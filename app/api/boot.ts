import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { users, authCredentials, websiteVisitors } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { handleStripeWebhook } from "./stripe-webhook";
import restApi from "./rest-router";
import { enrichIP } from "./lib/tracking";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.post("/api/webhooks/stripe", handleStripeWebhook);
app.post("/api/visitor/track", async (c) => {
  try {
    const body = await c.req.json<{ key: string; page?: string; referrer?: string; fingerprint?: string }>();
    const key = body?.key;
    if (!key) return c.json({ error: "Missing tracking key" }, 400);

    const db = getDb();
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.trackingKey, key))
      .limit(1);

    if (!owner) return c.json({ error: "Invalid tracking key" }, 401);

    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : c.req.header("x-real-ip") || "0.0.0.0";

    // Enrich IP
    const info = await enrichIP(ip);

    // Check for existing visitor by fingerprint + page
    const fingerprint = body.fingerprint || ip;
    const [existing] = await db
      .select()
      .from(websiteVisitors)
      .where(
        eq(websiteVisitors.fingerprint, fingerprint)
      )
      .limit(1);

    if (existing) {
      await db
        .update(websiteVisitors)
        .set({
          visitCount: existing.visitCount + 1,
          lastSeenAt: new Date(),
          page: body.page || existing.page,
          referrer: body.referrer || existing.referrer,
        })
        .where(eq(websiteVisitors.id, existing.id));
    } else {
      await db.insert(websiteVisitors).values({
        userId: owner.id,
        ip,
        country: info?.country || null,
        city: info?.city || null,
        org: info?.org || null,
        domain: info?.hostname || null,
        page: body.page || null,
        referrer: body.referrer || null,
        userAgent: c.req.header("user-agent") || null,
        fingerprint,
      });
    }

    return c.body(null, 204);
  } catch (err) {
    console.error("[visitor/track] error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

app.get("/track.js", async (c) => {
  const appUrl = JSON.stringify(env.appUrl);
  const script = `(function(){
    var key = document.currentScript.dataset.key;
    if(!key) return;
    var fp = btoa([screen.width,screen.height,navigator.language].join("|")).slice(0,32);
    fetch(${appUrl}+"/api/visitor/track",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        key:key,
        page:location.href,
        referrer:document.referrer,
        fingerprint:fp
      })
    }).catch(function(){});
  })();`;
  return c.text(script, 200, { "Content-Type": "application/javascript; charset=utf-8" });
});

app.route("/api/v1", restApi);

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

async function ensureAdminUser() {
  try {
    const db = getDb();
    const [existing] = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
    const devPassword = "admin";
    const passwordHash = await bcrypt.hash(devPassword, 12);

    if (!existing) {
      const [result] = await db.insert(users).values({
        username: "admin",
        name: "Admin",
        email: "admin@leadintel.ai",
        role: "admin",
      });
      const userId = Number(result.insertId);
      await db.insert(authCredentials).values({
        userId,
        passwordHash,
        mustChangePassword: false,
      });
      console.log("[boot] Admin user created (username: admin, password: admin)");
    } else {
      // Dev: ensure admin password is always predictable
      await db.update(authCredentials)
        .set({ passwordHash, mustChangePassword: false })
        .where(eq(authCredentials.userId, existing.id));
    }
  } catch (err) {
    console.error("[boot] Failed to ensure admin user:", err);
  }
}

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
} else {
  ensureAdminUser();
}

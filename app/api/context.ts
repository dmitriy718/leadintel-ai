import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import * as cookie from "cookie";
import { verifySessionToken, Session } from "./lib/auth";
import { findUserById } from "./queries/users";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const cookies = cookie.parse(opts.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (token) {
      const claim = await verifySessionToken(token);
      if (claim) {
        const user = await findUserById(claim.userId);
        if (user) {
          ctx.user = user;
        }
      }
    }
  } catch {
    // Ignore auth errors
  }
  return ctx;
}

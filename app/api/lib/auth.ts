import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import { Session } from "@contracts/constants";

const SECRET = new TextEncoder().encode(env.appSecret);

export async function signSessionToken(payload: { userId: number; username: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 });
    return payload as { userId: number; username: string };
  } catch {
    return null;
  }
}

export { Session };

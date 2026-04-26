import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/config/env";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface AccessTokenPayload {
  sub: string;        // user id
  email: string;
  role: "USER" | "ADMIN";
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .setIssuer("investa")
    .setAudience("investa-portal")
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify<AccessTokenPayload>(token, accessSecret, {
      issuer: "investa",
      audience: "investa-portal",
    });
    if (!payload.sub || !payload.email || !payload.role) return null;
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

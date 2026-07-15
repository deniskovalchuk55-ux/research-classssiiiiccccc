// ============================================================================
//  Сесія: підписаний JWT у httpOnly-кукі. Без паролів — вхід тільки по SMS-коду.
// ============================================================================
import { SignJWT, jwtVerify } from "jose";
import { serialize, parse } from "cookie";

const COOKIE_NAME = "session";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
const MAX_AGE = 60 * 60 * 24 * 30; // 30 днів

export async function createSessionCookie(userId) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);

  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  return serialize(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// Повертає userId або null. Використовуй на початку кожного API-роута.
export async function getUserIdFromReq(req) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId;
  } catch {
    return null;
  }
}

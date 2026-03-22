import { createHmac, timingSafeEqual } from "node:crypto";

import { publicEnv, serverEnv } from "@/lib/env";
import { normalizeSchoolEmail } from "@/lib/school-email";

function getVerificationSecret() {
  return (
    serverEnv.SUPABASE_SERVICE_ROLE_KEY ??
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "univers-student-verification"
  );
}

function buildPayload(requestId: string, userId: string, email: string) {
  return `${requestId}:${userId}:${normalizeSchoolEmail(email)}`;
}

export function createStudentVerificationToken(
  requestId: string,
  userId: string,
  email: string,
) {
  return createHmac("sha256", getVerificationSecret())
    .update(buildPayload(requestId, userId, email))
    .digest("hex");
}

export function verifyStudentVerificationToken(
  requestId: string,
  userId: string,
  email: string,
  token: string,
) {
  const expected = createStudentVerificationToken(requestId, userId, email);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);

  if (expectedBuffer.length !== tokenBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, tokenBuffer);
}

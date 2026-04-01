import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_AUTH_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_KAKAO_JS_KEY: z.string().optional(),
  NEXT_PUBLIC_NATIVE_PUSH_ENABLED: z.string().optional(),
  NEXT_PUBLIC_SHOW_TEST_ACCOUNTS: z.string().optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_SUPPORT_URL: z.string().url().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_AUTH_SITE_URL: z.string().url().optional(),
  SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS: z.string().optional(),
  SUPABASE_SMTP_HOST: z.string().optional(),
  SUPABASE_SMTP_PORT: z.string().optional(),
  SUPABASE_SMTP_USER: z.string().optional(),
  SUPABASE_SMTP_PASSWORD: z.string().optional(),
  SUPABASE_SMTP_SENDER_NAME: z.string().optional(),
  SUPABASE_SMTP_SENDER_EMAIL: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_KEY_ID: z.string().optional(),
  APNS_PRIVATE_KEY: z.string().optional(),
  APNS_BUNDLE_ID: z.string().optional(),
  APNS_USE_SANDBOX: z.string().optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_AUTH_SITE_URL: process.env.NEXT_PUBLIC_AUTH_SITE_URL,
  NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
  NEXT_PUBLIC_NATIVE_PUSH_ENABLED: process.env.NEXT_PUBLIC_NATIVE_PUSH_ENABLED,
  NEXT_PUBLIC_SHOW_TEST_ACCOUNTS: process.env.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_SUPPORT_URL: process.env.NEXT_PUBLIC_SUPPORT_URL,
});

export const serverEnv = serverEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_AUTH_SITE_URL: process.env.NEXT_PUBLIC_AUTH_SITE_URL,
  NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
  NEXT_PUBLIC_NATIVE_PUSH_ENABLED: process.env.NEXT_PUBLIC_NATIVE_PUSH_ENABLED,
  NEXT_PUBLIC_SHOW_TEST_ACCOUNTS: process.env.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_SUPPORT_URL: process.env.NEXT_PUBLIC_SUPPORT_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_AUTH_SITE_URL: process.env.SUPABASE_AUTH_SITE_URL,
  SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS: process.env.SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS,
  SUPABASE_SMTP_HOST: process.env.SUPABASE_SMTP_HOST,
  SUPABASE_SMTP_PORT: process.env.SUPABASE_SMTP_PORT,
  SUPABASE_SMTP_USER: process.env.SUPABASE_SMTP_USER,
  SUPABASE_SMTP_PASSWORD: process.env.SUPABASE_SMTP_PASSWORD,
  SUPABASE_SMTP_SENDER_NAME: process.env.SUPABASE_SMTP_SENDER_NAME,
  SUPABASE_SMTP_SENDER_EMAIL: process.env.SUPABASE_SMTP_SENDER_EMAIL,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  APNS_TEAM_ID: process.env.APNS_TEAM_ID,
  APNS_KEY_ID: process.env.APNS_KEY_ID,
  APNS_PRIVATE_KEY: process.env.APNS_PRIVATE_KEY,
  APNS_BUNDLE_ID: process.env.APNS_BUNDLE_ID,
  APNS_USE_SANDBOX: process.env.APNS_USE_SANDBOX,
});

export const env = serverEnv;

export function hasPublicSupabaseEnv() {
  return Boolean(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasAdminSupabaseEnv() {
  return Boolean(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function resolveAppUrl(fallback?: string) {
  return (
    publicEnv.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, "https://") ??
    process.env.VERCEL_URL?.replace(/^/, "https://") ??
    fallback ??
    "http://127.0.0.1:3000"
  );
}

export function resolveAuthSiteUrl(fallback?: string) {
  return (
    serverEnv.SUPABASE_AUTH_SITE_URL ??
    publicEnv.NEXT_PUBLIC_AUTH_SITE_URL ??
    resolveAppUrl(fallback)
  );
}

export function resolveAuthRedirectUrls(fallback?: string) {
  const authSiteUrl = resolveAuthSiteUrl(fallback).replace(/\/+$/, "");
  const configuredUrls = (serverEnv.SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(
    new Set([
      `${authSiteUrl}/login`,
      `${authSiteUrl}/login?next=*`,
      `${authSiteUrl}/auth/school-email/callback`,
      ...configuredUrls,
    ]),
  );
}

function parseFlag(value?: string | null) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseOptionalFlag(value?: string | null) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return parseFlag(value);
}

export function isNativePushEnabled() {
  const configured = parseOptionalFlag(publicEnv.NEXT_PUBLIC_NATIVE_PUSH_ENABLED);
  return configured ?? true;
}

export function shouldShowTestAccounts() {
  return parseFlag(publicEnv.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS);
}

export function getSupportEmail() {
  return publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@universeapp.kr";
}

export function getSupportUrl() {
  return publicEnv.NEXT_PUBLIC_SUPPORT_URL ?? "/support";
}

export function hasAppSmtpConfig() {
  return Boolean(
    serverEnv.SUPABASE_SMTP_HOST &&
      serverEnv.SUPABASE_SMTP_PORT &&
      serverEnv.SUPABASE_SMTP_USER &&
      serverEnv.SUPABASE_SMTP_PASSWORD &&
      serverEnv.SUPABASE_SMTP_SENDER_EMAIL,
  );
}

export function hasFirebasePushConfig() {
  return Boolean(
    serverEnv.FIREBASE_PROJECT_ID &&
      serverEnv.FIREBASE_CLIENT_EMAIL &&
      serverEnv.FIREBASE_PRIVATE_KEY,
  );
}

export function hasApnsPushConfig() {
  return Boolean(
    serverEnv.APNS_TEAM_ID &&
      serverEnv.APNS_KEY_ID &&
      serverEnv.APNS_PRIVATE_KEY &&
      (serverEnv.APNS_BUNDLE_ID ?? "kr.universeapp.camverse"),
  );
}

export function hasNativePushServerConfig() {
  return hasFirebasePushConfig() || hasApnsPushConfig();
}

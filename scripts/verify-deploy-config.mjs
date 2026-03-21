import nodemailer from "nodemailer";

import { loadLocalEnv } from "./_env.mjs";

loadLocalEnv();

function parseFlag(value) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function resolveAppUrl() {
  return (
    process.env.SUPABASE_AUTH_SITE_URL ||
    process.env.NEXT_PUBLIC_AUTH_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
}

function resolveRedirectUrls() {
  const appUrl = resolveAppUrl();
  const configuredUrls = (process.env.SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(
    new Set([
      `${appUrl}/login`,
      `${appUrl}/login?next=*`,
      `${appUrl}/auth/school-email/callback`,
      ...configuredUrls,
    ]),
  );
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SUPABASE_SMTP_HOST &&
      process.env.SUPABASE_SMTP_PORT &&
      process.env.SUPABASE_SMTP_USER &&
      process.env.SUPABASE_SMTP_PASSWORD &&
      process.env.SUPABASE_SMTP_SENDER_EMAIL,
  );
}

async function verifySmtp() {
  if (!hasSmtpConfig()) {
    console.log("SMTP");
    console.log("- app smtp: disabled");
    console.log("- delivery mode: supabase auth fallback");
    console.log("");
    return;
  }

  const port = Number(process.env.SUPABASE_SMTP_PORT || "587");
  const transporter = nodemailer.createTransport({
    host: process.env.SUPABASE_SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SUPABASE_SMTP_USER,
      pass: process.env.SUPABASE_SMTP_PASSWORD,
    },
  });

  await transporter.verify();

  console.log("SMTP");
  console.log("- app smtp: ready");
  console.log(`- sender: ${process.env.SUPABASE_SMTP_SENDER_EMAIL}`);
  console.log("");
}

async function main() {
  const appUrl = resolveAppUrl();
  const redirectUrls = resolveRedirectUrls();
  const googleEnabled = parseFlag(process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED);

  console.log("App URL");
  console.log(appUrl);
  console.log("");

  console.log("Redirect URLs");
  for (const value of redirectUrls) {
    console.log(`- ${value}`);
  }
  console.log("");

  console.log("Google Login");
  console.log(`- enabled: ${googleEnabled ? "yes" : "no"}`);
  if (googleEnabled) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is required when Google login is enabled.");
    }

    console.log(`- callback: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`);
  }
  console.log("");

  await verifySmtp();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

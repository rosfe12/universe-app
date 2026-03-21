import path from "node:path";

import { loadLocalEnv } from "./_env.mjs";

loadLocalEnv();

const appUrl = (
  process.env.SUPABASE_AUTH_SITE_URL ||
  process.env.NEXT_PUBLIC_AUTH_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  "http://127.0.0.1:3000"
).replace(/\/+$/, "");

const extraRedirects = (process.env.SUPABASE_AUTH_ADDITIONAL_REDIRECT_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const redirectUrls = Array.from(
  new Set([
    `${appUrl}/login`,
    `${appUrl}/login?next=*`,
    `${appUrl}/auth/school-email/callback`,
    ...extraRedirects,
  ]),
);

const senderName = process.env.SUPABASE_SMTP_SENDER_NAME || "유니버스";
const senderEmail = process.env.SUPABASE_SMTP_SENDER_EMAIL || "no-reply@your-domain.com";
const googleEnabled = ["1", "true", "yes", "on"].includes(
  String(process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED || "")
    .trim()
    .toLowerCase(),
);
const appSmtpEnabled = Boolean(
  process.env.SUPABASE_SMTP_HOST &&
    process.env.SUPABASE_SMTP_PORT &&
    process.env.SUPABASE_SMTP_USER &&
    process.env.SUPABASE_SMTP_PASSWORD &&
    process.env.SUPABASE_SMTP_SENDER_EMAIL,
);
const templateDir = path.join(process.cwd(), "supabase", "email-templates");

console.log("Site URL");
console.log(appUrl);
console.log("");

console.log("Redirect URLs");
for (const url of redirectUrls) {
  console.log(`- ${url}`);
}
console.log("");

console.log("Google Redirect URI");
if (googleEnabled && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`);
} else if (googleEnabled) {
  console.log("NEXT_PUBLIC_SUPABASE_URL required");
} else {
  console.log("disabled");
}
console.log("");

console.log("SMTP Sender");
console.log(`- name: ${senderName}`);
console.log(`- email: ${senderEmail}`);
console.log(`- app smtp enabled: ${appSmtpEnabled ? "yes" : "no"}`);
console.log("");

console.log("Email Templates");
console.log(`- subject: ${path.join(templateDir, "student-verification-magic-link.subject.txt")}`);
console.log(`- html: ${path.join(templateDir, "student-verification-magic-link.html")}`);

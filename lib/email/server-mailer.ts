import fs from "node:fs/promises";
import path from "node:path";

import nodemailer from "nodemailer";

import { env, hasAppSmtpConfig } from "@/lib/env";

let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpPort() {
  return Number(env.SUPABASE_SMTP_PORT ?? "587");
}

function getTransporter() {
  if (!hasAppSmtpConfig()) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const port = getSmtpPort();
  cachedTransporter = nodemailer.createTransport({
    host: env.SUPABASE_SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.SUPABASE_SMTP_USER,
      pass: env.SUPABASE_SMTP_PASSWORD,
    },
  });

  return cachedTransporter;
}

async function loadTemplate(filename: string) {
  return fs.readFile(path.join(process.cwd(), "supabase", "email-templates", filename), "utf8");
}

function replaceTemplateLink(html: string, verificationUrl: string) {
  return html.replace(
    "{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email",
    verificationUrl,
  );
}

export async function sendStudentVerificationEmail({
  toEmail,
  verificationUrl,
}: {
  toEmail: string;
  verificationUrl: string;
}) {
  const [subject, htmlTemplate] = await Promise.all([
    loadTemplate("student-verification-magic-link.subject.txt"),
    loadTemplate("student-verification-magic-link.html"),
  ]);

  const transporter = getTransporter();
  const html = replaceTemplateLink(htmlTemplate, verificationUrl);
  const from = env.SUPABASE_SMTP_SENDER_NAME
    ? `"${env.SUPABASE_SMTP_SENDER_NAME}" <${env.SUPABASE_SMTP_SENDER_EMAIL}>`
    : env.SUPABASE_SMTP_SENDER_EMAIL!;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: subject.trim(),
    html,
    text: [
      "유니버스 대학생 인증을 완료하세요.",
      verificationUrl,
      "",
      "본인이 요청하지 않았다면 이 메일을 무시해도 됩니다.",
    ].join("\n"),
  });
}

export async function verifyAppSmtpConnection() {
  const transporter = getTransporter();
  await transporter.verify();
}

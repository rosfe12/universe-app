import { createPrivateKey, createSign } from "node:crypto";
import { connect } from "node:http2";

import {
  env,
  hasApnsPushConfig,
  hasFirebasePushConfig,
  isNativePushEnabled,
} from "@/lib/env";
import { logServerEvent } from "@/lib/ops";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type NotificationInsertPayload = {
  user_id: string;
  type:
    | "comment"
    | "reply"
    | "trending_post"
    | "lecture_reaction"
    | "trade_match"
    | "admission_answer"
    | "school_recommendation"
    | "freshman_trending"
    | "admission_unanswered"
    | "verification_approved"
    | "report_update"
    | "announcement";
  title: string;
  body: string;
  href?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  source_kind?: "activity" | "recommendation" | "system";
  delivery_mode?: "instant" | "daily";
  metadata?: Record<string, unknown>;
};

type PushDevice = {
  id: string;
  user_id: string;
  platform: "ios" | "android" | "web";
  token: string;
};

const FCM_AUTH_AUDIENCE = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const APNS_PRODUCTION_ORIGIN = "https://api.push.apple.com";
const APNS_SANDBOX_ORIGIN = "https://api.sandbox.push.apple.com";
const APNS_DEFAULT_TOPIC = "kr.universeapp.camverse";
const APNS_INVALID_REASONS = new Set([
  "BadDeviceToken",
  "DeviceTokenNotForTopic",
  "Unregistered",
]);
const FCM_INVALID_REASONS = new Set(["UNREGISTERED", "INVALID_ARGUMENT"]);

let firebaseAccessTokenCache:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;

let apnsAuthTokenCache:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizePrivateKey(value?: string | null) {
  return (value ?? "").replace(/\\n/g, "\n").trim();
}

function signJwt(input: string, privateKey: string, algorithm: "RSA-SHA256" | "sha256", dsaEncoding?: "ieee-p1363") {
  const signer = createSign(algorithm);
  signer.update(input);
  signer.end();
  return signer.sign(
    dsaEncoding
      ? { key: createPrivateKey(privateKey), dsaEncoding }
      : createPrivateKey(privateKey),
  );
}

async function getFirebaseAccessToken() {
  if (!hasFirebasePushConfig()) {
    return null;
  }

  const now = Date.now();
  if (firebaseAccessTokenCache && firebaseAccessTokenCache.expiresAt - now > 60_000) {
    return firebaseAccessTokenCache.token;
  }

  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + 3600;
  const header = base64UrlEncode(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    }),
  );
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: env.FIREBASE_CLIENT_EMAIL,
      sub: env.FIREBASE_CLIENT_EMAIL,
      aud: FCM_AUTH_AUDIENCE,
      iat: issuedAt,
      exp: expiresAt,
      scope: FCM_SCOPE,
    }),
  );
  const assertion = `${header}.${payload}`;
  const signature = base64UrlEncode(
    signJwt(assertion, normalizePrivateKey(env.FIREBASE_PRIVATE_KEY), "RSA-SHA256"),
  );

  const response = await fetch(FCM_AUTH_AUDIENCE, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${assertion}.${signature}`,
    }),
  });

  const result = (await response.json().catch(() => null)) as
    | {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      }
    | null;

  if (!response.ok || !result?.access_token) {
    throw new Error(result?.error_description ?? result?.error ?? "Firebase access token 요청에 실패했습니다.");
  }

  firebaseAccessTokenCache = {
    token: result.access_token,
    expiresAt: now + Math.max((result.expires_in ?? 3600) - 60, 60) * 1000,
  };

  return firebaseAccessTokenCache.token;
}

async function getApnsAuthToken() {
  if (!hasApnsPushConfig()) {
    return null;
  }

  const now = Date.now();
  if (apnsAuthTokenCache && apnsAuthTokenCache.expiresAt - now > 60_000) {
    return apnsAuthTokenCache.token;
  }

  const issuedAt = Math.floor(now / 1000);
  const header = base64UrlEncode(
    JSON.stringify({
      alg: "ES256",
      kid: env.APNS_KEY_ID,
      typ: "JWT",
    }),
  );
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: env.APNS_TEAM_ID,
      iat: issuedAt,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = base64UrlEncode(
    signJwt(
      unsignedToken,
      normalizePrivateKey(env.APNS_PRIVATE_KEY),
      "sha256",
      "ieee-p1363",
    ),
  );

  apnsAuthTokenCache = {
    token: `${unsignedToken}.${signature}`,
    expiresAt: now + 50 * 60 * 1000,
  };

  return apnsAuthTokenCache.token;
}

function normalizePushData(
  notification: NotificationInsertPayload,
): Record<string, string> {
  const metadata =
    notification.metadata && Object.keys(notification.metadata).length > 0
      ? JSON.stringify(notification.metadata)
      : "";

  return {
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href ?? "",
    targetType: notification.target_type ?? "",
    targetId: notification.target_id ?? "",
    metadata,
  };
}

function parseFcmErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const errorPayload = (payload as { error?: { status?: string; details?: Array<Record<string, unknown>> } }).error;
  if (Array.isArray(errorPayload?.details)) {
    for (const detail of errorPayload.details) {
      if (typeof detail.errorCode === "string") {
        return detail.errorCode;
      }
    }
  }

  return typeof errorPayload?.status === "string" ? errorPayload.status : null;
}

function looksLikeApnsDeviceToken(token: string) {
  return /^[a-f0-9]{64,}$/i.test(token);
}

async function sendFirebasePush(token: string, notification: NotificationInsertPayload) {
  const accessToken = await getFirebaseAccessToken();
  if (!accessToken || !env.FIREBASE_PROJECT_ID) {
    return { ok: false, invalidToken: false };
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: normalizePushData(notification),
          android: {
            priority: "high",
            notification: {
              channelId: "default",
              clickAction: "OPEN_ACTIVITY_1",
            },
          },
          apns: {
            headers: {
              "apns-push-type": "alert",
              "apns-priority": "10",
            },
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        },
      }),
    },
  );

  const result = (await response.json().catch(() => null)) as unknown;
  if (response.ok) {
    return { ok: true, invalidToken: false };
  }

  const errorCode = parseFcmErrorCode(result);
  return {
    ok: false,
    invalidToken: Boolean(errorCode && FCM_INVALID_REASONS.has(errorCode)),
    errorCode,
  };
}

async function sendApnsPush(token: string, notification: NotificationInsertPayload) {
  const authToken = await getApnsAuthToken();
  if (!authToken) {
    return { ok: false, invalidToken: false };
  }

  const origin = env.APNS_USE_SANDBOX === "1" ? APNS_SANDBOX_ORIGIN : APNS_PRODUCTION_ORIGIN;
  const topic = env.APNS_BUNDLE_ID || APNS_DEFAULT_TOPIC;
  const payload = JSON.stringify({
    aps: {
      alert: {
        title: notification.title,
        body: notification.body,
      },
      sound: "default",
    },
    ...normalizePushData(notification),
  });

  return await new Promise<{ ok: boolean; invalidToken: boolean; errorCode?: string | null }>((resolve) => {
    const client = connect(origin);
    let responseBody = "";
    let statusCode = 0;

    client.on("error", (error) => {
      resolve({
        ok: false,
        invalidToken: false,
        errorCode: error.message,
      });
    });

    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${authToken}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(payload),
    });

    request.setEncoding("utf8");
    request.on("response", (headers) => {
      statusCode = Number(headers[":status"] ?? 0);
    });
    request.on("data", (chunk) => {
      responseBody += chunk;
    });
    request.on("error", (error) => {
      client.close();
      resolve({
        ok: false,
        invalidToken: false,
        errorCode: error.message,
      });
    });
    request.on("end", () => {
      client.close();
      let reason: string | null = null;
      try {
        const parsed = JSON.parse(responseBody) as { reason?: string };
        reason = parsed.reason ?? null;
      } catch {}

      resolve({
        ok: statusCode >= 200 && statusCode < 300,
        invalidToken: Boolean(reason && APNS_INVALID_REASONS.has(reason)),
        errorCode: reason,
      });
    });
    request.end(payload);
  });
}

async function removeInvalidPushTokens(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  tokens: string[],
) {
  if (tokens.length === 0) {
    return;
  }

  const uniqueTokens = Array.from(new Set(tokens));
  const { error } = await admin.from("push_devices").delete().in("token", uniqueTokens);
  if (error) {
    logServerEvent("warn", "push_invalid_token_cleanup_failed", {
      message: error.message,
      tokenCount: uniqueTokens.length,
    });
  }
}

export async function deliverNativePushNotifications(
  payload: NotificationInsertPayload[],
  options?: {
    admin?: ReturnType<typeof createAdminSupabaseClient>;
  },
) {
  if (!isNativePushEnabled()) {
    return;
  }

  const instantPayload = payload.filter(
    (item) => (item.delivery_mode ?? "instant") === "instant",
  );

  if (instantPayload.length === 0) {
    return;
  }

  const admin = options?.admin ?? createAdminSupabaseClient();
  const userIds = Array.from(new Set(instantPayload.map((item) => item.user_id)));
  const { data: devices, error } = await admin
    .from("push_devices")
    .select("id, user_id, platform, token")
    .in("user_id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  if (!devices?.length) {
    return;
  }

  const devicesByUserId = new Map<string, PushDevice[]>();
  for (const device of devices as PushDevice[]) {
    if (!devicesByUserId.has(device.user_id)) {
      devicesByUserId.set(device.user_id, []);
    }
    devicesByUserId.get(device.user_id)!.push(device);
  }

  const invalidTokens: string[] = [];

  await Promise.all(
    instantPayload.flatMap((notification) =>
      (devicesByUserId.get(notification.user_id) ?? []).map(async (device) => {
        try {
          if (device.platform === "android") {
            const result = await sendFirebasePush(device.token, notification);
            if (result.invalidToken) {
              invalidTokens.push(device.token);
            }
            if (!result.ok && result.errorCode) {
              logServerEvent("warn", "android_push_delivery_failed", {
                userId: notification.user_id,
                token: device.token.slice(0, 12),
                errorCode: result.errorCode,
              });
            }
            return;
          }

          if (device.platform === "ios") {
            const result = looksLikeApnsDeviceToken(device.token)
              ? await sendApnsPush(device.token, notification)
              : await sendFirebasePush(device.token, notification);

            if (result.invalidToken) {
              invalidTokens.push(device.token);
            }
            if (!result.ok && result.errorCode) {
              logServerEvent("warn", "ios_push_delivery_failed", {
                userId: notification.user_id,
                token: device.token.slice(0, 12),
                errorCode: result.errorCode,
              });
            }
          }
        } catch (error) {
          logServerEvent("warn", "native_push_delivery_failed", {
            userId: notification.user_id,
            platform: device.platform,
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }),
    ),
  );

  await removeInvalidPushTokens(admin, invalidTokens);
}

export async function insertNotificationsAsSystem(
  payload: NotificationInsertPayload[],
  options?: {
    admin?: ReturnType<typeof createAdminSupabaseClient>;
  },
) {
  if (payload.length === 0) {
    return;
  }

  const admin = options?.admin ?? createAdminSupabaseClient();
  const { error } = await admin.from("notifications").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  try {
    await deliverNativePushNotifications(payload, { admin });
  } catch (pushError) {
    logServerEvent("warn", "native_push_delivery_batch_failed", {
      message: pushError instanceof Error ? pushError.message : "unknown",
      notificationCount: payload.length,
    });
  }
}

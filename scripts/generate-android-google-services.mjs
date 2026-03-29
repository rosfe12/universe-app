import fs from "node:fs";
import path from "node:path";

import { loadLocalEnv } from "./_env.mjs";

loadLocalEnv();

const OUTPUT_PATH = path.join(process.cwd(), "android", "app", "google-services.json");
const DEFAULT_PACKAGE_NAME = process.env.CAPACITOR_APP_ID?.trim() || "kr.universeapp.camverse";

function readConfiguredGoogleServicesJson() {
  const rawJson = process.env.GOOGLE_SERVICES_JSON?.trim();
  if (rawJson) {
    return rawJson;
  }

  const rawBase64 = process.env.GOOGLE_SERVICES_JSON_BASE64?.trim();
  if (rawBase64) {
    return Buffer.from(rawBase64, "base64").toString("utf8");
  }

  return null;
}

function buildGoogleServicesJsonFromDiscreteConfig() {
  const projectNumber = process.env.FIREBASE_ANDROID_PROJECT_NUMBER?.trim();
  const projectId =
    process.env.FIREBASE_ANDROID_PROJECT_ID?.trim() || process.env.FIREBASE_PROJECT_ID?.trim();
  const storageBucket =
    process.env.FIREBASE_ANDROID_STORAGE_BUCKET?.trim() ||
    (projectId ? `${projectId}.appspot.com` : "");
  const apiKey = process.env.FIREBASE_ANDROID_API_KEY?.trim();
  const appId = process.env.FIREBASE_ANDROID_APP_ID?.trim();
  const packageName = process.env.FIREBASE_ANDROID_PACKAGE_NAME?.trim() || DEFAULT_PACKAGE_NAME;

  const configuredValues = [projectNumber, projectId, apiKey, appId].filter(Boolean);
  if (configuredValues.length === 0) {
    return null;
  }

  if (!projectNumber || !projectId || !apiKey || !appId) {
    throw new Error(
      "Android 푸시 설정이 일부만 있습니다. FIREBASE_ANDROID_PROJECT_NUMBER, FIREBASE_PROJECT_ID, FIREBASE_ANDROID_API_KEY, FIREBASE_ANDROID_APP_ID를 모두 설정하세요.",
    );
  }

  return JSON.stringify(
    {
      project_info: {
        project_number: projectNumber,
        project_id: projectId,
        storage_bucket: storageBucket,
      },
      client: [
        {
          client_info: {
            mobilesdk_app_id: appId,
            android_client_info: {
              package_name: packageName,
            },
          },
          oauth_client: [],
          api_key: [
            {
              current_key: apiKey,
            },
          ],
          services: {
            appinvite_service: {
              other_platform_oauth_client: [],
            },
          },
        },
      ],
      configuration_version: "1",
    },
    null,
    2,
  );
}

function main() {
  const configuredJson =
    readConfiguredGoogleServicesJson() ?? buildGoogleServicesJsonFromDiscreteConfig();

  if (!configuredJson) {
    return;
  }

  const normalized = `${JSON.stringify(JSON.parse(configuredJson), null, 2)}\n`;
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, "utf8") : null;
  if (current === normalized) {
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, normalized, "utf8");
}

main();

"use client";

import { publicEnv } from "@/lib/env";
import type { SharePayload } from "@/lib/share-utils";

const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";

type KakaoShareRequest = {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
  installTalk?: boolean;
};

type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share?: {
    sendDefault: (payload: KakaoShareRequest) => void;
  };
  Link?: {
    sendDefault: (payload: KakaoShareRequest) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let sdkPromise: Promise<KakaoSdk | null> | null = null;

export async function loadKakaoSdk() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.Kakao) {
    return window.Kakao;
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<KakaoSdk | null>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Kakao ?? null), { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.kakaoSdk = "true";
    script.addEventListener("load", () => resolve(window.Kakao ?? null), { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function initKakao() {
  const jsKey = publicEnv.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!jsKey) {
    return null;
  }

  const sdk = await loadKakaoSdk();
  if (!sdk) {
    return null;
  }

  if (!sdk.isInitialized()) {
    sdk.init(jsKey);
  }

  return sdk;
}

export async function shareToKakao(payload: SharePayload) {
  const sdk = await initKakao();
  if (!sdk) {
    return false;
  }

  const request: KakaoShareRequest = {
    objectType: "feed",
    content: {
      title: payload.title,
      description: payload.description ?? "CAMVERSE에서 확인해보세요",
      imageUrl: payload.imageUrl ?? "",
      link: {
        mobileWebUrl: payload.linkUrl,
        webUrl: payload.linkUrl,
      },
    },
    buttons: [
      {
        title: payload.buttonTitle ?? "확인하기",
        link: {
          mobileWebUrl: payload.linkUrl,
          webUrl: payload.linkUrl,
        },
      },
    ],
    installTalk: true,
  };

  const sender = sdk.Share?.sendDefault ?? sdk.Link?.sendDefault;
  if (!sender) {
    return false;
  }

  sender(request);
  return true;
}

export async function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export async function shareWithFallback(payload: SharePayload) {
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({
      title: payload.title,
      text: payload.description,
      url: payload.linkUrl,
    });
    return "native" as const;
  }

  await copyToClipboard(payload.linkUrl);
  return "copy" as const;
}

"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

const failedProfileImageKeys = new Map<string, number>();
const PROFILE_IMAGE_FAILURE_TTL_MS = 5 * 60 * 1000;

type ProfileImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: React.ReactNode;
};

function getProfileImageFailureKey(src: string) {
  try {
    const url = new URL(src);
    return url.pathname.includes("/storage/v1/object/sign/")
      ? `${url.origin}${url.pathname}`
      : `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return src.split("?")[0] ?? src;
  }
}

export function ProfileImage({ src, fallback = null, alt, ...props }: ProfileImageProps) {
  const failureKey = src ? getProfileImageFailureKey(src) : null;
  const [broken, setBroken] = useState(() =>
    failureKey
      ? (() => {
          const failedAt = failedProfileImageKeys.get(failureKey);
          return Boolean(failedAt && Date.now() - failedAt < PROFILE_IMAGE_FAILURE_TTL_MS);
        })()
      : false,
  );

  useEffect(() => {
    setBroken(
      failureKey
        ? (() => {
            const failedAt = failedProfileImageKeys.get(failureKey);
            if (!failedAt) {
              return false;
            }
            if (Date.now() - failedAt >= PROFILE_IMAGE_FAILURE_TTL_MS) {
              failedProfileImageKeys.delete(failureKey);
              return false;
            }
            return true;
          })()
        : false,
    );
  }, [failureKey]);

  if (!src || broken) {
    return <>{fallback}</>;
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized
      onError={() => {
        if (failureKey) {
          failedProfileImageKeys.set(failureKey, Date.now());
        }
        setBroken(true);
      }}
    />
  );
}

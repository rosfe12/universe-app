"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

const failedProfileImageKeys = new Set<string>();

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
    failureKey ? failedProfileImageKeys.has(failureKey) : false,
  );

  useEffect(() => {
    setBroken(failureKey ? failedProfileImageKeys.has(failureKey) : false);
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
          failedProfileImageKeys.add(failureKey);
        }
        setBroken(true);
      }}
    />
  );
}

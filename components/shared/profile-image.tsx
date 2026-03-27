"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

type ProfileImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: React.ReactNode;
};

export function ProfileImage({ src, fallback = null, alt, ...props }: ProfileImageProps) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return <>{fallback}</>;
  }

  return <Image {...props} src={src} alt={alt} unoptimized onError={() => setBroken(true)} />;
}

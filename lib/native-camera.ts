function resolveCapturedFileType(format?: string, blobType?: string) {
  if (blobType && blobType.startsWith("image/")) {
    return blobType;
  }

  switch (format?.toLowerCase()) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

function resolveCapturedExtension(type: string) {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export async function captureImageFromNativeCamera() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const [{ Capacitor }, { Camera, CameraResultType, CameraSource }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/camera"),
    ]);

    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    const photo = await Camera.getPhoto({
      allowEditing: false,
      correctOrientation: true,
      quality: 92,
      resultType: CameraResultType.Uri,
      saveToGallery: false,
      source: CameraSource.Camera,
    });

    if (!photo.webPath) {
      throw new Error("촬영한 사진을 불러오지 못했습니다.");
    }

    const response = await fetch(photo.webPath);
    if (!response.ok) {
      throw new Error("촬영한 사진을 읽지 못했습니다.");
    }

    const blob = await response.blob();
    const fileType = resolveCapturedFileType(photo.format, blob.type);
    const extension = resolveCapturedExtension(fileType);

    return new File([blob], `profile-camera-${Date.now()}.${extension}`, {
      type: fileType,
      lastModified: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("cancel")) {
      return null;
    }

    throw error;
  }
}

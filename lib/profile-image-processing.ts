import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_ALLOWED_TYPES,
} from "@/lib/community-profile";

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StickerType = "smile" | "star" | "dot" | "sparkle";

export type ImageValidationResult = {
  faceBoxes: FaceBox[];
  sensitiveTextDetected: boolean;
  qrDetected: boolean;
};

const MAX_OUTPUT_DIMENSION = 1280;
const MAX_DETECTION_DIMENSION = 1280;
const DEFAULT_OUTPUT_TYPE = "image/jpeg";
const DEFAULT_OUTPUT_QUALITY = 0.82;
const FAST_UPLOAD_SKIP_REENCODE_BYTES = 900 * 1024;
const TARGET_OUTPUT_BYTES = 1024 * 1024;
const HIGH_EFFICIENCY_IMAGE_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
] as const;

type BrowserFaceDetector = {
  detect(input: ImageBitmapSource): Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

type BlazeFacePrediction = {
  topLeft: ArrayLike<number>;
  bottomRight: ArrayLike<number>;
  probability?: ArrayLike<number>;
};

type BlazeFaceModel = {
  estimateFaces(
    input: TexImageSource | ImageData | HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
    returnTensors?: boolean,
  ): Promise<BlazeFacePrediction[]>;
};

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => BrowserFaceDetector;
  }
}

function normalizeSignal(value: string) {
  return value.trim().toLowerCase();
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      nextImage.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isHighEfficiencyImage(file: File) {
  return (
    HIGH_EFFICIENCY_IMAGE_TYPES.includes(
      file.type as (typeof HIGH_EFFICIENCY_IMAGE_TYPES)[number],
    ) || /\.(heic|heif)$/i.test(file.name)
  );
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, DEFAULT_OUTPUT_TYPE, quality);
  });
}

export async function buildManualCoverBoxes(file: File): Promise<FaceBox[]> {
  const image = await loadImageElement(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const boxWidth = Math.round(width * 0.34);
  const boxHeight = Math.round(height * 0.34);

  return [
    {
      x: Math.round((width - boxWidth) / 2),
      y: Math.round(height * 0.18),
      width: boxWidth,
      height: boxHeight,
    },
  ];
}

function fitCanvasSize(width: number, height: number) {
  return fitCanvasSizeToLimit(width, height, MAX_OUTPUT_DIMENSION);
}

function fitCanvasSizeToLimit(width: number, height: number, limit: number) {
  if (Math.max(width, height) <= limit) {
    return { width, height };
  }

  const ratio = width / height;
  if (width >= height) {
    return {
      width: limit,
      height: Math.round(limit / ratio),
    };
  }

  return {
    width: Math.round(limit * ratio),
    height: limit,
  };
}

async function renderBaseCanvas(file: File) {
  const image = await loadImageElement(file);
  const nextSize = fitCanvasSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");
  canvas.width = nextSize.width;
  canvas.height = nextSize.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지 편집을 시작하지 못했습니다.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const scaleX = canvas.width / (image.naturalWidth || image.width || canvas.width);
  const scaleY = canvas.height / (image.naturalHeight || image.height || canvas.height);

  return {
    canvas,
    context,
    scaleX,
    scaleY,
  };
}

async function renderDetectionInput(file: File) {
  const image = await loadImageElement(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  const detectionSize = fitCanvasSizeToLimit(originalWidth, originalHeight, MAX_DETECTION_DIMENSION);

  if (detectionSize.width === originalWidth && detectionSize.height === originalHeight) {
    return {
      input: image as HTMLImageElement | HTMLCanvasElement,
      scaleX: 1,
      scaleY: 1,
      width: originalWidth,
      height: originalHeight,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = detectionSize.width;
  canvas.height = detectionSize.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("얼굴 감지를 시작하지 못했습니다.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return {
    input: canvas as HTMLImageElement | HTMLCanvasElement,
    scaleX: originalWidth / canvas.width,
    scaleY: originalHeight / canvas.height,
    width: originalWidth,
    height: originalHeight,
  };
}

let tensorflowReadyPromise: Promise<void> | null = null;
let blazeFaceModelPromise: Promise<BlazeFaceModel> | null = null;

async function ensureTensorflowReady() {
  if (typeof window === "undefined") {
    throw new Error("브라우저 환경에서만 얼굴 감지를 사용할 수 있습니다.");
  }

  if (!tensorflowReadyPromise) {
    tensorflowReadyPromise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");

      await Promise.all([
        import("@tensorflow/tfjs-converter"),
        import("@tensorflow/tfjs-backend-cpu"),
        import("@tensorflow/tfjs-backend-webgl"),
      ]);

      const currentBackend = tf.getBackend();
      if (currentBackend !== "webgl" && currentBackend !== "cpu") {
        if (tf.findBackend("webgl")) {
          await tf.setBackend("webgl");
        } else if (tf.findBackend("cpu")) {
          await tf.setBackend("cpu");
        }
      }

      await tf.ready();
    })().catch((error) => {
      tensorflowReadyPromise = null;
      throw error;
    });
  }

  await tensorflowReadyPromise;
}

async function getBlazeFaceModel() {
  if (!blazeFaceModelPromise) {
    blazeFaceModelPromise = (async () => {
      await ensureTensorflowReady();
      const blazeface = await import("@tensorflow-models/blazeface");
      return blazeface.load({
        maxFaces: 5,
        iouThreshold: 0.3,
        scoreThreshold: 0.7,
      }) as Promise<BlazeFaceModel>;
    })().catch((error) => {
      blazeFaceModelPromise = null;
      throw error;
    });
  }

  return blazeFaceModelPromise;
}

function arrayLikeToPair(value: ArrayLike<number>) {
  return [Number(value[0] ?? 0), Number(value[1] ?? 0)] as const;
}

function keywordFaceBoxes(file: File, width: number, height: number): FaceBox[] {
  const signal = normalizeSignal(file.name);
  if (!/(face|selfie|portrait|얼굴|셀카|증명사진|profile-photo|front)/.test(signal)) {
    return [];
  }

  const boxWidth = Math.round(width * 0.34);
  const boxHeight = Math.round(height * 0.34);
  return [
    {
      x: Math.round((width - boxWidth) / 2),
      y: Math.round(height * 0.18),
      width: boxWidth,
      height: boxHeight,
    },
  ];
}

async function createOutputFile(
  canvas: HTMLCanvasElement,
  suffix: "masked" | "stickered" | "normalized",
) {
  let quality = DEFAULT_OUTPUT_QUALITY;
  let blob = await canvasToBlob(canvas, quality);

  if (!blob) {
    throw new Error("편집한 이미지를 저장하지 못했습니다.");
  }

  while (blob.size > TARGET_OUTPUT_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);

    if (!blob) {
      throw new Error("편집한 이미지를 저장하지 못했습니다.");
    }
  }

  return new File([blob], `profile-${suffix}-${Date.now()}.jpg`, {
    type: DEFAULT_OUTPUT_TYPE,
    lastModified: Date.now(),
  });
}

function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const appliedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + appliedRadius, y);
  context.lineTo(x + width - appliedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + appliedRadius);
  context.lineTo(x + width, y + height - appliedRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - appliedRadius, y + height);
  context.lineTo(x + appliedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - appliedRadius);
  context.lineTo(x, y + appliedRadius);
  context.quadraticCurveTo(x, y, x + appliedRadius, y);
  context.closePath();
}

export async function detectFaceInImage(file: File): Promise<FaceBox[]> {
  const detectionInput = await renderDetectionInput(file);
  const faceDetectorCtor = typeof window !== "undefined" ? window.FaceDetector : undefined;

  if (faceDetectorCtor) {
    try {
      const detector = new faceDetectorCtor({
        fastMode: true,
        maxDetectedFaces: 5,
      });
      const detections = await detector.detect(detectionInput.input);
      if (detections.length > 0) {
        return detections.map((detection) => ({
          x: detection.boundingBox.x * detectionInput.scaleX,
          y: detection.boundingBox.y * detectionInput.scaleY,
          width: detection.boundingBox.width * detectionInput.scaleX,
          height: detection.boundingBox.height * detectionInput.scaleY,
        }));
      }
    } catch {
      // browser support can vary; fall back to a model-based detector
    }
  }

  try {
    const model = await getBlazeFaceModel();
    const predictions = await model.estimateFaces(detectionInput.input, false);

    if (predictions.length > 0) {
      return predictions.map((prediction) => {
        const [topLeftX, topLeftY] = arrayLikeToPair(prediction.topLeft);
        const [bottomRightX, bottomRightY] = arrayLikeToPair(prediction.bottomRight);

        return {
          x: topLeftX * detectionInput.scaleX,
          y: topLeftY * detectionInput.scaleY,
          width: Math.max(0, (bottomRightX - topLeftX) * detectionInput.scaleX),
          height: Math.max(0, (bottomRightY - topLeftY) * detectionInput.scaleY),
        };
      });
    }
  } catch {
    // fall back to lightweight filename-based heuristics if on-device detection is unavailable
  }

  return keywordFaceBoxes(file, detectionInput.width, detectionInput.height);
}

export async function detectSensitiveTextInImage(file: File) {
  const signal = normalizeSignal(file.name);
  return /(phone|tel|연락처|번호|kakao|insta|instagram|sns|student|학번|qr|barcode|이메일|email|@)/.test(
    signal,
  );
}

export async function detectQrInImage(file: File) {
  const signal = normalizeSignal(file.name);
  return /(qr|barcode|바코드|큐알)/.test(signal);
}

export async function validateImageBeforeUpload(file: File): Promise<ImageValidationResult> {
  const [faceBoxes, sensitiveTextDetected, qrDetected] = await Promise.all([
    detectFaceInImage(file),
    detectSensitiveTextInImage(file),
    detectQrInImage(file),
  ]);

  return {
    faceBoxes,
    sensitiveTextDetected,
    qrDetected,
  };
}

export async function prepareProfileImageForUpload(file: File) {
  const alreadySupported = PROFILE_IMAGE_ALLOWED_TYPES.includes(
    file.type as (typeof PROFILE_IMAGE_ALLOWED_TYPES)[number],
  );
  if (alreadySupported && file.size <= FAST_UPLOAD_SKIP_REENCODE_BYTES) {
    return file;
  }

  try {
    const { canvas } = await renderBaseCanvas(file);

    let quality = DEFAULT_OUTPUT_QUALITY;
    let blob = await canvasToBlob(canvas, quality);

    while (blob && blob.size > TARGET_OUTPUT_BYTES && quality > 0.5) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, quality);
    }

    while (blob && blob.size > MAX_PROFILE_IMAGE_BYTES && quality > 0.42) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, quality);
    }

    if (!blob) {
      throw new Error("이미지를 준비하지 못했습니다.");
    }

    if (blob.size > MAX_PROFILE_IMAGE_BYTES) {
      throw new Error("프로필 사진은 5MB 이하만 업로드할 수 있습니다.");
    }

    return new File([blob], `profile-normalized-${Date.now()}.jpg`, {
      type: DEFAULT_OUTPUT_TYPE,
      lastModified: Date.now(),
    });
  } catch (cause) {
    if (isHighEfficiencyImage(file)) {
      throw new Error("HEIC 사진을 처리하지 못했습니다. 사진 앱에서 JPG로 저장하거나 스크린샷으로 다시 올려주세요.");
    }

    throw cause instanceof Error ? cause : new Error("이미지를 준비하지 못했습니다.");
  }
}

export async function applyBlurToFaces(file: File, faceBoxes: FaceBox[]) {
  const { canvas, context, scaleX, scaleY } = await renderBaseCanvas(file);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = canvas.width;
  sourceCanvas.height = canvas.height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("흐림 처리를 시작하지 못했습니다.");
  }

  sourceContext.drawImage(canvas, 0, 0);

  for (const faceBox of faceBoxes) {
    const baseX = Math.max(0, Math.floor(faceBox.x * scaleX));
    const baseY = Math.max(0, Math.floor(faceBox.y * scaleY));
    const baseWidth = Math.max(24, Math.ceil(faceBox.width * scaleX));
    const baseHeight = Math.max(24, Math.ceil(faceBox.height * scaleY));

    const paddingLeft = Math.max(54, Math.round(baseWidth * 0.72));
    const paddingRight = Math.max(54, Math.round(baseWidth * 0.72));
    const paddingTop = Math.max(48, Math.round(baseHeight * 0.58));
    const paddingBottom = Math.max(72, Math.round(baseHeight * 1.08));

    const x = Math.max(0, baseX - paddingLeft);
    const y = Math.max(0, baseY - paddingTop);
    const width = Math.min(canvas.width - x, baseWidth + paddingLeft + paddingRight);
    const height = Math.min(canvas.height - y, baseHeight + paddingTop + paddingBottom);

    const pixelCanvas = document.createElement("canvas");
    pixelCanvas.width = Math.max(1, Math.round(width / 80));
    pixelCanvas.height = Math.max(1, Math.round(height / 80));
    const pixelContext = pixelCanvas.getContext("2d");

    if (!pixelContext) {
      throw new Error("흐림 처리를 시작하지 못했습니다.");
    }

    pixelContext.drawImage(sourceCanvas, x, y, width, height, 0, 0, pixelCanvas.width, pixelCanvas.height);

    const pixelatedCanvas = document.createElement("canvas");
    pixelatedCanvas.width = width;
    pixelatedCanvas.height = height;
    const pixelatedContext = pixelatedCanvas.getContext("2d");

    if (!pixelatedContext) {
      throw new Error("흐림 처리를 시작하지 못했습니다.");
    }

    pixelatedContext.imageSmoothingEnabled = false;
    pixelatedContext.drawImage(
      pixelCanvas,
      0,
      0,
      pixelCanvas.width,
      pixelCanvas.height,
      0,
      0,
      pixelatedCanvas.width,
      pixelatedCanvas.height,
    );

    const blurredCanvas = document.createElement("canvas");
    blurredCanvas.width = width;
    blurredCanvas.height = height;
    const blurredContext = blurredCanvas.getContext("2d");

    if (!blurredContext) {
      throw new Error("흐림 처리를 시작하지 못했습니다.");
    }

    const blurRadius = Math.max(88, Math.round(Math.max(width, height) * 0.42));
    blurredContext.filter = `blur(${blurRadius}px) saturate(0.08) contrast(1.24) brightness(0.66)`;
    blurredContext.drawImage(pixelatedCanvas, 0, 0);

    context.save();
    traceRoundedRect(context, x, y, width, height, Math.max(28, Math.round(Math.min(width, height) * 0.32)));
    context.clip();
    context.drawImage(blurredCanvas, x, y);
    context.fillStyle = "rgba(15, 23, 42, 0.88)";
    context.fillRect(x, y, width, height);
    const centerGradient = context.createRadialGradient(
      baseX + baseWidth / 2,
      baseY + baseHeight / 2,
      Math.max(12, baseWidth * 0.12),
      baseX + baseWidth / 2,
      baseY + baseHeight / 2,
      Math.max(width, height) * 0.58,
    );
    centerGradient.addColorStop(0, "rgba(2, 6, 23, 0.72)");
    centerGradient.addColorStop(0.55, "rgba(2, 6, 23, 0.42)");
    centerGradient.addColorStop(1, "rgba(2, 6, 23, 0)");
    context.fillStyle = centerGradient;
    context.fillRect(x, y, width, height);
    context.restore();
  }

  return createOutputFile(canvas, "masked");
}

export async function applyStickerToFaces(
  file: File,
  faceBoxes: FaceBox[],
  stickerType: StickerType,
) {
  const { canvas, context, scaleX, scaleY } = await renderBaseCanvas(file);
  const emojiMap: Record<Exclude<StickerType, "dot">, string> = {
    smile: "🙂",
    star: "⭐",
    sparkle: "✨",
  };

  for (const faceBox of faceBoxes) {
    const x = Math.max(0, Math.floor(faceBox.x * scaleX));
    const y = Math.max(0, Math.floor(faceBox.y * scaleY));
    const width = Math.max(24, Math.ceil(faceBox.width * scaleX));
    const height = Math.max(24, Math.ceil(faceBox.height * scaleY));
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radiusX = Math.max(width, height) * 0.56;
    const radiusY = Math.max(width, height) * 0.62;

    context.save();
    context.fillStyle = stickerType === "dot" ? "rgba(79, 70, 229, 0.96)" : "rgba(15, 23, 42, 0.88)";
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();

    if (stickerType !== "dot") {
      context.font = `${Math.max(34, Math.round(Math.max(radiusX, radiusY) * 1.28))}px system-ui`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#ffffff";
      context.fillText(emojiMap[stickerType], centerX, centerY + 1);
    }
    context.restore();
  }

  return createOutputFile(canvas, "stickered");
}

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

const MAX_OUTPUT_DIMENSION = 1600;
const DEFAULT_OUTPUT_TYPE = "image/jpeg";
const DEFAULT_OUTPUT_QUALITY = 0.9;

type BrowserFaceDetector = {
  detect(input: ImageBitmapSource): Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
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
  if (Math.max(width, height) <= MAX_OUTPUT_DIMENSION) {
    return { width, height };
  }

  const ratio = width / height;
  if (width >= height) {
    return {
      width: MAX_OUTPUT_DIMENSION,
      height: Math.round(MAX_OUTPUT_DIMENSION / ratio),
    };
  }

  return {
    width: Math.round(MAX_OUTPUT_DIMENSION * ratio),
    height: MAX_OUTPUT_DIMENSION,
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

async function createOutputFile(canvas: HTMLCanvasElement, suffix: "masked" | "stickered") {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, DEFAULT_OUTPUT_TYPE, DEFAULT_OUTPUT_QUALITY);
  });

  if (!blob) {
    throw new Error("편집한 이미지를 저장하지 못했습니다.");
  }

  return new File([blob], `profile-${suffix}-${Date.now()}.jpg`, {
    type: DEFAULT_OUTPUT_TYPE,
    lastModified: Date.now(),
  });
}

export async function detectFaceInImage(file: File): Promise<FaceBox[]> {
  const image = await loadImageElement(file);
  const faceDetectorCtor = typeof window !== "undefined" ? window.FaceDetector : undefined;

  if (faceDetectorCtor) {
    try {
      const detector = new faceDetectorCtor({
        fastMode: true,
        maxDetectedFaces: 5,
      });
      const detections = await detector.detect(image);
      if (detections.length > 0) {
        return detections.map((detection) => ({
          x: detection.boundingBox.x,
          y: detection.boundingBox.y,
          width: detection.boundingBox.width,
          height: detection.boundingBox.height,
        }));
      }
    } catch {
      // browser support can vary; fall back to lightweight mock signals
    }
  }

  return keywordFaceBoxes(file, image.naturalWidth || image.width, image.naturalHeight || image.height);
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

export async function applyBlurToFaces(file: File, faceBoxes: FaceBox[]) {
  const { canvas, context, scaleX, scaleY } = await renderBaseCanvas(file);

  for (const faceBox of faceBoxes) {
    const x = Math.max(0, Math.floor(faceBox.x * scaleX));
    const y = Math.max(0, Math.floor(faceBox.y * scaleY));
    const width = Math.max(24, Math.ceil(faceBox.width * scaleX));
    const height = Math.max(24, Math.ceil(faceBox.height * scaleY));

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = Math.max(1, Math.round(width / 10));
    sampleCanvas.height = Math.max(1, Math.round(height / 10));
    const sampleContext = sampleCanvas.getContext("2d");

    if (!sampleContext) {
      throw new Error("흐림 처리를 시작하지 못했습니다.");
    }

    sampleContext.drawImage(canvas, x, y, width, height, 0, 0, sampleCanvas.width, sampleCanvas.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(sampleCanvas, 0, 0, sampleCanvas.width, sampleCanvas.height, x, y, width, height);
    context.imageSmoothingEnabled = true;
    context.fillStyle = "rgba(15, 23, 42, 0.16)";
    context.fillRect(x, y, width, height);
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
    const radius = Math.max(width, height) * 0.42;

    context.save();
    context.fillStyle = stickerType === "dot" ? "rgba(79, 70, 229, 0.96)" : "rgba(15, 23, 42, 0.88)";
    context.beginPath();
    context.ellipse(centerX, centerY, radius, radius, 0, 0, Math.PI * 2);
    context.fill();

    if (stickerType !== "dot") {
      context.font = `${Math.max(28, Math.round(radius * 1.3))}px system-ui`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#ffffff";
      context.fillText(emojiMap[stickerType], centerX, centerY + 1);
    }
    context.restore();
  }

  return createOutputFile(canvas, "stickered");
}

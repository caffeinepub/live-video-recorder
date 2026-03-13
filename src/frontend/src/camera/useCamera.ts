import { useCallback, useRef, useState } from "react";

export interface CameraConfig {
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
  quality?: number;
  format?: "image/jpeg" | "image/png" | "image/webp";
}

export interface CameraError {
  type: "permission" | "not-supported" | "not-found" | "unknown" | "timeout";
  message: string;
}

export interface UseCameraReturn {
  isActive: boolean;
  isSupported: boolean | null;
  error: CameraError | null;
  isLoading: boolean;
  currentFacingMode: "user" | "environment";
  startCamera: () => Promise<boolean>;
  stopCamera: () => Promise<void>;
  capturePhoto: () => Promise<File | null>;
  switchCamera: (newFacingMode?: "user" | "environment") => Promise<boolean>;
  retry: () => Promise<boolean>;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function useCamera(config: CameraConfig = {}): UseCameraReturn {
  const {
    facingMode = "user",
    width = 1280,
    height = 720,
    quality = 0.92,
    format = "image/jpeg",
  } = config;

  const videoRef = useRef<HTMLVideoElement>(null!);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<
    "user" | "environment"
  >(facingMode);

  const isSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices;

  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError({
        type: "not-supported",
        message: "Camera is not supported in this browser.",
      });
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentFacingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      return true;
    } catch (err: unknown) {
      const domErr = err as { name?: string };
      if (
        domErr?.name === "NotAllowedError" ||
        domErr?.name === "PermissionDeniedError"
      ) {
        setError({
          type: "permission",
          message: "Camera access was denied. Please allow camera permission.",
        });
      } else if (domErr?.name === "NotFoundError") {
        setError({ type: "not-found", message: "No camera device found." });
      } else {
        setError({ type: "unknown", message: "Could not start camera." });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentFacingMode, width, height, isSupported]);

  const stopCamera = useCallback(async (): Promise<void> => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
  }, []);

  const capturePhoto = useCallback(async (): Promise<File | null> => {
    if (!videoRef.current || !canvasRef.current || !isActive) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(
            new File([blob], `photo.${format.split("/")[1]}`, { type: format }),
          );
        },
        format,
        quality,
      );
    });
  }, [isActive, format, quality]);

  const switchCamera = useCallback(
    async (newFacingMode?: "user" | "environment"): Promise<boolean> => {
      const next =
        newFacingMode ??
        (currentFacingMode === "user" ? "environment" : "user");
      await stopCamera();
      setCurrentFacingMode(next);
      return startCamera();
    },
    [currentFacingMode, stopCamera, startCamera],
  );

  const retry = useCallback(async (): Promise<boolean> => {
    setError(null);
    return startCamera();
  }, [startCamera]);

  return {
    isActive,
    isSupported,
    error,
    isLoading,
    currentFacingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    retry,
    videoRef,
    canvasRef,
  };
}

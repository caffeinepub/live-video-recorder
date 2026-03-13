import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetTwilioSettings,
  useSendEmergencyAlerts,
} from "@/hooks/useQueries";
import {
  AlertCircle,
  Circle,
  Loader2,
  RefreshCw,
  Send,
  Square,
  Trash2,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SMSResult } from "../backend";
import { AudioLevelMeter } from "./AudioLevelMeter";
import { SMSResultsDialog } from "./SMSResultsDialog";

type RecorderPhase = "idle" | "recording" | "preview";

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) {
      setSeconds(0);
      return;
    }
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return seconds;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

interface CameraError {
  message: string;
  type: "permission" | "hardware" | "other";
}

function useLiveCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setIsActive(true);
      setError(null);
    } catch (err: any) {
      const name = err?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError({ message: "Camera access denied", type: "permission" });
      } else {
        setError({ message: "Camera not available", type: "hardware" });
      }
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(async () => {
    stopCamera();
    await new Promise((r) => setTimeout(r, 300));
    await startCamera();
  }, [stopCamera, startCamera]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isLoading,
    isActive,
    error,
    startCamera,
    stopCamera,
    retry,
  };
}

interface VideoRecorderProps {
  onGoToSettings: () => void;
}

export function VideoRecorder({ onGoToSettings }: VideoRecorderProps) {
  const { videoRef, canvasRef, isActive, isLoading, error, stopCamera, retry } =
    useLiveCamera();

  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [combinedStream, setCombinedStream] = useState<MediaStream | null>(
    null,
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [title, setTitle] = useState("");
  const elapsedSeconds = useTimer(phase === "recording");
  const recordedDurationRef = useRef(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const [smsResults, setSmsResults] = useState<SMSResult[] | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsNoSettings, setSmsNoSettings] = useState(false);

  const { mutate: sendAlerts, isPending: isSending } = useSendEmergencyAlerts();
  const { data: twilioSettings } = useGetTwilioSettings();

  useEffect(() => {
    return () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
    };
  }, [previewURL]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    await retry();
    setIsRetrying(false);
  }, [retry]);

  const startRecording = useCallback(async () => {
    if (!videoRef.current?.srcObject) return;
    const videoStream = videoRef.current.srcObject as MediaStream;
    let combined: MediaStream;
    let audio: MediaStream | null = null;

    try {
      audio = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setAudioStream(audio);
      combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audio.getAudioTracks(),
      ]);
    } catch {
      // Fallback: record video-only if microphone is denied
      toast.warning("Microphone access denied — recording video only.");
      combined = new MediaStream([...videoStream.getVideoTracks()]);
    }

    setCombinedStream(combined);

    try {
      const mr = new MediaRecorder(combined, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setPreviewURL(URL.createObjectURL(blob));
        setPhase("preview");
      };
      mediaRecorderRef.current = mr;
      mr.start(1000);
      setPhase("recording");
    } catch {
      if (audio) {
        for (const t of audio.getTracks()) t.stop();
      }
      toast.error("Could not start recording. Please try again.");
    }
  }, [videoRef]);

  const stopRecording = useCallback(() => {
    recordedDurationRef.current = elapsedSeconds;
    mediaRecorderRef.current?.stop();
    if (audioStream) {
      for (const t of audioStream.getTracks()) t.stop();
    }
    setAudioStream(null);
    setCombinedStream(null);
  }, [elapsedSeconds, audioStream]);

  const discard = useCallback(() => {
    if (previewURL) URL.revokeObjectURL(previewURL);
    setPreviewURL(null);
    setPhase("idle");
    setTitle("");
    stopCamera();
    // restart camera after discard
  }, [previewURL, stopCamera]);

  const handleSendAlerts = useCallback(() => {
    if (!title.trim()) return;
    setShowAlertDialog(false);
    const alertTitle = title.trim();

    if (!twilioSettings?.hasAuthToken) {
      setSmsNoSettings(true);
      setSmsResults(null);
      setSmsDialogOpen(true);
      return;
    }

    sendAlerts(
      { title: alertTitle, url: previewURL ?? "" },
      {
        onSuccess: (results) => {
          setSmsResults(results);
          setSmsNoSettings(false);
          setSmsDialogOpen(true);
          discard();
        },
        onError: () => toast.error("Failed to send SMS alerts."),
      },
    );
  }, [title, twilioSettings, sendAlerts, previewURL, discard]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Camera / Preview area */}
        <div className="relative rounded-xl overflow-hidden bg-black border border-border aspect-video w-full shadow-lg">
          <AnimatePresence mode="wait">
            {phase !== "preview" ? (
              <motion.div
                key="live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                >
                  <track kind="captions" />
                </video>
                <canvas ref={canvasRef} className="hidden" />

                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground font-mono">
                        Initializing camera…
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <Video className="w-10 h-10 text-destructive" />
                      <p className="text-destructive font-semibold">
                        {error.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {error.type === "permission"
                          ? "Grant permission in the browser address bar, then tap Retry Camera Access. If it still fails, open this page in a new browser tab directly (not inside a preview frame)."
                          : "Check that your camera is connected and not in use by another app, then try again."}
                      </p>
                    </div>
                  </div>
                )}

                {phase === "recording" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5"
                  >
                    <span className="rec-dot w-2.5 h-2.5 rounded-full bg-red-500 shadow-rec" />
                    <span className="font-mono text-sm text-white font-semibold tracking-widest">
                      {formatTime(elapsedSeconds)}
                    </span>
                    <span className="text-xs text-red-400 font-mono uppercase tracking-wider">
                      REC
                    </span>
                  </motion.div>
                )}

                {phase === "recording" && (
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5">
                    <AudioLevelMeter
                      stream={combinedStream}
                      isRecording={phase === "recording"}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <video
                  ref={previewVideoRef}
                  src={previewURL ?? undefined}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                >
                  <track kind="captions" />
                </video>
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-mono text-primary uppercase tracking-wider">
                  Preview
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Camera error retry banner */}
        <AnimatePresence>
          {error && phase !== "preview" && (
            <motion.div
              data-ocid="camera.error_state"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">
                    Camera access blocked
                  </p>
                  {error.type === "permission" ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Grant permission in the browser address bar, then tap{" "}
                      <strong>Retry Camera Access</strong>. If it still fails,
                      open this page in a <strong>new browser tab</strong>{" "}
                      directly (not inside a preview frame).
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Make sure your camera is connected and not in use by
                      another app, then tap Retry.
                    </p>
                  )}
                </div>
              </div>
              <Button
                data-ocid="camera.retry_button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying || isLoading}
                className="self-start border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
              >
                {isRetrying || isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isRetrying || isLoading ? "Retrying…" : "Retry Camera Access"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          {phase === "idle" && (
            <Button
              data-ocid="recorder.start_button"
              onClick={startRecording}
              disabled={!isActive || isLoading || !!error}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-rec font-semibold gap-2"
            >
              <Circle className="w-4 h-4 fill-current" />
              Start Recording
            </Button>
          )}
          {phase === "recording" && (
            <Button
              data-ocid="recorder.stop_button"
              onClick={stopRecording}
              variant="secondary"
              className="flex-1 gap-2 font-semibold"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Recording
            </Button>
          )}
          {phase === "preview" && (
            <>
              <Button
                data-ocid="recorder.save_button"
                onClick={() => setShowAlertDialog(true)}
                disabled={isSending}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow gap-2 font-semibold"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Alert to Contacts
              </Button>
              <Button
                data-ocid="recorder.cancel_button"
                onClick={discard}
                variant="outline"
                disabled={isSending}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Discard
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alert title dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display">
              Send Emergency Alert
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Give this incident a name. Your emergency contacts will receive an
            SMS with this title.
          </p>
          <div className="space-y-2">
            <Label
              htmlFor="alert-title"
              className="text-xs text-muted-foreground uppercase tracking-wider"
            >
              Incident Title
            </Label>
            <Input
              id="alert-title"
              data-ocid="title.input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Emergency alert, Incident report…"
              className="bg-input border-border"
              onKeyDown={(e) =>
                e.key === "Enter" && title.trim() && handleSendAlerts()
              }
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAlertDialog(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendAlerts}
              disabled={!title.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              <Send className="w-4 h-4" />
              Send SMS Alerts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SMSResultsDialog
        open={smsDialogOpen}
        onClose={() => setSmsDialogOpen(false)}
        results={smsResults}
        noSettings={smsNoSettings}
        onGoToSettings={onGoToSettings}
      />
    </>
  );
}

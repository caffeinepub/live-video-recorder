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
  Mic,
  MicOff,
  Send,
  Square,
  Trash2,
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

interface AudioRecorderProps {
  onGoToSettings: () => void;
}

export function AudioRecorder({ onGoToSettings }: AudioRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [title, setTitle] = useState("");
  const elapsedSeconds = useTimer(phase === "recording");
  const recordedDurationRef = useRef(0);

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

  const startRecording = useCallback(async () => {
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (err: any) {
      const name = err?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError(
          "Microphone access denied. Please allow microphone access in your browser and try again.",
        );
      } else {
        setMicError(
          "Microphone not available. Check that it is connected and not in use by another app.",
        );
      }
      return;
    }

    setAudioStream(stream);

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    try {
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setPreviewURL(URL.createObjectURL(blob));
        setPhase("preview");
      };
      mediaRecorderRef.current = mr;
      mr.start(1000);
      setPhase("recording");
    } catch {
      for (const t of stream.getTracks()) t.stop();
      setAudioStream(null);
      toast.error("Could not start recording. Please try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    recordedDurationRef.current = elapsedSeconds;
    mediaRecorderRef.current?.stop();
    if (audioStream) {
      for (const t of audioStream.getTracks()) t.stop();
    }
    setAudioStream(null);
  }, [elapsedSeconds, audioStream]);

  const discard = useCallback(() => {
    if (previewURL) URL.revokeObjectURL(previewURL);
    setPreviewURL(null);
    setPhase("idle");
    setTitle("");
  }, [previewURL]);

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
        {/* Audio visualizer area */}
        <div
          className="relative rounded-xl overflow-hidden bg-black border border-border w-full shadow-lg flex items-center justify-center"
          style={{ minHeight: 220 }}
        >
          <AnimatePresence mode="wait">
            {phase !== "preview" ? (
              <motion.div
                key="live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center w-full h-full gap-5 py-10"
              >
                {phase === "idle" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Mic className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      Ready to record audio
                    </p>
                  </div>
                )}

                {phase === "recording" && (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-mono text-sm text-white font-semibold tracking-widest">
                        {formatTime(elapsedSeconds)}
                      </span>
                      <span className="text-xs text-red-400 font-mono uppercase tracking-wider">
                        REC
                      </span>
                    </motion.div>
                    <AudioLevelMeter
                      stream={audioStream}
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
                className="flex flex-col items-center justify-center w-full h-full gap-4 py-10 px-6"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Mic className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Recording complete ({formatTime(recordedDurationRef.current)})
                </p>

                {/* biome-ignore lint/a11y/useMediaCaption: user recording preview */}
                <audio
                  src={previewURL ?? undefined}
                  controls
                  className="w-full max-w-sm"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-mono text-primary uppercase tracking-wider">
                  Preview
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mic error banner */}
        <AnimatePresence>
          {micError && phase !== "preview" && (
            <motion.div
              data-ocid="mic.error_state"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Microphone access blocked
                </p>
                <p className="text-xs text-muted-foreground mt-1">{micError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          {phase === "idle" && (
            <Button
              data-ocid="recorder.start_button"
              onClick={startRecording}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold gap-2"
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
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
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

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import type { SMSResult } from "../backend";

interface SMSResultsDialogProps {
  open: boolean;
  onClose: () => void;
  results: SMSResult[] | null;
  noSettings?: boolean;
  onGoToSettings?: () => void;
}

export function SMSResultsDialog({
  open,
  onClose,
  results,
  noSettings,
  onGoToSettings,
}: SMSResultsDialogProps) {
  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="sms.dialog"
        className="max-w-sm border-border bg-card"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="w-4 h-4" />
            </div>
            <DialogTitle className="font-display">SMS Alerts</DialogTitle>
          </div>
        </DialogHeader>

        {noSettings ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <p className="font-semibold text-foreground">
              Twilio not configured
            </p>
            <p className="text-sm text-muted-foreground">
              Set up your Twilio credentials in Settings to send SMS alerts.
            </p>
            <Button
              onClick={() => {
                onClose();
                onGoToSettings?.();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm w-full"
            >
              Go to Settings
            </Button>
          </div>
        ) : (
          <>
            {results && results.length > 0 && (
              <div className="flex gap-3 text-sm mb-3">
                {successCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {successCount} sent
                  </span>
                )}
                {failCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive font-mono">
                    <XCircle className="w-3.5 h-3.5" />
                    {failCount} failed
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              {results?.map((r, i) => (
                <motion.div
                  key={r.contactId}
                  data-ocid={`sms.item.${i + 1}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border"
                >
                  {r.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <span className="text-sm text-foreground flex-1 truncate">
                    {r.contactName}
                  </span>
                  <span
                    className={`text-xs font-mono ${r.success ? "text-emerald-400" : "text-destructive"}`}
                  >
                    {r.success ? "Sent" : "Failed"}
                  </span>
                </motion.div>
              ))}

              {results?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No emergency contacts configured.
                </p>
              )}
            </div>

            <Button
              data-ocid="sms.close_button"
              onClick={onClose}
              variant="outline"
              className="w-full mt-2 border-border"
            >
              Close
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Camera, Mic } from "lucide-react";

interface ConsentDialogProps {
  open: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

export function ConsentDialog({ open, onAllow, onCancel }: ConsentDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        data-ocid="alert.dialog"
        className="max-w-md border-border bg-card"
      >
        <AlertDialogHeader>
          <div className="flex gap-3 mb-2">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Camera className="w-5 h-5" />
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Mic className="w-5 h-5" />
            </div>
          </div>
          <AlertDialogTitle className="text-xl font-display font-semibold text-foreground">
            Camera &amp; Microphone Access
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
            CaptureStudio needs access to your camera and microphone to record
            video. Your recordings are stored privately and never shared without
            your consent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 flex-col sm:flex-row">
          <AlertDialogCancel
            data-ocid="alert.cancel_button"
            onClick={onCancel}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            data-ocid="alert.confirm_button"
            onClick={onAllow}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm"
          >
            Allow &amp; Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

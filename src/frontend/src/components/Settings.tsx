import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetTwilioSettings,
  useSaveTwilioSettings,
} from "@/hooks/useQueries";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Phone,
  Save,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function Settings() {
  const { data: settings, isLoading } = useGetTwilioSettings();
  const {
    mutate: saveSettings,
    isPending: isSaving,
    isSuccess,
    isError,
  } = useSaveTwilioSettings();

  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromPhone, setFromPhone] = useState("");

  // Pre-fill on load
  useEffect(() => {
    if (!settings) return;
    setAccountSid(settings.accountSid ?? "");
    setFromPhone(settings.fromPhone ?? "");
  }, [settings]);

  const handleSave = () => {
    if (!accountSid.trim() || !authToken.trim() || !fromPhone.trim()) return;
    saveSettings(
      {
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
        fromPhone: fromPhone.trim(),
      },
      {
        onSuccess: () => toast.success("Twilio settings saved"),
        onError: () => toast.error("Failed to save settings"),
      },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Configure Twilio to enable SMS alerts to your emergency contacts.
        </p>
      </div>

      <div className="p-5 rounded-xl bg-card border border-border space-y-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <KeyRound className="w-4 h-4" />
          </div>
          <h2 className="font-display font-semibold text-base text-foreground">
            Twilio Credentials
          </h2>
        </div>

        <a
          href="https://console.twilio.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
        >
          Get credentials from the Twilio Console ↗
        </a>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="account-sid"
              className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <CreditCard className="w-3 h-3" /> Account SID
            </Label>
            {isLoading ? (
              <div className="h-9 rounded-md bg-muted animate-pulse" />
            ) : (
              <Input
                id="account-sid"
                data-ocid="settings.account_sid_input"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="bg-input border-border font-mono text-sm"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="auth-token"
              className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <KeyRound className="w-3 h-3" /> Auth Token
            </Label>
            {isLoading ? (
              <div className="h-9 rounded-md bg-muted animate-pulse" />
            ) : (
              <>
                <Input
                  id="auth-token"
                  data-ocid="settings.auth_token_input"
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder={
                    settings?.hasAuthToken ? "——————————" : "Enter auth token"
                  }
                  className="bg-input border-border font-mono text-sm"
                />
                {settings?.hasAuthToken && !authToken && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Auth token is saved
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="from-phone"
              className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <Phone className="w-3 h-3" /> From Phone Number
            </Label>
            {isLoading ? (
              <div className="h-9 rounded-md bg-muted animate-pulse" />
            ) : (
              <Input
                id="from-phone"
                data-ocid="settings.from_phone_input"
                value={fromPhone}
                onChange={(e) => setFromPhone(e.target.value)}
                placeholder="e.g. +15550001234"
                type="tel"
                className="bg-input border-border font-mono text-sm"
              />
            )}
          </div>
        </div>

        <Button
          data-ocid="settings.save_button"
          onClick={handleSave}
          disabled={
            !accountSid.trim() ||
            !authToken.trim() ||
            !fromPhone.trim() ||
            isSaving
          }
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </Button>

        {isSuccess && (
          <motion.div
            data-ocid="settings.success_state"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" />
            Settings saved successfully.
          </motion.div>
        )}

        {isError && (
          <motion.div
            data-ocid="settings.error_state"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4" />
            Failed to save settings. Please try again.
          </motion.div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">How it works:</span>{" "}
          When you save a recording, CaptureStudio sends an SMS to each
          emergency contact with a link to the video using your Twilio account.
          Make sure your Twilio number has SMS capability.
        </p>
      </div>
    </div>
  );
}

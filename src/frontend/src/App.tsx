import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Mic, Settings as SettingsIcon, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AudioRecorder } from "./components/AudioRecorder";
import { EmergencyContacts } from "./components/EmergencyContacts";
import { Settings } from "./components/Settings";

const queryClient = new QueryClient();

type Tab = "recorder" | "contacts" | "settings";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "recorder", label: "Recorder", icon: Mic },
  { id: "contacts", label: "Emergency Contacts", icon: Users },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("recorder");

  return (
    <div className="noise-bg min-h-screen bg-background flex flex-col">
      {/* Header + nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-bold text-foreground tracking-tight">
                CaptureStudio
              </span>
            </div>
            <span className="text-xs font-mono text-muted-foreground hidden sm:block">
              Emergency Recorder
            </span>
          </div>

          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-ocid={`nav.${tab.id}_tab`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === "recorder" && (
            <motion.div
              key="recorder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="font-display font-bold text-2xl text-foreground leading-tight">
                  New Recording
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Record audio — then send an SMS alert with the clip to all
                  emergency contacts.
                </p>
              </div>
              <AudioRecorder onGoToSettings={() => setActiveTab("settings")} />
            </motion.div>
          )}

          {activeTab === "contacts" && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <EmergencyContacts />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <Settings />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border/30 mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-5 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

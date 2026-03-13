import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddEmergencyContact,
  useDeleteEmergencyContact,
  useListEmergencyContacts,
} from "@/hooks/useQueries";
import { Loader2, Phone, Trash2, UserPlus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

export function EmergencyContacts() {
  const { data: contacts, isLoading, isError } = useListEmergencyContacts();
  const { mutate: addContact, isPending: isAdding } = useAddEmergencyContact();
  const { mutate: deleteContact } = useDeleteEmergencyContact();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleAdd = () => {
    const trimName = name.trim();
    const trimPhone = phone.trim();
    if (!trimName || !trimPhone) return;
    addContact(
      { id: crypto.randomUUID(), name: trimName, phone: trimPhone },
      {
        onSuccess: () => {
          toast.success(`${trimName} added`);
          setName("");
          setPhone("");
        },
        onError: () => toast.error("Failed to add contact"),
      },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">
          Emergency Contacts
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          These contacts will receive an SMS with a link to your recording.
        </p>
      </div>

      {/* Add contact form */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        <h2 className="font-display font-semibold text-base text-foreground">
          Add Contact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="contact-name"
              className="text-xs text-muted-foreground uppercase tracking-wider"
            >
              Name
            </Label>
            <Input
              id="contact-name"
              data-ocid="contacts.name_input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Smith"
              className="bg-input border-border"
              onKeyDown={(e) =>
                e.key === "Enter" && name.trim() && phone.trim() && handleAdd()
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="contact-phone"
              className="text-xs text-muted-foreground uppercase tracking-wider"
            >
              Phone Number
            </Label>
            <Input
              id="contact-phone"
              data-ocid="contacts.phone_input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555 000 0000"
              type="tel"
              className="bg-input border-border"
              onKeyDown={(e) =>
                e.key === "Enter" && name.trim() && phone.trim() && handleAdd()
              }
            />
          </div>
        </div>
        <Button
          data-ocid="contacts.add_button"
          onClick={handleAdd}
          disabled={!name.trim() || !phone.trim() || isAdding}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm gap-2"
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Add Contact
        </Button>
      </div>

      {/* Contacts list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-base text-foreground">
            Contacts
          </h2>
          {contacts && contacts.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3.5 rounded-xl bg-card border border-border"
              >
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            Failed to load contacts. Please refresh.
          </div>
        )}

        {!isLoading && !isError && contacts?.length === 0 && (
          <motion.div
            data-ocid="contacts.empty_state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-12 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-display font-semibold text-foreground">
              No contacts yet
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add emergency contacts above. They&apos;ll be notified via SMS
              when you save a recording.
            </p>
          </motion.div>
        )}

        {!isLoading && !isError && contacts && contacts.length > 0 && (
          <div data-ocid="contacts.list" className="space-y-2">
            <AnimatePresence>
              {contacts.map((contact, i) => {
                const ocid = i + 1;
                return (
                  <motion.div
                    key={contact.id}
                    data-ocid={`contacts.item.${ocid}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-display font-bold text-sm">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {contact.name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Phone className="w-3 h-3" />
                        {contact.phoneNumber}
                      </p>
                    </div>
                    <Button
                      data-ocid={`contacts.delete_button.${ocid}`}
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        deleteContact(contact.id, {
                          onSuccess: () =>
                            toast.success(`${contact.name} removed`),
                          onError: () =>
                            toast.error("Failed to remove contact"),
                        })
                      }
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

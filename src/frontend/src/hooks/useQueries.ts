import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

// ─── Emergency Contacts ──────────────────────────────────────────────────────

export function useListEmergencyContacts() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["emergencyContacts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listEmergencyContacts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddEmergencyContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      phone,
    }: { id: string; name: string; phone: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addEmergencyContact(id, name, phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencyContacts"] });
    },
  });
}

export function useDeleteEmergencyContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteEmergencyContact(contactId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencyContacts"] });
    },
  });
}

// ─── Twilio Settings ─────────────────────────────────────────────────────────

export function useGetTwilioSettings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["twilioSettings"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getTwilioSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveTwilioSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountSid,
      authToken,
      fromPhone,
    }: {
      accountSid: string;
      authToken: string;
      fromPhone: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveTwilioSettings(accountSid, authToken, fromPhone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twilioSettings"] });
    },
  });
}

// ─── SMS Alerts ──────────────────────────────────────────────────────────────

export function useSendEmergencyAlerts() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ title, url }: { title: string; url: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendEmergencyAlerts(title, url);
    },
  });
}

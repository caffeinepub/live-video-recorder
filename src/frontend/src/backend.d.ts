import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface EmergencyContact {
    id: string;
    name: string;
    phoneNumber: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface SMSResult {
    contactName: string;
    success: boolean;
    contactId: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface backendInterface {
    addEmergencyContact(id: string, name: string, phoneNumber: string): Promise<void>;
    deleteEmergencyContact(contactId: string): Promise<boolean>;
    getTwilioSettings(): Promise<{
        accountSid: string;
        fromPhone: string;
        hasAuthToken: boolean;
    } | null>;
    listEmergencyContacts(): Promise<Array<EmergencyContact>>;
    saveTwilioSettings(accountSid: string, authToken: string, fromPhone: string): Promise<void>;
    sendEmergencyAlerts(recordingTitle: string, recordingUrl: string): Promise<Array<SMSResult>>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}

import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import OutCall "http-outcalls/outcall";
import List "mo:core/List";

actor {
  type EmergencyContact = {
    id : Text;
    name : Text;
    phoneNumber : Text;
  };

  type TwilioSettings = {
    accountSid : Text;
    authToken : Text;
    fromPhone : Text;
  };

  type SMSResult = {
    contactId : Text;
    contactName : Text;
    success : Bool;
  };

  // Storage
  let emergencyContacts = Map.empty<Principal, List.List<EmergencyContact>>();
  let twilioSettings = Map.empty<Principal, TwilioSettings>();

  // Add Emergency Contact
  public shared ({ caller }) func addEmergencyContact(id : Text, name : Text, phoneNumber : Text) : async () {
    let contact : EmergencyContact = { id; name; phoneNumber };
    let existingContacts = switch (emergencyContacts.get(caller)) {
      case (null) { List.empty<EmergencyContact>() };
      case (?contacts) { contacts };
    };
    existingContacts.add(contact);
    emergencyContacts.add(caller, existingContacts);
  };

  // List Emergency Contacts
  public shared ({ caller }) func listEmergencyContacts() : async [EmergencyContact] {
    switch (emergencyContacts.get(caller)) {
      case (null) { [] };
      case (?contacts) { contacts.toArray() };
    };
  };

  // Delete Emergency Contact
  public shared ({ caller }) func deleteEmergencyContact(contactId : Text) : async Bool {
    switch (emergencyContacts.get(caller)) {
      case (null) { false };
      case (?contacts) {
        let filteredContacts = List.empty<EmergencyContact>();
        for (contact in contacts.values()) {
          if (contact.id != contactId) {
            filteredContacts.add(contact);
          };
        };
        emergencyContacts.add(caller, filteredContacts);
        true;
      };
    };
  };

  // Save Twilio Settings
  public shared ({ caller }) func saveTwilioSettings(accountSid : Text, authToken : Text, fromPhone : Text) : async () {
    let settings : TwilioSettings = {
      accountSid;
      authToken;
      fromPhone;
    };
    twilioSettings.add(caller, settings);
  };

  // Get Twilio Settings (without authToken)
  public shared ({ caller }) func getTwilioSettings() : async ?{
    accountSid : Text;
    fromPhone : Text;
    hasAuthToken : Bool;
  } {
    switch (twilioSettings.get(caller)) {
      case (null) { null };
      case (?settings) {
        ?{
          accountSid = settings.accountSid;
          fromPhone = settings.fromPhone;
          hasAuthToken = true;
        };
      };
    };
  };

  // Outcall transform function
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Send Emergency Alerts via Twilio
  public shared ({ caller }) func sendEmergencyAlerts(recordingTitle : Text, recordingUrl : Text) : async [SMSResult] {
    let settings = switch (twilioSettings.get(caller)) {
      case (null) { Runtime.trap("User has not configured Twilio settings.") };
      case (?s) { s };
    };

    let contacts = switch (emergencyContacts.get(caller)) {
      case (null) { List.empty<EmergencyContact>() };
      case (?c) { c };
    };

    if (contacts.isEmpty()) {
      Runtime.trap("No emergency contacts found.");
    };

    let results = List.empty<SMSResult>();
    for (contact in contacts.values()) {
      let body = "ALERT: A new recording '" # recordingTitle # "' has been saved. View it here: " # recordingUrl;

      let url = "https://api.twilio.com/2010-04-01/Accounts/" # settings.accountSid # "/Messages.json";
      let postData = "Body=" # encodeURIComponent(body) # "&From=" # encodeURIComponent(settings.fromPhone) # "&To=" # encodeURIComponent(contact.phoneNumber);

      // Prepare basic auth header
      let authString = settings.accountSid # ":";
      let basicAuth = "Basic " # authString;

      let headers : [OutCall.Header] = [
        { name = "Authorization"; value = basicAuth },
        { name = "Content-Type"; value = "application/x-www-form-urlencoded" },
      ];

      let response = await OutCall.httpPostRequest(url, headers, postData, transform);

      // Check for "SID" in response as success indicator (simplified)
      results.add({
        contactId = contact.id;
        contactName = contact.name;
        success = response.contains(#text("SID"));
      });
    };

    results.toArray();
  };

  func encodeURIComponent(text : Text) : Text {
    // No-op, actual implementation should be on frontend
    text;
  };
};

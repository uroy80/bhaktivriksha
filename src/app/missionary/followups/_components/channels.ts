import type { FollowUpChannel } from "@prisma/client";

/** All follow-up channels in display order. */
export const CHANNEL_VALUES = [
  "PHONE_CALL",
  "WHATSAPP",
  "EMAIL",
  "SMS",
  "HOME_VISIT",
  "IN_PERSON",
  "OTHER",
] as const satisfies readonly FollowUpChannel[];

/** Friendly labels with icons — used in the form select and table badges. */
export const CHANNEL_LABELS: Record<FollowUpChannel, string> = {
  PHONE_CALL: "📞 Phone call",
  WHATSAPP: "💬 WhatsApp",
  EMAIL: "✉️ Email",
  SMS: "📱 SMS",
  HOME_VISIT: "🏠 Home visit",
  IN_PERSON: "🤝 In person",
  OTHER: "Other",
};

/** Plain-text labels — used in CSV export. */
export const CHANNEL_PLAIN_LABELS: Record<FollowUpChannel, string> = {
  PHONE_CALL: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  SMS: "SMS",
  HOME_VISIT: "Home visit",
  IN_PERSON: "In person",
  OTHER: "Other",
};

/** Badge tone per channel (tones from the UI kit). */
export const CHANNEL_TONES: Record<FollowUpChannel, "saffron" | "green" | "red" | "gray" | "blue"> = {
  PHONE_CALL: "blue",
  WHATSAPP: "green",
  EMAIL: "saffron",
  SMS: "gray",
  HOME_VISIT: "red",
  IN_PERSON: "saffron",
  OTHER: "gray",
};

export const CHANNEL_OPTIONS = CHANNEL_VALUES.map((value) => ({
  value,
  label: CHANNEL_LABELS[value],
}));

export function isFollowUpChannel(v: string | undefined): v is FollowUpChannel {
  return !!v && (CHANNEL_VALUES as readonly string[]).includes(v);
}

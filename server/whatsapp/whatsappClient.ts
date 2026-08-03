// Server-only. Never import this from a client component — the access
// token must never reach the browser bundle.

const REQUIRED_ENV_VARS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_OTP_TEMPLATE_NAME",
  "WHATSAPP_API_VERSION",
] as const;

export class WhatsAppConfigError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super(`WhatsApp is not configured — missing environment variable(s): ${missing.join(", ")}`);
    this.missing = missing;
  }
}

export class WhatsAppDeliveryError extends Error {}

function getConfig() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new WhatsAppConfigError(missing);
  }
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
    templateName: process.env.WHATSAPP_OTP_TEMPLATE_NAME!,
    apiVersion: process.env.WHATSAPP_API_VERSION!,
  };
}

/**
 * Sends a 6-digit OTP via a pre-approved WhatsApp message template.
 * Never logs the OTP value itself — only success/failure of the API call.
 */
export async function sendWhatsAppOtp(phoneE164: string, otp: string): Promise<void> {
  const config = getConfig(); // throws WhatsAppConfigError if unset — never invent credentials

  const to = phoneE164.replace(/^\+/, "");
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: config.templateName,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: otp }],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: otp }],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    // Deliberately don't include response body in what gets logged upstream —
    // it could echo back template params. Surface only the status.
    throw new WhatsAppDeliveryError(`WhatsApp message send failed with status ${res.status}`);
  }
}

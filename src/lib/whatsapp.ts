/**
 * Official WhatsApp Business Platform (Meta Cloud API) client. Server-side only.
 *
 * - Credentials come from environment variables and are never sent to the browser or logged.
 * - Business-initiated messages (confirmation, daily summary) must use APPROVED TEMPLATES (Meta policy).
 *   When a template name is not configured we fall back to a plain text message, which Meta only delivers
 *   inside the 24-hour customer-service window – so configure templates for production.
 * - Never throws: always returns a SendResult, so a WhatsApp problem can never break a booking.
 */

export interface WaConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  templateLang: string;
}

export interface SendInput {
  /** digits-only international number, e.g. 923323259577 */
  to: string;
  /** approved template; `params` fill {{1}}, {{2}}… in order (single-line values only) */
  template?: { name: string; params: string[]; lang?: string };
  /** plain-text fallback (also used when `template` is not given) */
  text?: string;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  /** short, token-free description for logs / admin dashboard */
  error?: string;
}

export function getWaConfig(env: Record<string, string | undefined> = process.env): WaConfig | null {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;
  return {
    accessToken,
    phoneNumberId,
    apiVersion: env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
    templateLang: env.WHATSAPP_TEMPLATE_LANG?.trim() || 'en',
  };
}

export const isWhatsAppConfigured = () => getWaConfig() !== null;

export function buildPayload(input: SendInput, cfg: Pick<WaConfig, 'templateLang'>) {
  if (input.template) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: 'template',
      template: {
        name: input.template.name,
        language: { code: input.template.lang || cfg.templateLang },
        ...(input.template.params.length
          ? { components: [{ type: 'body', parameters: input.template.params.map((text) => ({ type: 'text', text })) }] }
          : {}),
      },
    };
  }
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: input.to,
    type: 'text',
    text: { preview_url: false, body: input.text ?? '' },
  };
}

interface Deps {
  fetchImpl?: typeof fetch;
  config?: WaConfig | null;
  timeoutMs?: number;
}

export async function sendWhatsApp(input: SendInput, deps: Deps = {}): Promise<SendResult> {
  const cfg = deps.config === undefined ? getWaConfig() : deps.config;
  if (!cfg) return { ok: false, error: 'WhatsApp is not configured (missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)' };
  if (!/^\d{11,15}$/.test(input.to)) return { ok: false, error: 'Invalid recipient phone number' };
  if (!input.template && !input.text) return { ok: false, error: 'Empty message' };

  const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
  try {
    const res = await (deps.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(input, cfg)),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 8000),
    });
    const data = (await res.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string; code?: number; error_data?: { details?: string } };
    } | null;
    const id = data?.messages?.[0]?.id;
    if (res.ok && id) return { ok: true, messageId: id };
    const e = data?.error;
    const detail = e ? `${e.code ?? res.status}: ${e.error_data?.details || e.message || 'error'}` : `HTTP ${res.status}`;
    return { ok: false, error: detail.slice(0, 300) };
  } catch (err) {
    const name = (err as Error)?.name;
    return { ok: false, error: name === 'TimeoutError' || name === 'AbortError' ? 'WhatsApp request timed out' : 'WhatsApp request failed (network)' };
  }
}

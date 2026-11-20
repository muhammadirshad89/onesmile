import assert from 'node:assert/strict';
import { test, done } from './harness';
import { sendWhatsApp, buildPayload, getWaConfig, type WaConfig } from '../src/lib/whatsapp';
import { waNumber, normalizePhone } from '../src/lib/contact';

const cfg: WaConfig = { accessToken: 'SECRET_TOKEN_123', phoneNumberId: '555', apiVersion: 'v21.0', templateLang: 'en' };
const resp = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

(async () => {
  console.log('whatsapp');
  await test('Pakistani numbers normalise to international format', () => {
    assert.equal(waNumber('0332-3259577'), '923323259577');
    assert.equal(waNumber('03316256127'), '923316256127');
    assert.equal(waNumber('3323259577'), '923323259577');
    assert.equal(waNumber('+92 332 3259577'), '923323259577');
    assert.equal(waNumber('0092-332-3259577'), '923323259577');
    assert.equal(normalizePhone('0332 325 9577'), '03323259577');
  });
  await test('config requires both token and phone-number id', () => {
    assert.equal(getWaConfig({}), null);
    assert.equal(getWaConfig({ WHATSAPP_ACCESS_TOKEN: 'x' }), null);
    assert.deepEqual(getWaConfig({ WHATSAPP_ACCESS_TOKEN: 'x', WHATSAPP_PHONE_NUMBER_ID: '1' }), { accessToken: 'x', phoneNumberId: '1', apiVersion: 'v21.0', templateLang: 'en' });
  });
  await test('template payload follows the Cloud API format', () => {
    const p = buildPayload({ to: '923001234567', template: { name: 'appointment_confirmed', params: ['A', 'B'] } }, cfg) as any;
    assert.equal(p.messaging_product, 'whatsapp');
    assert.equal(p.type, 'template');
    assert.equal(p.template.name, 'appointment_confirmed');
    assert.equal(p.template.language.code, 'en');
    assert.deepEqual(p.template.components, [{ type: 'body', parameters: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }] }]);
  });
  await test('text payload when no template is configured', () => {
    const p = buildPayload({ to: '923001234567', text: 'hi' }, cfg) as any;
    assert.equal(p.type, 'text');
    assert.equal(p.text.body, 'hi');
  });
  await test('success: returns message id, POSTs to graph.facebook.com with bearer auth', async () => {
    let seen: any;
    const r = await sendWhatsApp({ to: '923001234567', text: 'hi' }, { config: cfg, fetchImpl: (async (u: any, init: any) => { seen = { u, init }; return resp(200, { messages: [{ id: 'wamid.ABC' }] }); }) as any });
    assert.deepEqual(r, { ok: true, messageId: 'wamid.ABC' });
    assert.equal(seen.u, 'https://graph.facebook.com/v21.0/555/messages');
    assert.equal(seen.init.headers.Authorization, 'Bearer SECRET_TOKEN_123');
  });
  await test('API error: ok=false with readable reason, token never leaks, never throws', async () => {
    const r = await sendWhatsApp({ to: '923001234567', text: 'hi' }, { config: cfg, fetchImpl: (async () => resp(400, { error: { code: 131047, message: 'Re-engagement message' } })) as any });
    assert.equal(r.ok, false);
    assert.match(r.error!, /131047/);
    assert.ok(!r.error!.includes('SECRET_TOKEN_123'));
  });
  await test('network failure and timeout are reported, not thrown', async () => {
    const a = await sendWhatsApp({ to: '923001234567', text: 'hi' }, { config: cfg, fetchImpl: (async () => { throw new TypeError('fetch failed'); }) as any });
    assert.equal(a.ok, false);
    const b = await sendWhatsApp({ to: '923001234567', text: 'hi' }, { config: cfg, fetchImpl: (async () => { const e = new Error('t'); e.name = 'TimeoutError'; throw e; }) as any });
    assert.match(b.error!, /timed out/);
  });
  await test('HTML/garbage error response is handled', async () => {
    const r = await sendWhatsApp({ to: '923001234567', text: 'hi' }, { config: cfg, fetchImpl: (async () => new Response('<html>502</html>', { status: 502 })) as any });
    assert.equal(r.ok, false);
    assert.match(r.error!, /502/);
  });
  await test('not configured => ok=false and no network call', async () => {
    let called = false;
    const r = await sendWhatsApp({ to: '923001234567', text: 'hi' }, { config: null, fetchImpl: (async () => { called = true; return resp(200, {}); }) as any });
    assert.equal(r.ok, false);
    assert.equal(called, false);
    assert.match(r.error!, /not configured/);
  });
  await test('invalid recipient is rejected before any request', async () => {
    let called = false;
    const r = await sendWhatsApp({ to: '0332', text: 'hi' }, { config: cfg, fetchImpl: (async () => { called = true; return resp(200, {}); }) as any });
    assert.equal(r.ok, false);
    assert.equal(called, false);
  });
  done();
})();

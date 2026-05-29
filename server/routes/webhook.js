import { Router } from 'express';
import crypto from 'crypto';
import supabase from '../lib/supabase.js';
import { waManager, logger } from '../lib/instances.js';

const router = Router();

// ----------------------------------------------------------------
// Verify GHL webhook signature (HMAC-SHA256)
// ----------------------------------------------------------------
function verifySignature(req) {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification in dev if not set

  const sig = req.headers['x-ghl-signature'] || req.headers['x-webhook-signature'] || '';
  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// ----------------------------------------------------------------
// POST /api/ghl/webhook/outbound
//
// GHL calls this when a sub-account sends an SMS to a contact.
// We intercept it and deliver via WhatsApp instead.
//
// GHL Custom Provider outbound payload (verify against your app config):
// {
//   type: "OutboundMessage",
//   locationId: "...",
//   message: {
//     type: "SMS",
//     from: "+11234567890",   <- the GHL number
//     to:   "+10987654321",   <- the contact number
//     body: "Hello!",
//     conversationId: "...",
//     messageId: "..."
//   }
// }
// ----------------------------------------------------------------
router.post('/webhook/outbound', async (req, res) => {
  // Always ACK quickly so GHL doesn't time out
  res.json({ status: 'accepted' });

  if (!verifySignature(req)) {
    logger.warn('GHL webhook signature mismatch — ignoring');
    return;
  }

  const payload = req.body;
  logger.debug({ payload }, 'GHL outbound webhook received');

  // Normalise across possible payload shapes
  const locationId  = payload.locationId || payload.location_id;
  const fromPhone   = payload.message?.from || payload.from;
  const toPhone     = payload.message?.to   || payload.to;
  const body        = payload.message?.body || payload.message?.text || payload.body || payload.text || '';
  const ghlMsgId    = payload.message?.messageId || payload.messageId || null;

  if (!locationId || !fromPhone || !toPhone || !body) {
    logger.warn({ payload }, 'GHL webhook missing required fields');
    return;
  }

  try {
    // Find which WhatsApp session to use for this GHL location + from number
    const { data: mapping } = await supabase
      .from('wa_number_mappings')
      .select('session_id, ghl_locations!inner(id)')
      .eq('ghl_locations.ghl_location_id', locationId)
      .eq('ghl_number', fromPhone)
      .single();

    if (!mapping?.session_id) {
      logger.warn({ locationId, fromPhone }, 'No WA session mapped for this GHL number');
      return;
    }

    const waMessageId = await waManager.sendMessage(mapping.session_id, toPhone, body);

    await supabase.from('message_logs').insert({
      location_id:    mapping.ghl_locations.id,
      session_id:     mapping.session_id,
      direction:      'outbound',
      from_number:    fromPhone,
      to_number:      toPhone,
      body,
      status:         'sent',
      ghl_message_id: ghlMsgId,
      wa_message_id:  waMessageId,
    });

    logger.info({ sessionId: mapping.session_id, to: toPhone }, 'WA message sent');
  } catch (err) {
    logger.error({ err: err.message, locationId, fromPhone, toPhone }, 'Failed to send WA message');

    await supabase.from('message_logs').insert({
      direction:  'outbound',
      from_number: fromPhone,
      to_number:  toPhone,
      body,
      status:     'failed',
      ghl_message_id: ghlMsgId,
      error:      err.message,
    });
  }
});

// ----------------------------------------------------------------
// POST /api/ghl/webhook/install
// Called when a GHL sub-account installs/uninstalls the LSWA app
// ----------------------------------------------------------------
router.post('/webhook/install', async (req, res) => {
  logger.info({ body: req.body }, 'GHL install webhook');
  res.json({ ok: true });
});

export default router;

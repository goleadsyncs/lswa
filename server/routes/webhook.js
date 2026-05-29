import { Router } from 'express';
import crypto from 'crypto';
import supabase from '../lib/supabase.js';
import { waManager, logger } from '../lib/instances.js';

const router = Router();

function verifySignature(req) {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = req.headers['x-ghl-signature'] || req.headers['x-webhook-signature'] || '';
  if (!sig) {
    logger.warn({ headers: Object.keys(req.headers) }, 'No signature header found - GHL headers received');
    return true; // allow through so we can see what GHL sends
  }
  const body = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
}

// ----------------------------------------------------------------
// POST /api/events
// Single endpoint for all GHL webhook events.
// Routes by payload type: OutboundMessage, InboundMessage, etc.
// ----------------------------------------------------------------
router.post('/', async (req, res) => {
  res.json({ status: 'accepted' });

  if (!verifySignature(req)) {
    logger.warn('Webhook signature mismatch - ignoring');
    return;
  }

  const payload = req.body;
  const type = payload.type || payload.event;

  logger.debug({ type, payload }, 'Webhook received');

  switch (type) {
    case 'OutboundMessage':
      await handleOutbound(payload);
      break;
    case 'InboundMessage':
      logger.info({ payload }, 'Inbound message event received');
      break;
    case 'ContactCreate':
    case 'ContactUpdate':
      logger.info({ type, contactId: payload.id }, 'Contact event');
      break;
    default:
      logger.debug({ type }, 'Unhandled webhook event type');
  }
});

async function handleOutbound(payload) {
  const locationId = payload.locationId || payload.location_id;
  const fromPhone  = payload.message?.from || payload.from;
  const toPhone    = payload.message?.to   || payload.to;
  const body       = payload.message?.body || payload.message?.text || payload.body || payload.text || '';
  const ghlMsgId   = payload.message?.messageId || payload.messageId || null;

  if (!locationId || !fromPhone || !toPhone || !body) {
    logger.warn({ payload }, 'OutboundMessage missing required fields');
    return;
  }

  try {
    const { data: mapping } = await supabase
      .from('wa_number_mappings')
      .select('session_id, ghl_locations!inner(id)')
      .eq('ghl_locations.ghl_location_id', locationId)
      .eq('ghl_number', fromPhone)
      .single();

    if (!mapping?.session_id) {
      logger.warn({ locationId, fromPhone }, 'No WhatsApp session mapped for this number');
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

    logger.info({ sessionId: mapping.session_id, to: toPhone }, 'WhatsApp message sent');
  } catch (err) {
    logger.error({ err: err.message, locationId, fromPhone, toPhone }, 'Failed to send WhatsApp message');
    await supabase.from('message_logs').insert({
      direction:      'outbound',
      from_number:    fromPhone,
      to_number:      toPhone,
      body,
      status:         'failed',
      ghl_message_id: ghlMsgId,
      error:          err.message,
    });
  }
}

export default router;

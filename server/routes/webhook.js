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
  const contactId  = payload.contactId  || payload.contact_id;
  const body       = payload.body || payload.message?.body || payload.message?.text || payload.text || '';
  const ghlMsgId   = payload.messageId || payload.message?.messageId || null;

  if (!locationId || !body) {
    logger.warn({ payload }, 'OutboundMessage missing locationId or body');
    return;
  }

  try {
    // Get the location record + access token
    const { data: loc } = await supabase
      .from('ghl_locations')
      .select('id, access_token, refresh_token, token_expires_at, ghl_location_id')
      .eq('ghl_location_id', locationId)
      .single();

    if (!loc) {
      logger.warn({ locationId }, 'Location not found in DB');
      return;
    }

    // Get contact phone number from GHL
    let toPhone = payload.to || payload.message?.to;
    if (!toPhone && contactId) {
      try {
        const { ghlClient } = await import('../lib/instances.js');
        const companyToken = await ghlClient.ensureFreshToken(loc);
        // Exchange company token for location-specific token
        const locToken = await ghlClient.getLocationToken(companyToken, locationId);
        const contact  = await ghlClient.getContact(locToken || companyToken, contactId);
        toPhone = contact?.phone;
      } catch (err) {
        logger.error({ err: err.message, contactId }, 'Failed to fetch contact phone');
        return;
      }
    }

    if (!toPhone) {
      logger.warn({ payload }, 'Could not determine recipient phone number');
      return;
    }

    // Find the first connected WA session for this location
    const { data: session } = await supabase
      .from('wa_sessions')
      .select('id')
      .eq('location_id', loc.id)
      .eq('status', 'connected')
      .limit(1)
      .single();

    if (!session) {
      logger.warn({ locationId }, 'No connected WhatsApp session for this location');
      return;
    }

    const waMessageId = await waManager.sendMessage(session.id, toPhone, body);

    await supabase.from('message_logs').insert({
      location_id:    loc.id,
      session_id:     session.id,
      direction:      'outbound',
      from_number:    'LSWA',
      to_number:      toPhone,
      body,
      status:         'sent',
      ghl_message_id: ghlMsgId,
      wa_message_id:  waMessageId,
    });

    logger.info({ sessionId: session.id, to: toPhone }, 'WhatsApp message sent');
  } catch (err) {
    logger.error({ err: err.message, locationId, toPhone }, 'Failed to send WhatsApp message');
    await supabase.from('message_logs').insert({
      direction:      'outbound',
      to_number:      toPhone,
      body,
      status:         'failed',
      ghl_message_id: ghlMsgId,
      error:          err.message,
    });
  }
}

export default router;

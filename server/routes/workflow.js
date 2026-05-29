import { Router } from 'express';
import axios from 'axios';
import supabase from '../lib/supabase.js';
import { logger, waManager, ghlClient } from '../lib/instances.js';

const router = Router();

// ----------------------------------------------------------------
// POST /api/workflow/subscribe
// GHL calls this when a user activates the "WhatsApp Message Received"
// trigger in their workflow. We store the subscription so we can
// fire the trigger when an inbound WhatsApp arrives.
// ----------------------------------------------------------------
router.post('/subscribe', async (req, res) => {
  logger.info({ body: req.body }, 'Workflow subscription received');

  const { locationId, workflowId, webhookUrl } = req.body;

  if (!locationId || !webhookUrl) {
    return res.status(400).json({ error: 'Missing locationId or webhookUrl' });
  }

  await supabase.from('workflow_subscriptions').upsert({
    location_id:  locationId,
    workflow_id:  workflowId,
    webhook_url:  webhookUrl,
    trigger_key:  'whatsapp_message_received',
    is_active:    true,
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'location_id,workflow_id' });

  res.json({ success: true });
});

// ----------------------------------------------------------------
// POST /api/workflow/unsubscribe
// Called when user removes the trigger from their workflow.
// ----------------------------------------------------------------
router.post('/unsubscribe', async (req, res) => {
  const { locationId, workflowId } = req.body;
  await supabase.from('workflow_subscriptions')
    .update({ is_active: false })
    .eq('location_id', locationId)
    .eq('workflow_id', workflowId);
  res.json({ success: true });
});

// ----------------------------------------------------------------
// Fire trigger — called internally when an inbound WA message arrives
// ----------------------------------------------------------------
export async function fireInboundTrigger({ locationId, contactId, phone, message }) {
  const { data: subs } = await supabase
    .from('workflow_subscriptions')
    .select('webhook_url')
    .eq('location_id', locationId)
    .eq('trigger_key', 'whatsapp_message_received')
    .eq('is_active', true);

  if (!subs?.length) return;

  const payload = {
    contactId,
    locationId,
    phone,
    message,
    timestamp: new Date().toISOString(),
  };

  for (const sub of subs) {
    try {
      await axios.post(sub.webhook_url, payload);
      logger.info({ locationId, contactId }, 'Workflow trigger fired');
    } catch (err) {
      logger.error({ err: err.message, webhook_url: sub.webhook_url }, 'Failed to fire workflow trigger');
    }
  }
}

// ----------------------------------------------------------------
// POST /api/workflow/action
// GHL calls this when a user's workflow reaches the
// "Send LSWA WhatsApp Message" action node.
// ----------------------------------------------------------------
router.post('/action', async (req, res) => {
  logger.info({ body: req.body }, 'Workflow action received');

  const locationId = req.body.locationId || req.body.location_id;
  const contactId  = req.body.contactId  || req.body.contact_id;
  const message    = req.body.customData?.message || req.body.message || req.body.body || '';

  if (!locationId || !message) {
    return res.status(400).json({ success: false, error: 'Missing locationId or message' });
  }

  try {
    // Get location + token
    const { data: loc } = await supabase
      .from('ghl_locations')
      .select('id, ghl_location_id, access_token, refresh_token, token_expires_at')
      .eq('ghl_location_id', locationId)
      .single();

    if (!loc) return res.status(404).json({ success: false, error: 'Location not found' });

    // Resolve contact phone
    let toPhone = req.body.phone || req.body.contactPhone;
    if (!toPhone && contactId) {
      const companyToken = await ghlClient.ensureFreshToken(loc);
      const locToken     = await ghlClient.getLocationToken(companyToken, locationId);
      const contact      = await ghlClient.getContact(locToken || companyToken, contactId);
      toPhone = contact?.phone;
    }

    if (!toPhone) return res.status(400).json({ success: false, error: 'Could not resolve contact phone' });

    // Find active WhatsApp session for this location
    const { data: session } = await supabase
      .from('wa_sessions')
      .select('id')
      .eq('location_id', loc.id)
      .eq('status', 'connected')
      .limit(1)
      .single();

    if (!session) return res.status(503).json({ success: false, error: 'No active WhatsApp session' });

    await waManager.sendMessage(session.id, toPhone, message);

    // Log it
    await supabase.from('message_logs').insert({
      location_id: loc.id,
      session_id:  session.id,
      direction:   'outbound',
      from_number: 'LSWA',
      to_number:   toPhone,
      body:        message,
      status:      'sent',
    });

    logger.info({ locationId, contactId, toPhone }, 'Workflow action: WhatsApp sent');
    res.json({ success: true });
  } catch (err) {
    const detail = err?.response?.data || err.message;
    logger.error({ err: detail, locationId, contactId }, 'Workflow action failed');
    res.status(500).json({ success: false, error: String(detail) });
  }
});

export default router;

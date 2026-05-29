import { Router } from 'express';
import axios from 'axios';
import supabase from '../lib/supabase.js';
import { logger } from '../lib/instances.js';

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

export default router;

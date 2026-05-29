import supabase from '../lib/supabase.js';
import { waManager, ghlClient, logger } from '../lib/instances.js';
import { fireInboundTrigger } from '../routes/workflow.js';

export function startInboundHandler() {
  waManager.on('inbound', async ({ sessionId, from, text }) => {
    try {
      // 1. Resolve session → location
      const { data: session } = await supabase
        .from('wa_sessions')
        .select('location_id')
        .eq('id', sessionId)
        .single();

      if (!session) {
        logger.warn({ sessionId }, 'Inbound: session not found in DB');
        return;
      }

      const { data: loc } = await supabase
        .from('ghl_locations')
        .select('id, ghl_location_id, access_token, refresh_token, token_expires_at')
        .eq('id', session.location_id)
        .single();

      if (!loc) {
        logger.warn({ sessionId }, 'Inbound: location not found');
        return;
      }

      // 2. Get a valid token
      const companyToken = await ghlClient.ensureFreshToken(loc);
      const locToken = await ghlClient.getLocationToken(companyToken, loc.ghl_location_id);
      const token = locToken || companyToken;

      // 3. Find or create GHL contact by phone
      let contact = await ghlClient.findContactByPhone(token, loc.ghl_location_id, from);
      const contactId = contact?.id || null;

      // 4. Push message into GHL conversation (shows under LSWA channel)
      await ghlClient.injectInbound({
        accessToken: token,
        locationId:  loc.ghl_location_id,
        fromPhone:   from,
        toPhone:     null,
        message:     text,
        type:        'Custom',
      });

      // 5. Fire workflow trigger webhooks
      await fireInboundTrigger({
        locationId: loc.ghl_location_id,
        contactId,
        phone:      from,
        message:    text,
      });

      // 6. Log the message
      await supabase.from('message_logs').insert({
        location_id: loc.id,
        session_id:  sessionId,
        direction:   'inbound',
        from_number: from,
        to_number:   'LSWA',
        body:        text,
        status:      'received',
      });

      logger.info({ sessionId, from, locationId: loc.ghl_location_id }, 'Inbound WhatsApp message forwarded to GHL');
    } catch (err) {
      logger.error({ err: err.message, sessionId, from }, 'Failed to handle inbound WhatsApp message');
    }
  });

  logger.info('Inbound WhatsApp handler started');
}

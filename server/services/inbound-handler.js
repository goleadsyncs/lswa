import supabase from '../lib/supabase.js';
import { waManager, ghlClient, logger } from '../lib/instances.js';
import { fireInboundTrigger } from '../routes/workflow.js';

export function startInboundHandler() {
  waManager.on('inbound', async ({ sessionId, from, text }) => {
    logger.info({ sessionId, from }, '[inbound] message received');

    try {
      const { data: session } = await supabase
        .from('wa_sessions')
        .select('location_id')
        .eq('id', sessionId)
        .single();

      if (!session) { logger.warn({ sessionId }, '[inbound] session not in DB'); return; }
      logger.info({ locationId: session.location_id }, '[inbound] session resolved');

      const { data: loc } = await supabase
        .from('ghl_locations')
        .select('id, ghl_location_id, access_token, refresh_token, token_expires_at')
        .eq('id', session.location_id)
        .single();

      if (!loc) { logger.warn({ sessionId }, '[inbound] location not found'); return; }
      logger.info({ ghlLocationId: loc.ghl_location_id }, '[inbound] location resolved');

      logger.info('[inbound] getting token');
      const companyToken = await ghlClient.ensureFreshToken(loc);
      logger.info('[inbound] ensureFreshToken done');

      const locToken = await ghlClient.getLocationToken(companyToken, loc.ghl_location_id);
      const token = locToken || companyToken;
      logger.info({ hasLocToken: !!locToken }, '[inbound] token ready');

      logger.info({ from }, '[inbound] finding contact by phone');
      const contact = await ghlClient.findContactByPhone(token, loc.ghl_location_id, from);
      logger.info({ contactId: contact?.id }, '[inbound] contact lookup done');

      logger.info('[inbound] calling injectInbound');
      await ghlClient.injectInbound({
        accessToken: token,
        locationId:  loc.ghl_location_id,
        fromPhone:   from,
        message:     text,
      });
      logger.info('[inbound] injectInbound success');

      await fireInboundTrigger({
        locationId: loc.ghl_location_id,
        contactId:  contact?.id || null,
        phone:      from,
        message:    text,
      });

      await supabase.from('message_logs').insert({
        location_id: loc.id,
        session_id:  sessionId,
        direction:   'inbound',
        from_number: from,
        to_number:   'LSWA',
        body:        text,
        status:      'received',
      });

      logger.info({ sessionId, from }, '[inbound] forwarded to GHL successfully');
    } catch (err) {
      const detail = err?.response?.data || err.message;
      logger.error({ err: detail, sessionId, from }, 'Failed to handle inbound WhatsApp message');
    }
  });

  logger.info('Inbound WhatsApp handler started');
}

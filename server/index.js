import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger, waManager, ghlClient } from './lib/instances.js';
import supabase from './lib/supabase.js';
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhook.js';
import whatsappRoutes from './routes/whatsapp.js';
import billingRoutes from './routes/billing.js';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/auth',     authRoutes);
app.use('/api/events',   webhookRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/billing',  billingRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

async function restoreSessions() {
  if (!process.env.SUPABASE_URL) return;
  const { data: sessions } = await supabase
    .from('wa_sessions')
    .select('id, location_id, ghl_locations(ghl_location_id)')
    .in('status', ['connected', 'connecting']);

  if (!sessions?.length) return;
  logger.info(`Restoring ${sessions.length} WhatsApp session(s)`);

  for (const s of sessions) {
    const locationGhlId = s.ghl_locations?.ghl_location_id;
    await waManager.createSession(s.id, locationGhlId, async (status) => {
      await supabase.from('wa_sessions').update({ status, updated_at: new Date() }).eq('id', s.id);
    });
  }
}

waManager.on('inbound', async ({ sessionId, from, text }) => {
  if (!process.env.SUPABASE_URL) return;
  try {
    const { data: mapping } = await supabase
      .from('wa_number_mappings')
      .select('ghl_number, location_id, ghl_locations(ghl_location_id, access_token, refresh_token, token_expires_at, id)')
      .eq('session_id', sessionId)
      .single();

    if (!mapping) return;

    const loc = mapping.ghl_locations;
    const token = await ghlClient.ensureFreshToken(loc);

    await ghlClient.injectInbound({
      accessToken: token,
      locationId: loc.ghl_location_id,
      fromPhone: from,
      toPhone: mapping.ghl_number,
      message: text,
    });

    await supabase.from('message_logs').insert({
      location_id: loc.id,
      session_id: sessionId,
      direction: 'inbound',
      from_number: from,
      to_number: mapping.ghl_number,
      body: text,
      status: 'delivered',
    });
  } catch (err) {
    logger.error({ err, sessionId, from }, 'Failed to relay inbound message to GHL');
  }
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, async () => {
  logger.info(`LSWA server running on port ${PORT}`);
  await restoreSessions();
});

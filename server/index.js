import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { logger, waManager } from './lib/instances.js';
import supabase from './lib/supabase.js';
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhook.js';
import whatsappRoutes from './routes/whatsapp.js';
import billingRoutes from './routes/billing.js';
import workflowRoutes from './routes/workflow.js';
import { startInboundHandler } from './services/inbound-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '..', 'client', 'dist');

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
app.use('/api/workflow', workflowRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Serve built React client in production
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(join(clientDist, 'index.html')));
}

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

startInboundHandler();

const PORT = process.env.PORT || 3007;
app.listen(PORT, async () => {
  logger.info(`LSWA server running on port ${PORT}`);
  await restoreSessions();
});

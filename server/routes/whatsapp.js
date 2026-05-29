import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { waManager, logger } from '../index.js';

const router = Router();
router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/whatsapp/sessions?locationId=:locationDbId
// List all WA sessions for a GHL location
// ----------------------------------------------------------------
router.get('/sessions', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  // Verify location belongs to user
  const { data: loc } = await supabase
    .from('ghl_locations')
    .select('id')
    .eq('id', locationId)
    .eq('user_id', req.user.id)
    .single();
  if (!loc) return res.status(403).json({ error: 'Forbidden' });

  const { data: sessions } = await supabase
    .from('wa_sessions')
    .select('id, phone_number, display_name, status, created_at')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  // Enrich with live in-process status
  const enriched = (sessions || []).map(s => ({
    ...s,
    liveStatus: waManager.getStatus(s.id),
    phoneNumber: waManager.getPhoneNumber(s.id) || s.phone_number,
  }));

  res.json({ sessions: enriched });
});

// ----------------------------------------------------------------
// POST /api/whatsapp/sessions
// Create a new session and start the QR-code flow
// ----------------------------------------------------------------
router.post('/sessions', async (req, res) => {
  const { locationId } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  const { data: loc } = await supabase
    .from('ghl_locations')
    .select('id, ghl_location_id')
    .eq('id', locationId)
    .eq('user_id', req.user.id)
    .single();
  if (!loc) return res.status(403).json({ error: 'Forbidden' });

  const { data: session } = await supabase
    .from('wa_sessions')
    .insert({ location_id: locationId, status: 'pending' })
    .select()
    .single();

  // Start Baileys — fires async, status updates persisted via callback
  waManager.createSession(session.id, loc.ghl_location_id, async (status, qrDataUrl) => {
    const update = { status, updated_at: new Date().toISOString() };
    if (status === 'connected') {
      update.phone_number = waManager.getPhoneNumber(session.id);
    }
    await supabase.from('wa_sessions').update(update).eq('id', session.id);
    logger.info({ sessionId: session.id, status }, 'WA session status');
  });

  res.json({ session });
});

// ----------------------------------------------------------------
// GET /api/whatsapp/sessions/:id/qr
// Poll this endpoint to get the QR code image (data URL)
// ----------------------------------------------------------------
router.get('/sessions/:id/qr', async (req, res) => {
  // Verify ownership
  const { data: session } = await supabase
    .from('wa_sessions')
    .select('id, status, ghl_locations!inner(user_id)')
    .eq('id', req.params.id)
    .single();

  if (!session) return res.status(404).json({ error: 'Not found' });
  if (session.ghl_locations.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const qr = waManager.getQR(req.params.id);
  const status = waManager.getStatus(req.params.id);

  res.json({ qr, status });
});

// ----------------------------------------------------------------
// DELETE /api/whatsapp/sessions/:id
// Disconnect and remove a session
// ----------------------------------------------------------------
router.delete('/sessions/:id', async (req, res) => {
  const { data: session } = await supabase
    .from('wa_sessions')
    .select('id, ghl_locations!inner(user_id)')
    .eq('id', req.params.id)
    .single();

  if (!session) return res.status(404).json({ error: 'Not found' });
  if (session.ghl_locations.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  await waManager.destroySession(req.params.id);
  await supabase.from('wa_sessions').delete().eq('id', req.params.id);

  res.json({ ok: true });
});

// ----------------------------------------------------------------
// GET /api/whatsapp/mappings?locationId=:id
// ----------------------------------------------------------------
router.get('/mappings', async (req, res) => {
  const { locationId } = req.query;
  const { data: loc } = await supabase
    .from('ghl_locations').select('id').eq('id', locationId).eq('user_id', req.user.id).single();
  if (!loc) return res.status(403).json({ error: 'Forbidden' });

  const { data: mappings } = await supabase
    .from('wa_number_mappings')
    .select('id, ghl_number, session_id, wa_sessions(phone_number, status)')
    .eq('location_id', locationId);

  res.json({ mappings: mappings || [] });
});

// ----------------------------------------------------------------
// POST /api/whatsapp/mappings
// Map a GHL phone number to a WA session
// ----------------------------------------------------------------
router.post('/mappings', async (req, res) => {
  const { locationId, ghlNumber, sessionId } = req.body;

  const { data: loc } = await supabase
    .from('ghl_locations').select('id').eq('id', locationId).eq('user_id', req.user.id).single();
  if (!loc) return res.status(403).json({ error: 'Forbidden' });

  const { data: mapping } = await supabase
    .from('wa_number_mappings')
    .upsert({ location_id: locationId, ghl_number: ghlNumber, session_id: sessionId },
      { onConflict: 'location_id,ghl_number' })
    .select()
    .single();

  res.json({ mapping });
});

// ----------------------------------------------------------------
// DELETE /api/whatsapp/mappings/:id
// ----------------------------------------------------------------
router.delete('/mappings/:id', async (req, res) => {
  await supabase.from('wa_number_mappings').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

// ----------------------------------------------------------------
// GET /api/whatsapp/logs?locationId=:id&limit=50
// ----------------------------------------------------------------
router.get('/logs', async (req, res) => {
  const { locationId, limit = 50 } = req.query;

  const { data: loc } = await supabase
    .from('ghl_locations').select('id').eq('id', locationId).eq('user_id', req.user.id).single();
  if (!loc) return res.status(403).json({ error: 'Forbidden' });

  const { data: logs } = await supabase
    .from('message_logs')
    .select('id, direction, from_number, to_number, body, status, error, created_at')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  res.json({ logs: logs || [] });
});

export default router;

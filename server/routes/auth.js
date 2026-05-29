import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { issueToken, requireAuth } from '../middleware/auth.js';
import { ghlClient } from '../lib/instances.js';

const router = Router();

// ----------------------------------------------------------------
// GET /api/auth/ghl  — redirect user to GHL OAuth consent screen
// ----------------------------------------------------------------
router.get('/ghl', (_req, res) => {
  res.redirect(ghlClient.getAuthUrl());
});

// ----------------------------------------------------------------
// GET /api/auth/ghl/callback  — GHL redirects here after consent
// ----------------------------------------------------------------
router.get('/ghl/callback', async (req, res) => {
  const { code, locationId } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokens = await ghlClient.exchangeCode(code);

    // Upsert user by GHL user id
    const { data: user } = await supabase
      .from('users')
      .upsert(
        { ghl_user_id: tokens.userId, email: tokens.email || `${tokens.userId}@ghl.user` },
        { onConflict: 'ghl_user_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    // Upsert the connected location
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await supabase.from('ghl_locations').upsert({
      user_id:          user.id,
      ghl_location_id:  tokens.locationId || locationId,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      is_active:        true,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'ghl_location_id' });

    // Fetch location name from GHL
    try {
      const locData = await ghlClient.getLocation(tokens.access_token, tokens.locationId || locationId);
      await supabase
        .from('ghl_locations')
        .update({ name: locData.location?.name })
        .eq('ghl_location_id', tokens.locationId || locationId);
    } catch { /* non-critical */ }

    const jwt = issueToken(user.id);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/dashboard?token=${jwt}`);
  } catch (err) {
    console.error('GHL OAuth callback error', err?.response?.data || err.message);
    res.status(500).send('OAuth failed. Please try again.');
  }
});

// ----------------------------------------------------------------
// GET /api/auth/me  — return current user + locations
// ----------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
  const { data: locations } = await supabase
    .from('ghl_locations')
    .select('id, ghl_location_id, name, is_active, created_at')
    .eq('user_id', req.user.id)
    .eq('is_active', true);

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, trial_ends_at, current_period_ends_at')
    .eq('user_id', req.user.id)
    .single();

  res.json({ user: req.user, locations: locations || [], subscription: sub || null });
});

// ----------------------------------------------------------------
// DELETE /api/auth/locations/:locationId  — disconnect a location
// ----------------------------------------------------------------
router.delete('/locations/:locationId', requireAuth, async (req, res) => {
  await supabase
    .from('ghl_locations')
    .update({ is_active: false })
    .eq('id', req.params.locationId)
    .eq('user_id', req.user.id);

  res.json({ ok: true });
});

export default router;

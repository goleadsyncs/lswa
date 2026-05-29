import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { issueToken, requireAuth } from '../middleware/auth.js';
import { ghlClient } from '../lib/instances.js';

const router = Router();

// ----------------------------------------------------------------
// GET /api/auth/connect  — redirect user to OAuth consent screen
// ----------------------------------------------------------------
router.get('/connect', (_req, res) => {
  res.redirect(ghlClient.getAuthUrl());
});

// ----------------------------------------------------------------
// GET /api/auth/callback  — redirected here after consent
// ----------------------------------------------------------------
router.get('/callback', async (req, res) => {
  const { code, locationId } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    let tokens;
    try {
      tokens = await ghlClient.exchangeCode(code);
    } catch (exchangeErr) {
      const detail = exchangeErr?.response?.data || exchangeErr.message;
      console.error('Token exchange failed:', JSON.stringify(detail));
      return res.status(500).send(`Token exchange failed: ${JSON.stringify(detail)}`);
    }

    const ghlUserId = tokens.userId || tokens.user_id || tokens.companyId || 'unknown';
    const companyId = tokens.companyId;
    const isCompanyInstall = tokens.userType === 'Company' || (companyId && !tokens.locationId);
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 86400) * 1000);

    // Upsert user
    const { data: user } = await supabase
      .from('users')
      .upsert(
        { ghl_user_id: ghlUserId, email: tokens.email || `${ghlUserId}@ghl.user` },
        { onConflict: 'ghl_user_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (isCompanyInstall && companyId) {
      // Agency-level install — fetch and store all sub-account locations
      try {
        const locations = await ghlClient.getCompanyLocations(tokens.access_token, companyId);
        console.log(`Company install: found ${locations.length} locations`);

        for (const loc of locations) {
          await supabase.from('ghl_locations').upsert({
            user_id:          user.id,
            ghl_location_id:  loc.id,
            name:             loc.name,
            access_token:     tokens.access_token,
            refresh_token:    tokens.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            is_active:        true,
            updated_at:       new Date().toISOString(),
          }, { onConflict: 'ghl_location_id' });
        }

        if (locations.length === 0) {
          // No locations found — store company as fallback
          await supabase.from('ghl_locations').upsert({
            user_id:          user.id,
            ghl_location_id:  companyId,
            name:             'Agency Account',
            access_token:     tokens.access_token,
            refresh_token:    tokens.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            is_active:        true,
            updated_at:       new Date().toISOString(),
          }, { onConflict: 'ghl_location_id' });
        }
      } catch (locErr) {
        console.error('Failed to fetch company locations:', locErr.message);
        // Store company as fallback
        await supabase.from('ghl_locations').upsert({
          user_id:          user.id,
          ghl_location_id:  companyId,
          name:             'Agency Account',
          access_token:     tokens.access_token,
          refresh_token:    tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_active:        true,
          updated_at:       new Date().toISOString(),
        }, { onConflict: 'ghl_location_id' });
      }
    } else {
      // Location-level install
      const ghlLocId = tokens.locationId || tokens.location_id || locationId;
      await supabase.from('ghl_locations').upsert({
        user_id:          user.id,
        ghl_location_id:  ghlLocId,
        access_token:     tokens.access_token,
        refresh_token:    tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        is_active:        true,
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'ghl_location_id' });

      try {
        const locData = await ghlClient.getLocation(tokens.access_token, ghlLocId);
        const locName = locData?.location?.name || locData?.name;
        if (locName) await supabase.from('ghl_locations').update({ name: locName }).eq('ghl_location_id', ghlLocId);
      } catch { /* non-critical */ }
    }

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

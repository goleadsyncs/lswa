import axios from 'axios';
import supabase from '../lib/supabase.js';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

export class GHLClient {
  /**
   * Exchange an OAuth code for access + refresh tokens.
   */
  async exchangeCode(code) {
    const { data } = await axios.post(GHL_TOKEN_URL, new URLSearchParams({
      client_id:     process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  process.env.GHL_REDIRECT_URI,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    return data; // { access_token, refresh_token, expires_in, locationId, userId, ... }
  }

  /**
   * Refresh an expired access token. Updates DB record in place.
   */
  async refreshToken(locationDbId, refreshToken) {
    const { data } = await axios.post(GHL_TOKEN_URL, new URLSearchParams({
      client_id:     process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    await supabase.from('ghl_locations').update({
      access_token:     data.access_token,
      refresh_token:    data.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      updated_at:       new Date().toISOString(),
    }).eq('id', locationDbId);

    return data.access_token;
  }

  /**
   * Returns a valid access token, refreshing if within 5 minutes of expiry.
   * loc = ghl_locations row
   */
  async ensureFreshToken(loc) {
    const expiresAt = new Date(loc.token_expires_at).getTime();
    const fiveMin = 5 * 60 * 1000;
    if (Date.now() + fiveMin >= expiresAt) {
      return this.refreshToken(loc.id, loc.refresh_token);
    }
    return loc.access_token;
  }

  /**
   * Get GHL location details.
   */
  async getLocation(accessToken, locationId) {
    const { data } = await axios.get(`${GHL_BASE}/locations/${locationId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-07-28' },
    });
    return data;
  }

  /**
   * Look up a GHL contact by phone number within a location.
   */
  async findContactByPhone(accessToken, locationId, phone) {
    const digits = phone.replace(/\D/g, '');
    const { data } = await axios.get(`${GHL_BASE}/contacts/`, {
      headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-07-28' },
      params: { locationId, phone: `+${digits}`, limit: 1 },
    });
    return data?.contacts?.[0] || null;
  }

  /**
   * Inject an inbound message into GHL so it appears in the contact's conversation.
   * GHL treats it as an incoming SMS from the contact.
   *
   * NOTE: The exact endpoint/payload may need adjustment based on your GHL app type.
   * Verify against: https://highlevel.stoplight.io/docs/integrations
   */
  async injectInbound({ accessToken, locationId, fromPhone, toPhone, message }) {
    const digits = fromPhone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `+27${digits.slice(1)}` : `+${digits}`;

    await axios.post(
      `${GHL_BASE}/conversations/messages/inbound`,
      {
        type:        'SMS',
        phone:       normalized,
        message,
        attachments: [],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version:       '2021-04-15',
          'Content-Type': 'application/json',
        },
        params: { locationId },
      }
    );
  }

  /**
   * Build the GHL OAuth authorization URL to redirect the user to.
   */
  getAuthUrl() {
    const scopes = [
      'conversations/message.readonly',
      'conversations/message.write',
      'contacts.readonly',
      'locations.readonly',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri:  process.env.GHL_REDIRECT_URI,
      client_id:     process.env.GHL_CLIENT_ID,
      scope:         scopes,
    });

    return `https://marketplace.gohighlevel.com/oauth/chooselocation?${params}`;
  }
}

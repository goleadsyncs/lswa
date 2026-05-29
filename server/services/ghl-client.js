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

    return data;
  }

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
   * Get all locations under a company (agency-level install).
   */
  async getCompanyLocations(accessToken, companyId) {
    const { data } = await axios.get(`${GHL_BASE}/locations/search`, {
      headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-07-28' },
      params: { companyId, limit: 100 },
    });
    return data?.locations || [];
  }

  /**
   * Exchange a company-level token for a location-specific token.
   * Required for location-level API calls (contacts, conversations, etc.)
   */
  async getLocationToken(companyToken, locationId) {
    // Decode JWT to extract companyId (authClassId field)
    const jwtPayload = JSON.parse(
      Buffer.from(companyToken.split('.')[1], 'base64url').toString('utf8')
    );
    const companyId = jwtPayload.authClassId || jwtPayload.primaryAuthClassId;

    const { data } = await axios.post(
      `${GHL_BASE}/oauth/locationToken`,
      { companyId, locationId },
      {
        headers: {
          Authorization:  `Bearer ${companyToken}`,
          'Content-Type': 'application/json',
          Version:        '2021-07-28',
        },
      }
    );
    return data?.access_token || data?.token;
  }

  /**
   * Get a contact by ID using a location token.
   */
  async getContact(accessToken, contactId) {
    const { data } = await axios.get(`${GHL_BASE}/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-07-28' },
    });
    return data?.contact || data;
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
  async injectInbound({ accessToken, locationId, fromPhone, message }) {
    const digits = fromPhone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `+27${digits.slice(1)}` : `+${digits}`;

    // 1. Find or create the GHL contact
    let contact = await this.findContactByPhone(accessToken, locationId, normalized);
    if (!contact) {
      const { data } = await axios.post(
        `${GHL_BASE}/contacts/`,
        { locationId, phone: normalized, source: 'WhatsApp' },
        { headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-07-28', 'Content-Type': 'application/json' } }
      );
      contact = data?.contact || data;
    }

    // 2. Find or create the conversation for this contact
    const { data: convSearch } = await axios.get(
      `${GHL_BASE}/conversations/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-04-15' },
        params: { locationId, contactId: contact.id, limit: 1 },
      }
    );
    let conversationId = convSearch?.conversations?.[0]?.id;

    if (!conversationId) {
      const { data: newConv } = await axios.post(
        `${GHL_BASE}/conversations/`,
        { locationId, contactId: contact.id },
        { headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-04-15', 'Content-Type': 'application/json' } }
      );
      conversationId = newConv?.conversation?.id || newConv?.id;
    }

    // 3. Post the inbound message to the conversation
    await axios.post(
      `${GHL_BASE}/conversations/messages`,
      {
        type:           'WhatsApp',
        conversationId,
        message,
      },
      {
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          Version:        '2021-04-15',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Build the GHL OAuth authorization URL to redirect the user to.
   */
  getAuthUrl() {
    const scopes = [
      'businesses.readonly',
      'conversations.readonly',
      'conversations.write',
      'conversations/message.readonly',
      'conversations/message.write',
      'contacts.readonly',
      'contacts.write',
      'locations.readonly',
      'locations/customValues.readonly',
      'locations/customValues.write',
      'locations/customFields.readonly',
      'locations/customFields.write',
      'locations/tags.readonly',
      'locations/tags.write',
      'medias.readonly',
      'medias.write',
      'users.readonly',
      'users.write',
    ].join(' ');

    const clientId  = process.env.GHL_CLIENT_ID; // e.g. 6a197451508d954be48f732c-mpqtubjl
    const versionId = clientId.split('-')[0];     // e.g. 6a197451508d954be48f732c

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri:  process.env.GHL_REDIRECT_URI,
      client_id:     clientId,
      scope:         scopes,
      version_id:    versionId,
    });

    return `https://marketplace.gohighlevel.com/v2/oauth/chooselocation?${params}`;
  }
}

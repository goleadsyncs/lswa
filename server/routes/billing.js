import { Router } from 'express';
import Stripe from 'stripe';
import supabase from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../index.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

const PLAN_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth:  process.env.STRIPE_PRICE_GROWTH,
  agency:  process.env.STRIPE_PRICE_AGENCY,
};

const PLAN_LIMITS = {
  starter: { locations: 1,  waNumbers: 3 },
  growth:  { locations: 5,  waNumbers: 15 },
  agency:  { locations: -1, waNumbers: -1 }, // unlimited
};

// ----------------------------------------------------------------
// POST /api/billing/checkout
// Create a Stripe Checkout Session for a new subscription
// ----------------------------------------------------------------
router.post('/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body;
  const priceId = PLAN_PRICES[plan];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

  let customerId = req.user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: req.user.email });
    customerId = customer.id;
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', req.user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${process.env.CLIENT_URL}/billing?success=1`,
    cancel_url:  `${process.env.CLIENT_URL}/billing?cancelled=1`,
    metadata:    { userId: req.user.id, plan },
  });

  res.json({ url: session.url });
});

// ----------------------------------------------------------------
// POST /api/billing/portal
// Open Stripe Customer Portal to manage subscription
// ----------------------------------------------------------------
router.post('/portal', requireAuth, async (req, res) => {
  const customerId = req.user.stripe_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No billing account found' });

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${process.env.CLIENT_URL}/billing`,
  });

  res.json({ url: session.url });
});

// ----------------------------------------------------------------
// GET /api/billing/subscription
// ----------------------------------------------------------------
router.get('/subscription', requireAuth, async (req, res) => {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  const limits = PLAN_LIMITS[sub?.plan || 'starter'];
  res.json({ subscription: sub, limits });
});

// ----------------------------------------------------------------
// POST /api/billing/webhook  (raw body, no auth middleware)
// Stripe sends lifecycle events here
// ----------------------------------------------------------------
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn({ err: err.message }, 'Stripe webhook signature failed');
    return res.status(400).send('Webhook signature error');
  }

  const sub = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (sub.subscription) {
        const stripeSub = await stripe.subscriptions.retrieve(sub.subscription);
        const plan = sub.metadata?.plan || 'starter';
        await supabase.from('subscriptions').upsert({
          user_id:                sub.metadata.userId,
          stripe_subscription_id: sub.subscription,
          stripe_customer_id:     sub.customer,
          stripe_price_id:        stripeSub.items.data[0]?.price?.id,
          plan,
          status:                 stripeSub.status,
          trial_ends_at:          stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
          current_period_ends_at: new Date(stripeSub.current_period_end * 1000).toISOString(),
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' });
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await supabase.from('subscriptions')
        .update({
          status:                 sub.status,
          current_period_ends_at: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at:             new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
  }

  res.json({ received: true });
});

export default router;

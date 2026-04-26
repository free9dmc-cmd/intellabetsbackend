const express = require('express');
const { authenticateToken, TIER_LIMITS } = require('../middleware/auth');
const db = require('../services/db');
const router = express.Router();

// Get subscription plans
router.get('/plans', (req, res) => {
  const plans = Object.entries(TIER_LIMITS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    price: plan.price,
    period: 'month',
    picksPerPeriod: plan.picksPerPeriod === Infinity ? 'unlimited' : plan.picksPerPeriod,
    periodDays: plan.periodDays,
    features: getPlanFeatures(key)
  }));
  res.json({ plans });
});

// Verify and update subscription (called after in-app purchase)
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { productId, transactionId, platform } = req.body;

    if (!productId || !transactionId) {
      return res.status(400).json({ error: 'Product ID and transaction ID required' });
    }

    const tierMap = {
      'intellabets_basic_monthly': 'basic',
      'intellabets_pro_monthly': 'pro',
      'intellabets_elite_monthly': 'elite'
    };

    const tier = tierMap[productId];
    if (!tier) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    await db.query(
      'UPDATE users SET subscription_tier = $1, picks_used = 0, picks_reset_at = NOW() WHERE id = $2',
      [tier, req.user.userId]
    );

    await db.query(
      'INSERT INTO subscription_history (user_id, tier, product_id, transaction_id, platform, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [req.user.userId, tier, productId, transactionId, platform]
    );

    const jwt = require('jsonwebtoken');
    const newToken = jwt.sign(
      { userId: req.user.userId, email: req.user.email, tier },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      tier,
      token: newToken,
      message: `Successfully upgraded to ${TIER_LIMITS[tier].name} plan`
    });
  } catch (error) {
    console.error('Subscription verify error:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
});

// Get current subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT subscription_tier, picks_used, picks_reset_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const limits = TIER_LIMITS[user.subscription_tier];

    res.json({
      tier: user.subscription_tier,
      tierName: limits.name,
      picksUsed: user.picks_used,
      picksLimit: limits.picksPerPeriod === Infinity ? 'unlimited' : limits.picksPerPeriod,
      periodDays: limits.periodDays,
      picksResetAt: user.picks_reset_at
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

function getPlanFeatures(tier) {
  const features = {
    basic: [
      '2 AI picks every 3 days',
      'All major sports covered',
      'Bet slip generator',
      'All sportsbooks supported',
      'Basic analysis'
    ],
    pro: [
      '10 AI picks per day',
      'All major sports covered',
      'Bet slip generator',
      'All sportsbooks supported',
      'Deep AI analysis',
      'Parlay builder',
      'Confidence ratings'
    ],
    elite: [
      'Unlimited AI picks',
      'All major sports covered',
      'Bet slip generator',
      'All sportsbooks supported',
      'Premium AI analysis',
      'Advanced parlay builder',
      'Value ratings',
      'Priority pick generation',
      'Early access to picks'
    ]
  };
  return features[tier] || features.basic;
}

module.exports = router;

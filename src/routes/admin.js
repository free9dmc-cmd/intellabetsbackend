const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const pool = require('../services/db');

// Simple admin check middleware
// For now: any valid JWT user can call admin routes (upgrade this later with an isAdmin flag)
// To lock it down further, add: if (req.user.email !== 'free9dmc@icloud.com') return res.status(403).json({ error: 'Forbidden' });
const adminCheck = (req, res, next) => {
  // Optional: whitelist your email
  // if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// GET /admin/users — list all users
router.get('/users', verifyToken, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, tier, picks_used, period_start, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 500`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /admin/picks — recent pick history across all users
router.get('/picks', verifyToken, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ph.id, ph.sport, ph.recommendation, ph.confidence, ph.created_at,
              u.email as user_email, u.name as user_name
       FROM pick_history ph
       LEFT JOIN users u ON u.id = ph.user_id
       ORDER BY ph.created_at DESC
       LIMIT 200`
    );
    res.json({ picks: result.rows });
  } catch (err) {
    console.error('Admin picks error:', err);
    res.status(500).json({ error: 'Failed to fetch picks' });
  }
});

// GET /admin/subscriptions — subscription history
router.get('/subscriptions', verifyToken, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sh.id, sh.tier, sh.transaction_id, sh.created_at,
              u.email as user_email, u.name as user_name
       FROM subscription_history sh
       LEFT JOIN users u ON u.id = sh.user_id
       ORDER BY sh.created_at DESC
       LIMIT 200`
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error('Admin subscriptions error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription history' });
  }
});

// POST /admin/set-tier — manually override a user's tier
router.post('/set-tier', verifyToken, adminCheck, async (req, res) => {
  const { email, tier } = req.body;
  const validTiers = ['free', 'basic', 'pro', 'elite'];

  if (!email || !validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Invalid email or tier' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET subscription_tier = $1, picks_used = 0, picks_reset_at = NOW()
       WHERE email = $2
       RETURNING id, name, email, subscription_tier as tier`,
      [tier, email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attempt to log in subscription history (best-effort, don't fail if table schema differs)
    try {
      await pool.query(
        `INSERT INTO subscription_history (user_id, tier, transaction_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [result.rows[0].id, tier, `admin-override-${Date.now()}`]
      );
    } catch (histErr) {
      console.warn('subscription_history insert skipped:', histErr.message);
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Admin set-tier error:', err);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// GET /admin/stats — summary stats
router.get('/stats', verifyToken, adminCheck, async (req, res) => {
  try {
    const [users, picks, subs] = await Promise.all([
      pool.query('SELECT tier, COUNT(*) as count FROM users GROUP BY tier'),
      pool.query('SELECT COUNT(*) as total FROM pick_history'),
      pool.query('SELECT COUNT(*) as total FROM subscription_history'),
    ]);

    const tierCounts = {};
    users.rows.forEach(r => { tierCounts[r.tier] = parseInt(r.count); });

    const prices = { basic: 20, pro: 50, elite: 200 };
    const mrr = Object.keys(prices).reduce(
      (s, t) => s + (tierCounts[t] || 0) * prices[t], 0
    );

    res.json({
      tierCounts,
      totalUsers: users.rows.reduce((s, r) => s + parseInt(r.count), 0),
      totalPicks: parseInt(picks.rows[0].total),
      totalSubscriptions: parseInt(subs.rows[0].total),
      estimatedMRR: mrr,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

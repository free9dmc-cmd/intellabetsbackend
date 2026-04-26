const express = require('express');
const { authenticateToken, TIER_LIMITS } = require('../middleware/auth');
const { getUpcomingGames } = require('../services/oddsApi');
const { generatePick } = require('../services/claude');
const db = require('../services/db');
const router = express.Router();

// Cache picks for 30 minutes
const picksCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

// Get AI picks (authenticated, tier-limited)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tier = req.user.tier || 'basic';
    const limits = TIER_LIMITS[tier];

    // Check picks usage
    const userResult = await db.query(
      'SELECT picks_used, picks_reset_at, subscription_tier FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const now = new Date();
    const resetAt = new Date(user.picks_reset_at);
    const daysSinceReset = (now - resetAt) / (1000 * 60 * 60 * 24);

    // Reset picks if period has passed
    if (daysSinceReset >= limits.periodDays) {
      await db.query(
        'UPDATE users SET picks_used = 0, picks_reset_at = NOW() WHERE id = $1',
        [userId]
      );
      user.picks_used = 0;
    }

    // Check limit
    if (limits.picksPerPeriod !== Infinity && user.picks_used >= limits.picksPerPeriod) {
      const resetTime = new Date(resetAt.getTime() + limits.periodDays * 24 * 60 * 60 * 1000);
      return res.status(429).json({
        error: 'Pick limit reached',
        limit: limits.picksPerPeriod,
        resetsAt: resetTime,
        tier,
        upgrade: tier === 'basic' ? 'Upgrade to Pro for 10 picks/day' : 'Upgrade to Elite for unlimited picks'
      });
    }

    // Check cache
    const cacheKey = `picks_${tier}`;
    const cached = picksCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return res.json({ picks: cached.data, fromCache: true, picksUsed: user.picks_used, limit: limits.picksPerPeriod });
    }

    // Fetch games and generate picks
    const sport = req.query.sport || null;
    const games = await getUpcomingGames(sport);

    if (!games.length) {
      return res.json({ picks: [], message: 'No games available right now' });
    }

    // Generate picks for top games (limit based on tier)
    const maxGames = tier === 'basic' ? 3 : tier === 'pro' ? 8 : 15;
    const selectedGames = games.slice(0, maxGames);
    const picks = [];

    for (const game of selectedGames) {
      try {
        const pick = await generatePick(game, game.sportKey || game.sport_key);
        picks.push(pick);
      } catch (err) {
        console.warn('Pick generation failed for game:', game.id, err.message);
      }
    }

    // Cache the results
    picksCache.set(cacheKey, { data: picks, timestamp: Date.now() });

    // Increment picks used
    await db.query('UPDATE users SET picks_used = picks_used + 1 WHERE id = $1', [userId]);

    res.json({
      picks,
      picksUsed: user.picks_used + 1,
      limit: limits.picksPerPeriod === Infinity ? 'unlimited' : limits.picksPerPeriod,
      tier
    });
  } catch (error) {
    console.error('Picks error:', error);
    res.status(500).json({ error: 'Failed to generate picks' });
  }
});

// Preview picks (unauthenticated teaser - 1 pick)
router.get('/preview', async (req, res) => {
  try {
    const cacheKey = 'picks_preview';
    const cached = picksCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return res.json({ pick: cached.data, preview: true });
    }

    const games = await getUpcomingGames();
    if (!games.length) {
      return res.json({ pick: null, message: 'No games available' });
    }

    const pick = await generatePick(games[0], games[0].sportKey || games[0].sport_key);
    picksCache.set(cacheKey, { data: pick, timestamp: Date.now() });

    // Blur the recommendation for non-subscribers
    pick.recommendation = pick.recommendation.split(' ').map((w, i) => i > 0 ? '***' : w).join(' ');

    res.json({ pick, preview: true, message: 'Sign up to see full picks' });
  } catch (error) {
    console.error('Preview picks error:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

module.exports = router;

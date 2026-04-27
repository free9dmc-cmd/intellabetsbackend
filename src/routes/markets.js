/**
 * /markets — Prediction Market Picks
 *
 * GET /markets          — authenticated, returns AI-analyzed market picks
 * GET /markets/preview  — unauthenticated, blurred teaser
 * GET /markets/sources  — list available market sources
 */

const express = require('express');
const router = express.Router();
const { verifyToken, checkPickLimit, TIER_LIMITS } = require('../middleware/auth');
const { getAllPredictionMarkets } = require('../services/predictionMarkets');
const { generateMarketPick } = require('../services/claude');
const pool = require('../services/db');

// Simple in-memory cache for market picks (15 min TTL — markets move slower than odds)
const marketCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCacheKey(source, sport) {
  return `markets:${source || 'all'}:${sport || 'all'}`;
}

// GET /markets — authenticated market picks
router.get('/', verifyToken, async (req, res) => {
  const { source = 'all', sport = null, limit = 10 } = req.query;
  const userId = req.user.id;
  const tier = req.user.tier || 'free';

  // Free users get preview only
  if (tier === 'free') {
    return res.status(403).json({
      error: 'Prediction market picks require a subscription',
      code: 'SUBSCRIPTION_REQUIRED',
      upgradeRequired: true,
      message: 'Upgrade to Basic or higher to access prediction market analysis',
    });
  }

  const cacheKey = getCacheKey(source, sport);
  const cached = marketCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ picks: cached.picks, fromCache: true, source: 'markets' });
  }

  try {
    // Fetch raw markets
    const markets = await getAllPredictionMarkets({
      source,
      sport,
      limit: Math.min(parseInt(limit) || 10, 20),
    });

    if (!markets.length) {
      return res.json({ picks: [], message: 'No open prediction markets found right now' });
    }

    // Generate AI picks for top markets (limit to 6 to control API costs)
    const marketsToAnalyze = markets.slice(0, 6);
    const pickResults = await Promise.allSettled(
      marketsToAnalyze.map(m => generateMarketPick(m))
    );

    const picks = pickResults
      .filter(r => r.status === 'fulfilled' && r.value.position !== 'PASS')
      .map(r => r.value)
      .sort((a, b) => b.confidence - a.confidence);

    // Cache results
    marketCache.set(cacheKey, { picks, timestamp: Date.now() });

    // Log pick activity (reuse pick_history table with source='markets')
    if (picks.length > 0) {
      await pool.query(
        `INSERT INTO pick_history (user_id, sport, recommendation, confidence, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, 'prediction_markets', picks[0]?.recommendation || 'Market Pick', picks[0]?.confidence || 0]
      ).catch(() => {}); // non-fatal
    }

    res.json({ picks, source: 'markets', total: picks.length });
  } catch (err) {
    console.error('[Markets] Error:', err);
    res.status(500).json({ error: 'Failed to fetch market picks', details: err.message });
  }
});

// GET /markets/preview — unauthenticated teaser
router.get('/preview', async (req, res) => {
  const cacheKey = getCacheKey('all', null);
  const cached = marketCache.get(cacheKey);
  const picks = cached?.picks || [];

  const preview = picks.slice(0, 2).map(p => ({
    ...p,
    recommendation: '🔒 Subscribe to unlock',
    reasoning: '🔒 AI analysis locked — upgrade to Basic or higher to see full reasoning',
    keyFactors: ['🔒 Locked', '🔒 Locked', '🔒 Locked'],
    edge: null,
    trueProbability: null,
    blurred: true,
  }));

  res.json({ picks: preview, blurred: true });
});

// GET /markets/sources — list available sources and their status
router.get('/sources', async (req, res) => {
  res.json({
    sources: [
      {
        id: 'kalshi',
        name: 'Kalshi',
        description: 'CFTC-regulated US prediction exchange',
        regulated: true,
        currency: 'USD',
        payoutStructure: '$1.00 per contract if YES',
        url: 'https://kalshi.com',
        status: 'active',
        sports: ['NFL', 'NBA', 'MLB', 'NHL', 'MMA', 'NCAAB'],
      },
      {
        id: 'polymarket',
        name: 'Polymarket',
        description: 'Global prediction market (crypto-settled)',
        regulated: false,
        currency: 'USDC',
        payoutStructure: '$1.00 USDC per contract if YES',
        url: 'https://polymarket.com',
        status: 'active',
        sports: ['NFL', 'NBA', 'MLB', 'NHL', 'MMA', 'Soccer'],
        note: 'Requires crypto wallet. Not available to US residents per Polymarket TOS.',
      },
      {
        id: 'predictit',
        name: 'PredictIt',
        description: 'US-based regulated prediction market',
        regulated: true,
        currency: 'USD',
        payoutStructure: '$1.00 per share if YES',
        url: 'https://predictit.org',
        status: 'active',
        sports: ['NFL', 'NBA', 'MLB', 'NHL'],
        note: '10% fee on winnings, 5% withdrawal fee',
      },
    ],
    // Integration hooks for future direct sportsbook APIs
    sportsbookIntegrations: {
      status: 'planned',
      description: 'Direct sportsbook API integration — place bets without leaving the app',
      planned: [
        { name: 'DraftKings', apiStatus: 'Partner API available (requires partnership agreement)' },
        { name: 'FanDuel', apiStatus: 'Affiliate API available' },
        { name: 'BetMGM', apiStatus: 'Partner program available' },
        { name: 'Caesars', apiStatus: 'Affiliate program available' },
      ],
      note: 'Sportsbook deep links are active now. Direct bet placement pending partnership agreements.',
    },
  });
});

module.exports = router;

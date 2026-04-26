const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { buildParlay } = require('../services/claude');
const { getUpcomingGames } = require('../services/oddsApi');
const { generatePick } = require('../services/claude');
const router = express.Router();

// Build parlay from provided picks
router.post('/build', authenticateToken, async (req, res) => {
  try {
    const { picks, legs } = req.body;

    if (!picks || !Array.isArray(picks) || picks.length < 2) {
      return res.status(400).json({ error: 'At least 2 picks required for a parlay' });
    }

    if (picks.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 legs per parlay' });
    }

    const parlay = await buildParlay(picks);
    res.json({ parlay });
  } catch (error) {
    console.error('Build parlay error:', error);
    res.status(500).json({ error: 'Failed to build parlay' });
  }
});

// Generate parlay from current top picks
router.post('/from-picks', authenticateToken, async (req, res) => {
  try {
    const { count = 3, sport = null } = req.body;
    const legCount = Math.min(Math.max(parseInt(count), 2), 8);

    const games = await getUpcomingGames(sport);
    if (games.length < legCount) {
      return res.status(400).json({ error: 'Not enough games available for parlay' });
    }

    const selectedGames = games.slice(0, legCount);
    const picks = [];

    for (const game of selectedGames) {
      try {
        const pick = await generatePick(game, game.sportKey || game.sport_key);
        picks.push(pick);
      } catch (err) {
        console.warn('Pick failed for parlay leg:', err.message);
      }
    }

    if (picks.length < 2) {
      return res.status(500).json({ error: 'Could not generate enough picks for parlay' });
    }

    const parlay = await buildParlay(picks);
    res.json({ parlay, legs: picks });
  } catch (error) {
    console.error('From-picks parlay error:', error);
    res.status(500).json({ error: 'Failed to generate parlay' });
  }
});

module.exports = router;

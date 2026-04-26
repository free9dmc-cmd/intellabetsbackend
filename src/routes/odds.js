const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getUpcomingGames, getAvailableSports, SPORTS } = require('../services/oddsApi');
const router = express.Router();

// Get upcoming games with odds by sport
router.get('/:sport?', authenticateToken, async (req, res) => {
  try {
    const { sport } = req.params;
    const sportKey = SPORTS[sport?.toUpperCase()] || sport;

    const games = await getUpcomingGames(sportKey || null);
    res.json({ games, count: games.length });
  } catch (error) {
    console.error('Odds error:', error);
    res.status(500).json({ error: 'Failed to fetch odds' });
  }
});

// Get available active sports
router.get('/sports/available', authenticateToken, async (req, res) => {
  try {
    const sports = await getAvailableSports();
    res.json({ sports });
  } catch (error) {
    console.error('Sports error:', error);
    res.status(500).json({ error: 'Failed to fetch sports' });
  }
});

module.exports = router;

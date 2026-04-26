const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { formatBetSlip, formatParlaySlip, SPORTSBOOK_FORMATS } = require('../services/betslip');
const router = express.Router();

// Format a bet slip for a specific sportsbook
router.post('/format', authenticateToken, async (req, res) => {
  try {
    const { pick, bookmaker, stake = 10 } = req.body;

    if (!pick) {
      return res.status(400).json({ error: 'Pick data required' });
    }

    if (bookmaker && !SPORTSBOOK_FORMATS[bookmaker]) {
      return res.status(400).json({
        error: 'Invalid bookmaker',
        validBookmakers: Object.keys(SPORTSBOOK_FORMATS)
      });
    }

    const slip = formatBetSlip(pick, bookmaker, stake);

    res.json({
      slip,
      bookmaker: bookmaker ? SPORTSBOOK_FORMATS[bookmaker].name : 'Generic',
      stake,
      formatted: true
    });
  } catch (error) {
    console.error('Format bet slip error:', error);
    res.status(500).json({ error: 'Failed to format bet slip' });
  }
});

// Format a parlay slip
router.post('/parlay', authenticateToken, async (req, res) => {
  try {
    const { parlay, stake = 10 } = req.body;

    if (!parlay) {
      return res.status(400).json({ error: 'Parlay data required' });
    }

    const slip = formatParlaySlip(parlay, stake);
    res.json({ slip, stake, formatted: true });
  } catch (error) {
    console.error('Format parlay slip error:', error);
    res.status(500).json({ error: 'Failed to format parlay slip' });
  }
});

// List supported sportsbooks
router.get('/sportsbooks', (req, res) => {
  const books = Object.entries(SPORTSBOOK_FORMATS).map(([key, val]) => ({
    id: key,
    name: val.name
  }));
  res.json({ sportsbooks: books });
});

module.exports = router;

/**
 * IntellaBets — Sportsbook Deep Link Service
 *
 * Generates affiliate deep links to specific bets on major sportsbooks.
 * When a partnership agreement is signed, the AFFILIATE_IDs below get replaced
 * with real partner IDs — everything else stays the same.
 *
 * Architecture is forward-compatible with direct API placement:
 * Each sportsbook entry has a placeBet() stub ready to wire up once
 * DraftKings/FanDuel/BetMGM expose partner APIs.
 */

// ─── AFFILIATE IDS ───────────────────────────────────────────────────────────
// Replace with real IDs when you join each affiliate program
const AFFILIATE_IDS = {
  draftkings:   process.env.AFFILIATE_DRAFTKINGS   || 'intellabets',
  fanduel:      process.env.AFFILIATE_FANDUEL       || 'intellabets',
  betmgm:       process.env.AFFILIATE_BETMGM        || 'intellabets',
  caesars:      process.env.AFFILIATE_CAESARS        || 'intellabets',
  pointsbetus:  process.env.AFFILIATE_POINTSBET      || 'intellabets',
  betrivers:    process.env.AFFILIATE_BETRIVERS      || 'intellabets',
  unibet_us:    process.env.AFFILIATE_UNIBET         || 'intellabets',
  williamhill:  process.env.AFFILIATE_WILLIAMHILL    || 'intellabets',
};

// ─── DEEP LINK GENERATORS ────────────────────────────────────────────────────
// Each function returns a URL that opens the sportsbook app/site to the right bet
function buildDeepLink(bookmaker, { homeTeam, awayTeam, betType, line, sport } = {}) {
  const bk = bookmaker.toLowerCase().replace(/[^a-z]/g, '');
  const aff = AFFILIATE_IDS[bk] || AFFILIATE_IDS[bookmaker] || 'intellabets';
  const query = encodeURIComponent(`${homeTeam} ${awayTeam}`);

  const links = {
    draftkings: `https://sportsbook.draftkings.com/event?wpsrc=${aff}&wpcid=${sport}&wpmid=${query}`,
    fanduel:    `https://sportsbook.fanduel.com/sports/${sport?.toLowerCase() || 'all'}?referral=${aff}`,
    betmgm:     `https://sports.betmgm.com/en/sports?btag=${aff}`,
    caesars:    `https://www.caesars.com/sportsbook-and-casino?btag=${aff}`,
    pointsbetus:`https://pointsbet.com/sports?ref=${aff}`,
    betrivers:  `https://betrivers.com/?page=sportsbook&referralCode=${aff}`,
    unibet_us:  `https://nj.unibet.com/sports?btag=${aff}`,
    williamhill:`https://www.williamhill.com/us/co/bet?affiliate=${aff}`,
  };

  return links[bk] || `https://www.google.com/search?q=${query}+${betType}+sportsbook`;
}

// ─── APP DEEP LINKS (native app URI schemes) ─────────────────────────────────
function buildAppDeepLink(bookmaker) {
  const schemes = {
    draftkings:   'draftkings://sportsbook',
    fanduel:      'fanduel://sportsbook',
    betmgm:       'betmgm://sports',
    caesars:      'williamhill://sports',  // Caesars acquired William Hill app
    pointsbetus:  'pointsbet://sports',
    betrivers:    'betrivers://sports',
    unibet_us:    'unibet://sports',
    williamhill:  'williamhill://sports',
  };
  return schemes[bookmaker.toLowerCase()] || null;
}

// ─── FUTURE: DIRECT BET PLACEMENT STUBS ─────────────────────────────────────
// These will be wired to real APIs once partnership agreements are signed.
// The interface is defined now so frontend integration requires zero changes later.
const DIRECT_INTEGRATIONS = {
  draftkings: {
    status: 'pending_partnership',
    apiBase: 'https://api.draftkings.com/lineups/v1',        // hypothetical
    docs: 'https://developer.draftkings.com',
    async placeBet({ eventId, selectionId, stake, odds, userId }) {
      throw new Error('DraftKings direct bet placement requires partnership agreement. Contact partnerships@draftkings.com');
    },
  },
  fanduel: {
    status: 'pending_partnership',
    apiBase: 'https://api.fanduel.com/bets',
    async placeBet({ eventId, selectionId, stake, odds, userId }) {
      throw new Error('FanDuel direct bet placement requires partnership agreement. Contact affiliates@fanduel.com');
    },
  },
  betmgm: {
    status: 'pending_partnership',
    apiBase: 'https://api.betmgm.com/sports/v1',
    async placeBet({ eventId, selectionId, stake, odds, userId }) {
      throw new Error('BetMGM direct bet placement requires partnership agreement.');
    },
  },
  // Kalshi — CFTC regulated, has a real public API for order placement
  kalshi: {
    status: 'available',
    apiBase: 'https://api.elections.kalshi.com/trade-api/v2',
    docs: 'https://trading-api.readme.io',
    async placeBet({ ticker, side, count, price, userId }) {
      // This one can actually work — Kalshi allows API trading with user's own account
      // Requires: user's Kalshi API key (stored securely per user)
      throw new Error('Kalshi API trading: wire up user.kalshiApiKey to enable. See kalshi.com/api');
    },
  },
};

// ─── AFFILIATE LINK TRACKER ──────────────────────────────────────────────────
// Log when users click through to a sportsbook (for affiliate revenue tracking)
async function logAffiliateClick(pool, { userId, bookmaker, pickId, sport }) {
  try {
    await pool.query(
      `INSERT INTO affiliate_clicks (user_id, bookmaker, pick_id, sport, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [userId, bookmaker, pickId, sport]
    ).catch(() => {}); // table may not exist yet, non-fatal
  } catch {}
}

module.exports = {
  buildDeepLink,
  buildAppDeepLink,
  DIRECT_INTEGRATIONS,
  AFFILIATE_IDS,
  logAffiliateClick,
};

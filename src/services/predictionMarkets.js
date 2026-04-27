/**
 * IntellaBets — Prediction Markets Service
 *
 * Integrates with:
 *   - Kalshi (CFTC-regulated US prediction market) — kalshi.com/api/v2
 *   - Polymarket (crypto-based global) — clob.polymarket.com
 *   - PredictIt (US, political + sports) — predictit.org/api
 *
 * Architecture is designed to be extensible — add new markets by implementing
 * the standard { id, title, category, yesPrice, noPrice, volume, closes, source } shape.
 */

const axios = require('axios');

// ─── KALSHI ──────────────────────────────────────────────────────────────────
// Kalshi is CFTC-regulated, US-accessible, no API key needed for public markets
const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

// Sports-relevant category slugs on Kalshi
const KALSHI_SPORT_SERIES = [
  'SUPERBOWL',
  'NBAPLAYOFFS',
  'MLBWORLDSERIES',
  'NHLSTANLEYCUP',
  'NCAACHAMPIONSHIP',
  'UFCEVENT',
];

async function getKalshiMarkets(category = null, limit = 20) {
  try {
    const params = {
      limit,
      status: 'open',
      series_ticker: category || undefined,
    };

    const res = await axios.get(`${KALSHI_BASE}/markets`, {
      params,
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });

    const markets = res.data?.markets || [];

    return markets
      .filter(m => m.status === 'open' && m.yes_ask && m.volume_24h > 0)
      .map(m => ({
        id: m.ticker,
        title: m.title,
        subtitle: m.subtitle || '',
        category: 'Prediction',
        sport: detectSport(m.title + ' ' + (m.subtitle || '')),
        source: 'Kalshi',
        sourceUrl: `https://kalshi.com/markets/${m.ticker}`,
        yesPrice: m.yes_ask,          // cents (0–100)
        noPrice: m.no_ask,
        yesPriceFormatted: `${m.yes_ask}¢`,
        noPriceFormatted: `${m.no_ask}¢`,
        impliedProbability: m.yes_ask / 100,
        volume24h: m.volume_24h || 0,
        openInterest: m.open_interest || 0,
        closesAt: m.close_time,
        lastPrice: m.last_price,
        rules: m.rules_primary || '',
        isRegulated: true,
        payoutStructure: '$1 if YES, $0 if NO',
      }));
  } catch (err) {
    console.error('[Kalshi] Error fetching markets:', err.message);
    return [];
  }
}

// ─── POLYMARKET ───────────────────────────────────────────────────────────────
// Polymarket CLOB API — no auth needed for market reads
const POLYMARKET_BASE = 'https://gamma-api.polymarket.com';

async function getPolymarketMarkets(limit = 20) {
  try {
    const res = await axios.get(`${POLYMARKET_BASE}/markets`, {
      params: {
        limit,
        active: true,
        closed: false,
        tag_slug: 'sports',  // sports tag
      },
      timeout: 8000,
    });

    const markets = res.data || [];

    return markets
      .filter(m => m.active && !m.closed && m.volume > 1000)
      .slice(0, limit)
      .map(m => {
        const outcomes = m.tokens || [];
        const yesToken = outcomes.find(t => t.outcome === 'Yes') || outcomes[0];
        const noToken = outcomes.find(t => t.outcome === 'No') || outcomes[1];

        return {
          id: m.id,
          title: m.question,
          subtitle: m.description?.slice(0, 120) || '',
          category: 'Prediction',
          sport: detectSport(m.question),
          source: 'Polymarket',
          sourceUrl: `https://polymarket.com/event/${m.slug}`,
          yesPrice: yesToken ? Math.round(parseFloat(yesToken.price) * 100) : null,
          noPrice: noToken ? Math.round(parseFloat(noToken.price) * 100) : null,
          yesPriceFormatted: yesToken ? `${Math.round(parseFloat(yesToken.price) * 100)}¢` : 'N/A',
          noPriceFormatted: noToken ? `${Math.round(parseFloat(noToken.price) * 100)}¢` : 'N/A',
          impliedProbability: yesToken ? parseFloat(yesToken.price) : null,
          volume24h: m.volumeNum || 0,
          openInterest: m.liquidityNum || 0,
          closesAt: m.endDate,
          isRegulated: false,
          payoutStructure: 'USDC · Crypto-settled',
        };
      });
  } catch (err) {
    console.error('[Polymarket] Error fetching markets:', err.message);
    return [];
  }
}

// ─── PREDICTIT ────────────────────────────────────────────────────────────────
// PredictIt has a public JSON feed
async function getPredictItMarkets() {
  try {
    const res = await axios.get('https://www.predictit.org/api/marketdata/all/', {
      timeout: 8000,
    });

    const markets = res.data?.markets || [];

    // Filter to sports-relevant markets
    const sportKeywords = ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'championship', 'playoff', 'world series', 'stanley cup', 'mvp'];

    return markets
      .filter(m => {
        const lower = m.name.toLowerCase();
        return sportKeywords.some(k => lower.includes(k)) && m.status === 'Open';
      })
      .slice(0, 10)
      .map(m => {
        const contract = m.contracts?.[0] || {};
        return {
          id: String(m.id),
          title: m.name,
          subtitle: contract.name || '',
          category: 'Prediction',
          sport: detectSport(m.name),
          source: 'PredictIt',
          sourceUrl: `https://www.predictit.org/markets/detail/${m.id}`,
          yesPrice: contract.lastTradePrice ? Math.round(contract.lastTradePrice * 100) : null,
          noPrice: contract.lastTradePrice ? Math.round((1 - contract.lastTradePrice) * 100) : null,
          yesPriceFormatted: contract.lastTradePrice ? `${Math.round(contract.lastTradePrice * 100)}¢` : 'N/A',
          noPriceFormatted: null,
          impliedProbability: contract.lastTradePrice,
          volume24h: null,
          closesAt: m.dateEnd,
          isRegulated: true,
          payoutStructure: '$1 if YES · Regulated exchange',
        };
      });
  } catch (err) {
    console.error('[PredictIt] Error fetching markets:', err.message);
    return [];
  }
}

// ─── SPORT DETECTION ─────────────────────────────────────────────────────────
function detectSport(text) {
  const t = text.toLowerCase();
  if (t.includes('nfl') || t.includes('super bowl') || t.includes('football')) return 'NFL';
  if (t.includes('nba') || t.includes('basketball')) return 'NBA';
  if (t.includes('mlb') || t.includes('world series') || t.includes('baseball')) return 'MLB';
  if (t.includes('nhl') || t.includes('stanley cup') || t.includes('hockey')) return 'NHL';
  if (t.includes('ufc') || t.includes('mma') || t.includes('fight')) return 'MMA';
  if (t.includes('ncaa') || t.includes('college')) return 'NCAAB';
  if (t.includes('soccer') || t.includes('premier league') || t.includes('mls')) return 'Soccer';
  if (t.includes('golf') || t.includes('pga')) return 'Golf';
  return 'General';
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
async function getAllPredictionMarkets({ source = 'all', sport = null, limit = 30 } = {}) {
  const fetchers = [];

  if (source === 'all' || source === 'kalshi') fetchers.push(getKalshiMarkets(null, limit));
  if (source === 'all' || source === 'polymarket') fetchers.push(getPolymarketMarkets(limit));
  if (source === 'all' || source === 'predictit') fetchers.push(getPredictItMarkets());

  const results = await Promise.allSettled(fetchers);
  let markets = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Filter by sport if requested
  if (sport && sport !== 'all') {
    markets = markets.filter(m => m.sport?.toLowerCase() === sport.toLowerCase());
  }

  // Sort by volume (highest first)
  markets.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

  return markets.slice(0, limit);
}

module.exports = {
  getAllPredictionMarkets,
  getKalshiMarkets,
  getPolymarketMarkets,
  getPredictItMarkets,
  detectSport,
};

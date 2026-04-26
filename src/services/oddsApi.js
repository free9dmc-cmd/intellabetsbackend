const axios = require('axios');

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.ODDS_API_KEY;

const SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
  'icehockey_nhl',
  'americanfootball_ncaaf',
  'basketball_ncaab',
  'soccer_usa_mls',
  'soccer_epl',
  'mma_mixed_martial_arts'
];

const BOOKMAKERS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'pointsbetus',
  'betrivers',
  'unibet_us',
  'williamhill_us'
];

async function getUpcomingGames(sport = null) {
  try {
    const sportsToFetch = sport ? [sport] : SPORTS;
    const allGames = [];

    for (const s of sportsToFetch) {
      try {
        const response = await axios.get(`${ODDS_API_BASE}/sports/${s}/odds`, {
          params: {
            apiKey: API_KEY,
            regions: 'us',
            markets: 'h2h,spreads,totals',
            bookmakers: BOOKMAKERS.join(','),
            oddsFormat: 'american',
            dateFormat: 'iso'
          }
        });
        allGames.push(...response.data.map(g => ({ ...g, sportKey: s })));
      } catch (err) {
        console.warn(`Failed to fetch odds for ${s}:`, err.message);
      }
    }

    return allGames;
  } catch (error) {
    console.error('Odds API error:', error.message);
    throw error;
  }
}

async function getGameById(gameId, sport) {
  const games = await getUpcomingGames(sport);
  return games.find(g => g.id === gameId) || null;
}

function getBestOdds(game, market = 'h2h') {
  const bestOdds = {};

  for (const bookmaker of game.bookmakers || []) {
    const marketData = bookmaker.markets?.find(m => m.key === market);
    if (!marketData) continue;

    for (const outcome of marketData.outcomes || []) {
      const name = outcome.name;
      if (!bestOdds[name] || outcome.price > bestOdds[name].price) {
        bestOdds[name] = {
          price: outcome.price,
          bookmaker: bookmaker.title,
          bookmakerId: bookmaker.key
        };
      }
    }
  }

  return bestOdds;
}

module.exports = { getUpcomingGames, getGameById, getBestOdds, BOOKMAKERS, SPORTS };

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function generatePick(game, sport) {
  const prompt = `You are an expert sports betting analyst. Analyze this game and provide a betting recommendation.

Game: ${game.home_team} vs ${game.away_team}
Sport: ${sport}
Start Time: ${game.commence_time}
Available Odds:
${JSON.stringify(game.bookmakers?.slice(0, 3), null, 2)}

Provide a detailed betting pick in this exact JSON format:
{
  "gameId": "${game.id}",
  "homeTeam": "${game.home_team}",
  "awayTeam": "${game.away_team}",
  "sport": "${sport}",
  "recommendation": "string (e.g. 'Chicago Bulls -4.5')",
  "betType": "string (spread|moneyline|total)",
  "confidence": number (1-100),
  "valueRating": number (1-10),
  "bestOdds": number (american format),
  "bestBookmaker": "string",
  "reasoning": "string (2-3 sentences explaining the pick)",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskLevel": "string (low|medium|high)"
}

Return ONLY the JSON object, no other text.`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude pick generation error:', error.message);
    throw error;
  }
}

async function buildParlay(picks) {
  const picksText = picks.map((p, i) =>
    `Pick ${i + 1}: ${p.recommendation} (${p.homeTeam} vs ${p.awayTeam}) - Confidence: ${p.confidence}%`
  ).join('\n');

  const prompt = `You are an expert sports betting analyst specializing in parlays.

Individual picks to combine:
${picksText}

Build an optimized parlay recommendation in this exact JSON format:
{
  "parlayLegs": [
    {
      "gameId": "string",
      "recommendation": "string",
      "odds": number,
      "bookmaker": "string"
    }
  ],
  "combinedOdds": number,
  "estimatedPayout": "string (e.g. '$250 on $10 bet')",
  "confidence": number (1-100),
  "reasoning": "string",
  "riskLevel": "string (low|medium|high)"
}

Return ONLY the JSON object.`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude parlay generation error:', error.message);
    throw error;
  }
}

// ─── PREDICTION MARKET ANALYSIS ──────────────────────────────────────────────
async function generateMarketPick(market) {
  const prompt = `You are an expert prediction market analyst. Analyze this prediction market contract and provide a trading recommendation.

Market: ${market.title}
${market.subtitle ? `Details: ${market.subtitle}` : ''}
Source: ${market.source} (${market.isRegulated ? 'CFTC-Regulated' : 'Crypto-settled'})
Sport/Category: ${market.sport || 'General'}
Current YES price: ${market.yesPriceFormatted} (implied probability: ${market.impliedProbability ? Math.round(market.impliedProbability * 100) + '%' : 'N/A'})
Current NO price: ${market.noPriceFormatted}
24h Volume: ${market.volume24h ? '$' + market.volume24h.toLocaleString() : 'N/A'}
Closes: ${market.closesAt || 'Unknown'}
Payout: ${market.payoutStructure}

Analyze this market and provide a recommendation in this exact JSON format:
{
  "marketId": "${market.id}",
  "title": "${market.title.replace(/"/g, "'")}",
  "source": "${market.source}",
  "recommendation": "string (e.g. 'Buy YES at 42¢' or 'Buy NO at 61¢')",
  "position": "string (YES|NO|PASS)",
  "entryPrice": number (in cents, 1-99),
  "targetPrice": number (in cents),
  "confidence": number (1-100),
  "valueRating": number (1-10),
  "impliedProbability": number (0-1, current market price),
  "trueProbability": number (0-1, your estimate of actual probability),
  "edge": number (percentage edge over market, can be negative),
  "reasoning": "string (2-3 sentences explaining the position)",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskLevel": "string (low|medium|high)",
  "marketType": "prediction"
}

If the market offers no clear edge, set position to "PASS" and explain why.
Return ONLY the JSON object, no other text.`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const pick = JSON.parse(jsonMatch[0]);
    pick.sourceUrl = market.sourceUrl;
    pick.closesAt = market.closesAt;
    pick.volume24h = market.volume24h;
    pick.isRegulated = market.isRegulated;
    pick.payoutStructure = market.payoutStructure;
    return pick;
  } catch (error) {
    console.error('Claude market pick generation error:', error.message);
    throw error;
  }
}

module.exports = { generatePick, buildParlay, generateMarketPick };

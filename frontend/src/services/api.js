import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://intellabetsbackend-production.up.railway.app';

async function getToken() {
  return await AsyncStorage.getItem('authToken');
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export const api = {
  register: (email, password, name) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request('/auth/me'),

  // Picks
  getPicks: (sport) =>
    request(`/picks${sport ? `?sport=${sport}` : ''}`),

  getPickPreview: () => request('/picks/preview'),

  // Parlays
  buildParlay: (picks) =>
    request('/parlays/build', {
      method: 'POST',
      body: JSON.stringify({ picks }),
    }),

  parlayFromPicks: (count, sport) =>
    request('/parlays/from-picks', {
      method: 'POST',
      body: JSON.stringify({ count, sport }),
    }),

  // Bet Slip
  formatBetSlip: (pick, bookmaker, stake) =>
    request('/betslip/format', {
      method: 'POST',
      body: JSON.stringify({ pick, bookmaker, stake }),
    }),

  formatParlaySlip: (parlay, stake) =>
    request('/betslip/parlay', {
      method: 'POST',
      body: JSON.stringify({ parlay, stake }),
    }),

  getSportsbooks: () => request('/betslip/sportsbooks'),

  // Prediction Markets
  getMarkets: (source, sport) => {
    const params = new URLSearchParams();
    if (source && source !== 'all') params.append('source', source);
    if (sport && sport !== 'all') params.append('sport', sport);
    const qs = params.toString();
    return request(`/markets${qs ? '?' + qs : ''}`);
  },

  getMarketPreview: () => request('/markets/preview'),

  getMarketSources: () => request('/markets/sources'),

  // Subscriptions
  getPlans: () => request('/subscriptions/plans'),

  getSubscriptionStatus: () => request('/subscriptions/status'),

  verifySubscription: (productId, transactionId, platform) =>
    request('/subscriptions/verify', {
      method: 'POST',
      body: JSON.stringify({ productId, transactionId, platform }),
    }),
};

/**
 * MarketsScreen — Prediction Market AI Picks
 *
 * Shows AI-analyzed picks from Kalshi, Polymarket, and PredictIt.
 * Each card shows the market question, AI recommendation (YES/NO),
 * implied probability, edge, and a deep link to the exchange.
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { api } from '../services/api';

const SOURCE_FILTERS = [
  { id: 'all', label: 'All Markets' },
  { id: 'kalshi', label: '🇺🇸 Kalshi' },
  { id: 'polymarket', label: '🌐 Polymarket' },
  { id: 'predictit', label: '📊 PredictIt' },
];

const SPORT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'NFL', label: '🏈' },
  { id: 'NBA', label: '🏀' },
  { id: 'MLB', label: '⚾' },
  { id: 'NHL', label: '🏒' },
  { id: 'MMA', label: '🥊' },
];

function EdgeBar({ edge }) {
  if (edge == null) return null;
  const pct = Math.abs(edge);
  const isPositive = edge > 0;
  return (
    <View style={styles.edgeBar}>
      <Text style={styles.edgeLabel}>Edge</Text>
      <View style={styles.edgeTrack}>
        <View
          style={[
            styles.edgeFill,
            {
              width: `${Math.min(pct * 3, 100)}%`,
              backgroundColor: isPositive ? '#22c55e' : '#ef4444',
            },
          ]}
        />
      </View>
      <Text style={[styles.edgeValue, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
        {isPositive ? '+' : ''}{edge.toFixed(1)}%
      </Text>
    </View>
  );
}

function MarketCard({ pick, onPress }) {
  const isYes = pick.position === 'YES';
  const posColor = isYes ? '#22c55e' : '#ef4444';
  const confColor =
    pick.confidence >= 75 ? '#22c55e' : pick.confidence >= 60 ? '#f0c040' : '#ef4444';

  const sourceColors = {
    Kalshi: '#00b4d8',
    Polymarket: '#8b5cf6',
    PredictIt: '#f59e0b',
  };
  const sourceColor = sourceColors[pick.source] || '#888';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(pick)} activeOpacity={0.8}>
      {/* Source badge */}
      <View style={[styles.sourceBadge, { backgroundColor: sourceColor + '22', borderColor: sourceColor + '55' }]}>
        <Text style={[styles.sourceBadgeText, { color: sourceColor }]}>
          {pick.source} {pick.isRegulated ? '🇺🇸' : '🌐'}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={3}>{pick.title}</Text>

      {/* Position + Confidence row */}
      <View style={styles.posRow}>
        <View style={[styles.posTag, { backgroundColor: posColor + '22', borderColor: posColor }]}>
          <Text style={[styles.posText, { color: posColor }]}>
            {pick.position === 'YES' ? '▲ BUY YES' : '▼ BUY NO'} @ {pick.entryPrice}¢
          </Text>
        </View>
        <Text style={[styles.confText, { color: confColor }]}>{pick.confidence}%</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Market Price</Text>
          <Text style={styles.statValue}>{pick.impliedProbability != null ? Math.round(pick.impliedProbability * 100) + '¢' : '—'}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>AI Est.</Text>
          <Text style={[styles.statValue, { color: '#f0c040' }]}>
            {pick.trueProbability != null ? Math.round(pick.trueProbability * 100) + '%' : '—'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>
            {pick.volume24h ? '$' + (pick.volume24h >= 1000 ? (pick.volume24h / 1000).toFixed(1) + 'k' : pick.volume24h) : '—'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Risk</Text>
          <Text style={[styles.statValue, {
            color: pick.riskLevel === 'low' ? '#22c55e' : pick.riskLevel === 'medium' ? '#f0c040' : '#ef4444'
          }]}>{pick.riskLevel || '—'}</Text>
        </View>
      </View>

      <EdgeBar edge={pick.edge} />

      {/* Reasoning preview */}
      <Text style={styles.reasoning} numberOfLines={2}>{pick.reasoning}</Text>

      {/* Tap to trade */}
      <Text style={styles.tapHint}>Tap for full analysis & trading link →</Text>
    </TouchableOpacity>
  );
}

export default function MarketsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState('all');
  const [sport, setSport] = useState('all');
  const [error, setError] = useState(null);
  const [locked, setLocked] = useState(false);

  const tier = user?.tier || 'free';

  const loadMarkets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getMarkets(source, sport === 'all' ? null : sport);
      setPicks(data.picks || []);
      setLocked(false);
    } catch (err) {
      if (err.message?.includes('SUBSCRIPTION_REQUIRED') || err.message?.includes('subscription')) {
        setLocked(true);
        // Load blurred preview
        try {
          const preview = await api.getMarketPreview();
          setPicks(preview.picks || []);
        } catch {}
      } else {
        setError(err.message || 'Failed to load prediction markets');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [source, sport]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  const handleCardPress = (pick) => {
    if (locked || pick.blurred) {
      Alert.alert(
        '🔒 Unlock Prediction Markets',
        'Prediction market picks require a Basic subscription or higher.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }
    navigation.navigate('MarketDetail', { pick });
  };

  return (
    <View style={styles.container}>
      {/* Source filter */}
      <FlatList
        horizontal
        data={SOURCE_FILTERS}
        keyExtractor={i => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, source === item.id && styles.filterChipActive]}
            onPress={() => setSource(item.id)}
          >
            <Text style={[styles.filterChipText, source === item.id && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Sport filter */}
      <FlatList
        horizontal
        data={SPORT_FILTERS}
        keyExtractor={i => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingTop: 0 }]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.sportChip, sport === item.id && styles.sportChipActive]}
            onPress={() => setSport(item.id)}
          >
            <Text style={[styles.sportChipText, sport === item.id && styles.sportChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Lock banner for free users */}
      {locked && (
        <TouchableOpacity
          style={styles.lockBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.lockBannerText}>
            🔒 Prediction market picks require a subscription — tap to upgrade
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f0c040" />
          <Text style={styles.loadingText}>Analyzing prediction markets…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadMarkets()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : picks.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No open markets right now.</Text>
          <Text style={styles.emptySubText}>Check back soon — Kalshi & Polymarket update frequently.</Text>
        </View>
      ) : (
        <FlatList
          data={picks}
          keyExtractor={(p, i) => p.marketId || String(i)}
          renderItem={({ item }) => <MarketCard pick={item} onPress={handleCardPress} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMarkets(true)} tintColor="#f0c040" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  filterChipActive: { backgroundColor: '#f0c040', borderColor: '#f0c040' },
  filterChipText: { color: '#888', fontSize: 13, fontWeight: '700' },
  filterChipTextActive: { color: '#0a0a0a' },
  sportChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#1f1f1f',
  },
  sportChipActive: { backgroundColor: '#f0c04020', borderColor: '#f0c040' },
  sportChipText: { color: '#666', fontSize: 13, fontWeight: '700' },
  sportChipTextActive: { color: '#f0c040' },

  lockBanner: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1a1000', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#f0c04044',
  },
  lockBannerText: { color: '#f0c040', fontSize: 13, textAlign: 'center', fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#555', marginTop: 12, fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1a1a1a', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  retryText: { color: '#f0c040', fontWeight: '700' },
  emptyText: { color: '#888', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#444', fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: '#141414', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#222',
  },
  sourceBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, marginBottom: 10,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 12, lineHeight: 22 },
  posRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  posTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  posText: { fontSize: 13, fontWeight: '800' },
  confText: { fontSize: 15, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: '#0f0f0f', borderRadius: 8, padding: 8, alignItems: 'center' },
  statLabel: { color: '#555', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  statValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  edgeBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  edgeLabel: { color: '#555', fontSize: 11, fontWeight: '700', width: 32 },
  edgeTrack: { flex: 1, height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
  edgeFill: { height: '100%', borderRadius: 3 },
  edgeValue: { fontSize: 12, fontWeight: '700', width: 46, textAlign: 'right' },
  reasoning: { color: '#888', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  tapHint: { color: '#444', fontSize: 12, textAlign: 'right' },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const SPORT_FILTERS = [
  { label: 'All', value: null },
  { label: 'NFL', value: 'americanfootball_nfl' },
  { label: 'NBA', value: 'basketball_nba' },
  { label: 'MLB', value: 'baseball_mlb' },
  { label: 'NHL', value: 'icehockey_nhl' },
  { label: 'MMA', value: 'mma_mixed_martial_arts' },
];

const CONFIDENCE_COLOR = (c) => c >= 75 ? '#4caf50' : c >= 60 ? '#f0c040' : '#ff5722';
const RISK_COLOR = { low: '#4caf50', medium: '#f0c040', high: '#ff5722' };

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sport, setSport] = useState(null);
  const [picksInfo, setPicksInfo] = useState(null);
  const [error, setError] = useState(null);

  const loadPicks = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await api.getPicks(sport);
      setPicks(data.picks || []);
      setPicksInfo({ used: data.picksUsed, limit: data.limit, tier: data.tier });
    } catch (err) {
      if (err.message?.includes('limit')) {
        setError('pick_limit');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sport]);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const renderPick = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PickDetail', { pick: item })}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.sport}>{formatSport(item.sport)}</Text>
        <View style={[styles.badge, { backgroundColor: RISK_COLOR[item.riskLevel] + '22' }]}>
          <Text style={[styles.badgeText, { color: RISK_COLOR[item.riskLevel] }]}>
            {item.riskLevel?.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.teams}>{item.homeTeam} vs {item.awayTeam}</Text>
      <Text style={styles.recommendation}>{item.recommendation}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Confidence</Text>
          <Text style={[styles.statValue, { color: CONFIDENCE_COLOR(item.confidence) }]}>
            {item.confidence}%
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Value</Text>
          <Text style={styles.statValue}>{item.valueRating}/10</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Best Odds</Text>
          <Text style={styles.statValue}>
            {item.bestOdds > 0 ? `+${item.bestOdds}` : item.bestOdds}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Book</Text>
          <Text style={styles.statValue} numberOfLines={1}>{item.bestBookmaker || '—'}</Text>
        </View>
      </View>

      <Text style={styles.reasoning} numberOfLines={2}>{item.reasoning}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.tapHint}>Tap to build bet slip →</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f0c040" />
        <Text style={styles.loadingText}>Generating AI picks...</Text>
      </View>
    );
  }

  if (error === 'pick_limit') {
    return (
      <View style={styles.center}>
        <Text style={styles.limitEmoji}>🔒</Text>
        <Text style={styles.limitTitle}>Pick Limit Reached</Text>
        <Text style={styles.limitSub}>
          {user?.subscription_tier === 'basic'
            ? 'Basic plan: 2 picks every 3 days'
            : 'Upgrade for more picks'}
        </Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏆 Today's Picks</Text>
          {picksInfo && (
            <Text style={styles.headerSub}>
              {picksInfo.limit === 'unlimited'
                ? '∞ picks remaining'
                : `${picksInfo.used}/${picksInfo.limit} picks used · ${picksInfo.tier}`}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Parlay')} style={styles.parlayBtn}>
          <Text style={styles.parlayBtnText}>Parlay →</Text>
        </TouchableOpacity>
      </View>

      {/* Sport filter */}
      <FlatList
        data={SPORT_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.label}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSport(item.value)}
            style={[styles.filterChip, sport === item.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, sport === item.value && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Picks */}
      <FlatList
        data={picks}
        keyExtractor={(item, i) => item.gameId || String(i)}
        renderItem={renderPick}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPicks(true); }} tintColor="#f0c040" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No picks available right now.</Text>
            <Text style={styles.emptySubText}>Pull down to refresh.</Text>
          </View>
        }
      />
    </View>
  );
}

function formatSport(key) {
  const map = {
    americanfootball_nfl: 'NFL', basketball_nba: 'NBA', baseball_mlb: 'MLB',
    icehockey_nhl: 'NHL', mma_mixed_martial_arts: 'MMA', soccer_usa_mls: 'MLS',
    americanfootball_ncaaf: 'NCAAF', basketball_ncaab: 'NCAAB', soccer_epl: 'EPL',
  };
  return map[key] || key || 'Sports';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#888', marginTop: 16, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  parlayBtn: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#f0c040' },
  parlayBtnText: { color: '#f0c040', fontSize: 13, fontWeight: '600' },
  filterList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  filterChipActive: { backgroundColor: '#f0c040', borderColor: '#f0c040' },
  filterChipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: '#000', fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#141414', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sport: { fontSize: 12, fontWeight: '700', color: '#f0c040', letterSpacing: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  teams: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  recommendation: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#666', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  reasoning: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 12 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
  tapHint: { fontSize: 12, color: '#f0c040', fontWeight: '600', textAlign: 'right' },
  limitEmoji: { fontSize: 60, marginBottom: 16 },
  limitTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  limitSub: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  upgradeBtn: { backgroundColor: '#f0c040', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  upgradeBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#888', fontSize: 16 },
  emptySubText: { color: '#555', fontSize: 13, marginTop: 8 },
});

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Share, Alert, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { api } from '../services/api';

const SPORTSBOOKS = [
  { id: 'draftkings', name: 'DraftKings' },
  { id: 'fanduel', name: 'FanDuel' },
  { id: 'betmgm', name: 'BetMGM' },
  { id: 'caesars', name: 'Caesars' },
  { id: 'pointsbetus', name: 'PointsBet' },
  { id: 'betrivers', name: 'BetRivers' },
  { id: 'unibet_us', name: 'Unibet' },
  { id: 'williamhill_us', name: 'William Hill' },
];

export default function PickDetailScreen({ route, navigation }) {
  const { pick } = route.params;
  const [selectedBook, setSelectedBook] = useState('draftkings');
  const [stake, setStake] = useState(10);
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  const confidence = pick.confidence || 0;
  const confColor = confidence >= 75 ? '#4caf50' : confidence >= 60 ? '#f0c040' : '#ff5722';

  async function generateSlip() {
    setLoading(true);
    try {
      const data = await api.formatBetSlip(pick, selectedBook, stake);
      setSlip(data.slip);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function shareSlip() {
    if (!slip) return;
    try {
      await Share.share({ message: slip, title: 'IntellaBets Pick' });
    } catch {}
  }

  const selectedBookName = SPORTSBOOKS.find(b => b.id === selectedBook)?.name || 'DraftKings';
  const odds = pick.bestOdds || -110;
  const oddsDisplay = odds > 0 ? `+${odds}` : `${odds}`;
  const decimal = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
  const payout = (stake * decimal).toFixed(2);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Pick Header */}
        <View style={styles.header}>
          <Text style={styles.sportLabel}>{formatSport(pick.sport)}</Text>
          <Text style={styles.teams}>{pick.homeTeam} vs {pick.awayTeam}</Text>
          <Text style={styles.recommendation}>{pick.recommendation}</Text>
          <Text style={styles.betType}>{pick.betType?.toUpperCase()}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Confidence" value={`${confidence}%`} color={confColor} />
          <StatBox label="Value Rating" value={`${pick.valueRating}/10`} color="#f0c040" />
          <StatBox label="Best Odds" value={oddsDisplay} color="#fff" />
          <StatBox label="Risk Level" value={pick.riskLevel?.toUpperCase()} color={pick.riskLevel === 'low' ? '#4caf50' : pick.riskLevel === 'medium' ? '#f0c040' : '#ff5722'} />
        </View>

        {/* Best Book */}
        {pick.bestBookmaker && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Line</Text>
            <View style={styles.bookHighlight}>
              <Text style={styles.bookName}>{pick.bestBookmaker}</Text>
              <Text style={styles.bookOdds}>{oddsDisplay}</Text>
            </View>
          </View>
        )}

        {/* Reasoning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>
          <Text style={styles.reasoning}>{pick.reasoning}</Text>
        </View>

        {/* Key Factors */}
        {pick.keyFactors?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Factors</Text>
            {pick.keyFactors.map((f, i) => (
              <View key={i} style={styles.factor}>
                <Text style={styles.factorBullet}>▶</Text>
                <Text style={styles.factorText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bet Slip Builder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Build Bet Slip</Text>

          <TouchableOpacity style={styles.bookSelector} onPress={() => setShowBookModal(true)}>
            <Text style={styles.bookSelectorLabel}>Sportsbook</Text>
            <Text style={styles.bookSelectorValue}>{selectedBookName} ▾</Text>
          </TouchableOpacity>

          <View style={styles.stakeRow}>
            {[5, 10, 25, 50, 100].map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.stakeChip, stake === s && styles.stakeChipActive]}
                onPress={() => setStake(s)}
              >
                <Text style={[styles.stakeChipText, stake === s && styles.stakeChipTextActive]}>${s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.payoutPreview}>
            <Text style={styles.payoutLabel}>Est. Payout</Text>
            <Text style={styles.payoutValue}>${payout}</Text>
          </View>

          <TouchableOpacity style={styles.generateBtn} onPress={generateSlip} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.generateBtnText}>Generate Bet Slip</Text>}
          </TouchableOpacity>
        </View>

        {/* Generated Slip */}
        {slip && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Bet Slip</Text>
            <View style={styles.slipBox}>
              <Text style={styles.slipText}>{slip}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={shareSlip}>
              <Text style={styles.shareBtnText}>📋 Copy & Share Slip</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sportsbook Modal */}
      <Modal visible={showBookModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowBookModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Sportsbook</Text>
            <FlatList
              data={SPORTSBOOKS}
              keyExtractor={b => b.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, selectedBook === item.id && styles.modalItemActive]}
                  onPress={() => { setSelectedBook(item.id); setShowBookModal(false); }}
                >
                  <Text style={[styles.modalItemText, selectedBook === item.id && styles.modalItemTextActive]}>
                    {item.name}
                  </Text>
                  {selectedBook === item.id && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatSport(key) {
  const map = { americanfootball_nfl: 'NFL', basketball_nba: 'NBA', baseball_mlb: 'MLB', icehockey_nhl: 'NHL', mma_mixed_martial_arts: 'MMA' };
  return map[key] || key || 'Sports';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { backgroundColor: '#141414', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  sportLabel: { fontSize: 11, fontWeight: '700', color: '#f0c040', letterSpacing: 1, marginBottom: 6 },
  teams: { fontSize: 14, color: '#888', marginBottom: 6 },
  recommendation: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  betType: { fontSize: 11, color: '#666', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: '#141414', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#666' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#f0c040', marginBottom: 10, letterSpacing: 0.5 },
  bookHighlight: { backgroundColor: '#141414', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#2a2a2a' },
  bookName: { fontSize: 16, color: '#fff', fontWeight: '600' },
  bookOdds: { fontSize: 16, color: '#4caf50', fontWeight: '700' },
  reasoning: { color: '#bbb', fontSize: 14, lineHeight: 22, backgroundColor: '#141414', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222' },
  factor: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  factorBullet: { color: '#f0c040', fontSize: 10, marginTop: 3 },
  factorText: { color: '#ccc', fontSize: 14, flex: 1, lineHeight: 20 },
  bookSelector: { backgroundColor: '#141414', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 12 },
  bookSelectorLabel: { color: '#888', fontSize: 14 },
  bookSelectorValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  stakeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stakeChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a1a', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  stakeChipActive: { backgroundColor: '#f0c040', borderColor: '#f0c040' },
  stakeChipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  stakeChipTextActive: { color: '#000' },
  payoutPreview: { backgroundColor: '#1a2a1a', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#2a3a2a' },
  payoutLabel: { color: '#888', fontSize: 14 },
  payoutValue: { color: '#4caf50', fontSize: 18, fontWeight: '800' },
  generateBtn: { backgroundColor: '#f0c040', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  slipBox: { backgroundColor: '#111', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 10 },
  slipText: { color: '#ccc', fontSize: 12, fontFamily: 'Courier', lineHeight: 18 },
  shareBtn: { backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f0c040' },
  shareBtnText: { fontSize: 15, fontWeight: '600', color: '#f0c040' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalItemActive: { },
  modalItemText: { fontSize: 16, color: '#ccc' },
  modalItemTextActive: { color: '#f0c040', fontWeight: '700' },
  check: { color: '#f0c040', fontSize: 16, fontWeight: '700' },
});

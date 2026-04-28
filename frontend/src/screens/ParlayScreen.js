import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, Alert
} from 'react-native';
import { api } from '../services/api';

export default function ParlayScreen({ navigation }) {
  const [legCount, setLegCount] = useState(3);
  const [parlay, setParlay] = useState(null);
  const [legs, setLegs] = useState([]);
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stake, setStake] = useState(10);

  async function generateParlay() {
    setLoading(true);
    setParlay(null);
    setSlip(null);
    try {
      const data = await api.parlayFromPicks(legCount);
      setParlay(data.parlay);
      setLegs(data.legs || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function buildSlip() {
    if (!parlay) return;
    try {
      const data = await api.formatParlaySlip(parlay, stake);
      setSlip(data.slip);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function shareSlip() {
    if (!slip) return;
    try {
      await Share.share({ message: slip, title: 'IntellaBets Parlay' });
    } catch {}
  }

  const combinedOdds = parlay?.combinedOdds || 0;
  const oddsDisplay = combinedOdds > 0 ? `+${combinedOdds}` : `${combinedOdds}`;
  const decimal = combinedOdds > 0 ? (combinedOdds / 100) + 1 : (100 / Math.abs(combinedOdds)) + 1;
  const payout = combinedOdds ? (stake * decimal).toFixed(2) : '—';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🎯 Parlay Builder</Text>
        <Text style={styles.subtitle}>AI picks the best legs for your parlay</Text>

        {/* Leg Count Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Number of Legs</Text>
          <View style={styles.legRow}>
            {[2, 3, 4, 5, 6].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.legChip, legCount === n && styles.legChipActive]}
                onPress={() => setLegCount(n)}
              >
                <Text style={[styles.legChipText, legCount === n && styles.legChipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.generateBtn} onPress={generateParlay} disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#000" size="small" />
              <Text style={styles.generateBtnText}> Analyzing games...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>⚡ Generate {legCount}-Leg Parlay</Text>
          )}
        </TouchableOpacity>

        {/* Parlay Result */}
        {parlay && (
          <>
            <View style={styles.parlayCard}>
              <View style={styles.parlayHeader}>
                <Text style={styles.parlayTitle}>{parlay.parlayLegs?.length}-Leg Parlay</Text>
                <View style={[styles.riskBadge, { backgroundColor: parlay.riskLevel === 'low' ? '#1a3a1a' : parlay.riskLevel === 'medium' ? '#3a2a1a' : '#3a1a1a' }]}>
                  <Text style={[styles.riskText, { color: parlay.riskLevel === 'low' ? '#4caf50' : parlay.riskLevel === 'medium' ? '#f0c040' : '#ff5722' }]}>
                    {parlay.riskLevel?.toUpperCase()} RISK
                  </Text>
                </View>
              </View>

              <View style={styles.parlayStats}>
                <View style={styles.parlayStatItem}>
                  <Text style={styles.parlayStatValue}>{oddsDisplay}</Text>
                  <Text style={styles.parlayStatLabel}>Combined Odds</Text>
                </View>
                <View style={styles.parlayStatItem}>
                  <Text style={styles.parlayStatValue}>{parlay.confidence}%</Text>
                  <Text style={styles.parlayStatLabel}>Confidence</Text>
                </View>
              </View>

              <Text style={styles.parlayReasoning}>{parlay.reasoning}</Text>
            </View>

            {/* Individual Legs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Legs</Text>
              {(parlay.parlayLegs || []).map((leg, i) => (
                <View key={i} style={styles.leg}>
                  <View style={styles.legNumber}>
                    <Text style={styles.legNumberText}>{i + 1}</Text>
                  </View>
                  <View style={styles.legContent}>
                    <Text style={styles.legRec}>{leg.recommendation}</Text>
                    <Text style={styles.legBook}>{leg.bookmaker || 'Best available'}</Text>
                  </View>
                  <Text style={styles.legOdds}>
                    {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                  </Text>
                </View>
              ))}
            </View>

            {/* Stake & Slip */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Build Slip</Text>
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

              <View style={styles.payoutRow}>
                <Text style={styles.payoutLabel}>Stake: ${stake}</Text>
                <Text style={styles.payoutArrow}>→</Text>
                <Text style={styles.payoutValue}>Win: ${payout}</Text>
              </View>

              <TouchableOpacity style={styles.slipBtn} onPress={buildSlip}>
                <Text style={styles.slipBtnText}>Generate Bet Slip</Text>
              </TouchableOpacity>
            </View>

            {slip && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Parlay Slip</Text>
                <View style={styles.slipBox}>
                  <Text style={styles.slipText}>{slip}</Text>
                </View>
                <TouchableOpacity style={styles.shareBtn} onPress={shareSlip}>
                  <Text style={styles.shareBtnText}>📋 Copy & Share Parlay</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#f0c040', marginBottom: 10, letterSpacing: 0.5 },
  legRow: { flexDirection: 'row', gap: 10 },
  legChip: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  legChipActive: { backgroundColor: '#f0c040', borderColor: '#f0c040' },
  legChipText: { color: '#888', fontSize: 18, fontWeight: '700' },
  legChipTextActive: { color: '#000' },
  generateBtn: { backgroundColor: '#f0c040', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  parlayCard: { backgroundColor: '#141414', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  parlayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  parlayTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  riskBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  riskText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  parlayStats: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  parlayStatItem: { flex: 1, alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12 },
  parlayStatValue: { fontSize: 22, fontWeight: '800', color: '#f0c040' },
  parlayStatLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  parlayReasoning: { fontSize: 13, color: '#888', lineHeight: 20 },
  leg: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 10, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#222' },
  legNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0c040', alignItems: 'center', justifyContent: 'center' },
  legNumberText: { fontSize: 13, fontWeight: '800', color: '#000' },
  legContent: { flex: 1 },
  legRec: { fontSize: 14, fontWeight: '600', color: '#fff' },
  legBook: { fontSize: 11, color: '#666', marginTop: 2 },
  legOdds: { fontSize: 14, fontWeight: '700', color: '#4caf50' },
  stakeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stakeChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a1a', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  stakeChipActive: { backgroundColor: '#f0c040', borderColor: '#f0c040' },
  stakeChipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  stakeChipTextActive: { color: '#000' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#1a2a1a', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2a3a2a' },
  payoutLabel: { color: '#888', fontSize: 15 },
  payoutArrow: { color: '#666', fontSize: 15 },
  payoutValue: { color: '#4caf50', fontSize: 20, fontWeight: '800' },
  slipBtn: { backgroundColor: '#f0c040', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  slipBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  slipBox: { backgroundColor: '#111', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 10 },
  slipText: { color: '#ccc', fontSize: 12, fontFamily: 'Courier', lineHeight: 18 },
  shareBtn: { backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f0c040' },
  shareBtnText: { fontSize: 15, fontWeight: '600', color: '#f0c040' },
});

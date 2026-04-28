/**
 * MarketDetailScreen — Full AI analysis for a prediction market
 * Shows reasoning, key factors, edge breakdown, and deep link to trade
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Alert, Share,
} from 'react-native';

export default function MarketDetailScreen({ route }) {
  const { pick } = route.params;

  const isYes = pick.position === 'YES';
  const posColor = isYes ? '#22c55e' : '#ef4444';
  const confColor = pick.confidence >= 75 ? '#22c55e' : pick.confidence >= 60 ? '#f0c040' : '#ef4444';

  const sourceColors = { Kalshi: '#00b4d8', Polymarket: '#8b5cf6', PredictIt: '#f59e0b' };
  const sourceColor = sourceColors[pick.source] || '#888';

  const edgeIsPositive = (pick.edge || 0) > 0;

  const handleTrade = async () => {
    if (!pick.sourceUrl) {
      Alert.alert('No link available', 'Visit ' + pick.source + ' directly to trade this market.');
      return;
    }
    const canOpen = await Linking.canOpenURL(pick.sourceUrl);
    if (canOpen) {
      await Linking.openURL(pick.sourceUrl);
    } else {
      Alert.alert('Cannot open link', pick.sourceUrl);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          `🏆 IntellaBets Market Pick\n\n` +
          `${pick.title}\n\n` +
          `AI Recommendation: ${pick.position === 'YES' ? '▲ BUY YES' : '▼ BUY NO'} @ ${pick.entryPrice}¢\n` +
          `Confidence: ${pick.confidence}%\n` +
          `Edge: ${pick.edge != null ? (pick.edge > 0 ? '+' : '') + pick.edge.toFixed(1) + '%' : 'N/A'}\n\n` +
          `Source: ${pick.source}${pick.sourceUrl ? '\n' + pick.sourceUrl : ''}\n\n` +
          `Powered by IntellaBets AI`,
      });
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Source tag */}
      <View style={[styles.sourceTag, { backgroundColor: sourceColor + '22', borderColor: sourceColor + '55' }]}>
        <Text style={[styles.sourceTagText, { color: sourceColor }]}>
          {pick.source} {pick.isRegulated ? '🇺🇸 Regulated' : '🌐 Unregulated'}
        </Text>
      </View>

      {/* Market question */}
      <Text style={styles.title}>{pick.title}</Text>

      {/* Position card */}
      <View style={[styles.posCard, { borderColor: posColor + '55' }]}>
        <View style={styles.posCardTop}>
          <Text style={[styles.posLabel, { color: posColor }]}>
            {isYes ? '▲ BUY YES' : '▼ BUY NO'}
          </Text>
          <Text style={[styles.posConf, { color: confColor }]}>{pick.confidence}% Confidence</Text>
        </View>
        <Text style={[styles.posPrice, { color: posColor }]}>Entry: {pick.entryPrice}¢</Text>
        {pick.targetPrice && (
          <Text style={styles.posTarget}>Target: {pick.targetPrice}¢ → ${(pick.targetPrice / 100).toFixed(2)} payout per contract</Text>
        )}
        <Text style={styles.payoutNote}>{pick.payoutStructure}</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Market Price</Text>
          <Text style={styles.statValue}>
            {pick.impliedProbability != null ? Math.round(pick.impliedProbability * 100) + '¢' : '—'}
          </Text>
          <Text style={styles.statSub}>
            {pick.impliedProbability != null ? Math.round(pick.impliedProbability * 100) + '% implied' : ''}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>AI Estimate</Text>
          <Text style={[styles.statValue, { color: '#f0c040' }]}>
            {pick.trueProbability != null ? Math.round(pick.trueProbability * 100) + '%' : '—'}
          </Text>
          <Text style={styles.statSub}>true probability</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Edge</Text>
          <Text style={[styles.statValue, { color: edgeIsPositive ? '#22c55e' : '#ef4444' }]}>
            {pick.edge != null ? (edgeIsPositive ? '+' : '') + pick.edge.toFixed(1) + '%' : '—'}
          </Text>
          <Text style={styles.statSub}>{edgeIsPositive ? 'favorable' : 'unfavorable'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Value</Text>
          <Text style={[styles.statValue, { color: '#f0c040' }]}>{pick.valueRating || '—'}/10</Text>
        </View>
      </View>

      {/* Volume + closes */}
      <View style={styles.infoRow}>
        {pick.volume24h != null && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>24h Volume</Text>
            <Text style={styles.infoValue}>${pick.volume24h.toLocaleString()}</Text>
          </View>
        )}
        {pick.closesAt && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Market Closes</Text>
            <Text style={styles.infoValue}>
              {new Date(pick.closesAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        )}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Risk Level</Text>
          <Text style={[styles.infoValue, {
            color: pick.riskLevel === 'low' ? '#22c55e' : pick.riskLevel === 'medium' ? '#f0c040' : '#ef4444',
          }]}>
            {pick.riskLevel ? pick.riskLevel.charAt(0).toUpperCase() + pick.riskLevel.slice(1) : '—'}
          </Text>
        </View>
      </View>

      {/* AI Reasoning */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Reasoning</Text>
        <Text style={styles.reasoning}>{pick.reasoning}</Text>
      </View>

      {/* Key Factors */}
      {pick.keyFactors?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Factors</Text>
          {pick.keyFactors.map((f, i) => (
            <View key={i} style={styles.factorRow}>
              <Text style={styles.factorBullet}>•</Text>
              <Text style={styles.factorText}>{f}</Text>
            </View>
          ))}
        </View>
      )}

      {/* How prediction markets work */}
      <View style={[styles.section, styles.explainerBox]}>
        <Text style={[styles.sectionTitle, { color: sourceColor }]}>How {pick.source} Works</Text>
        <Text style={styles.explainerText}>
          {pick.source === 'Kalshi'
            ? 'Kalshi is a CFTC-regulated US exchange. Each contract costs up to $1 and pays $1 if the outcome is YES. You can sell before resolution to lock in profits. No crypto required — USD only.'
            : pick.source === 'Polymarket'
            ? 'Polymarket is a global prediction market settled in USDC (a crypto stablecoin). Each YES share pays $1 USDC if the outcome is correct. Requires a crypto wallet. Not available to US residents per Polymarket TOS.'
            : 'PredictIt is a US-regulated research exchange. Each share trades between $0.01–$0.99. A $1 payout if YES. Note: 10% fee on winnings, 5% withdrawal fee.'}
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠ Prediction market positions are speculative. IntellaBets AI analysis is for
          informational purposes only. Always research before trading. Past performance
          does not guarantee future results.
        </Text>
      </View>

      {/* Action buttons */}
      <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: posColor }]} onPress={handleTrade}>
        <Text style={styles.tradeBtnText}>
          Trade on {pick.source} →
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Text style={styles.shareBtnText}>↗ Share This Pick</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 16, paddingBottom: 48 },

  sourceTag: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, marginBottom: 12,
  },
  sourceTagText: { fontSize: 12, fontWeight: '700' },

  title: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 16 },

  posCard: {
    backgroundColor: '#141414', borderRadius: 14, padding: 16,
    borderWidth: 1, marginBottom: 16,
  },
  posCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  posLabel: { fontSize: 20, fontWeight: '900' },
  posConf: { fontSize: 14, fontWeight: '700' },
  posPrice: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  posTarget: { color: '#888', fontSize: 13, marginBottom: 4 },
  payoutNote: { color: '#555', fontSize: 12 },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  statBox: {
    flex: 1, minWidth: '22%', backgroundColor: '#141414', borderRadius: 10,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#222',
  },
  statLabel: { color: '#555', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 17, fontWeight: '800' },
  statSub: { color: '#444', fontSize: 10, marginTop: 2 },

  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  infoItem: {
    flex: 1, minWidth: '30%', backgroundColor: '#141414', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#222',
  },
  infoLabel: { color: '#555', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '700' },

  section: { backgroundColor: '#141414', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  sectionTitle: { color: '#f0c040', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  reasoning: { color: '#ccc', fontSize: 14, lineHeight: 22 },
  factorRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  factorBullet: { color: '#f0c040', fontWeight: '700' },
  factorText: { color: '#ccc', fontSize: 14, flex: 1, lineHeight: 20 },

  explainerBox: { borderColor: '#1a1a2a' },
  explainerText: { color: '#aaa', fontSize: 13, lineHeight: 20 },

  disclaimer: { padding: 12, marginBottom: 16 },
  disclaimerText: { color: '#444', fontSize: 12, lineHeight: 18, textAlign: 'center' },

  tradeBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  tradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  shareBtn: {
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a',
  },
  shareBtnText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
});

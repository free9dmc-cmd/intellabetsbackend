import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { verifySubscription } from '../services/api';
import {
  getProductPrices,
  purchaseTier,
  restorePurchases,
  initializePurchases,
} from '../services/iap';

const PLANS = [
  {
    tier: 'basic',
    name: 'Basic',
    defaultPrice: '$20/mo',
    color: '#60a5fa',
    description: 'Perfect for casual bettors',
    features: [
      '2 AI picks every 3 days',
      'Bet slip formatting',
      'All 8 sportsbooks',
      'Parlay builder',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    defaultPrice: '$50/mo',
    color: '#f0c040',
    description: 'For serious sports bettors',
    popular: true,
    features: [
      '10 AI picks per day',
      'Priority AI analysis',
      'Parlay builder (6 legs)',
      'All sports coverage',
      'Bet slip formatting',
    ],
  },
  {
    tier: 'elite',
    name: 'Elite',
    defaultPrice: '$200/mo',
    color: '#a78bfa',
    description: 'Unlimited edge, every day',
    features: [
      'Unlimited AI picks daily',
      'All sports + early access',
      'Advanced parlay strategies',
      'Highest confidence model',
      'VIP support',
    ],
  },
];

export default function SubscriptionScreen() {
  const { user, refreshUser } = useContext(AuthContext);
  const [productPrices, setProductPrices] = useState({});
  const [purchasing, setPurchasing] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [iapReady, setIapReady] = useState(false);
  const [iapError, setIapError] = useState(null);

  const currentTier = user?.tier || 'free';

  useEffect(() => {
    async function setup() {
      if (!user?.id) return;
      try {
        await initializePurchases(user.id);
        const prices = await getProductPrices();
        setProductPrices(prices);
        setIapReady(true);
      } catch (err) {
        console.error('IAP setup error:', err);
        setIapError('Store unavailable. Try again later.');
        setIapReady(true);
      }
    }
    setup();
  }, [user?.id]);

  const handlePurchase = useCallback(async (tier) => {
    if (tier === currentTier) {
      Alert.alert('Already Subscribed', `You're already on the ${tier} plan.`);
      return;
    }

    setPurchasing(tier);
    try {
      const result = await purchaseTier(tier);

      if (result.cancelled) return;

      if (!result.success) {
        Alert.alert('Purchase Failed', result.error || 'Something went wrong. Please try again.');
        return;
      }

      // Sync with our backend to get updated JWT
      try {
        await verifySubscription({
          tier: result.tier || tier,
          transactionId: result.customerInfo?.originalAppUserId || `rc-${Date.now()}`,
          platform: 'ios',
        });
        await refreshUser();
        Alert.alert(
          '🎉 Welcome to ' + tier.charAt(0).toUpperCase() + tier.slice(1) + '!',
          'Your subscription is now active.',
          [{ text: "Let's Go!" }]
        );
      } catch (backendErr) {
        console.error('Backend verify error:', backendErr);
        await refreshUser();
        Alert.alert(
          'Purchase Successful',
          'Subscription active. If pick limits look wrong, tap "Restore Purchases".',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  }, [currentTier, refreshUser]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.tier !== 'free') {
        try {
          await verifySubscription({
            tier: result.tier,
            transactionId: `restore-${Date.now()}`,
            platform: 'ios',
          });
          await refreshUser();
          Alert.alert('Purchases Restored', `Your ${result.tier} subscription has been restored.`);
        } catch {
          await refreshUser();
          Alert.alert('Restored', `Your ${result.tier} plan is active.`);
        }
      } else {
        Alert.alert('No Purchases Found', 'No active subscriptions found for this Apple ID.');
      }
    } catch (err) {
      Alert.alert('Restore Failed', err.message || 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  }, [refreshUser]);

  const priceFor = (tier) =>
    productPrices[tier]?.price || PLANS.find(p => p.tier === tier)?.defaultPrice || '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🏆</Text>
        <Text style={styles.headerTitle}>Upgrade IntellaBets</Text>
        <Text style={styles.headerSub}>AI-powered picks. Real edge. Win more.</Text>
      </View>

      {currentTier !== 'free' && (
        <View style={styles.currentBanner}>
          <Text style={styles.currentBannerText}>
            ✅ Current plan:{' '}
            <Text style={{ color: '#f0c040', fontWeight: '700' }}>
              {currentTier.toUpperCase()}
            </Text>
          </Text>
        </View>
      )}

      {iapError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠ {iapError}</Text>
        </View>
      )}

      {PLANS.map((plan) => {
        const isActive = currentTier === plan.tier;
        const isLoading = purchasing === plan.tier;

        return (
          <View
            key={plan.tier}
            style={[
              styles.planCard,
              { borderColor: isActive ? plan.color : plan.popular ? plan.color + '55' : '#222' },
            ]}
          >
            {plan.popular && (
              <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}
            {isActive && (
              <View style={[styles.activeBadge, { backgroundColor: plan.color }]}>
                <Text style={styles.activeBadgeText}>YOUR PLAN</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                <Text style={styles.planDesc}>{plan.description}</Text>
              </View>
              <Text style={styles.planPrice}>{priceFor(plan.tier)}</Text>
            </View>

            <View style={styles.featureList}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, { color: plan.color }]}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.subscribeBtn,
                { backgroundColor: isActive ? '#1a1a1a' : plan.color },
                isActive && { borderWidth: 1, borderColor: plan.color },
                (isLoading || !iapReady) && { opacity: 0.6 },
              ]}
              onPress={() => handlePurchase(plan.tier)}
              disabled={isActive || isLoading || !iapReady || !!purchasing}
            >
              {isLoading ? (
                <ActivityIndicator color={isActive ? plan.color : '#0a0a0a'} />
              ) : (
                <Text style={[styles.subscribeBtnText, { color: isActive ? plan.color : '#0a0a0a' }]}>
                  {isActive
                    ? '✓ Current Plan'
                    : !iapReady
                    ? 'Loading Store…'
                    : currentTier !== 'free'
                    ? `Switch to ${plan.name}`
                    : `Subscribe — ${priceFor(plan.tier)}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color="#888" size="small" />
        ) : (
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.legal}>
        Subscriptions auto-renew monthly. Cancel anytime in iOS Settings → Apple ID →
        Subscriptions. Payment charged to your Apple ID account. Prices in USD.
      </Text>

      <View style={styles.legalLinks}>
        <TouchableOpacity onPress={() => Alert.alert('Privacy', 'Visit intellabets.com/privacy')}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.legalDot}>·</Text>
        <TouchableOpacity onPress={() => Alert.alert('Terms', 'Visit intellabets.com/terms')}>
          <Text style={styles.legalLink}>Terms of Use</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 16, paddingBottom: 48 },
  header: { alignItems: 'center', paddingVertical: 24 },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 15, color: '#888', textAlign: 'center' },
  currentBanner: {
    backgroundColor: '#1a2a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#22c55e44',
    alignItems: 'center',
  },
  currentBannerText: { color: '#aaa', fontSize: 14 },
  errorBanner: {
    backgroundColor: '#2a1a0a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0c04044',
  },
  errorBannerText: { color: '#f0c040', fontSize: 13 },
  planCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 10,
  },
  popularBadgeText: { fontSize: 10, fontWeight: '800', color: '#0a0a0a', letterSpacing: 1 },
  activeBadge: {
    position: 'absolute', top: 0, left: 0,
    paddingHorizontal: 12, paddingVertical: 5, borderBottomRightRadius: 10, opacity: 0.9,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#0a0a0a', letterSpacing: 1 },
  planHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16, marginTop: 4,
  },
  planName: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  planDesc: { fontSize: 13, color: '#888' },
  planPrice: { fontSize: 20, fontWeight: '800', color: '#fff' },
  featureList: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureCheck: { fontSize: 14, fontWeight: '700', width: 22 },
  featureText: { fontSize: 14, color: '#ccc', flex: 1 },
  subscribeBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  subscribeBtnText: { fontSize: 15, fontWeight: '700' },
  restoreBtn: { alignItems: 'center', paddingVertical: 14, marginBottom: 16 },
  restoreBtnText: { color: '#555', fontSize: 14, textDecorationLine: 'underline' },
  legal: {
    color: '#444', fontSize: 11, textAlign: 'center',
    lineHeight: 16, marginBottom: 12, paddingHorizontal: 8,
  },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  legalLink: { color: '#555', fontSize: 12, textDecorationLine: 'underline' },
  legalDot: { color: '#333', fontSize: 12, marginHorizontal: 8 },
});

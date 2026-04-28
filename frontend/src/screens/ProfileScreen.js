import React, { useContext, useState, useEffect } from 'react';
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
import { getSubscriptionStatus } from '../services/api';

const TIER_COLORS = {
  free: '#888888',
  basic: '#60a5fa',
  pro: '#f0c040',
  elite: '#a78bfa',
};

const TIER_LABELS = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  elite: 'Elite',
};

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await getSubscriptionStatus();
      setSubStatus(status);
    } catch (err) {
      console.log('Status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const tier = user?.tier || 'free';
  const tierColor = TIER_COLORS[tier] || '#888';
  const tierLabel = TIER_LABELS[tier] || 'Free';

  const picksUsed = subStatus?.picksUsed ?? 0;
  const picksLimit = subStatus?.picksLimit ?? (tier === 'elite' ? '∞' : tier === 'pro' ? 10 : 2);
  const periodDays = subStatus?.periodDays ?? (tier === 'pro' ? 1 : 3);

  const usagePercent =
    typeof picksLimit === 'number' && picksLimit > 0
      ? Math.min((picksUsed / picksLimit) * 100, 100)
      : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name[0].toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        <View style={[styles.tierBadge, { backgroundColor: tierColor + '22', borderColor: tierColor }]}>
          <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel} Plan</Text>
        </View>
      </View>

      {/* Usage Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pick Usage</Text>
        {loading ? (
          <ActivityIndicator color="#f0c040" style={{ marginTop: 12 }} />
        ) : (
          <>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>
                {picksUsed} / {typeof picksLimit === 'number' ? picksLimit : '∞'} picks used
              </Text>
              <Text style={styles.usagePeriod}>
                Resets every {periodDays} day{periodDays !== 1 ? 's' : ''}
              </Text>
            </View>
            {typeof picksLimit === 'number' && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${usagePercent}%`,
                      backgroundColor:
                        usagePercent >= 100 ? '#ef4444' : usagePercent >= 75 ? '#f0c040' : '#22c55e',
                    },
                  ]}
                />
              </View>
            )}
            {tier === 'elite' && (
              <Text style={styles.unlimitedText}>♾ Unlimited picks — Elite member</Text>
            )}
          </>
        )}
      </View>

      {/* Plan Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Plan</Text>
        {tier === 'free' && (
          <View>
            <Text style={styles.planDetail}>• 2 picks every 3 days (preview mode)</Text>
            <Text style={styles.planDetail}>• No bet slip formatting</Text>
            <Text style={styles.planDetail}>• No parlay builder</Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Unlock All Features →</Text>
            </TouchableOpacity>
          </View>
        )}
        {tier === 'basic' && (
          <View>
            <Text style={styles.planDetail}>• 2 AI picks every 3 days</Text>
            <Text style={styles.planDetail}>• Bet slip formatting (8 sportsbooks)</Text>
            <Text style={styles.planDetail}>• Parlay builder</Text>
            <Text style={styles.planPrice}>$20/month</Text>
          </View>
        )}
        {tier === 'pro' && (
          <View>
            <Text style={styles.planDetail}>• 10 AI picks per day</Text>
            <Text style={styles.planDetail}>• Bet slip formatting (8 sportsbooks)</Text>
            <Text style={styles.planDetail}>• Parlay builder (up to 6 legs)</Text>
            <Text style={styles.planDetail}>• Priority analysis</Text>
            <Text style={styles.planPrice}>$50/month</Text>
          </View>
        )}
        {tier === 'elite' && (
          <View>
            <Text style={styles.planDetail}>• Unlimited AI picks daily</Text>
            <Text style={styles.planDetail}>• All sports coverage</Text>
            <Text style={styles.planDetail}>• Advanced parlay strategies</Text>
            <Text style={styles.planDetail}>• VIP support</Text>
            <Text style={styles.planPrice}>$200/month</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>

        {tier !== 'elite' && (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.actionText}>⬆ Upgrade Plan</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            Alert.alert(
              'Support',
              'For support, email support@intellabets.com or visit intellabets.com/help',
              [{ text: 'OK' }]
            )
          }
        >
          <Text style={styles.actionText}>💬 Contact Support</Text>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            Alert.alert(
              'Privacy Policy',
              'Visit intellabets.com/privacy to read our privacy policy.',
              [{ text: 'OK' }]
            )
          }
        >
          <Text style={styles.actionText}>🔒 Privacy Policy</Text>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            Alert.alert(
              'Terms of Service',
              'IntellaBets is for entertainment purposes. Always gamble responsibly. 21+.',
              [{ text: 'OK' }]
            )
          }
        >
          <Text style={styles.actionText}>📄 Terms of Service</Text>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Responsible Gambling */}
      <View style={[styles.card, { borderColor: '#ef444433' }]}>
        <Text style={[styles.cardTitle, { color: '#ef4444' }]}>⚠ Responsible Gambling</Text>
        <Text style={styles.disclaimerText}>
          IntellaBets is for entertainment purposes only. AI picks are not financial advice.
          Please gamble responsibly. If you have a gambling problem, call 1-800-GAMBLER.
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>IntellaBets v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0c040',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0a0a0a',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0c040',
    marginBottom: 12,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  usagePeriod: {
    fontSize: 13,
    color: '#888',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  unlimitedText: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '600',
    marginTop: 8,
  },
  planDetail: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 6,
    lineHeight: 20,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0c040',
    marginTop: 8,
  },
  upgradeBtn: {
    backgroundColor: '#f0c040',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  upgradeBtnText: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  actionText: {
    fontSize: 15,
    color: '#fff',
  },
  actionChevron: {
    fontSize: 22,
    color: '#555',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
  },
  logoutBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 16,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    color: '#333',
    fontSize: 12,
  },
});

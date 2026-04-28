/**
 * IntellaBets — In-App Purchase Service (RevenueCat)
 *
 * Setup required (one-time):
 * 1. Create account at revenuecat.com (free)
 * 2. Add your app → iOS → paste your App Store Connect API key
 * 3. Add your 3 products: intellabets_basic_monthly, intellabets_pro_monthly, intellabets_elite_monthly
 * 4. Copy your RevenueCat iOS Public SDK Key and paste it below as REVENUECAT_API_KEY
 *
 * Install: npm install react-native-purchases
 */

import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Replace with your RevenueCat iOS Public SDK Key from:
// revenuecat.com → your project → API Keys → Public app-specific keys
const REVENUECAT_API_KEY = 'YOUR_REVENUECAT_IOS_KEY_HERE';

// Your product IDs (must match App Store Connect exactly)
export const PRODUCT_IDS = {
  basic: 'intellabets_basic_monthly',
  pro: 'intellabets_pro_monthly',
  elite: 'intellabets_elite_monthly',
};

// Map product ID → tier name
export const PRODUCT_TIER_MAP = {
  [PRODUCT_IDS.basic]: 'basic',
  [PRODUCT_IDS.pro]: 'pro',
  [PRODUCT_IDS.elite]: 'elite',
};

// ─── INITIALIZATION ──────────────────────────────────────────────────────────
let initialized = false;

export async function initializePurchases(userId) {
  if (initialized) return;
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
    initialized = true;
    console.log('[IAP] RevenueCat initialized for user:', userId);
  } catch (err) {
    console.error('[IAP] Init error:', err);
  }
}

// ─── FETCH OFFERINGS ─────────────────────────────────────────────────────────
// Returns the list of available packages to display to the user
export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (err) {
    console.error('[IAP] getOfferings error:', err);
    throw err;
  }
}

// Fetch formatted product info (title, price, description) for all 3 tiers
export async function getProductPrices() {
  try {
    const packages = await getOfferings();
    const prices = {};
    packages.forEach(pkg => {
      const productId = pkg.product.identifier;
      const tier = PRODUCT_TIER_MAP[productId];
      if (tier) {
        prices[tier] = {
          price: pkg.product.priceString,
          title: pkg.product.title,
          description: pkg.product.description,
          package: pkg,
        };
      }
    });
    return prices;
  } catch (err) {
    console.error('[IAP] getProductPrices error:', err);
    return {};
  }
}

// ─── PURCHASE ────────────────────────────────────────────────────────────────
// Returns { success, customerInfo, tier, error }
export async function purchaseTier(tierName) {
  try {
    const packages = await getOfferings();
    const productId = PRODUCT_IDS[tierName];
    if (!productId) throw new Error('Invalid tier: ' + tierName);

    const pkg = packages.find(p => p.product.identifier === productId);
    if (!pkg) throw new Error('Product not found: ' + productId);

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const activeTier = getActiveTierFromCustomerInfo(customerInfo);

    return { success: true, customerInfo, tier: activeTier };
  } catch (err) {
    // User cancelled — not a real error
    if (err.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.error('[IAP] purchaseTier error:', err);
    return { success: false, error: err.message };
  }
}

// ─── RESTORE PURCHASES ───────────────────────────────────────────────────────
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const tier = getActiveTierFromCustomerInfo(customerInfo);
    return { success: true, tier, customerInfo };
  } catch (err) {
    console.error('[IAP] restorePurchases error:', err);
    return { success: false, error: err.message };
  }
}

// ─── CHECK ACTIVE ENTITLEMENTS ───────────────────────────────────────────────
// Determine tier from RevenueCat entitlements
export function getActiveTierFromCustomerInfo(customerInfo) {
  if (!customerInfo?.entitlements?.active) return 'free';

  const active = customerInfo.entitlements.active;

  // Check highest tier first
  if (active['elite']) return 'elite';
  if (active['pro']) return 'pro';
  if (active['basic']) return 'basic';

  // Fallback: check by product ID in active subscriptions
  const activeProductIds = Object.keys(active);
  for (const id of activeProductIds) {
    const tier = PRODUCT_TIER_MAP[id];
    if (tier) return tier;
  }

  return 'free';
}

// ─── GET CURRENT STATUS ──────────────────────────────────────────────────────
export async function getCurrentSubscriptionStatus() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const tier = getActiveTierFromCustomerInfo(customerInfo);
    return { tier, customerInfo };
  } catch (err) {
    console.error('[IAP] getCurrentSubscriptionStatus error:', err);
    return { tier: 'free', customerInfo: null };
  }
}

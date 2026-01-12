import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Feature definitions by tier
 * Features are cumulative: Gold includes Silver, Silver includes Bronze
 */
const TIER_FEATURES = {
  bronze: {
    unlimited_teams: true,
    unlimited_games: true,
    unlimited_history: true,
    pdf_box_scores: true,
    simple_mode: true,
    advanced_mode: true,
    play_by_play: true,
    // Premium features
    public_live_stats: false,
    embed_widgets: false,
    sponsor_banners: 0,
    csv_export: false,
    shared_access: false,
    custom_branding: false,
    white_label_embeds: false,
    custom_team_logos: false,
    priority_support: false,
  },
  silver: {
    unlimited_teams: true,
    unlimited_games: true,
    unlimited_history: true,
    pdf_box_scores: true,
    simple_mode: true,
    advanced_mode: true,
    play_by_play: true,
    // Silver features
    public_live_stats: true,
    embed_widgets: true,
    sponsor_banners: 5,
    csv_export: true,
    // Gold-only features
    shared_access: false,
    custom_branding: false,
    white_label_embeds: false,
    custom_team_logos: false,
    priority_support: false,
  },
  gold: {
    unlimited_teams: true,
    unlimited_games: true,
    unlimited_history: true,
    pdf_box_scores: true,
    simple_mode: true,
    advanced_mode: true,
    play_by_play: true,
    public_live_stats: true,
    embed_widgets: true,
    sponsor_banners: -1, // Unlimited
    csv_export: true,
    // Gold-only features
    shared_access: true,
    custom_branding: true,
    white_label_embeds: true,
    custom_team_logos: true,
    priority_support: true,
  }
};

/**
 * Hook to check user's subscription tier and feature access
 */
export function useSubscriptionFeatures() {
  const [userTier, setUserTier] = useState('bronze');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isComped, setIsComped] = useState(false);

  // Fetch user's tier from backend
  useEffect(() => {
    const fetchTier = async () => {
      try {
        const response = await axios.get(`${API}/payments/user-tier`);
        const tierData = response.data;
        // Backend now returns effective tier (Gold for admins/comped users)
        setUserTier(tierData.tier || 'bronze');
        setSubscriptionStatus(tierData.subscription_status);
        setIsAdmin(tierData.is_admin || false);
        setIsComped(tierData.is_comped || false);
        setError(null);
      } catch (err) {
        // Default to bronze on error
        console.error('Failed to fetch user tier:', err);
        setUserTier('bronze');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, []);

  /**
   * Check if user has access to a specific feature
   * @param {string} featureName - The feature to check
   * @returns {boolean|number} - true/false for boolean features, number for numeric features
   */
  const hasFeature = useCallback((featureName) => {
    const tierFeatures = TIER_FEATURES[userTier] || TIER_FEATURES.bronze;
    return tierFeatures[featureName];
  }, [userTier]);

  /**
   * Check if user can access a feature (boolean)
   * @param {string} featureName - The feature to check
   * @returns {boolean}
   */
  const canAccess = useCallback((featureName) => {
    const value = hasFeature(featureName);
    return value === true || (typeof value === 'number' && value !== 0);
  }, [hasFeature]);

  /**
   * Get the limit for a numeric feature (e.g., sponsor_banners)
   * @param {string} featureName - The feature to check
   * @returns {number} - The limit (-1 for unlimited)
   */
  const getLimit = useCallback((featureName) => {
    const value = hasFeature(featureName);
    return typeof value === 'number' ? value : (value ? -1 : 0);
  }, [hasFeature]);

  /**
   * Get all features for the current tier
   * @returns {object} - All features for the user's tier
   */
  const getAllFeatures = useCallback(() => {
    return TIER_FEATURES[userTier] || TIER_FEATURES.bronze;
  }, [userTier]);

  /**
   * Check if user needs to upgrade for a feature
   * @param {string} featureName - The feature to check
   * @returns {string|null} - Required tier to access feature, or null if already has access
   */
  const getRequiredTierFor = useCallback((featureName) => {
    if (canAccess(featureName)) return null;
    
    // Check which tier has this feature
    if (TIER_FEATURES.silver[featureName]) return 'silver';
    if (TIER_FEATURES.gold[featureName]) return 'gold';
    return 'gold';
  }, [canAccess]);

  return {
    userTier,
    loading,
    error,
    subscriptionStatus,
    hasFeature,
    canAccess,
    getLimit,
    getAllFeatures,
    getRequiredTierFor,
    TIER_FEATURES,
  };
}

/**
 * Feature Gate component - wraps content that requires a specific tier
 */
export function FeatureGate({ feature, children, fallback = null, showUpgradePrompt = false }) {
  const { canAccess, getRequiredTierFor, loading } = useSubscriptionFeatures();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (canAccess(feature)) {
    return children;
  }

  if (showUpgradePrompt) {
    const requiredTier = getRequiredTierFor(feature);
    return (
      <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 text-center">
        <p className="text-zinc-400 mb-2">This feature requires {requiredTier?.charAt(0).toUpperCase() + requiredTier?.slice(1)} tier</p>
        <a href="/pricing" className="text-amber-500 hover:text-amber-400 underline">
          Upgrade to {requiredTier}
        </a>
      </div>
    );
  }

  return fallback;
}

export default useSubscriptionFeatures;

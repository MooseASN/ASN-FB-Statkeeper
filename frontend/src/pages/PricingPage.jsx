import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Tier logos
const TIER_LOGOS = {
  bronze: "https://customer-assets.emergentagent.com/job_31d87846-33e6-4c74-b3e3-570fec34a9a4/artifacts/fkjmxy2o_StatMoose%20Bronze%20Logo.png",
  silver: "https://customer-assets.emergentagent.com/job_31d87846-33e6-4c74-b3e3-570fec34a9a4/artifacts/th9kex3j_StatMoose%20Silver%20Logo.png",
  gold: "https://customer-assets.emergentagent.com/job_31d87846-33e6-4c74-b3e3-570fec34a9a4/artifacts/y6akc4wa_StatMoose%20Gold%20Logo.png"
};

// Feature list with tier availability
const FEATURES = [
  { name: "Teams & Games", bronze: "Unlimited", silver: "Unlimited", gold: "Unlimited" },
  { name: "Game History", bronze: "Unlimited", silver: "Unlimited", gold: "Unlimited" },
  { name: "PDF Box Scores", bronze: true, silver: true, gold: true },
  { name: "Stat Tracking Modes", bronze: "Simple + Advanced", silver: "Simple + Advanced", gold: "Simple + Advanced" },
  { name: "Play-by-Play Logging", bronze: true, silver: true, gold: true },
  { name: "Public Live Stats Pages", bronze: false, silver: true, gold: true },
  { name: "Embed Widgets", bronze: false, silver: true, gold: true },
  { name: "Sponsor Banners", bronze: false, silver: "5 slots", gold: "Unlimited" },
  { name: "Season Stats & Leaderboards", bronze: false, silver: true, gold: true },
  { name: "CSV Export", bronze: false, silver: true, gold: true },
  { name: "Shared Access (Invite Staff)", bronze: false, silver: false, gold: true },
  { name: "Custom Branding (Live Stats)", bronze: false, silver: false, gold: true },
  { name: "White-Label Embeds", bronze: false, silver: false, gold: true },
  { name: "Custom Team Logos", bronze: false, silver: false, gold: true },
  { name: "Priority Support", bronze: false, silver: false, gold: true },
];

// Feature cell renderer
const FeatureCell = ({ value }) => {
  if (value === true) {
    return <Check className="w-5 h-5 text-green-500 mx-auto" />;
  }
  if (value === false) {
    return <X className="w-5 h-5 text-zinc-600 mx-auto" />;
  }
  return <span className="text-sm text-white">{value}</span>;
};

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [processingTier, setProcessingTier] = useState(null);
  
  // Check for return from Stripe
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [sessionId]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.info('Payment status check timed out. Please check your email for confirmation.');
      return;
    }

    try {
      const res = await axios.get(`${API}/api/payments/status/${sessionId}`);
      
      if (res.data.payment_status === 'paid') {
        toast.success('Payment successful! Thank you for subscribing.');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      } else if (res.data.status === 'expired') {
        toast.error('Payment session expired. Please try again.');
        return;
      }

      // Continue polling
      toast.info('Payment is being processed...');
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast.error('Error checking payment status');
    }
  };

  const handleSubscribe = async (tier) => {
    if (tier === 'bronze') {
      // Free tier - just go to dashboard
      navigate('/select-sport');
      return;
    }
    
    setProcessingTier(tier);
    try {
      const originUrl = window.location.origin;
      const res = await axios.post(`${API}/api/payments/checkout`, {
        package_id: `monthly_${tier}`,
        origin_url: originUrl
      }, { withCredentials: true });

      // Redirect to Stripe checkout
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error(error.response?.data?.detail || 'Failed to start checkout. Please login first.');
      setProcessingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-white mb-8"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4" data-testid="pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Track stats for any sport. Upgrade anytime to unlock more features.
          </p>
        </div>

        {/* Pricing Table */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            {/* Header with Logos and Prices */}
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="p-6 text-left w-1/4">
                  <span className="text-zinc-500 text-sm font-normal">Compare plans</span>
                </th>
                
                {/* Bronze */}
                <th className="p-6 text-center border-l border-zinc-800">
                  <div className="flex flex-col items-center">
                    <img src={TIER_LOGOS.bronze} alt="Bronze" className="w-20 h-20 object-contain mb-3" />
                    <span className="text-xl font-bold text-amber-700">Bronze</span>
                    <div className="mt-2">
                      <span className="text-3xl font-black text-white">Free</span>
                    </div>
                    <Button 
                      onClick={() => handleSubscribe('bronze')}
                      variant="outline"
                      className="mt-4 border-amber-700 text-amber-700 hover:bg-amber-700 hover:text-white"
                      data-testid="bronze-select"
                    >
                      Get Started
                    </Button>
                  </div>
                </th>
                
                {/* Silver */}
                <th className="p-6 text-center border-l border-zinc-800 bg-zinc-800/30">
                  <div className="flex flex-col items-center">
                    <img src={TIER_LOGOS.silver} alt="Silver" className="w-20 h-20 object-contain mb-3" />
                    <span className="text-xl font-bold text-zinc-300">Silver</span>
                    <div className="mt-2">
                      <span className="text-3xl font-black text-white">$15</span>
                      <span className="text-zinc-400 text-sm">/month</span>
                    </div>
                    <Button 
                      onClick={() => handleSubscribe('silver')}
                      disabled={processingTier === 'silver'}
                      className="mt-4 bg-zinc-600 hover:bg-zinc-500 text-white"
                      data-testid="silver-select"
                    >
                      {processingTier === 'silver' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Subscribe'
                      )}
                    </Button>
                  </div>
                </th>
                
                {/* Gold */}
                <th className="p-6 text-center border-l border-zinc-800 bg-amber-500/10">
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-b-lg">
                    MOST POPULAR
                  </div>
                  <div className="flex flex-col items-center">
                    <img src={TIER_LOGOS.gold} alt="Gold" className="w-20 h-20 object-contain mb-3" />
                    <span className="text-xl font-bold text-amber-400">Gold</span>
                    <div className="mt-2">
                      <span className="text-3xl font-black text-white">$20</span>
                      <span className="text-zinc-400 text-sm">/month</span>
                    </div>
                    <Button 
                      onClick={() => handleSubscribe('gold')}
                      disabled={processingTier === 'gold'}
                      className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                      data-testid="gold-select"
                    >
                      {processingTier === 'gold' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Subscribe'
                      )}
                    </Button>
                  </div>
                </th>
              </tr>
            </thead>
            
            {/* Feature Rows */}
            <tbody>
              {FEATURES.map((feature, index) => (
                <tr 
                  key={feature.name} 
                  className={`border-b border-zinc-800 ${index % 2 === 0 ? 'bg-zinc-900/50' : ''}`}
                >
                  <td className="p-4 text-sm text-zinc-300 font-medium">
                    {feature.name}
                  </td>
                  <td className="p-4 text-center border-l border-zinc-800">
                    <FeatureCell value={feature.bronze} />
                  </td>
                  <td className="p-4 text-center border-l border-zinc-800 bg-zinc-800/20">
                    <FeatureCell value={feature.silver} />
                  </td>
                  <td className="p-4 text-center border-l border-zinc-800 bg-amber-500/5">
                    <FeatureCell value={feature.gold} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-zinc-500 text-sm">
            All plans include unlimited teams and games. Cancel anytime.
          </p>
          <p className="text-zinc-600 text-xs mt-2">
            Questions? Contact us at support@statmoose.com
          </p>
        </div>
      </div>
    </div>
  );
}

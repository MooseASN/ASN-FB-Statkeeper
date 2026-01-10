import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Crown, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  // Check for return from Stripe
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    fetchPackages();
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [sessionId]);

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${API}/api/payments/packages`);
      setPackages(res.data.packages);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      toast.error('Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubscribe = async (packageId) => {
    setProcessingPackage(packageId);
    try {
      const originUrl = window.location.origin;
      const res = await axios.post(`${API}/api/payments/checkout`, {
        package_id: packageId,
        origin_url: originUrl
      }, { withCredentials: true });

      // Redirect to Stripe checkout
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error(error.response?.data?.detail || 'Failed to start checkout');
      setProcessingPackage(null);
    }
  };

  const getDisplayPackages = () => {
    const isMonthly = billingCycle === 'monthly';
    return {
      basic: isMonthly ? packages.monthly_basic : packages.annual_basic,
      pro: isMonthly ? packages.monthly_pro : packages.annual_pro,
      basicId: isMonthly ? 'monthly_basic' : 'annual_basic',
      proId: isMonthly ? 'monthly_pro' : 'annual_pro'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const displayPkgs = getDisplayPackages();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white mb-8"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4" data-testid="pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Unlock the full power of StatMoose with our premium features
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-800 rounded-full p-1 flex items-center gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              data-testid="monthly-toggle"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              data-testid="annual-toggle"
            >
              Annual
              <span className="bg-amber-500 text-amber-900 text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Basic Plan */}
          {displayPkgs.basic && (
            <div 
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all"
              data-testid="basic-plan-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{displayPkgs.basic.name}</h3>
                  <p className="text-slate-400 text-sm">For casual users</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">
                  ${displayPkgs.basic.amount}
                </span>
                <span className="text-slate-400">
                  /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {displayPkgs.basic.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(displayPkgs.basicId)}
                disabled={processingPackage === displayPkgs.basicId}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                data-testid="subscribe-basic-btn"
              >
                {processingPackage === displayPkgs.basicId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </div>
          )}

          {/* Pro Plan */}
          {displayPkgs.pro && (
            <div 
              className="bg-gradient-to-b from-emerald-900/30 to-slate-800/50 border-2 border-emerald-500/50 rounded-2xl p-8 relative"
              data-testid="pro-plan-card"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{displayPkgs.pro.name}</h3>
                  <p className="text-emerald-400 text-sm">For serious coaches</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">
                  ${displayPkgs.pro.amount}
                </span>
                <span className="text-slate-400">
                  /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {displayPkgs.pro.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(displayPkgs.proId)}
                disabled={processingPackage === displayPkgs.proId}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                data-testid="subscribe-pro-btn"
              >
                {processingPackage === displayPkgs.proId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Get Pro'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* FAQ or Features */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

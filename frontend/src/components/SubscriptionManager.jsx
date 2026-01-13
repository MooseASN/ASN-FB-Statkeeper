import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Crown,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Tier configuration
const TIERS = {
  bronze: {
    name: "Bronze",
    price: 0,
    color: "bg-amber-100 text-amber-700 border-amber-300",
    icon: "🥉",
    features: [
      "Unlimited teams & games",
      "Unlimited game history",
      "PDF box scores",
      "Simple + Advanced stat tracking",
      "Play-by-play logging"
    ]
  },
  silver: {
    name: "Silver",
    price: 15,
    color: "bg-slate-200 text-slate-700 border-slate-400",
    icon: "🥈",
    features: [
      "Everything in Bronze",
      "Public live stats pages",
      "Embed widgets",
      "5 sponsor banner slots",
      "CSV export"
    ]
  },
  gold: {
    name: "Gold",
    price: 20,
    color: "bg-yellow-100 text-yellow-700 border-yellow-400",
    icon: "🥇",
    features: [
      "Everything in Silver",
      "Shared access (invite staff)",
      "Custom branding on live stats",
      "White-label embeds",
      "Unlimited sponsor banners",
      "Custom team logos",
      "Priority support"
    ]
  }
};

const TIER_ORDER = ["bronze", "silver", "gold"];

export function SubscriptionManager({ user, currentTier = "bronze", onTierChange }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [changingTier, setChangingTier] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [showChangeTierDialog, setShowChangeTierDialog] = useState(false);
  const [selectedNewTier, setSelectedNewTier] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelingChange, setCancelingChange] = useState(false);

  // Fetch subscription details and pending changes
  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const [detailsRes, pendingRes] = await Promise.all([
        axios.get(`${API}/payments/subscription-details`, { withCredentials: true }),
        axios.get(`${API}/payments/pending-changes`, { withCredentials: true })
      ]);
      
      setSubscriptionDetails(detailsRes.data);
      setPendingChanges(pendingRes.data);
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleChangeTier = async (newTier) => {
    setChangingTier(true);
    try {
      const res = await axios.post(
        `${API}/payments/change-tier`,
        { new_tier: newTier, billing_interval: "month" },
        { withCredentials: true }
      );

      if (res.data.requires_checkout) {
        // Redirect to checkout for new subscription
        toast.info("Redirecting to checkout...");
        const checkoutRes = await axios.post(
          `${API}/payments/checkout`,
          { 
            package_id: res.data.checkout_package,
            origin_url: window.location.origin
          },
          { withCredentials: true }
        );
        
        if (checkoutRes.data.url) {
          window.location.href = checkoutRes.data.url;
        }
        return;
      }

      if (res.data.success) {
        toast.success(res.data.message);
        setShowChangeTierDialog(false);
        fetchSubscriptionData();
        if (onTierChange) onTierChange(newTier);
      }
    } catch (error) {
      console.error("Error changing tier:", error);
      toast.error(error.response?.data?.detail || "Failed to change subscription tier");
    } finally {
      setChangingTier(false);
    }
  };

  const handleCancelPendingChange = async () => {
    setCancelingChange(true);
    try {
      const res = await axios.post(
        `${API}/payments/cancel-pending-change`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success(res.data.message);
        setShowCancelDialog(false);
        fetchSubscriptionData();
      }
    } catch (error) {
      console.error("Error canceling pending change:", error);
      toast.error(error.response?.data?.detail || "Failed to cancel pending change");
    } finally {
      setCancelingChange(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      const res = await axios.post(
        `${API}/payments/create-billing-portal`,
        { return_url: window.location.href },
        { withCredentials: true }
      );

      if (res.data.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast.error(error.response?.data?.detail || "Failed to open billing portal");
    }
  };

  const openChangeTierDialog = (tier) => {
    setSelectedNewTier(tier);
    setShowChangeTierDialog(true);
  };

  const getCurrentTierIndex = () => TIER_ORDER.indexOf(currentTier);
  
  const isUpgrade = (newTier) => {
    return TIER_ORDER.indexOf(newTier) > getCurrentTierIndex();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const effectiveTier = currentTier || subscriptionDetails?.tier || "bronze";
  const tierConfig = TIERS[effectiveTier] || TIERS.bronze;

  return (
    <>
      <Card data-testid="subscription-manager">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Manage Subscription
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchSubscriptionData}
              data-testid="refresh-subscription"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {subscriptionDetails?.is_trial && (
            <CardDescription className="text-amber-600">
              Trial ends {new Date(subscriptionDetails.trial_end).toLocaleDateString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Plan */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tierConfig.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{tierConfig.name} Plan</h3>
                  <p className="text-sm text-gray-500">
                    {tierConfig.price === 0 ? "Free" : `$${tierConfig.price}/month`}
                  </p>
                </div>
              </div>
              <Badge className={tierConfig.color}>Current Plan</Badge>
            </div>
            
            {subscriptionDetails?.current_period_end && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {subscriptionDetails.cancel_at_period_end 
                    ? `Cancels on ${new Date(subscriptionDetails.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(subscriptionDetails.current_period_end).toLocaleDateString()}`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Pending Changes Alert */}
          {pendingChanges?.has_pending_change && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800">Pending Tier Change</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Your subscription will change to <strong>{TIERS[pendingChanges.pending_tier]?.name}</strong> on{" "}
                    {new Date(pendingChanges.effective_date).toLocaleDateString()}.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => setShowCancelDialog(true)}
                    data-testid="cancel-pending-change-btn"
                  >
                    Cancel Change
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Available Plans */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Change Your Plan</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIER_ORDER.map((tierKey) => {
                const tier = TIERS[tierKey];
                const isCurrent = tierKey === effectiveTier;
                const isPending = pendingChanges?.pending_tier === tierKey;
                const upgrading = isUpgrade(tierKey);

                return (
                  <div
                    key={tierKey}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCurrent 
                        ? "border-blue-500 bg-blue-50" 
                        : isPending 
                        ? "border-amber-400 bg-amber-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`tier-option-${tierKey}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{tier.icon}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Current
                        </Badge>
                      )}
                      {isPending && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <h5 className="font-semibold">{tier.name}</h5>
                    <p className="text-sm text-gray-500 mb-3">
                      {tier.price === 0 ? "Free forever" : `$${tier.price}/mo`}
                    </p>
                    
                    <ul className="text-xs text-gray-600 space-y-1 mb-4">
                      {tier.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                      {tier.features.length > 3 && (
                        <li className="text-gray-400">+{tier.features.length - 3} more</li>
                      )}
                    </ul>

                    {!isCurrent && !isPending && (
                      <Button
                        size="sm"
                        variant={upgrading ? "default" : "outline"}
                        className="w-full"
                        onClick={() => openChangeTierDialog(tierKey)}
                        disabled={changingTier}
                        data-testid={`select-tier-${tierKey}`}
                      >
                        {upgrading ? (
                          <>
                            <ArrowUp className="w-3 h-3 mr-1" />
                            Upgrade
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3 h-3 mr-1" />
                            Downgrade
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Management */}
          {subscriptionDetails?.stripe_subscription_id && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-700 mb-3">Payment & Billing</h4>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleOpenBillingPortal}
                  data-testid="open-billing-portal"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Payment Methods
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenBillingPortal}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Invoices
                </Button>
              </div>
            </div>
          )}

          {/* Upgrade CTA for free users */}
          {effectiveTier === "bronze" && !subscriptionDetails?.stripe_subscription_id && (
            <div className="pt-4 border-t">
              <Button 
                onClick={() => navigate("/pricing")} 
                className="w-full"
                data-testid="upgrade-btn"
              >
                <Crown className="w-4 h-4 mr-2" />
                View All Plans & Pricing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Tier Confirmation Dialog */}
      <Dialog open={showChangeTierDialog} onOpenChange={setShowChangeTierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedNewTier && isUpgrade(selectedNewTier) ? "Upgrade" : "Downgrade"} to{" "}
              {selectedNewTier && TIERS[selectedNewTier]?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedNewTier && isUpgrade(selectedNewTier) ? (
                <>
                  Your new plan will start at the beginning of your next billing cycle.
                  You'll keep your current {tierConfig.name} features until then.
                </>
              ) : (
                <>
                  Your plan will change to {selectedNewTier && TIERS[selectedNewTier]?.name} at the end of your 
                  current billing period. You'll keep your {tierConfig.name} features until then.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNewTier && (
            <div className="py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{TIERS[selectedNewTier]?.icon}</span>
                  <div>
                    <h4 className="font-semibold">{TIERS[selectedNewTier]?.name} Plan</h4>
                    <p className="text-sm text-gray-500">
                      {TIERS[selectedNewTier]?.price === 0 
                        ? "Free" 
                        : `$${TIERS[selectedNewTier]?.price}/month`
                      }
                    </p>
                  </div>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {TIERS[selectedNewTier]?.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeTierDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleChangeTier(selectedNewTier)}
              disabled={changingTier}
              data-testid="confirm-tier-change"
            >
              {changingTier && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm {isUpgrade(selectedNewTier) ? "Upgrade" : "Downgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Pending Change Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Pending Change?</DialogTitle>
            <DialogDescription>
              Your scheduled change to {pendingChanges?.pending_tier && TIERS[pendingChanges.pending_tier]?.name} will 
              be canceled, and you'll keep your current {tierConfig.name} subscription.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Change
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelPendingChange}
              disabled={cancelingChange}
              data-testid="confirm-cancel-change"
            >
              {cancelingChange && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SubscriptionManager;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, User, Mail, Lock, Shield, Eye, EyeOff, Check, AlertCircle, Users, UserPlus, UserMinus, Share2, CreditCard, Crown, ExternalLink, Trash2, Star, RefreshCw, XCircle } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Tier badge component
const TierBadge = ({ tier }) => {
  const tierConfig = {
    bronze: { bg: "bg-amber-900/30", text: "text-amber-600", label: "Bronze" },
    silver: { bg: "bg-gray-500/30", text: "text-gray-300", label: "Silver" },
    gold: { bg: "bg-yellow-500/30", text: "text-yellow-500", label: "Gold" }
  };
  const config = tierConfig[tier] || tierConfig.bronze;
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default function AccountSettings({ user, onLogout, onUserUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  // Edit modes
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingName, setEditingName] = useState(false);
  
  // Form values
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Security verification
  const [securityQuestion, setSecurityQuestion] = useState(null);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'username', 'email', 'password'
  
  // Password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  
  // Shared Access state
  const [sharedAccessList, setSharedAccessList] = useState([]);
  const [receivedAccessList, setReceivedAccessList] = useState([]);
  const [newShareEmail, setNewShareEmail] = useState("");
  const [sharingAccess, setSharingAccess] = useState(false);
  const [loadingSharedAccess, setLoadingSharedAccess] = useState(false);
  
  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Payment Methods state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchSharedAccess();
    fetchSubscription();
    fetchPaymentMethods();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/account/profile`);
      setProfile(res.data);
      setNewUsername(res.data.username || "");
      setNewEmail(res.data.email || "");
      setNewName(res.data.name || "");
    } catch (error) {
      toast.error("Failed to load profile");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const res = await axios.get(`${API}/payments/subscription-details`);
      setSubscription(res.data);
    } catch (error) {
      console.error("Failed to load subscription:", error);
    } finally {
      setLoadingSubscription(false);
    }
  };
  
  const fetchPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const res = await axios.get(`${API}/payments/payment-methods`);
      setPaymentMethods(res.data.payment_methods || []);
    } catch (error) {
      console.error("Failed to load payment methods:", error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    setCancelingSubscription(true);
    try {
      const res = await axios.post(`${API}/payments/cancel-subscription`);
      toast.success(res.data.message);
      setShowCancelDialog(false);
      fetchSubscription();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cancel subscription");
    } finally {
      setCancelingSubscription(false);
    }
  };
  
  const handleReactivateSubscription = async () => {
    try {
      const res = await axios.post(`${API}/payments/reactivate-subscription`);
      toast.success(res.data.message);
      fetchSubscription();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reactivate subscription");
    }
  };
  
  const handleOpenBillingPortal = async () => {
    setOpeningBillingPortal(true);
    try {
      const res = await axios.post(`${API}/payments/create-billing-portal`, {
        return_url: window.location.href
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to open billing portal");
      setOpeningBillingPortal(false);
    }
  };
  
  const handleDeletePaymentMethod = async (paymentMethodId) => {
    if (!confirm("Are you sure you want to remove this payment method?")) return;
    
    try {
      await axios.delete(`${API}/payments/payment-method/${paymentMethodId}`);
      toast.success("Payment method removed");
      fetchPaymentMethods();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove payment method");
    }
  };
  
  const handleSetDefaultPaymentMethod = async (paymentMethodId) => {
    try {
      await axios.post(`${API}/payments/set-default-payment-method`, {
        payment_method_id: paymentMethodId
      });
      toast.success("Default payment method updated");
      fetchPaymentMethods();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update default payment method");
    }
  };

  const fetchSharedAccess = async () => {
    setLoadingSharedAccess(true);
    try {
      const [grantedRes, receivedRes] = await Promise.all([
        axios.get(`${API}/admin/shared-access`),
        axios.get(`${API}/admin/shared-access/received`)
      ]);
      setSharedAccessList(grantedRes.data);
      setReceivedAccessList(receivedRes.data);
    } catch (error) {
      console.error("Failed to load shared access:", error);
    } finally {
      setLoadingSharedAccess(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!newShareEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    setSharingAccess(true);
    try {
      await axios.post(`${API}/admin/shared-access`, { email: newShareEmail.trim() });
      toast.success(`Access granted to ${newShareEmail}`);
      setNewShareEmail("");
      fetchSharedAccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to grant access");
    } finally {
      setSharingAccess(false);
    }
  };

  const handleRevokeAccess = async (accessId, email) => {
    if (!confirm(`Are you sure you want to revoke access for ${email}?`)) return;
    
    try {
      await axios.delete(`${API}/admin/shared-access/${accessId}`);
      toast.success(`Access revoked for ${email}`);
      fetchSharedAccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to revoke access");
    }
  };

  const fetchSecurityQuestion = async () => {
    try {
      const res = await axios.get(`${API}/account/security-question`);
      if (res.data.has_questions) {
        setSecurityQuestion(res.data.question);
        return true;
      } else {
        toast.error("No security questions set for this account");
        return false;
      }
    } catch (error) {
      toast.error("Failed to fetch security question");
      return false;
    }
  };

  const initiateSecurityVerification = async (action) => {
    const hasQuestion = await fetchSecurityQuestion();
    if (hasQuestion) {
      setPendingAction(action);
      setSecurityAnswer("");
      setShowSecurityDialog(true);
    }
  };

  const handleSecurityVerified = async () => {
    setShowSecurityDialog(false);
    setSubmitting(true);
    
    try {
      switch (pendingAction) {
        case 'username':
          await updateUsername();
          break;
        case 'email':
          await updateEmail();
          break;
        case 'password':
          await updatePassword();
          break;
      }
    } finally {
      setSubmitting(false);
      setSecurityAnswer("");
      setPendingAction(null);
    }
  };

  const updateUsername = async () => {
    try {
      const res = await axios.put(`${API}/account/username`, {
        new_username: newUsername,
        security_answer: securityAnswer
      });
      toast.success(res.data.message);
      setEditingUsername(false);
      fetchProfile();
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update username");
    }
  };

  const updateEmail = async () => {
    try {
      const res = await axios.put(`${API}/account/email`, {
        new_email: newEmail,
        security_answer: securityAnswer
      });
      toast.success(res.data.message);
      setEditingEmail(false);
      fetchProfile();
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update email");
    }
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    try {
      const res = await axios.put(`${API}/account/password`, {
        current_password: currentPassword,
        new_password: newPassword,
        security_answer: securityAnswer
      });
      toast.success(res.data.message);
      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Redirect to login since all sessions are invalidated
      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update password");
    }
  };

  const updateName = async () => {
    try {
      const res = await axios.put(`${API}/account/name`, {
        name: newName
      });
      toast.success(res.data.message);
      setEditingName(false);
      fetchProfile();
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update name");
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const isGoogleAccount = profile?.auth_provider === "google";

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        {/* Security Notice */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Security Verification Required</p>
              <p className="text-sm text-amber-700">
                Changes to username, email, or password require answering a security question.
              </p>
            </div>
          </CardContent>
        </Card>

        {isGoogleAccount && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Google Account</p>
                <p className="text-sm text-blue-700">
                  This account is linked to Google. Username, email, and password cannot be changed.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Display Name
            </CardTitle>
            <CardDescription>Your name as shown across the app</CardDescription>
          </CardHeader>
          <CardContent>
            {editingName ? (
              <div className="space-y-4">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter display name"
                />
                <div className="flex gap-2">
                  <Button onClick={updateName} disabled={!newName.trim()}>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => { setEditingName(false); setNewName(profile?.name || ""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg">{profile?.name || "Not set"}</span>
                <Button variant="outline" onClick={() => setEditingName(true)}>
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Username */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Username
            </CardTitle>
            <CardDescription>Your unique username for login</CardDescription>
          </CardHeader>
          <CardContent>
            {editingUsername ? (
              <div className="space-y-4">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                  placeholder="Enter new username"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => initiateSecurityVerification('username')} 
                    disabled={!newUsername.trim() || newUsername === profile?.username || submitting}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Verify & Save
                  </Button>
                  <Button variant="outline" onClick={() => { setEditingUsername(false); setNewUsername(profile?.username || ""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono">{profile?.username || "Not set"}</span>
                <Button variant="outline" onClick={() => setEditingUsername(true)} disabled={isGoogleAccount}>
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Address
            </CardTitle>
            <CardDescription>Your email for login and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {editingEmail ? (
              <div className="space-y-4">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value.toLowerCase())}
                  placeholder="Enter new email"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => initiateSecurityVerification('email')} 
                    disabled={!newEmail.trim() || newEmail === profile?.email || submitting}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Verify & Save
                  </Button>
                  <Button variant="outline" onClick={() => { setEditingEmail(false); setNewEmail(profile?.email || ""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg">{profile?.email}</span>
                <Button variant="outline" onClick={() => setEditingEmail(true)} disabled={isGoogleAccount}>
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            {editingPassword ? (
              <div className="space-y-4">
                <div>
                  <Label>Current Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="mt-1"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => initiateSecurityVerification('password')} 
                    disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6 || submitting}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Verify & Change
                  </Button>
                  <Button variant="outline" onClick={() => { 
                    setEditingPassword(false); 
                    setCurrentPassword(""); 
                    setNewPassword(""); 
                    setConfirmPassword("");
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg text-muted-foreground">••••••••</span>
                <Button variant="outline" onClick={() => setEditingPassword(true)} disabled={isGoogleAccount}>
                  Change Password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shared Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Shared Access
            </CardTitle>
            <CardDescription>
              Share your teams, games, and events with other StatMoose users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grant Access Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Grant Access to Another User</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter user's email address"
                  value={newShareEmail}
                  onChange={(e) => setNewShareEmail(e.target.value)}
                  className="flex-1"
                  disabled={sharingAccess}
                />
                <Button 
                  onClick={handleGrantAccess} 
                  disabled={sharingAccess || !newShareEmail.trim()}
                >
                  {sharingAccess ? (
                    "Granting..."
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Grant Access
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Users you grant access to can view and manage all your teams, games, and events across all sports.
              </p>
            </div>
            
            {/* Users I've Shared With */}
            {sharedAccessList.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users with Access to My Data ({sharedAccessList.length})
                </Label>
                <div className="space-y-2">
                  {sharedAccessList.map((access) => (
                    <div 
                      key={access.id} 
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{access.shared_with_email}</p>
                        {access.shared_with_username && (
                          <p className="text-sm text-muted-foreground">@{access.shared_with_username}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeAccess(access.id, access.shared_with_email)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Accounts I Have Access To */}
            {receivedAccessList.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Accounts I Have Access To ({receivedAccessList.length})
                </Label>
                <div className="space-y-2">
                  {receivedAccessList.map((access) => (
                    <div 
                      key={access.id} 
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div>
                        <p className="font-medium text-blue-700">{access.owner_email}</p>
                        {access.owner_username && (
                          <p className="text-sm text-blue-500">@{access.owner_username}</p>
                        )}
                      </div>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Shared with me
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Teams, games, and events from these accounts will appear alongside your own data.
                </p>
              </div>
            )}
            
            {sharedAccessList.length === 0 && receivedAccessList.length === 0 && !loadingSharedAccess && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No shared access configured. Grant access to another user above, or ask another user to share their account with you.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Subscription
            </CardTitle>
            <CardDescription>Manage your StatMoose subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSubscription ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : subscription ? (
              <>
                {/* Current Plan */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Current Plan</span>
                      <TierBadge tier={subscription.tier} />
                    </div>
                    {subscription.is_trial && (
                      <p className="text-sm text-emerald-600 font-medium">
                        Free trial active
                        {subscription.trial_end && (
                          <span> · Ends {new Date(subscription.trial_end).toLocaleDateString()}</span>
                        )}
                      </p>
                    )}
                    {subscription.status === "canceling" && (
                      <p className="text-sm text-amber-600 font-medium">
                        Cancels on {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "end of period"}
                      </p>
                    )}
                    {subscription.is_active && !subscription.is_trial && subscription.status !== "canceling" && (
                      <p className="text-sm text-muted-foreground">
                        Renews {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "automatically"}
                      </p>
                    )}
                  </div>
                  {subscription.tier !== "bronze" && (
                    <div className="flex gap-2">
                      {subscription.status === "canceling" || subscription.cancel_at_period_end ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleReactivateSubscription}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reactivate
                        </Button>
                      ) : subscription.can_cancel ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setShowCancelDialog(true)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Upgrade/Change Plan */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="font-medium">Want to change your plan?</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.tier === "bronze" 
                        ? "Upgrade to unlock more features" 
                        : subscription.tier === "silver" 
                          ? "Upgrade to Gold for unlimited features"
                          : "You're on our best plan!"}
                    </p>
                  </div>
                  <Button onClick={() => navigate("/pricing")} variant="outline">
                    View Plans
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No active subscription</p>
                <Button onClick={() => navigate("/pricing")}>
                  View Subscription Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Manage your saved payment methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPaymentMethods ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : paymentMethods.length > 0 ? (
              <>
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <div 
                      key={pm.id} 
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 bg-slate-200 rounded flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {pm.brand} •••• {pm.last4}
                            {pm.is_default && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {pm.exp_month}/{pm.exp_year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!pm.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultPaymentMethod(pm.id)}
                            title="Set as default"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePaymentMethod(pm.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Stripe Billing Portal */}
                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleOpenBillingPortal}
                    disabled={openingBillingPortal}
                    className="w-full"
                  >
                    {openingBillingPortal ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Opening...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage in Stripe Billing Portal
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Add new payment methods, view invoices, and update billing info
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No payment methods saved</p>
                {subscription?.tier !== "bronze" ? (
                  <Button 
                    variant="outline" 
                    onClick={handleOpenBillingPortal}
                    disabled={openingBillingPortal}
                  >
                    {openingBillingPortal ? "Opening..." : "Add Payment Method"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Payment methods are saved when you subscribe to a paid plan
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>User ID:</strong> {profile?.user_id}</p>
            <p><strong>Account Type:</strong> {profile?.auth_provider === "google" ? "Google Account" : "Email/Password"}</p>
            <p><strong>Security Questions:</strong> {profile?.has_security_questions ? `${profile?.security_question_count} set` : "None set"}</p>
            {profile?.created_at && (
              <p><strong>Member Since:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Question Verification Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Security Verification
            </DialogTitle>
            <DialogDescription>
              Please answer your security question to verify this change.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-slate-100 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Security Question:</p>
              <p className="font-medium">{securityQuestion}</p>
            </div>
            
            <div>
              <Label htmlFor="security-answer">Your Answer</Label>
              <Input
                id="security-answer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Enter your answer"
                className="mt-1"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Answer is case-insensitive
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSecurityVerified} 
              disabled={!securityAnswer.trim() || submitting}
            >
              {submitting ? "Verifying..." : "Verify & Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>What happens when you cancel:</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>You'll keep access until the end of your current billing period</li>
                <li>Your teams, games, and data will be preserved</li>
                <li>You can reactivate anytime before the period ends</li>
                <li>After cancellation, you'll be downgraded to Bronze (free) tier</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelingSubscription}
            >
              {cancelingSubscription ? "Canceling..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

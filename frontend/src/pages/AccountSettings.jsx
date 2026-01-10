import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, User, Mail, Lock, Shield, Eye, EyeOff, Check, AlertCircle, Users, UserPlus, UserMinus, Share2 } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

  useEffect(() => {
    fetchProfile();
    fetchSharedAccess();
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
    </Layout>
  );
}

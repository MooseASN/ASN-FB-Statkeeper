import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Users, 
  Download, 
  RefreshCw, 
  Search,
  Shield,
  Calendar,
  Trophy,
  Target,
  Wrench,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ChevronRight,
  ChevronDown,
  Trash2,
  X,
  DollarSign,
  Crown,
  UserCog,
  Check,
  Edit2,
  Save,
  Gift
} from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [migrating, setMigrating] = useState(false);
  
  // Beta mode settings
  const [betaSettings, setBetaSettings] = useState({
    site_beta_enabled: false,
    site_beta_message: "StatMoose is currently in private beta. Contact the administrator for access.",
    allowed_emails: [],
    basketball_beta: false,
    basketball_password: "",
    football_beta: false,
    football_password: "",
    baseball_beta: false,
    baseball_password: "",
    school_creation_beta: false,
    school_creation_password: ""
  });
  const [newAllowedEmail, setNewAllowedEmail] = useState("");
  const [savingBeta, setSavingBeta] = useState(false);
  const [showBasketballPassword, setShowBasketballPassword] = useState(false);
  const [showFootballPassword, setShowFootballPassword] = useState(false);
  const [showBaseballPassword, setShowBaseballPassword] = useState(false);
  const [showSchoolCreationPassword, setShowSchoolCreationPassword] = useState(false);
  
  // User deletion
  const [deletingUser, setDeletingUser] = useState(null);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  
  // User role management
  const [updatingRole, setUpdatingRole] = useState(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  
  // Comped (all perks) management
  const [updatingComped, setUpdatingComped] = useState(null);
  const [showCompedDialog, setShowCompedDialog] = useState(false);
  const [compedUser, setCompedUser] = useState(null);
  
  // Pricing management
  const [pricingConfig, setPricingConfig] = useState(null);
  const [editingPricing, setEditingPricing] = useState(false);
  const [pricingDraft, setPricingDraft] = useState(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  
  // Schools viewer
  const [schools, setSchools] = useState([]);
  const [schoolSearchTerm, setSchoolSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolDetails, setSchoolDetails] = useState(null);
  const [loadingSchoolDetails, setLoadingSchoolDetails] = useState(false);
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);
  
  // Collapsible sections
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [betaOpen, setBetaOpen] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  
  // Error logs
  const [errorLogs, setErrorLogs] = useState([]);
  const [errorStats, setErrorStats] = useState(null);
  const [loadingErrors, setLoadingErrors] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, statsRes, betaRes, schoolsRes, pricingRes, errorStatsRes] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/beta-settings`),
        axios.get(`${API}/admin/schools`),
        axios.get(`${API}/admin/pricing`),
        axios.get(`${API}/errors/admin/stats`).catch(() => ({ data: { total: 0, unresolved: 0, recent_24h: 0 } }))
      ]);
      setUsers(usersRes.data.users);
      setStats(statsRes.data);
      setBetaSettings(betaRes.data);
      setSchools(schoolsRes.data.schools || []);
      setPricingConfig(pricingRes.data.pricing);
      setErrorStats(errorStatsRes.data);
      setLastUpdated(new Date());
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Admin access required");
        navigate("/dashboard");
      } else {
        toast.error("Failed to load admin data");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);
  
  const handleSaveBetaSettings = async () => {
    setSavingBeta(true);
    try {
      await axios.put(`${API}/admin/beta-settings`, betaSettings);
      toast.success("Beta mode settings saved");
    } catch (error) {
      toast.error("Failed to save beta settings");
    } finally {
      setSavingBeta(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    try {
      await axios.delete(`${API}/admin/users/${deletingUser.user_id}`);
      toast.success(`User ${deletingUser.email} deleted successfully`);
      setShowDeleteUserDialog(false);
      setDeletingUser(null);
      fetchData(); // Refresh user list
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleToggleAdmin = async (targetUser) => {
    if (!targetUser) return;
    
    const newRole = targetUser.effective_role === "admin" ? "user" : "admin";
    setUpdatingRole(targetUser.user_id);
    
    try {
      await axios.put(`${API}/admin/users/${targetUser.user_id}/role`, { role: newRole });
      toast.success(`${targetUser.email} is now ${newRole === "admin" ? "an admin" : "a regular user"}`);
      setShowRoleDialog(false);
      setRoleChangeUser(null);
      fetchData(); // Refresh user list
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleToggleComped = async (targetUser) => {
    if (!targetUser) return;
    
    const newCompedStatus = !targetUser.is_comped;
    setUpdatingComped(targetUser.user_id);
    
    try {
      await axios.put(`${API}/admin/users/${targetUser.user_id}/comped`, { is_comped: newCompedStatus });
      toast.success(
        newCompedStatus 
          ? `${targetUser.email} now has complimentary Gold access!` 
          : `${targetUser.email}'s complimentary access has been revoked`
      );
      setShowCompedDialog(false);
      setCompedUser(null);
      fetchData(); // Refresh user list
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user perks");
    } finally {
      setUpdatingComped(null);
    }
  };

  const handleStartEditPricing = () => {
    setPricingDraft(JSON.parse(JSON.stringify(pricingConfig)));
    setEditingPricing(true);
  };

  const handleCancelEditPricing = () => {
    setPricingDraft(null);
    setEditingPricing(false);
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      await axios.put(`${API}/admin/pricing`, pricingDraft);
      setPricingConfig(pricingDraft);
      setEditingPricing(false);
      setPricingDraft(null);
      toast.success("Pricing configuration saved");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save pricing");
    } finally {
      setSavingPricing(false);
    }
  };

  const updatePricingDraft = (tier, field, value) => {
    setPricingDraft(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value
      }
    }));
  };

  const updatePricingFeature = (tier, index, value) => {
    setPricingDraft(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        features: prev[tier].features.map((f, i) => i === index ? value : f)
      }
    }));
  };

  const addPricingFeature = (tier) => {
    setPricingDraft(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        features: [...prev[tier].features, "New feature"]
      }
    }));
  };

  const removePricingFeature = (tier, index) => {
    setPricingDraft(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        features: prev[tier].features.filter((_, i) => i !== index)
      }
    }));
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API}/admin/users/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statmoose_users_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Users exported successfully");
    } catch (error) {
      toast.error("Failed to export users");
    }
  };

  const handleMigrateTeams = async () => {
    if (!window.confirm("This will assign all teams/games/events without a sport to 'basketball'. Continue?")) {
      return;
    }
    
    setMigrating(true);
    try {
      const response = await axios.post(`${API}/admin/migrate-teams-sport`);
      toast.success(`Migration complete! Teams: ${response.data.teams_migrated}, Games: ${response.data.games_migrated}, Events: ${response.data.events_migrated}`);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error("Migration failed: " + (error.response?.data?.detail || error.message));
    } finally {
      setMigrating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSchools = schools.filter(s =>
    s.name?.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
    s.school_code?.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
    s.state?.toLowerCase().includes(schoolSearchTerm.toLowerCase())
  );

  const handleViewSchool = async (school) => {
    setSelectedSchool(school);
    setShowSchoolDialog(true);
    setLoadingSchoolDetails(true);
    
    try {
      const res = await axios.get(`${API}/admin/schools/${school.school_id}`);
      setSchoolDetails(res.data);
    } catch (error) {
      toast.error("Failed to load school details");
    } finally {
      setLoadingSchoolDetails(false);
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

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-amber-500" />
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-muted-foreground text-sm">
                StatMoose Platform Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-50 border-green-300" : ""}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Schools</p>
                  <p className="text-2xl font-bold">{schools.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Teams</p>
                  <p className="text-2xl font-bold">{stats?.total_teams || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    🏀 {stats?.basketball_teams || 0} | 🏈 {stats?.football_teams || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Games</p>
                  <p className="text-2xl font-bold">{stats?.total_games || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    🏀 {stats?.basketball_games || 0} | 🏈 {stats?.football_games || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Warning - Show if teams don't match total */}
        {stats && (stats.total_teams > (stats.basketball_teams + stats.football_teams)) && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">Teams Missing Sport Assignment</p>
                    <p className="text-sm text-amber-700">
                      {stats.total_teams - stats.basketball_teams - stats.football_teams} teams don&apos;t have a sport assigned and won&apos;t appear in Basketball or Football views.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleMigrateTeams} 
                  disabled={migrating}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  {migrating ? "Migrating..." : "Assign to Basketball"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Beta Mode Settings - Collapsible */}
        <Collapsible open={betaOpen} onOpenChange={setBetaOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Beta Mode Settings
                      {betaSettings.site_beta_enabled && (
                        <Badge className="bg-amber-500 text-xs">ACTIVE</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Control site access and lock sports behind passwords for beta testing.
                    </p>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${betaOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* SITE-WIDE BETA MODE */}
            <div className={`p-4 rounded-lg space-y-4 ${betaSettings.site_beta_enabled ? 'bg-amber-500/10 border-2 border-amber-500' : 'border border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${betaSettings.site_beta_enabled ? 'bg-amber-500' : 'bg-zinc-200'}`}>
                    <Shield className={`w-5 h-5 ${betaSettings.site_beta_enabled ? 'text-white' : 'text-zinc-500'}`} />
                  </div>
                  <div>
                    <Label className="text-lg font-bold">Site-Wide Beta Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      {betaSettings.site_beta_enabled 
                        ? "🔒 ENABLED - Only whitelisted users can access the site"
                        : "Restrict entire site to approved users only"
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={betaSettings.site_beta_enabled}
                  onCheckedChange={(checked) => setBetaSettings(prev => ({ ...prev, site_beta_enabled: checked }))}
                  data-testid="site-beta-toggle"
                />
              </div>
              
              {betaSettings.site_beta_enabled && (
                <div className="space-y-4 pt-2">
                  {/* Beta message */}
                  <div>
                    <Label className="text-sm font-medium">Message for blocked users</Label>
                    <Input
                      type="text"
                      placeholder="Message shown to users without access"
                      value={betaSettings.site_beta_message}
                      onChange={(e) => setBetaSettings(prev => ({ ...prev, site_beta_message: e.target.value }))}
                      className="mt-1"
                      data-testid="beta-message-input"
                    />
                  </div>
                  
                  {/* Allowed emails list */}
                  <div>
                    <Label className="text-sm font-medium">Allowed Users ({betaSettings.allowed_emails?.length || 0})</Label>
                    <p className="text-xs text-muted-foreground mb-2">Admin users always have access. Add email addresses below to grant beta access.</p>
                    
                    {/* Add new email */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={newAllowedEmail}
                        onChange={(e) => setNewAllowedEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newAllowedEmail.trim()) {
                            e.preventDefault();
                            const email = newAllowedEmail.trim().toLowerCase();
                            if (!betaSettings.allowed_emails?.includes(email)) {
                              setBetaSettings(prev => ({
                                ...prev,
                                allowed_emails: [...(prev.allowed_emails || []), email]
                              }));
                            }
                            setNewAllowedEmail("");
                          }
                        }}
                        className="flex-1"
                        data-testid="add-email-input"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const email = newAllowedEmail.trim().toLowerCase();
                          if (email && !betaSettings.allowed_emails?.includes(email)) {
                            setBetaSettings(prev => ({
                              ...prev,
                              allowed_emails: [...(prev.allowed_emails || []), email]
                            }));
                          }
                          setNewAllowedEmail("");
                        }}
                        disabled={!newAllowedEmail.trim()}
                        data-testid="add-email-btn"
                      >
                        Add
                      </Button>
                    </div>
                    
                    {/* List of allowed emails */}
                    {betaSettings.allowed_emails?.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {betaSettings.allowed_emails.map((email, index) => (
                          <div key={email} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setBetaSettings(prev => ({
                                  ...prev,
                                  allowed_emails: prev.allowed_emails.filter((_, i) => i !== index)
                                }));
                              }}
                              className="text-red-500 hover:text-red-700"
                              data-testid={`remove-email-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-4">Sport-specific beta modes (require password to access specific sports):</p>
            </div>
            
            {/* Basketball Beta */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏀</span>
                  <div>
                    <Label className="text-base font-medium">Basketball Beta Mode</Label>
                    <p className="text-sm text-muted-foreground">Require password to access basketball</p>
                  </div>
                </div>
                <Switch
                  checked={betaSettings.basketball_beta}
                  onCheckedChange={(checked) => setBetaSettings(prev => ({ ...prev, basketball_beta: checked }))}
                />
              </div>
              {betaSettings.basketball_beta && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showBasketballPassword ? "text" : "password"}
                      placeholder="Enter beta password"
                      value={betaSettings.basketball_password}
                      onChange={(e) => setBetaSettings(prev => ({ ...prev, basketball_password: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBasketballPassword(!showBasketballPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showBasketballPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Football Beta */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏈</span>
                  <div>
                    <Label className="text-base font-medium">Football Beta Mode</Label>
                    <p className="text-sm text-muted-foreground">Require password to access football</p>
                  </div>
                </div>
                <Switch
                  checked={betaSettings.football_beta}
                  onCheckedChange={(checked) => setBetaSettings(prev => ({ ...prev, football_beta: checked }))}
                />
              </div>
              {betaSettings.football_beta && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showFootballPassword ? "text" : "password"}
                      placeholder="Enter beta password"
                      value={betaSettings.football_password}
                      onChange={(e) => setBetaSettings(prev => ({ ...prev, football_password: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFootballPassword(!showFootballPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showFootballPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Baseball Beta */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚾</span>
                  <div>
                    <Label className="text-base font-medium">Baseball Beta Mode</Label>
                    <p className="text-sm text-muted-foreground">Require password to access Baseball</p>
                  </div>
                </div>
                <Switch
                  checked={betaSettings.baseball_beta}
                  onCheckedChange={(checked) => setBetaSettings(prev => ({ ...prev, baseball_beta: checked }))}
                  data-testid="baseball-beta-toggle"
                />
              </div>
              {betaSettings.baseball_beta && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showBaseballPassword ? "text" : "password"}
                      placeholder="Enter beta password for Baseball"
                      value={betaSettings.baseball_password}
                      onChange={(e) => setBetaSettings(prev => ({ ...prev, baseball_password: e.target.value }))}
                      className="pr-10"
                      data-testid="baseball-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBaseballPassword(!showBaseballPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showBaseballPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* School Creation Beta */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-purple-500" />
                  <div>
                    <Label className="text-base font-medium">School Creation Beta Mode</Label>
                    <p className="text-sm text-muted-foreground">Require password to register a new school</p>
                  </div>
                </div>
                <Switch
                  checked={betaSettings.school_creation_beta}
                  onCheckedChange={(checked) => setBetaSettings(prev => ({ ...prev, school_creation_beta: checked }))}
                  data-testid="school-creation-beta-toggle"
                />
              </div>
              {betaSettings.school_creation_beta && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showSchoolCreationPassword ? "text" : "password"}
                      placeholder="Enter beta password for school creation"
                      value={betaSettings.school_creation_password}
                      onChange={(e) => setBetaSettings(prev => ({ ...prev, school_creation_password: e.target.value }))}
                      className="pr-10"
                      data-testid="school-creation-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSchoolCreationPassword(!showSchoolCreationPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSchoolCreationPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <Button onClick={handleSaveBetaSettings} disabled={savingBeta} className="w-full">
              {savingBeta ? "Saving..." : "Save Beta Settings"}
            </Button>
          </CardContent>
        </CollapsibleContent>
        </Card>
      </Collapsible>

        {/* Pricing Management - Collapsible */}
        <Collapsible open={pricingOpen} onOpenChange={setPricingOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Pricing Management
                  </CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${pricingOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Configure pricing tiers and features for each subscription level.
                  </p>
                  {!editingPricing ? (
                    <Button onClick={handleStartEditPricing} variant="outline" size="sm">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Pricing
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleCancelEditPricing} variant="outline" size="sm">
                        Cancel
                      </Button>
                      <Button onClick={handleSavePricing} disabled={savingPricing} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        {savingPricing ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>
                
                {pricingConfig && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {["bronze", "silver", "gold"].map((tier) => {
                      const config = editingPricing ? pricingDraft?.[tier] : pricingConfig?.[tier];
                      if (!config) return null;
                      
                      return (
                        <div 
                          key={tier} 
                          className={`p-4 rounded-lg border-2 ${
                            tier === "gold" 
                              ? "border-yellow-400 bg-yellow-50" 
                              : tier === "silver" 
                                ? "border-gray-300 bg-gray-50" 
                                : "border-orange-300 bg-orange-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            {tier === "gold" && <span className="text-2xl">🥇</span>}
                            {tier === "silver" && <span className="text-2xl">🥈</span>}
                            {tier === "bronze" && <span className="text-2xl">🥉</span>}
                            {editingPricing ? (
                              <Input
                                value={config.name}
                                onChange={(e) => updatePricingDraft(tier, "name", e.target.value)}
                                className="font-bold text-lg h-8"
                              />
                            ) : (
                              <h3 className="font-bold text-lg">{config.name}</h3>
                            )}
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-16">Monthly:</span>
                              {editingPricing ? (
                                <div className="flex items-center gap-1">
                                  <span>$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={config.monthly_price}
                                    onChange={(e) => updatePricingDraft(tier, "monthly_price", parseFloat(e.target.value) || 0)}
                                    className="w-20 h-7 text-sm"
                                  />
                                </div>
                              ) : (
                                <span className="font-semibold">
                                  {config.monthly_price === 0 ? "Free" : `$${config.monthly_price}/mo`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-16">Annual:</span>
                              {editingPricing ? (
                                <div className="flex items-center gap-1">
                                  <span>$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={config.annual_price}
                                    onChange={(e) => updatePricingDraft(tier, "annual_price", parseFloat(e.target.value) || 0)}
                                    className="w-20 h-7 text-sm"
                                  />
                                </div>
                              ) : (
                                <span className="font-semibold">
                                  {config.annual_price === 0 ? "Free" : `$${config.annual_price}/yr`}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Features:</span>
                            {config.features?.map((feature, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                                {editingPricing ? (
                                  <div className="flex-1 flex items-center gap-1">
                                    <Input
                                      value={feature}
                                      onChange={(e) => updatePricingFeature(tier, idx, e.target.value)}
                                      className="h-6 text-xs flex-1"
                                    />
                                    <button
                                      onClick={() => removePricingFeature(tier, idx)}
                                      className="text-red-500 hover:text-red-700 p-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs">{feature}</span>
                                )}
                              </div>
                            ))}
                            {editingPricing && (
                              <Button
                                onClick={() => addPricingFeature(tier)}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs mt-1"
                              >
                                + Add Feature
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Schools Viewer - Collapsible */}
        <Collapsible open={schoolsOpen} onOpenChange={setSchoolsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Participating Schools ({schools.length})
                  </CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${schoolsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search schools..."
                      value={schoolSearchTerm}
                      onChange={(e) => setSchoolSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                {filteredSchools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {schoolSearchTerm ? "No schools match your search" : "No schools registered yet"}
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {filteredSchools.map((school) => (
                        <div
                          key={school.school_id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleViewSchool(school)}
                        >
                          <div className="flex items-center gap-3">
                            {school.logo_url ? (
                              <img 
                                src={school.logo_url} 
                                alt={school.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: school.primary_color || "#666" }}
                              >
                                {school.name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {school.name}
                                {school.classification_display && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {school.classification_display === "high_school" ? "High School" :
                                     school.classification_display === "college" ? "College" :
                                     school.classification_display === "prep" ? "Prep" :
                                     school.classification_display}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-mono text-orange-600">{school.school_code}</span>
                                {school.state && <span> • {school.state}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <div className="text-muted-foreground">{school.member_count || 0} members</div>
                              <div className="text-muted-foreground">{school.season_count || 0} seasons</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Users Table - Collapsible */}
        <Collapsible open={usersOpen} onOpenChange={setUsersOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    All Users ({filteredUsers.length})
                  </CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${usersOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleExportCSV} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
                <ScrollArea className="h-[400px]">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead className="text-center">Teams</TableHead>
                          <TableHead className="text-center">Games</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              {searchTerm ? "No users match your search" : "No users found"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u, idx) => (
                            <TableRow key={`${u.user_id}_${idx}`}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className={u.effective_role === "primary_admin" ? "font-bold text-amber-600" : ""}>
                                    {u.email}
                                  </span>
                                  {u.username && (
                                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{u.name || "-"}</TableCell>
                              <TableCell>
                                {u.effective_role === "primary_admin" && (
                                  <Badge className="bg-amber-500 hover:bg-amber-600">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Primary Admin
                                  </Badge>
                                )}
                                {u.effective_role === "admin" && (
                                  <Badge className="bg-purple-500 hover:bg-purple-600">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Admin
                                  </Badge>
                                )}
                                {u.effective_role === "user" && (
                                  <Badge variant="secondary">User</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      u.subscription_tier === "gold" 
                                        ? "border-yellow-500 text-yellow-600 bg-yellow-50" 
                                        : u.subscription_tier === "silver" 
                                          ? "border-gray-400 text-gray-600 bg-gray-50" 
                                          : "border-orange-400 text-orange-600 bg-orange-50"
                                    }
                                  >
                                    {u.subscription_tier === "gold" && "🥇 "}
                                    {u.subscription_tier === "silver" && "🥈 "}
                                    {u.subscription_tier === "bronze" && "🥉 "}
                                    {(u.subscription_tier || "bronze").charAt(0).toUpperCase() + (u.subscription_tier || "bronze").slice(1)}
                                  </Badge>
                                  {u.is_comped && (
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">
                                      <Gift className="w-3 h-3 mr-1" />
                                      Comp
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    u.subscription_status === "active" 
                                      ? "bg-green-100 text-green-700" 
                                      : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {u.subscription_status === "active" ? "Active" : "Free"}
                                  </span>
                                  {u.subscription_end && u.subscription_status === "active" && (
                                    <span className="text-[10px] text-muted-foreground mt-0.5">
                                      Ends: {new Date(u.subscription_end).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{u.team_count || 0}</TableCell>
                              <TableCell className="text-center">{u.game_count || 0}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  {/* Grant/Revoke All Perks button */}
                                  {u.effective_role !== "primary_admin" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setCompedUser(u);
                                        setShowCompedDialog(true);
                                      }}
                                      disabled={updatingComped === u.user_id}
                                      className={u.is_comped 
                                        ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                                        : "text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                                      }
                                      data-testid={`toggle-comped-${u.user_id}`}
                                      title={u.is_comped ? "Revoke All Perks" : "Grant All Perks"}
                                    >
                                      <Gift className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {/* Grant/Revoke Admin button - only show for non-primary admins */}
                                  {u.effective_role !== "primary_admin" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setRoleChangeUser(u);
                                        setShowRoleDialog(true);
                                      }}
                                      disabled={updatingRole === u.user_id}
                                      className="text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                                      data-testid={`toggle-admin-${u.user_id}`}
                                      title={u.effective_role === "admin" ? "Revoke Admin" : "Grant Admin"}
                                    >
                                      <UserCog className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {/* Delete button - only show for non-admin users */}
                                  {u.effective_role !== "primary_admin" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setDeletingUser(u);
                                        setShowDeleteUserDialog(true);
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      data-testid={`delete-user-${u.user_id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* School Details Dialog */}
      <Dialog open={showSchoolDialog} onOpenChange={setShowSchoolDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedSchool?.logo_url ? (
                <img 
                  src={selectedSchool.logo_url} 
                  alt={selectedSchool.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedSchool?.primary_color || "#666" }}
                >
                  {selectedSchool?.name?.charAt(0)}
                </div>
              )}
              <div>
                <div>{selectedSchool?.name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  ID: <span className="font-mono text-orange-600">{selectedSchool?.school_code}</span>
                  {selectedSchool?.state && <span> • {selectedSchool.state}</span>}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {loadingSchoolDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : schoolDetails && (
            <div className="space-y-6">
              {/* Sports Used */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Sports Being Used
                </h3>
                <div className="flex gap-2">
                  {schoolDetails.sports_used?.length > 0 ? (
                    schoolDetails.sports_used.map(sport => (
                      <Badge key={sport} variant="secondary" className="text-sm">
                        {sport === "basketball" ? "🏀 Basketball" : sport === "football" ? "🏈 Football" : sport}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No sports configured</span>
                  )}
                </div>
              </div>

              {/* Seasons */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Seasons ({schoolDetails.seasons?.length || 0})
                </h3>
                {schoolDetails.seasons?.length > 0 ? (
                  <div className="space-y-2">
                    {schoolDetails.seasons.map(season => (
                      <div key={season.season_id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span>{season.sport === "basketball" ? "🏀" : "🏈"}</span>
                          <span className="font-medium">{season.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {season.gender === "men" ? "Men's" : "Women's"} {season.level === "varsity" ? "Varsity" : "JV"}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{season.game_count || 0} games</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">No seasons created</span>
                )}
              </div>

              {/* Team Members */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members ({schoolDetails.members?.length || 0})
                </h3>
                {schoolDetails.members?.length > 0 ? (
                  <ScrollArea className="h-48 border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schoolDetails.members.map(member => (
                          <TableRow key={member.user_id}>
                            <TableCell>{member.name || member.username || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{member.email}</TableCell>
                            <TableCell>
                              <Badge variant={member.school_role === "admin" ? "default" : "secondary"}>
                                {member.school_role === "admin" ? "Admin" : "Member"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <span className="text-muted-foreground text-sm">No members</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the user account.
            </DialogDescription>
          </DialogHeader>
          
          {deletingUser && (
            <div className="py-4 space-y-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800">{deletingUser.name || deletingUser.username || "Unknown User"}</p>
                <p className="text-sm text-red-600">{deletingUser.email}</p>
                <p className="text-xs text-red-500 font-mono mt-1">{deletingUser.user_id}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                The user will no longer be able to log in. Any teams, games, or data created by this user will remain but will be unassigned.
              </p>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteUserDialog(false);
                setDeletingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              data-testid="confirm-delete-user-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <UserCog className="w-5 h-5" />
              {roleChangeUser?.effective_role === "admin" ? "Revoke Admin Access" : "Grant Admin Access"}
            </DialogTitle>
            <DialogDescription>
              {roleChangeUser?.effective_role === "admin" 
                ? "This will remove admin privileges from this user."
                : "This will give this user full admin access to the platform."}
            </DialogDescription>
          </DialogHeader>
          
          {roleChangeUser && (
            <div className="py-4 space-y-2">
              <div className={`p-3 rounded-lg border ${
                roleChangeUser.effective_role === "admin" 
                  ? "bg-amber-50 border-amber-200" 
                  : "bg-purple-50 border-purple-200"
              }`}>
                <p className={`font-medium ${
                  roleChangeUser.effective_role === "admin" ? "text-amber-800" : "text-purple-800"
                }`}>
                  {roleChangeUser.name || roleChangeUser.username || "Unknown User"}
                </p>
                <p className={`text-sm ${
                  roleChangeUser.effective_role === "admin" ? "text-amber-600" : "text-purple-600"
                }`}>
                  {roleChangeUser.email}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Current role:</span>
                  <Badge variant={roleChangeUser.effective_role === "admin" ? "default" : "secondary"}>
                    {roleChangeUser.effective_role === "admin" ? "Admin" : "User"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant={roleChangeUser.effective_role === "admin" ? "secondary" : "default"}>
                    {roleChangeUser.effective_role === "admin" ? "User" : "Admin"}
                  </Badge>
                </div>
              </div>
              {roleChangeUser.effective_role !== "admin" && (
                <p className="text-sm text-muted-foreground">
                  Admin users can access the admin dashboard, manage users, view all data, and configure platform settings.
                </p>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRoleDialog(false);
                setRoleChangeUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleToggleAdmin(roleChangeUser)}
              disabled={updatingRole === roleChangeUser?.user_id}
              className={roleChangeUser?.effective_role === "admin" 
                ? "bg-amber-600 hover:bg-amber-700" 
                : "bg-purple-600 hover:bg-purple-700"}
              data-testid="confirm-role-change-btn"
            >
              {roleChangeUser?.effective_role === "admin" ? (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Revoke Admin
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Grant Admin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comped (All Perks) Dialog */}
      <Dialog open={showCompedDialog} onOpenChange={setShowCompedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className={compedUser?.is_comped ? "w-5 h-5 text-red-500" : "w-5 h-5 text-emerald-500"} />
              {compedUser?.is_comped ? "Revoke All Perks" : "Grant All Perks"}
            </DialogTitle>
            <DialogDescription>
              {compedUser?.is_comped 
                ? "This will remove complimentary Gold access from this user."
                : "This will give the user complimentary Gold-tier access (all premium features) without requiring payment."}
            </DialogDescription>
          </DialogHeader>
          
          {compedUser && (
            <div className="py-4">
              <div className={`p-4 rounded-lg ${compedUser.is_comped ? "bg-red-50" : "bg-emerald-50"}`}>
                <p className={`font-medium ${compedUser.is_comped ? "text-red-800" : "text-emerald-800"}`}>
                  {compedUser.email}
                </p>
                <p className={`text-sm ${compedUser.is_comped ? "text-red-600" : "text-emerald-600"}`}>
                  Current tier: <span className="font-medium capitalize">{compedUser.subscription_tier || "bronze"}</span>
                  {compedUser.is_comped && " (Comped)"}
                </p>
              </div>
              
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">
                  {compedUser.is_comped ? "After revoking:" : "User will receive:"}
                </p>
                {compedUser.is_comped ? (
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Downgraded to Bronze (free) tier</li>
                    <li>Premium features will be locked</li>
                    <li>Teams and data remain intact</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Full Gold tier access</li>
                    <li>Embeddable stats widgets</li>
                    <li>Unlimited sponsor banners</li>
                    <li>Custom team logos</li>
                    <li>Shared access for staff</li>
                    <li>Priority support</li>
                  </ul>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCompedDialog(false);
                setCompedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleToggleComped(compedUser)}
              disabled={updatingComped === compedUser?.user_id}
              className={compedUser?.is_comped 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-emerald-600 hover:bg-emerald-700"}
              data-testid="confirm-comped-change-btn"
            >
              {compedUser?.is_comped ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Revoke All Perks
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Grant All Perks
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

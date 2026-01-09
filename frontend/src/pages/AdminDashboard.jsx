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
  ChevronDown
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
    basketball_beta: false,
    basketball_password: "",
    football_beta: false,
    football_password: ""
  });
  const [savingBeta, setSavingBeta] = useState(false);
  const [showBasketballPassword, setShowBasketballPassword] = useState(false);
  const [showFootballPassword, setShowFootballPassword] = useState(false);
  
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

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, statsRes, betaRes, schoolsRes] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/beta-settings`),
        axios.get(`${API}/admin/schools`)
      ]);
      setUsers(usersRes.data.users);
      setStats(statsRes.data);
      setBetaSettings(betaRes.data);
      setSchools(schoolsRes.data.schools || []);
      setLastUpdated(new Date());
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Admin access required");
        navigate("/");
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
        
        {/* Beta Mode Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Beta Mode Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Lock sports behind a password for beta testing. Users without the password cannot access that sport.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
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
            
            <Button onClick={handleSaveBetaSettings} disabled={savingBeta} className="w-full">
              {savingBeta ? "Saving..." : "Save Beta Settings"}
            </Button>
          </CardContent>
        </Card>

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
                              <div className="font-medium">{school.name}</div>
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
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Users ({filteredUsers.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead className="text-center">Teams</TableHead>
                    <TableHead className="text-center">Games</TableHead>
                    <TableHead className="text-center">Events</TableHead>
                    <TableHead>Created</TableHead>
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
                    filteredUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-mono text-xs">{u.user_id}</TableCell>
                        <TableCell>
                          <span className={u.email === "antlersportsnetwork@gmail.com" ? "font-bold text-amber-600" : ""}>
                            {u.email}
                          </span>
                          {u.email === "antlersportsnetwork@gmail.com" && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">ADMIN</span>
                          )}
                        </TableCell>
                        <TableCell>{u.username || "-"}</TableCell>
                        <TableCell>{u.name || "-"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            u.auth_provider === "google" 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {u.auth_provider || "local"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{u.team_count || 0}</TableCell>
                        <TableCell className="text-center">{u.game_count || 0}</TableCell>
                        <TableCell className="text-center">{u.event_count || 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
    </Layout>
  );
}

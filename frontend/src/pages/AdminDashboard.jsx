import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertTriangle
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

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/stats`)
      ]);
      setUsers(usersRes.data.users);
      setStats(statsRes.data);
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

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Users (7d)</p>
                  <p className="text-2xl font-bold">{stats?.recent_signups_7d || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
    </Layout>
  );
}

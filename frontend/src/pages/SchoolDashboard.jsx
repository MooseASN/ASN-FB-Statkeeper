import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useSport } from "@/contexts/SportContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, Calendar, Users, Trophy, Plus, Copy, RefreshCw, 
  ChevronLeft, ChevronRight, ArrowLeft, LogOut, Settings,
  Basketball, CircleDot, Play, Clock
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Calendar component
function SchoolCalendar({ games, onGameClick, selectedDate, onDateChange }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getGamesForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return games.filter(g => g.scheduled_date === dateStr);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold text-white">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="text-slate-400 hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-xs text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-20" />;
          }
          
          const dateGames = getGamesForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          
          return (
            <div
              key={idx}
              onClick={() => onDateChange(date)}
              className={`h-20 p-1 rounded cursor-pointer transition-colors ${
                isToday ? "bg-orange-500/20 border border-orange-500" :
                isSelected ? "bg-slate-700" :
                "hover:bg-slate-700/50"
              }`}
            >
              <div className={`text-xs ${isToday ? "text-orange-400 font-bold" : "text-slate-400"}`}>
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-0.5">
                {dateGames.slice(0, 2).map((game, i) => (
                  <div
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onGameClick(game); }}
                    className={`text-xs truncate px-1 rounded cursor-pointer ${
                      game.status === "active" 
                        ? "bg-green-500/30 text-green-400 animate-pulse" 
                        : game.status === "final"
                        ? "bg-slate-600 text-slate-300"
                        : "bg-blue-500/30 text-blue-400"
                    }`}
                  >
                    {game.sport === "basketball" ? "🏀" : "🏈"} {game.home_team_name?.substring(0, 8)}
                  </div>
                ))}
                {dateGames.length > 2 && (
                  <div className="text-xs text-slate-500 px-1">
                    +{dateGames.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchoolDashboard() {
  const navigate = useNavigate();
  const { selectSport } = useSport();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userRole, setUserRole] = useState("member");
  
  // Dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showSeasonDialog, setShowSeasonDialog] = useState(false);
  const [showGameStartDialog, setShowGameStartDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  
  // New season form
  const [newSeason, setNewSeason] = useState({ name: "", sport: "basketball" });
  
  // Invite link
  const [inviteLink, setInviteLink] = useState("");

  const fetchData = useCallback(async () => {
    try {
      // Check both localStorage and sessionStorage for token
      const token = localStorage.getItem("session_token") || sessionStorage.getItem("session_token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      // No need for manual headers - axios interceptor handles auth
      
      // Get school info - axios interceptor handles auth header
      const schoolRes = await axios.get(`${API}/schools/my-school`);
      setSchool(schoolRes.data);
      setUserRole(schoolRes.data.user_role);
      
      const schoolId = schoolRes.data.school_id;
      setInviteLink(`${window.location.origin}/school/join/${schoolRes.data.invite_code}`);
      
      // Get members, seasons, and calendar data
      const [membersRes, seasonsRes, calendarRes] = await Promise.all([
        axios.get(`${API}/schools/${schoolId}/members`),
        axios.get(`${API}/schools/${schoolId}/seasons`),
        axios.get(`${API}/schools/${schoolId}/calendar`)
      ]);
      
      setMembers(membersRes.data);
      setSeasons(seasonsRes.data);
      setGames(calendarRes.data.games || []);
      
    } catch (error) {
      console.error("Error fetching school data:", error);
      if (error.response?.status === 404) {
        // User doesn't have a school - redirect to select-sport (not "/" which also redirects)
        toast.error("You are not part of any school");
        navigate("/select-sport");
      } else if (error.response?.status === 401) {
        navigate("/login");
      } else {
        // For other errors, just show error state but don't redirect
        toast.error("Failed to load school dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!");
  };

  const handleRegenerateInvite = async () => {
    try {
      const token = sessionStorage.getItem("session_token");
      const res = await axios.post(
        `${API}/schools/${school.school_id}/regenerate-invite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteLink(`${window.location.origin}/school/join/${res.data.invite_code}`);
      toast.success("New invite link generated!");
    } catch (error) {
      toast.error("Failed to regenerate invite link");
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeason.name.trim()) {
      toast.error("Please enter a season name");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token");
      await axios.post(
        `${API}/schools/${school.school_id}/seasons`,
        newSeason,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Season created!");
      setShowSeasonDialog(false);
      setNewSeason({ name: "", sport: "basketball" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create season");
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const token = sessionStorage.getItem("session_token");
      await axios.put(
        `${API}/schools/${school.school_id}/members/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Role updated to ${newRole}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update role");
    }
  };

  const handleGameClick = (game) => {
    setSelectedGame(game);
    setShowGameStartDialog(true);
  };

  const handleStartGame = () => {
    if (!selectedGame) return;
    
    // Select the sport first (required by SportProtectedRoute)
    selectSport(selectedGame.sport);
    
    // Navigate to stat tracker
    if (selectedGame.sport === "football") {
      navigate(`/football/${selectedGame.id}`);
    } else {
      navigate(`/game/${selectedGame.id}`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("session_token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-orange-500 mx-auto animate-pulse" />
          <p className="text-slate-400 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">School not found</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const adminCount = members.filter(m => m.school_role === "admin").length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {school.logo_url ? (
              <img src={school.logo_url} alt={school.name} className="w-12 h-12 object-contain rounded" />
            ) : (
              <div className="w-12 h-12 bg-orange-500/20 rounded flex items-center justify-center">
                <Building2 className="w-6 h-6 text-orange-500" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{school.name}</h1>
              <p className="text-sm text-slate-400">{school.state}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={userRole === "admin" ? "default" : "secondary"}>
              {userRole === "admin" ? "Admin" : "Member"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Calendar Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                Schedule
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="text-orange-400 hover:text-orange-300"
              >
                Today
              </Button>
            </div>
            <SchoolCalendar
              games={games}
              onGameClick={handleGameClick}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          {/* Members Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Team Members ({members.length})
              </h2>
              {userRole === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteDialog(true)}
                  className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              )}
            </div>
            
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 text-sm p-3">Name</th>
                      <th className="text-left text-slate-400 text-sm p-3">Email</th>
                      <th className="text-left text-slate-400 text-sm p-3">Role</th>
                      {userRole === "admin" && <th className="text-left text-slate-400 text-sm p-3">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.user_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="p-3 text-white">{member.name}</td>
                        <td className="p-3 text-slate-400">{member.email}</td>
                        <td className="p-3">
                          <Badge variant={member.school_role === "admin" ? "default" : "secondary"}>
                            {member.school_role}
                          </Badge>
                        </td>
                        {userRole === "admin" && (
                          <td className="p-3">
                            {member.school_role === "member" && adminCount < 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateRole(member.user_id, "admin")}
                                className="text-orange-400 hover:text-orange-300"
                              >
                                Make Admin
                              </Button>
                            )}
                            {member.school_role === "admin" && adminCount > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateRole(member.user_id, "member")}
                                className="text-slate-400 hover:text-slate-300"
                              >
                                Remove Admin
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Seasons Sidebar */}
        <div className="w-80 bg-slate-800/50 border-l border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-500" />
              Seasons
            </h2>
            {userRole === "admin" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSeasonDialog(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Create
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {seasons.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No seasons yet</p>
              ) : (
                seasons.map(season => (
                  <Card
                    key={season.season_id}
                    className="bg-slate-900/50 border-slate-600 cursor-pointer hover:border-orange-500/50 transition-colors"
                    onClick={() => navigate(`/school/season/${season.season_id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {season.sport === "basketball" ? (
                          <span className="text-lg">🏀</span>
                        ) : (
                          <span className="text-lg">🏈</span>
                        )}
                        <span className="font-medium text-white text-sm">{season.name}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {season.team_id ? "Team configured" : "No team yet"}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Invite Members</DialogTitle>
            <DialogDescription className="text-slate-400">
              Share this link with people to invite them to your school
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="bg-slate-900 border-slate-600 text-white"
              />
              <Button onClick={handleCopyInvite} variant="outline" className="border-slate-600">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={handleRegenerateInvite}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate new link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Season Dialog */}
      <Dialog open={showSeasonDialog} onOpenChange={setShowSeasonDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Season</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new season for your school
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Sport</Label>
              <Select
                value={newSeason.sport}
                onValueChange={(v) => setNewSeason(prev => ({ ...prev, sport: v }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basketball">🏀 Basketball</SelectItem>
                  <SelectItem value="football">🏈 Football</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-200">Season Name</Label>
              <Input
                value={newSeason.name}
                onChange={(e) => setNewSeason(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 2025-26 Men's Basketball"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <Button
              onClick={handleCreateSeason}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Create Season
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Game Start Dialog */}
      <Dialog open={showGameStartDialog} onOpenChange={setShowGameStartDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedGame?.status === "active" ? "Game In Progress" : "Start Game?"}
            </DialogTitle>
          </DialogHeader>
          {selectedGame && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-right">
                    <div className="font-bold">{selectedGame.home_team_name}</div>
                    <div className="text-xs text-slate-500">Home</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-500">VS</div>
                  <div className="text-left">
                    <div className="font-bold">{selectedGame.away_team_name}</div>
                    <div className="text-xs text-slate-500">Away</div>
                  </div>
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  {selectedGame.scheduled_date} {selectedGame.scheduled_time && `at ${selectedGame.scheduled_time}`}
                </div>
                {selectedGame.status === "active" && (
                  <Badge className="mt-2 bg-green-500 animate-pulse">LIVE</Badge>
                )}
              </div>
              
              {selectedGame.status === "active" ? (
                <Button
                  onClick={handleStartGame}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continue Tracking
                </Button>
              ) : selectedGame.status === "scheduled" ? (
                <>
                  <p className="text-slate-400 text-sm text-center">
                    Are you ready to start tracking this game?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowGameStartDialog(false)}
                      variant="outline"
                      className="flex-1 border-slate-600"
                    >
                      Not Yet
                    </Button>
                    <Button
                      onClick={handleStartGame}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Game
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={handleStartGame}
                  variant="outline"
                  className="w-full border-slate-600"
                >
                  View Final Stats
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

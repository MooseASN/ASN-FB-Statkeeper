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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, Calendar, Users, Trophy, Plus, Copy, RefreshCw, 
  ChevronLeft, ChevronRight, LogOut, Settings, Edit,
  Play, Clock, Timer, BarChart3, Save, Upload
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper to format 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Calendar component
function SchoolCalendar({ games, onGameClick, selectedDate, onDateChange, onGoToToday }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getGamesForDate = (date) => {
    if (!date || !games || !Array.isArray(games)) return [];
    const dateStr = date.toISOString().split('T')[0];
    return games.filter(g => g.scheduled_date === dateStr);
  };

  // Function to go to today's date
  const handleGoToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateChange(today);
    if (onGoToToday) onGoToToday();
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleGoToToday}
            className="text-orange-400 hover:text-orange-300 text-xs px-2 py-1"
          >
            Today
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="text-slate-400 hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs text-slate-500 py-1">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-16" />;
          }
          
          const dateGames = getGamesForDate(date);
          const isToday = date.toDateString() === today.toDateString();
          
          return (
            <div
              key={date.toISOString()}
              className={`h-16 rounded p-1 cursor-pointer transition-colors ${
                isToday ? "bg-orange-500/20 border border-orange-500" : "hover:bg-slate-700/50"
              }`}
              onClick={() => onDateChange(date)}
            >
              <div className={`text-xs mb-1 ${isToday ? "text-orange-400 font-bold" : "text-slate-400"}`}>
                {date.getDate()}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dateGames.slice(0, 2).map(game => (
                  <div
                    key={game.id}
                    onClick={(e) => { e.stopPropagation(); onGameClick(game); }}
                    className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer ${
                      game.status === "active" 
                        ? "bg-green-500/30 text-green-400" 
                        : "bg-slate-600/50 text-slate-300"
                    }`}
                  >
                    {game.home_team_name?.split(' ')[0]}
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
  
  // Active tab
  const [activeTab, setActiveTab] = useState("schedule");
  
  // Dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showSeasonDialog, setShowSeasonDialog] = useState(false);
  const [showGameStartDialog, setShowGameStartDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  
  // New season form
  const [newSeason, setNewSeason] = useState({ 
    name: "", 
    sport: "basketball",
    gender: "men",
    level: "varsity"
  });
  
  // Invite link
  const [inviteLink, setInviteLink] = useState("");
  
  // Edit school form
  const [editForm, setEditForm] = useState({
    name: "",
    state: "",
    logo_url: "",
    primary_color: "#f97316"
  });
  const [editLoading, setEditLoading] = useState(false);
  
  // Game setup options (for starting scheduled games)
  const [gameSetup, setGameSetup] = useState({
    statMode: "classic",
    clockEnabled: false,
    periodMinutes: 12,
    periodLabel: "Quarter",
    timeoutPreset: "college",
    customTimeouts: 4
  });

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("session_token") || sessionStorage.getItem("session_token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      const schoolRes = await axios.get(`${API}/schools/my-school`);
      setSchool(schoolRes.data);
      setUserRole(schoolRes.data.user_role);
      
      // Initialize edit form with school data
      setEditForm({
        name: schoolRes.data.name || "",
        state: schoolRes.data.state || "",
        logo_url: schoolRes.data.logo_url || "",
        primary_color: schoolRes.data.primary_color || "#f97316"
      });
      
      const schoolId = schoolRes.data.school_id;
      setInviteLink(`${window.location.origin}/school/join/${schoolRes.data.invite_code}`);
      
      const [membersRes, seasonsRes, calendarRes] = await Promise.all([
        axios.get(`${API}/schools/${schoolId}/members`),
        axios.get(`${API}/schools/${schoolId}/seasons`),
        axios.get(`${API}/schools/${schoolId}/calendar`)
      ]);
      
      setMembers(membersRes.data);
      setSeasons(seasonsRes.data);
      // Calendar returns {games: [...], seasons: [...]}
      setGames(calendarRes.data.games || []);
      
    } catch (error) {
      console.error("Error fetching school data:", error);
      if (error.response?.status === 404) {
        toast.error("You are not part of any school");
        navigate("/select-sport");
      } else if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Failed to load school dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/schools/${school.school_id}/members/${userId}/role`, {
        role: newRole
      });
      toast.success(`Role updated to ${newRole}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!");
  };

  const handleRegenerateInvite = async () => {
    try {
      const res = await axios.post(`${API}/schools/${school.school_id}/regenerate-invite`);
      setInviteLink(`${window.location.origin}/school/join/${res.data.invite_code}`);
      toast.success("Invite link regenerated!");
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
      await axios.post(`${API}/schools/${school.school_id}/seasons`, newSeason);
      toast.success("Season created!");
      setShowSeasonDialog(false);
      setNewSeason({ name: "", sport: "basketball", gender: "men", level: "varsity" });
      fetchData();
    } catch (error) {
      toast.error("Failed to create season");
    }
  };

  const handleGameClick = (game) => {
    setSelectedGame(game);
    if (game.sport === "football") {
      setGameSetup({
        statMode: "classic",
        clockEnabled: true,
        periodMinutes: 12,
        periodLabel: "Quarter",
        timeoutPreset: "custom",
        customTimeouts: 3
      });
    } else {
      setGameSetup({
        statMode: "classic",
        clockEnabled: false,
        periodMinutes: 12,
        periodLabel: "Quarter",
        timeoutPreset: "college",
        customTimeouts: 4
      });
    }
    setShowGameStartDialog(true);
  };

  const handleStartGame = async () => {
    if (!selectedGame) return;
    
    if (selectedGame.status === "scheduled") {
      try {
        await axios.put(`${API}/games/${selectedGame.id}`, {
          status: "active",
          simple_mode: gameSetup.statMode === "simple",
          advanced_mode: gameSetup.statMode === "advanced",
          clock_enabled: selectedGame.sport === "football" ? true : gameSetup.clockEnabled,
          period_duration: gameSetup.clockEnabled || selectedGame.sport === "football" 
            ? gameSetup.periodMinutes * 60 
            : 0,
          period_label: gameSetup.periodLabel,
          timeout_preset: gameSetup.timeoutPreset,
          custom_timeouts: gameSetup.timeoutPreset === "custom" ? gameSetup.customTimeouts : 4
        });
      } catch (error) {
        console.error("Error updating game:", error);
        toast.error("Failed to start game");
        return;
      }
    }
    
    selectSport(selectedGame.sport);
    
    if (selectedGame.sport === "football") {
      navigate(`/football/${selectedGame.id}`);
    } else if (gameSetup.statMode === "advanced") {
      navigate(`/game/${selectedGame.id}/advanced`);
    } else {
      navigate(`/game/${selectedGame.id}`);
    }
  };

  const handleSaveSchool = async () => {
    if (!editForm.name.trim()) {
      toast.error("School name is required");
      return;
    }
    
    setEditLoading(true);
    try {
      await axios.put(`${API}/schools/${school.school_id}`, editForm);
      toast.success("School updated successfully!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update school");
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("session_token");
    localStorage.removeItem("user");
    localStorage.removeItem("remember_me");
    sessionStorage.removeItem("session_token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("selected_sport");
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
          <Button onClick={() => navigate("/select-sport")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const adminCount = members.filter(m => m.school_role === "admin").length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Main Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* StatMoose Logo - clickable to go to sport selection */}
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pr-4 border-r border-slate-600"
              onClick={() => navigate("/select-sport")}
            >
              <img 
                src="/logo-white.png" 
                alt="StatMoose" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-orange-500 font-bold text-lg">StatMoose</span>
            </div>
            
            {/* School Logo and Name */}
            <div className="flex items-center gap-3">
              {school.logo_url ? (
                <img src={school.logo_url} alt={school.name} className="w-10 h-10 object-contain rounded" />
              ) : (
                <div 
                  className="w-10 h-10 rounded flex items-center justify-center"
                  style={{ backgroundColor: school.primary_color || '#f97316' }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-white">{school.name}</h1>
                <p className="text-xs text-slate-400">{school.state}</p>
              </div>
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

      {/* Submenu */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-6">
        <nav className="flex gap-1">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("schedule")}
            className={`rounded-none border-b-2 ${
              activeTab === "schedule" 
                ? "border-orange-500 text-orange-400" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("stats")}
            className={`rounded-none border-b-2 ${
              activeTab === "stats" 
                ? "border-orange-500 text-orange-400" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Stats
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("members")}
            className={`rounded-none border-b-2 ${
              activeTab === "members" 
                ? "border-orange-500 text-orange-400" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Members
          </Button>
          {userRole === "admin" && (
            <Button
              variant="ghost"
              onClick={() => setActiveTab("edit")}
              className={`rounded-none border-b-2 ${
                activeTab === "edit" 
                  ? "border-orange-500 text-orange-400" 
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit School
            </Button>
          )}
        </nav>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="space-y-6">
              {/* Gameday Section - Only show if there's a game today */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const todayGames = (games || []).filter(g => g.scheduled_date === todayStr);
                
                if (todayGames.length === 0) return null;
                
                return (
                  <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-lg p-5 border border-orange-500/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                      <h2 className="text-xl font-bold text-white">🏆 GAMEDAY</h2>
                    </div>
                    
                    <div className="space-y-4">
                      {todayGames.map(game => {
                        // Find the season for this game
                        const gameSeason = (seasons || []).find(s => s.season_id === game.season_id);
                        
                        return (
                          <div key={game.id} className="bg-slate-900/70 rounded-lg p-4">
                            {/* Matchup */}
                            <div className="flex items-center justify-center gap-4 mb-3">
                              <div className="text-center">
                                <div className="text-lg font-bold text-white">{game.home_team_name}</div>
                                <div className="text-xs text-slate-400">Home</div>
                              </div>
                              <div className="text-2xl font-bold text-orange-500">VS</div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-white">{game.away_team_name}</div>
                                <div className="text-xs text-slate-400">Away</div>
                              </div>
                            </div>
                            
                            {/* Season & Time Info */}
                            <div className="text-center mb-4">
                              {gameSeason && (
                                <Badge className="bg-slate-700 text-slate-200 mb-2">
                                  {gameSeason.name}
                                </Badge>
                              )}
                              <div className="text-sm text-slate-300">
                                {game.scheduled_time ? formatTime12Hour(game.scheduled_time) : "Time TBD"}
                                {game.location && ` • ${game.location}`}
                              </div>
                              {game.note && (
                                <div className="text-xs text-orange-400 mt-1">{game.note}</div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={() => {
                                  selectSport(game.sport);
                                  navigate(`/live/${game.id}`);
                                }}
                                variant="outline"
                                className="border-slate-600 text-white hover:bg-slate-700"
                                data-testid="gameday-live-stats-btn"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Live Stats Output
                              </Button>
                              <Button
                                onClick={() => handleGameClick(game)}
                                className="bg-orange-500 hover:bg-orange-600"
                                data-testid="gameday-tracker-btn"
                              >
                                {game.status === "active" ? (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Continue Tracking
                                  </>
                                ) : game.status === "final" || game.status === "completed" ? (
                                  <>
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    View Results
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Start Game
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Status Badge */}
                            {game.status === "active" && (
                              <div className="text-center mt-3">
                                <Badge className="bg-green-500 animate-pulse">LIVE NOW</Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Calendar Section */}
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  Schedule
                </h2>
                <SchoolCalendar
                  games={games}
                  onGameClick={handleGameClick}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Season Statistics
              </h2>
              
              {seasons.length === 0 ? (
                <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700 text-center">
                  <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No seasons created yet</p>
                  <p className="text-slate-500 text-sm mt-2">Create a season to start tracking stats</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {seasons.map(season => (
                    <Card 
                      key={season.season_id}
                      className="bg-slate-800/50 border-slate-700 cursor-pointer hover:border-orange-500/50 transition-colors"
                      onClick={() => navigate(`/school/season/${season.season_id}/stats`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{season.sport === "basketball" ? "🏀" : "🏈"}</span>
                            <div>
                              <h3 className="font-semibold text-white">{season.name}</h3>
                              <p className="text-sm text-slate-400">
                                {season.games_count || 0} games played
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
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
          )}

          {/* Edit School Tab */}
          {activeTab === "edit" && userRole === "admin" && (
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-orange-500" />
                Edit School
              </h2>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 space-y-4">
                  {/* School Code - Read Only */}
                  <div>
                    <Label className="text-slate-200">School ID Code</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={school?.school_code || "N/A"}
                        disabled
                        className="bg-slate-900/50 border-slate-700 text-slate-400 cursor-not-allowed"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(school?.school_code || "");
                          toast.success("School code copied!");
                        }}
                        className="border-slate-600 text-slate-300"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Other schools can use this code to find and add you as an opponent
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-slate-200">School Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-slate-900 border-slate-600 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-200">State</Label>
                    <Input
                      value={editForm.state}
                      onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g., Texas"
                      className="bg-slate-900 border-slate-600 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-200">Logo URL</Label>
                    <Input
                      value={editForm.logo_url}
                      onChange={(e) => setEditForm(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                      className="bg-slate-900 border-slate-600 text-white mt-1"
                    />
                    {editForm.logo_url && (
                      <div className="mt-2 flex items-center gap-2">
                        <img 
                          src={editForm.logo_url} 
                          alt="Preview" 
                          className="w-16 h-16 object-contain rounded border border-slate-600"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <span className="text-xs text-slate-500">Preview</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-slate-200">Primary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={editForm.primary_color}
                        onChange={(e) => setEditForm(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-12 h-10 rounded border border-slate-600 cursor-pointer"
                      />
                      <Input
                        value={editForm.primary_color}
                        onChange={(e) => setEditForm(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveSchool}
                    disabled={editLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 mt-4"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
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
          
          <ScrollArea className="h-[calc(100vh-260px)]">
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
              className="w-full text-slate-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Season Dialog */}
      <Dialog open={showSeasonDialog} onOpenChange={setShowSeasonDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create Season</DialogTitle>
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
              <Label className="text-slate-200">Gender</Label>
              <Select
                value={newSeason.gender}
                onValueChange={(v) => setNewSeason(prev => ({ ...prev, gender: v }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">Men&apos;s</SelectItem>
                  <SelectItem value="women">Women&apos;s</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-200">Level</Label>
              <Select
                value={newSeason.level}
                onValueChange={(v) => setNewSeason(prev => ({ ...prev, level: v }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="varsity">Varsity</SelectItem>
                  <SelectItem value="subvarsity">Sub-Varsity (JV/Freshman)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-200">Season Name</Label>
              <Input
                value={newSeason.name}
                onChange={(e) => setNewSeason(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 2025-26 Season"
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
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedGame?.status === "active" ? "Game In Progress" : "Start Game"}
            </DialogTitle>
          </DialogHeader>
          {selectedGame && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-white">{selectedGame.home_team_name}</div>
                    <div className="text-xs text-slate-400">Home</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-500">VS</div>
                  <div className="text-left">
                    <div className="font-bold text-white">{selectedGame.away_team_name}</div>
                    <div className="text-xs text-slate-400">Away</div>
                  </div>
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  {selectedGame.scheduled_date} {selectedGame.scheduled_time && `at ${formatTime12Hour(selectedGame.scheduled_time)}`}
                </div>
                {selectedGame.note && (
                  <div className="text-xs text-orange-400 mt-1">{selectedGame.note}</div>
                )}
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
                  {selectedGame.sport === "basketball" && (
                    <div className="space-y-4 border-t border-slate-700 pt-4">
                      <Label className="text-sm font-semibold text-slate-200">Stat Tracking Mode</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setGameSetup(prev => ({ ...prev, statMode: "simple" }))}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            gameSetup.statMode === "simple" 
                              ? "border-green-500 bg-green-900/30" 
                              : "border-slate-600 hover:border-slate-500"
                          }`}
                        >
                          <div className="font-semibold text-green-400 text-sm">Simple</div>
                          <p className="text-xs text-slate-400">Basic stats</p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setGameSetup(prev => ({ ...prev, statMode: "classic" }))}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            gameSetup.statMode === "classic" 
                              ? "border-orange-500 bg-orange-900/30" 
                              : "border-slate-600 hover:border-slate-500"
                          }`}
                        >
                          <div className="font-semibold text-orange-400 text-sm">Classic</div>
                          <p className="text-xs text-slate-400">Full stats</p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setGameSetup(prev => ({ 
                            ...prev, 
                            statMode: "advanced",
                            clockEnabled: true
                          }))}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            gameSetup.statMode === "advanced" 
                              ? "border-blue-500 bg-blue-900/30" 
                              : "border-slate-600 hover:border-slate-500"
                          }`}
                        >
                          <div className="font-semibold text-blue-400 text-sm">Advanced</div>
                          <p className="text-xs text-slate-400">Pro interface</p>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3 border-t border-slate-700 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-slate-400" />
                        <Label className="text-sm font-semibold text-slate-200">Game Clock</Label>
                      </div>
                      {selectedGame.sport !== "football" && (
                        <Switch
                          checked={gameSetup.clockEnabled}
                          onCheckedChange={(v) => setGameSetup(prev => ({ ...prev, clockEnabled: v }))}
                          disabled={gameSetup.statMode === "advanced"}
                        />
                      )}
                      {selectedGame.sport === "football" && (
                        <span className="text-xs text-green-400">Always On</span>
                      )}
                    </div>
                    
                    {(gameSetup.clockEnabled || selectedGame.sport === "football") && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400">Minutes per Period</Label>
                          <Select
                            value={gameSetup.periodMinutes.toString()}
                            onValueChange={(v) => setGameSetup(prev => ({ ...prev, periodMinutes: parseInt(v) }))}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[6, 8, 10, 12, 15, 20].map(m => (
                                <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedGame.sport === "basketball" && (
                          <div>
                            <Label className="text-xs text-slate-400">Period Type</Label>
                            <Select
                              value={gameSetup.periodLabel}
                              onValueChange={(v) => setGameSetup(prev => ({ ...prev, periodLabel: v }))}
                            >
                              <SelectTrigger className="bg-slate-900 border-slate-600 text-white mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Quarter">Quarters (4)</SelectItem>
                                <SelectItem value="Half">Halves (2)</SelectItem>
                                <SelectItem value="Period">Periods</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3 border-t border-slate-700 pt-4">
                    <Label className="text-sm font-semibold text-slate-200">Timeouts</Label>
                    {selectedGame.sport === "football" ? (
                      <p className="text-xs text-slate-400">3 timeouts per half (standard)</p>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { value: "high_school", label: "HS (5)" },
                          { value: "college", label: "College (4)" },
                          { value: "custom", label: "Custom" }
                        ].map(opt => (
                          <Button
                            key={opt.value}
                            type="button"
                            variant={gameSetup.timeoutPreset === opt.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setGameSetup(prev => ({ ...prev, timeoutPreset: opt.value }))}
                            className={gameSetup.timeoutPreset === opt.value 
                              ? "bg-orange-500 hover:bg-orange-600" 
                              : "border-slate-600 text-slate-300"}
                          >
                            {opt.label}
                          </Button>
                        ))}
                        {gameSetup.timeoutPreset === "custom" && (
                          <Select
                            value={gameSetup.customTimeouts.toString()}
                            onValueChange={(v) => setGameSetup(prev => ({ ...prev, customTimeouts: parseInt(v) }))}
                          >
                            <SelectTrigger className="w-20 bg-slate-900 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
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
              ) : selectedGame.status === "final" || selectedGame.status === "completed" ? (
                <div className="space-y-3">
                  {/* Final Score Display */}
                  <div className="bg-slate-900/80 rounded-lg p-4 text-center">
                    <Badge className="mb-2 bg-slate-600">FINAL</Badge>
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">{selectedGame.home_score || 0}</div>
                        <div className="text-xs text-slate-400">Home</div>
                      </div>
                      <div className="text-slate-500">-</div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">{selectedGame.away_score || 0}</div>
                        <div className="text-xs text-slate-400">Away</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons for Final Games */}
                  <Button
                    onClick={() => {
                      selectSport(selectedGame.sport);
                      navigate(`/game/${selectedGame.id}/box-score`);
                    }}
                    className="w-full bg-slate-700 hover:bg-slate-600"
                    data-testid="view-box-score-btn"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Box Score
                  </Button>
                  
                  <Button
                    onClick={() => {
                      selectSport(selectedGame.sport);
                      navigate(`/live/${selectedGame.id}`);
                    }}
                    variant="outline"
                    className="w-full border-slate-600 text-white"
                    data-testid="view-live-stats-btn"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    View Live Stats Output
                  </Button>
                  
                  {userRole === "admin" && (
                    <Button
                      onClick={handleStartGame}
                      variant="outline"
                      className="w-full border-orange-500 text-orange-400 hover:bg-orange-500/10"
                      data-testid="reopen-tracker-btn"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Reopen Stat Tracker
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleStartGame}
                  variant="outline"
                  className="w-full border-slate-600"
                >
                  View Game
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

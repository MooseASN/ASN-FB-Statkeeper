import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useSport } from "@/contexts/SportContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, Trophy, Users, Calendar, Plus, Upload, Link as LinkIcon, 
  Trash2, Edit, Play, MapPin, Clock, Pencil
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper to format 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return "TBD";
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function SeasonManagement() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const { selectSport } = useSport();
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(null);
  const [school, setSchool] = useState(null);
  const [teams, setTeams] = useState([]);
  const [userRole, setUserRole] = useState("member");
  
  // Dialog states
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [showOpponentDialog, setShowOpponentDialog] = useState(false);
  const [showEditOpponentDialog, setShowEditOpponentDialog] = useState(false);
  const [showOpponentRosterDialog, setShowOpponentRosterDialog] = useState(false);
  const [showEditSeasonDialog, setShowEditSeasonDialog] = useState(false);
  const [showDeleteSeasonDialog, setShowDeleteSeasonDialog] = useState(false);
  const [showSchoolSearchDialog, setShowSchoolSearchDialog] = useState(false);
  
  // Edit season form
  const [editSeasonForm, setEditSeasonForm] = useState({ name: "" });
  const [deletePassword, setDeletePassword] = useState("");
  
  // School search
  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");
  const [schoolSearchResults, setSchoolSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Form states
  const [rosterMethod, setRosterMethod] = useState("manual");
  const [newPlayer, setNewPlayer] = useState({ number: "", name: "", position: "", playerClass: "", isRedshirt: false });
  const [roster, setRoster] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  
  // Game form
  const [gameForm, setGameForm] = useState({
    opponent_team_id: "",
    scheduled_date: "",
    scheduled_time: "",
    location: "",
    is_home_game: true,
    note: ""
  });
  
  // Opponent form
  const [opponentForm, setOpponentForm] = useState({
    name: "",
    sport: "",
    color: "#666666"
  });
  
  // Edit opponent form
  const [editOpponentForm, setEditOpponentForm] = useState({
    id: "",
    name: "",
    color: "#666666",
    logo_url: ""
  });
  
  // Opponent roster editing
  const [opponentRoster, setOpponentRoster] = useState([]);
  const [newOpponentPlayer, setNewOpponentPlayer] = useState({ number: "", name: "", position: "", playerClass: "" });

  const fetchData = useCallback(async () => {
    try {
      // Check both localStorage and sessionStorage for token
      const token = localStorage.getItem("session_token") || sessionStorage.getItem("session_token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      // axios interceptor handles auth header
      
      // Get school info first
      const schoolRes = await axios.get(`${API}/schools/my-school`);
      setSchool(schoolRes.data);
      setUserRole(schoolRes.data.user_role);
      
      const schoolId = schoolRes.data.school_id;
      
      // Get season details and teams
      const [seasonRes, teamsRes] = await Promise.all([
        axios.get(`${API}/schools/${schoolId}/seasons/${seasonId}`),
        axios.get(`${API}/schools/${schoolId}/teams?sport=${schoolRes.data.sport || ''}`)
      ]);
      
      setSeason(seasonRes.data);
      setTeams(teamsRes.data);
      
      // Set opponent form sport to match season
      setOpponentForm(prev => ({ ...prev, sport: seasonRes.data.sport }));
      
      // If season has a team, load the roster
      if (seasonRes.data.team?.roster) {
        setRoster(seasonRes.data.team.roster);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Failed to load season");
        navigate("/school-dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [seasonId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Roster handlers
  const handleAddPlayer = () => {
    if (!newPlayer.number || !newPlayer.name) {
      toast.error("Please enter player number and name");
      return;
    }
    
    // Build class string with redshirt prefix if applicable
    let classStr = newPlayer.playerClass || "";
    if (newPlayer.isRedshirt && classStr) {
      classStr = `RS ${classStr}`;
    }
    
    const player = {
      id: `player_${Date.now()}`,
      number: newPlayer.number,
      name: newPlayer.name,
      position: newPlayer.position || "",
      playerClass: classStr
    };
    
    setRoster(prev => [...prev, player]);
    setNewPlayer({ number: "", name: "", position: "", playerClass: "", isRedshirt: false });
  };

  const handleRemovePlayer = (id) => {
    setRoster(prev => prev.filter(p => p.id !== id));
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if exists
      const startIdx = lines[0]?.toLowerCase().includes('number') || lines[0]?.toLowerCase().includes('name') ? 1 : 0;
      
      const players = lines.slice(startIdx).map((line, idx) => {
        const parts = line.split(',').map(p => p.trim());
        return {
          id: `player_${Date.now()}_${idx}`,
          number: parts[0] || "",
          name: parts[1] || "",
          position: parts[2] || "",
          playerClass: parts[3] || ""
        };
      }).filter(p => p.number && p.name);
      
      setRoster(players);
      toast.success(`Imported ${players.length} players`);
    };
    reader.readAsText(file);
  };

  const handleSaveRoster = async () => {
    if (roster.length === 0) {
      toast.error("Please add at least one player");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token");
      const headers = { Authorization: `Bearer ${token}` };
      
      // Create or update team for this season
      let teamId = season.team_id;
      
      if (!teamId) {
        // Create new team
        const teamRes = await axios.post(
          `${API}/schools/${school.school_id}/teams`,
          {
            name: `${school.name} ${season.sport === 'basketball' ? 'Basketball' : 'Football'}`,
            sport: season.sport,
            color: "#FF6B00",
            roster: roster
          },
          { headers }
        );
        teamId = teamRes.data.id;
        
        // Link team to season
        await axios.put(
          `${API}/schools/${school.school_id}/seasons/${seasonId}/team`,
          { team_id: teamId },
          { headers }
        );
      } else {
        // Update existing team roster
        await axios.put(
          `${API}/teams/${teamId}`,
          { roster: roster },
          { headers }
        );
      }
      
      toast.success("Roster saved!");
      setShowRosterDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save roster");
    }
  };

  // Opponent handlers
  const handleCreateOpponent = async () => {
    if (!opponentForm.name.trim()) {
      toast.error("Please enter opponent name");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token");
      await axios.post(
        `${API}/schools/${school.school_id}/teams`,
        {
          name: opponentForm.name,
          sport: season.sport,
          color: opponentForm.color,
          roster: []
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Opponent created!");
      setShowOpponentDialog(false);
      setOpponentForm({ name: "", sport: season.sport, color: "#666666" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create opponent");
    }
  };

  // Edit opponent handlers
  const handleOpenEditOpponent = async (team) => {
    setEditOpponentForm({
      id: team.id,
      name: team.name,
      color: team.color || "#666666",
      logo_url: team.logo_url || ""
    });
    setOpponentRoster(team.roster || []);
    setShowEditOpponentDialog(true);
  };

  const handleUpdateOpponent = async () => {
    if (!editOpponentForm.name.trim()) {
      toast.error("Please enter opponent name");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token") || localStorage.getItem("session_token");
      await axios.put(
        `${API}/schools/${school.school_id}/teams/${editOpponentForm.id}`,
        {
          name: editOpponentForm.name,
          color: editOpponentForm.color,
          logo_url: editOpponentForm.logo_url || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Opponent updated!");
      setShowEditOpponentDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update opponent");
    }
  };

  // Opponent roster handlers
  const handleOpenOpponentRoster = () => {
    setShowEditOpponentDialog(false);
    setShowOpponentRosterDialog(true);
  };

  const handleAddOpponentPlayer = () => {
    if (!newOpponentPlayer.number || !newOpponentPlayer.name) {
      toast.error("Please enter player number and name");
      return;
    }
    
    const player = {
      id: `player_${Date.now()}`,
      number: newOpponentPlayer.number,
      name: newOpponentPlayer.name,
      position: newOpponentPlayer.position || "",
      playerClass: newOpponentPlayer.playerClass || ""
    };
    
    setOpponentRoster(prev => [...prev, player]);
    setNewOpponentPlayer({ number: "", name: "", position: "", playerClass: "" });
  };

  const handleRemoveOpponentPlayer = (id) => {
    setOpponentRoster(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveOpponentRoster = async () => {
    try {
      const token = sessionStorage.getItem("session_token") || localStorage.getItem("session_token");
      await axios.put(
        `${API}/schools/${school.school_id}/teams/${editOpponentForm.id}`,
        { roster: opponentRoster },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Opponent roster saved!");
      setShowOpponentRosterDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save roster");
    }
  };

  // Edit Season handlers
  const handleOpenEditSeason = () => {
    setEditSeasonForm({ name: season?.name || "" });
    setShowEditSeasonDialog(true);
  };

  const handleUpdateSeason = async () => {
    if (!editSeasonForm.name.trim()) {
      toast.error("Please enter a season name");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token") || localStorage.getItem("session_token");
      await axios.put(
        `${API}/schools/${school.school_id}/seasons/${seasonId}`,
        { name: editSeasonForm.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Season updated!");
      setShowEditSeasonDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update season");
    }
  };

  const handleDeleteSeason = async () => {
    if (!deletePassword) {
      toast.error("Please enter your password to confirm deletion");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token") || localStorage.getItem("session_token");
      await axios.delete(
        `${API}/schools/${school.school_id}/seasons/${seasonId}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          data: { password: deletePassword }
        }
      );
      
      toast.success("Season deleted successfully");
      navigate("/school-dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete season");
    }
  };

  // School search for adding opponents
  const handleSearchSchools = async () => {
    if (!schoolSearchQuery || schoolSearchQuery.length < 2) {
      toast.error("Please enter at least 2 characters");
      return;
    }
    
    setSearchLoading(true);
    try {
      const token = sessionStorage.getItem("session_token") || localStorage.getItem("session_token");
      const res = await axios.get(
        `${API}/schools/search?q=${encodeURIComponent(schoolSearchQuery)}&sport=${season?.sport}&gender=${season?.gender}&level=${season?.level}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchoolSearchResults(res.data);
    } catch (error) {
      toast.error("Failed to search schools");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImportFromSchool = async (schoolData) => {
    try {
      const token = sessionStorage.getItem("session_token") || localStorage.getItem("session_token");
      
      // Create opponent team with imported data
      await axios.post(
        `${API}/schools/${school.school_id}/teams`,
        {
          name: schoolData.name,
          sport: season.sport,
          color: schoolData.primary_color || "#666666",
          logo_url: schoolData.logo_url,
          from_school_code: schoolData.school_code
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Imported ${schoolData.name} as opponent!`);
      setShowSchoolSearchDialog(false);
      setSchoolSearchQuery("");
      setSchoolSearchResults([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to import school");
    }
  };

  // Link roster import
  const handleLinkRosterImport = async () => {
    if (!websiteUrl) {
      toast.error("Please enter a URL");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token") || localStorage.getItem("session_token");
      const res = await axios.post(
        `${API}/team/scrape-roster`,
        { url: websiteUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.roster && res.data.roster.length > 0) {
        const importedPlayers = res.data.roster.map((player, idx) => ({
          id: `player_${Date.now()}_${idx}`,
          number: player.number || "",
          name: player.name || "",
          position: player.position || "",
          playerClass: player.playerClass || player.class || ""
        }));
        
        setRoster(importedPlayers);
        toast.success(`Imported ${importedPlayers.length} players from website`);
      } else {
        toast.error("No players found on the page. Try a different URL.");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to import roster from URL");
    }
  };

  // Game handlers
  const handleCreateGame = async () => {
    if (!gameForm.opponent_team_id || !gameForm.scheduled_date) {
      toast.error("Please select opponent and date");
      return;
    }
    
    if (!season.team_id) {
      toast.error("Please set up your team roster first");
      return;
    }
    
    try {
      const token = sessionStorage.getItem("session_token");
      await axios.post(
        `${API}/schools/${school.school_id}/seasons/${seasonId}/games`,
        {
          ...gameForm,
          season_id: seasonId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Game scheduled!");
      setShowGameDialog(false);
      setGameForm({
        opponent_team_id: "",
        scheduled_date: "",
        scheduled_time: "",
        location: "",
        is_home_game: true,
        note: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create game");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-orange-500 mx-auto animate-pulse" />
          <p className="text-slate-400 mt-4">Loading season...</p>
        </div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Season not found</p>
          <Button onClick={() => navigate("/school-dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === "admin";
  const opponentTeams = teams.filter(t => t.id !== season.team_id && t.sport === season.sport);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/school-dashboard")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{season.sport === "basketball" ? "🏀" : "🏈"}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{season.name}</h1>
              <p className="text-sm text-slate-400">{school?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="roster">Team Roster</TabsTrigger>
            <TabsTrigger value="opponents">Opponents</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Game Schedule</h2>
              {isAdmin && (
                <Button
                  onClick={() => setShowGameDialog(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={!season.team_id}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Game
                </Button>
              )}
            </div>
            
            {!season.team_id && (
              <Card className="bg-yellow-500/10 border-yellow-500/50 mb-4">
                <CardContent className="p-4 text-yellow-400 text-sm">
                  ⚠️ Please set up your team roster before scheduling games
                </CardContent>
              </Card>
            )}
            
            {season.games?.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center text-slate-300">
                  No games scheduled yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {season.games?.map(game => (
                  <Card key={game.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[80px]">
                            <div className="text-sm font-medium text-white">{game.scheduled_date}</div>
                            <div className="text-xs text-slate-300">{formatTime12Hour(game.scheduled_time)}</div>
                          </div>
                          <div className="text-white">
                            <div className="font-medium">
                              {game.home_team_name} vs {game.away_team_name}
                            </div>
                            {game.location && (
                              <div className="text-xs text-slate-300 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {game.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              game.status === "active" ? "default" :
                              game.status === "final" ? "secondary" :
                              "outline"
                            } 
                            className={
                              game.status === "active" 
                                ? "bg-green-500 animate-pulse" 
                                : game.status === "scheduled"
                                ? "border-slate-500 text-white bg-slate-700"
                                : ""
                            }
                          >
                            {game.status === "active" ? "LIVE" :
                             game.status === "final" ? "Final" :
                             "Scheduled"}
                          </Badge>
                          {(isAdmin || game.status !== "scheduled") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                selectSport(season.sport);
                                navigate(
                                  season.sport === "football" 
                                    ? `/football/${game.id}` 
                                    : `/game/${game.id}`
                                );
                              }}
                              className="text-orange-400 hover:text-orange-300"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Roster Tab */}
          <TabsContent value="roster">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Team Roster</h2>
              {isAdmin && (
                <Button
                  onClick={() => setShowRosterDialog(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {season.team ? "Edit Roster" : "Set Up Roster"}
                </Button>
              )}
            </div>
            
            {!season.team ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center text-slate-300">
                  No roster set up yet
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-300 text-sm p-3 w-20">#</th>
                        <th className="text-left text-slate-300 text-sm p-3">Name</th>
                        <th className="text-left text-slate-300 text-sm p-3">Position</th>
                        <th className="text-left text-slate-300 text-sm p-3">Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {season.team.roster?.map((player, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50">
                          <td className="p-3 text-orange-400 font-bold">{player.number}</td>
                          <td className="p-3 text-white">{player.name}</td>
                          <td className="p-3 text-white">{player.position || "-"}</td>
                          <td className="p-3 text-white">{player.playerClass || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Opponents Tab */}
          <TabsContent value="opponents">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Opponents</h2>
              {isAdmin && (
                <Button
                  onClick={() => setShowOpponentDialog(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Opponent
                </Button>
              )}
            </div>
            
            {opponentTeams.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center text-slate-300">
                  No opponents added yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {opponentTeams.map(team => (
                  <Card key={team.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: team.color || "#666" }}
                            >
                              {team.name?.charAt(0) || "T"}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">{team.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs border-slate-500 text-slate-200">
                                {team.sport === "basketball" ? "🏀" : "🏈"} {team.roster?.length || 0} players
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditOpponent(team)}
                            className="text-slate-400 hover:text-white"
                            data-testid={`edit-opponent-${team.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Roster Dialog */}
      <Dialog open={showRosterDialog} onOpenChange={setShowRosterDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Roster</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add players to your team roster
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={rosterMethod} onValueChange={setRosterMethod}>
            <TabsList className="bg-slate-700 mb-4">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              <TabsTrigger value="website">From Website</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="flex gap-2 flex-wrap items-end">
                <Input
                  placeholder="#"
                  value={newPlayer.number}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, number: e.target.value }))}
                  className="w-16 bg-slate-900 border-slate-600 text-white"
                />
                <Input
                  placeholder="Player Name"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1 min-w-[140px] bg-slate-900 border-slate-600 text-white"
                />
                <Input
                  placeholder="Position"
                  value={newPlayer.position}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, position: e.target.value }))}
                  className="w-24 bg-slate-900 border-slate-600 text-white"
                />
                <Select
                  value={newPlayer.playerClass}
                  onValueChange={(v) => setNewPlayer(prev => ({ ...prev, playerClass: v }))}
                >
                  <SelectTrigger className="w-28 bg-slate-900 border-slate-600 text-white">
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FR">Freshman</SelectItem>
                    <SelectItem value="SO">Sophomore</SelectItem>
                    <SelectItem value="JR">Junior</SelectItem>
                    <SelectItem value="SR">Senior</SelectItem>
                    <SelectItem value="GR">Graduate</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md">
                  <Checkbox
                    id="redshirt"
                    checked={newPlayer.isRedshirt}
                    onCheckedChange={(checked) => setNewPlayer(prev => ({ ...prev, isRedshirt: checked }))}
                  />
                  <Label htmlFor="redshirt" className="text-xs text-slate-300 cursor-pointer">RS</Label>
                </div>
                <Button onClick={handleAddPlayer} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="csv" className="space-y-4">
              <p className="text-sm text-slate-300">
                Upload a CSV file with columns: Number, Name, Position, Class
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </TabsContent>
            
            <TabsContent value="website" className="space-y-4">
              <p className="text-sm text-slate-300">
                Enter the URL of your school&apos;s roster page
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://school.edu/roster"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white"
                />
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-white"
                  onClick={handleLinkRosterImport}
                >
                  Import
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Note: Website import may not work for all sites. Best results from athletic department roster pages.
              </p>
            </TabsContent>
          </Tabs>
          
          {/* Current Roster */}
          <div className="mt-4">
            <Label className="text-slate-200">Current Roster ({roster.length} players)</Label>
            <ScrollArea className="h-48 mt-2 border border-slate-700 rounded">
              {roster.length === 0 ? (
                <div className="p-4 text-center text-slate-300">No players added</div>
              ) : (
                <div className="p-2 space-y-1">
                  {roster.map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-orange-400 font-bold w-8">#{player.number}</span>
                        <span className="text-white">{player.name}</span>
                        {player.position && (
                          <Badge variant="outline" className="text-xs border-slate-500 text-white">{player.position}</Badge>
                        )}
                        {player.playerClass && (
                          <Badge variant="secondary" className="text-xs bg-slate-700 text-white">{player.playerClass}</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePlayer(player.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          <Button onClick={handleSaveRoster} className="w-full bg-orange-500 hover:bg-orange-600 mt-4">
            Save Roster
          </Button>
        </DialogContent>
      </Dialog>

      {/* Add Opponent Dialog */}
      <Dialog open={showOpponentDialog} onOpenChange={setShowOpponentDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Opponent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Team Name</Label>
              <Input
                value={opponentForm.name}
                onChange={(e) => setOpponentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Central High School"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-200">Team Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={opponentForm.color}
                  onChange={(e) => setOpponentForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 rounded border border-slate-600 cursor-pointer"
                />
                <Input
                  value={opponentForm.color}
                  onChange={(e) => setOpponentForm(prev => ({ ...prev, color: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button onClick={handleCreateOpponent} className="w-full bg-orange-500 hover:bg-orange-600">
              Add Opponent
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Game Dialog */}
      <Dialog open={showGameDialog} onOpenChange={setShowGameDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Schedule Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Opponent</Label>
              <Select
                value={gameForm.opponent_team_id}
                onValueChange={(v) => setGameForm(prev => ({ ...prev, opponent_team_id: v }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Select opponent" />
                </SelectTrigger>
                <SelectContent>
                  {opponentTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {opponentTeams.length === 0 && (
                <Button
                  variant="link"
                  className="text-orange-400 p-0 h-auto mt-1"
                  onClick={() => { setShowGameDialog(false); setShowOpponentDialog(true); }}
                >
                  + Add opponent first
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Date</Label>
                <Input
                  type="date"
                  value={gameForm.scheduled_date}
                  onChange={(e) => setGameForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Time</Label>
                <Input
                  type="time"
                  value={gameForm.scheduled_time}
                  onChange={(e) => setGameForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white">Location</Label>
              <Input
                value={gameForm.location}
                onChange={(e) => setGameForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Home Gym"
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            
            <div>
              <Label className="text-white">Home/Away</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={gameForm.is_home_game ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGameForm(prev => ({ ...prev, is_home_game: true }))}
                  className={gameForm.is_home_game ? "bg-orange-500" : "border-slate-600 text-white"}
                >
                  Home
                </Button>
                <Button
                  type="button"
                  variant={!gameForm.is_home_game ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGameForm(prev => ({ ...prev, is_home_game: false }))}
                  className={!gameForm.is_home_game ? "bg-orange-500" : "border-slate-600 text-white"}
                >
                  Away
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-white">Game Note (optional)</Label>
              <Input
                value={gameForm.note}
                onChange={(e) => setGameForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="e.g., Homecoming game, District playoff"
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            
            <Button onClick={handleCreateGame} className="w-full bg-orange-500 hover:bg-orange-600">
              Schedule Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Opponent Dialog */}
      <Dialog open={showEditOpponentDialog} onOpenChange={setShowEditOpponentDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Opponent</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update opponent team details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Team Name</Label>
              <Input
                value={editOpponentForm.name}
                onChange={(e) => setEditOpponentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Central High School"
                className="bg-slate-900 border-slate-600 text-white"
                data-testid="edit-opponent-name"
              />
            </div>
            
            <div>
              <Label className="text-white">Team Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={editOpponentForm.color}
                  onChange={(e) => setEditOpponentForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 rounded border border-slate-600 cursor-pointer"
                  data-testid="edit-opponent-color"
                />
                <Input
                  value={editOpponentForm.color}
                  onChange={(e) => setEditOpponentForm(prev => ({ ...prev, color: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white">Logo URL (optional)</Label>
              <Input
                value={editOpponentForm.logo_url}
                onChange={(e) => setEditOpponentForm(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
                data-testid="edit-opponent-logo"
              />
              {editOpponentForm.logo_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={editOpponentForm.logo_url}
                    alt="Logo preview"
                    className="w-10 h-10 rounded object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <span className="text-xs text-slate-400">Preview</span>
                </div>
              )}
            </div>
            
            <div className="pt-2 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={handleOpenOpponentRoster}
                className="w-full border-slate-600 text-white hover:bg-slate-700"
                data-testid="edit-opponent-roster-btn"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Roster ({opponentRoster.length} players)
              </Button>
            </div>
            
            <Button 
              onClick={handleUpdateOpponent} 
              className="w-full bg-orange-500 hover:bg-orange-600"
              data-testid="save-opponent-btn"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Opponent Roster Dialog */}
      <Dialog open={showOpponentRosterDialog} onOpenChange={setShowOpponentRosterDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Opponent Roster - {editOpponentForm.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add or remove players from the opponent&apos;s roster
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add Player Form */}
            <div className="flex gap-2 flex-wrap items-end">
              <Input
                placeholder="#"
                value={newOpponentPlayer.number}
                onChange={(e) => setNewOpponentPlayer(prev => ({ ...prev, number: e.target.value }))}
                className="w-16 bg-slate-900 border-slate-600 text-white"
              />
              <Input
                placeholder="Player Name"
                value={newOpponentPlayer.name}
                onChange={(e) => setNewOpponentPlayer(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 min-w-[140px] bg-slate-900 border-slate-600 text-white"
              />
              <Input
                placeholder="Position"
                value={newOpponentPlayer.position}
                onChange={(e) => setNewOpponentPlayer(prev => ({ ...prev, position: e.target.value }))}
                className="w-24 bg-slate-900 border-slate-600 text-white"
              />
              <Select
                value={newOpponentPlayer.playerClass}
                onValueChange={(v) => setNewOpponentPlayer(prev => ({ ...prev, playerClass: v }))}
              >
                <SelectTrigger className="w-28 bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FR">Freshman</SelectItem>
                  <SelectItem value="SO">Sophomore</SelectItem>
                  <SelectItem value="JR">Junior</SelectItem>
                  <SelectItem value="SR">Senior</SelectItem>
                  <SelectItem value="GR">Graduate</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddOpponentPlayer} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Current Roster */}
            <div>
              <Label className="text-slate-200">Current Roster ({opponentRoster.length} players)</Label>
              <ScrollArea className="h-64 mt-2 border border-slate-700 rounded">
                {opponentRoster.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No players added</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {opponentRoster.map((player, idx) => (
                      <div key={player.id || idx} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-orange-400 font-bold w-8">#{player.number}</span>
                          <span className="text-white">{player.name}</span>
                          {player.position && (
                            <Badge variant="outline" className="text-xs border-slate-500 text-white">{player.position}</Badge>
                          )}
                          {player.playerClass && (
                            <Badge variant="secondary" className="text-xs bg-slate-700 text-white">{player.playerClass}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOpponentPlayer(player.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOpponentRosterDialog(false);
                  setShowEditOpponentDialog(true);
                }}
                className="flex-1 border-slate-600 text-white hover:bg-slate-700"
              >
                Back
              </Button>
              <Button 
                onClick={handleSaveOpponentRoster} 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                data-testid="save-opponent-roster-btn"
              >
                Save Roster
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

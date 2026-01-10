import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, PlayCircle, Users, Calendar, Clock, Timer, FileText, Building2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useSport, SPORT_CONFIG } from "@/contexts/SportContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewGame({ user, onLogout }) {
  const navigate = useNavigate();
  const { selectedSport } = useSport();
  const sportConfig = SPORT_CONFIG[selectedSport] || SPORT_CONFIG.basketball;
  const [teams, setTeams] = useState([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [gameMode, setGameMode] = useState("start"); // "start" or "schedule"
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Clock options - always enabled for football
  const [clockEnabled, setClockEnabled] = useState(selectedSport === "football" ? true : false);
  const [periodMinutes, setPeriodMinutes] = useState(12);
  const [periodSeconds, setPeriodSeconds] = useState(0);
  const [periodLabel, setPeriodLabel] = useState("Quarter"); // "Quarter" or "Period"
  
  // Timeout options
  const [timeoutPreset, setTimeoutPreset] = useState("college"); // "high_school", "college", "custom"
  const [customTimeouts, setCustomTimeouts] = useState(4);

  // Primetime options
  const [primetimeEnabled, setPrimetimeEnabled] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  // Game mode option: "simple", "classic", "advanced"
  const [statMode, setStatMode] = useState("classic");

  // Game notes
  const [gameNote, setGameNote] = useState("");
  
  // Baseball-specific options
  const [totalInnings, setTotalInnings] = useState(9); // 9 standard, 7 for high school/doubleheaders
  
  // School/Season linking (for school users)
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  useEffect(() => {
    fetchTeams();
    fetchSchoolAndSeasons();
  }, [selectedSport]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API}/teams`, { params: { sport: selectedSport } });
      setTeams(res.data);
    } catch (error) {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSchoolAndSeasons = async () => {
    try {
      // Check if user belongs to a school
      const schoolRes = await axios.get(`${API}/schools/my-school`);
      if (schoolRes.data && schoolRes.data.school_id) {
        setSchoolInfo(schoolRes.data);
        
        // Fetch seasons for this school, filtered by current sport
        const seasonsRes = await axios.get(`${API}/schools/${schoolRes.data.school_id}/seasons`);
        const sportSeasons = (seasonsRes.data || []).filter(s => s.sport === selectedSport);
        setSeasons(sportSeasons);
      }
    } catch (error) {
      // User is not part of a school - that's fine
      setSchoolInfo(null);
      setSeasons([]);
    }
  };

  const getClockSettings = () => {
    // Football always has clock enabled
    if (selectedSport === "football" || clockEnabled) {
      return {
        clock_enabled: true,
        period_duration: (periodMinutes * 60) + periodSeconds,
        period_label: periodLabel
      };
    }
    return {};
  };

  const getTimeoutSettings = () => {
    // Football always has 3 timeouts per half
    if (selectedSport === "football") {
      return {
        timeout_preset: "custom",
        custom_timeouts: 3
      };
    }
    return {
      timeout_preset: timeoutPreset,
      custom_timeouts: timeoutPreset === "custom" ? customTimeouts : 4
    };
  };

  const getPrimetimeSettings = () => {
    if (!primetimeEnabled) return {};
    return {
      primetime_enabled: true,
      video_url: videoUrl || null
    };
  };

  const handleStartGame = async () => {
    if (!homeTeamId || !awayTeamId) {
      toast.error("Please select both teams");
      return;
    }

    if (homeTeamId === awayTeamId) {
      toast.error("Please select different teams");
      return;
    }

    setCreating(true);
    try {
      const gameData = {
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        start_immediately: true,
        simple_mode: statMode === "simple",
        advanced_mode: statMode === "advanced",
        note: gameNote || null,
        sport: selectedSport,
        ...getClockSettings(),
        ...getTimeoutSettings(),
        ...getPrimetimeSettings(),
        ...(selectedSport === "baseball" ? { total_innings: totalInnings } : {})
      };
      
      // Add season linkage if selected
      if (selectedSeasonId && schoolInfo) {
        gameData.season_id = selectedSeasonId;
        gameData.school_id = schoolInfo.school_id;
      }
      
      const res = await axios.post(`${API}/games`, gameData);
      toast.success("Game started!");
      // Navigate based on sport and mode
      if (selectedSport === "football") {
        navigate(`/football/${res.data.id}`);
      } else if (selectedSport === "baseball") {
        navigate(`/baseball/${res.data.id}`);
      } else if (statMode === "advanced") {
        navigate(`/game/${res.data.id}/advanced`);
      } else {
        navigate(`/game/${res.data.id}`);
      }
    } catch (error) {
      toast.error("Failed to create game");
    } finally {
      setCreating(false);
    }
  };

  const handleScheduleGame = async () => {
    if (!homeTeamId || !awayTeamId) {
      toast.error("Please select both teams");
      return;
    }

    if (homeTeamId === awayTeamId) {
      toast.error("Please select different teams");
      return;
    }

    if (!scheduledDate) {
      toast.error("Please select a date");
      return;
    }

    setCreating(true);
    try {
      const gameData = {
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        start_immediately: false,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        simple_mode: statMode === "simple",
        advanced_mode: statMode === "advanced",
        note: gameNote || null,
        sport: selectedSport,
        ...getClockSettings(),
        ...getTimeoutSettings(),
        ...getPrimetimeSettings(),
        ...(selectedSport === "baseball" ? { total_innings: totalInnings } : {})
      };
      
      // Add season linkage if selected
      if (selectedSeasonId && schoolInfo) {
        gameData.season_id = selectedSeasonId;
        gameData.school_id = schoolInfo.school_id;
      }
      
      await axios.post(`${API}/games`, gameData);
      toast.success("Game scheduled!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to schedule game");
    } finally {
      setCreating(false);
    }
  };

  const selectedHome = teams.find(t => t.id === homeTeamId);
  const selectedAway = teams.find(t => t.id === awayTeamId);

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="new-game-page">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            // Navigate to sport-specific dashboard
            if (selectedSport === "football") navigate("/dashboard");
            else if (selectedSport === "baseball") navigate("/dashboard");
            else if (selectedSport === "basketball") navigate("/dashboard");
            else navigate("/dashboard");
          }} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">New Game</h1>
            <p className="text-muted-foreground">Start now or schedule for later</p>
          </div>
        </div>

        {teams.length < 2 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Need More Teams</h3>
              <p className="text-muted-foreground mb-4">You need at least 2 teams to start a game</p>
              <Link to="/teams">
                <Button data-testid="create-teams-btn">Create Teams</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select Teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Home Team */}
              <div>
                <Label className="text-base font-semibold text-[#000000]">Home Team</Label>
                <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                  <SelectTrigger className="mt-2" data-testid="home-team-select">
                    <SelectValue placeholder="Select home team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TBD" disabled={awayTeamId === "TBD" ? false : false}>
                      <span className="text-slate-500 italic">TBD (To Be Determined)</span>
                    </SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id} disabled={team.id === awayTeamId}>
                        {team.name} ({team.roster?.length || 0} players)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {homeTeamId === "TBD" ? (
                  <p className="text-sm text-slate-500 mt-1 italic">
                    Team to be determined
                  </p>
                ) : selectedHome && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Roster: {selectedHome.roster?.length || 0} players
                  </p>
                )}
              </div>

              {/* VS */}
              <div className="text-center">
                <span className="text-2xl font-bold text-slate-300">VS</span>
              </div>

              {/* Away Team */}
              <div>
                <Label className="text-base font-semibold text-orange-500">Away Team</Label>
                <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                  <SelectTrigger className="mt-2" data-testid="away-team-select">
                    <SelectValue placeholder="Select away team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TBD">
                      <span className="text-slate-500 italic">TBD (To Be Determined)</span>
                    </SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id} disabled={team.id === homeTeamId}>
                        {team.name} ({team.roster?.length || 0} players)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {awayTeamId === "TBD" ? (
                  <p className="text-sm text-slate-500 mt-1 italic">
                    Team to be determined
                  </p>
                ) : selectedAway && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Roster: {selectedAway.roster?.length || 0} players
                  </p>
                )}
              </div>

              {/* Preview */}
              {homeTeamId && awayTeamId && (
                <div className="bg-gradient-to-r from-[#000000] to-[#333333] rounded-xl p-6 text-white text-center">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex-1">
                      <p className={`text-lg font-semibold ${homeTeamId === "TBD" ? "italic text-white/60" : ""}`}>
                        {homeTeamId === "TBD" ? "TBD" : selectedHome?.name}
                      </p>
                      <p className="text-white/60 text-sm">Home</p>
                    </div>
                    <div className="text-3xl font-bold">VS</div>
                    <div className="flex-1">
                      <p className={`text-lg font-semibold ${awayTeamId === "TBD" ? "italic text-white/60" : ""}`}>
                        {awayTeamId === "TBD" ? "TBD" : selectedAway?.name}
                      </p>
                      <p className="text-white/60 text-sm">Away</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Game Mode Selection - Basketball only */}
              {selectedSport === "basketball" && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  <Label className="text-base font-semibold">Stat Tracking Mode</Label>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Simple Mode */}
                  <button
                    type="button"
                    onClick={() => setStatMode("simple")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      statMode === "simple" 
                        ? "border-green-500 bg-green-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-green-700 mb-1">Simple</div>
                    <p className="text-xs text-slate-600">Basic stat tracking for quick games</p>
                  </button>
                  
                  {/* Classic Mode */}
                  <button
                    type="button"
                    onClick={() => setStatMode("classic")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      statMode === "classic" 
                        ? "border-black bg-slate-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-slate-800 mb-1">Classic</div>
                    <p className="text-xs text-slate-600">Full stats with traditional interface</p>
                  </button>
                  
                  {/* Advanced Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatMode("advanced");
                      setClockEnabled(true); // Advanced requires clock
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      statMode === "advanced" 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-blue-700 mb-1">Advanced</div>
                    <p className="text-xs text-slate-600">Pro interface with hotkeys & more</p>
                  </button>
                </div>
                
                {/* Mode Details */}
                {statMode === "simple" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800 mb-1">Simple Mode tracks:</p>
                    <ul className="text-sm text-green-700 grid grid-cols-2 gap-x-4">
                      <li>• FT Makes</li>
                      <li>• 2PT Makes</li>
                      <li>• 3PT Makes</li>
                      <li>• Rebounds</li>
                      <li>• Assists</li>
                      <li>• Fouls</li>
                    </ul>
                  </div>
                )}
                
                {statMode === "classic" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-800 mb-1">Classic Mode includes:</p>
                    <ul className="text-sm text-slate-700 grid grid-cols-2 gap-x-4">
                      <li>• All shot tracking</li>
                      <li>• Rebounds (O/D)</li>
                      <li>• Assists & Steals</li>
                      <li>• Blocks & Turnovers</li>
                      <li>• Fouls</li>
                      <li>• Player Minutes</li>
                    </ul>
                  </div>
                )}
                
                {statMode === "advanced" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-800 mb-2">Advanced Mode features:</p>
                    <ul className="text-sm text-blue-700 grid grid-cols-2 gap-x-4 gap-y-1">
                      <li>• Possession Arrow</li>
                      <li>• Keyboard Hotkeys</li>
                      <li>• On-court Lineup</li>
                      <li>• Team Foul Tracking</li>
                      <li>• Game Control Panel</li>
                      <li>• Quick Substitutions</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-2 italic">
                      * Clock is required for Advanced Mode
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Baseball Options - Innings Selection */}
              {selectedSport === "baseball" && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚾</span>
                  <Label className="text-base font-semibold">Game Settings</Label>
                </div>
                
                <div className="space-y-4">
                  {/* Innings Selection */}
                  <div>
                    <Label className="text-sm font-medium">Number of Innings</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Button
                        type="button"
                        variant={totalInnings === 7 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTotalInnings(7)}
                        className={totalInnings === 7 ? "bg-red-600 hover:bg-red-700" : ""}
                        data-testid="innings-7"
                      >
                        7
                      </Button>
                      <Button
                        type="button"
                        variant={totalInnings === 9 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTotalInnings(9)}
                        className={totalInnings === 9 ? "bg-red-600 hover:bg-red-700" : ""}
                        data-testid="innings-9"
                      >
                        9
                      </Button>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          value={totalInnings !== 7 && totalInnings !== 9 ? totalInnings : ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 1 && val <= 99) {
                              setTotalInnings(val);
                            }
                          }}
                          placeholder="Custom"
                          className="w-20 h-9"
                          data-testid="innings-custom"
                        />
                        <span className="text-sm text-muted-foreground">innings</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalInnings === 7 ? "7 innings - Common for high school and doubleheaders" : 
                       totalInnings === 9 ? "9 innings - Standard regulation game" :
                       `${totalInnings} innings - Custom game length`}
                    </p>
                  </div>
                </div>
              </div>
              )}

              {/* Clock Options - Not shown for baseball */}
              {selectedSport !== "baseball" && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-slate-600" />
                    <Label htmlFor="clock-toggle" className="text-base font-semibold cursor-pointer">
                      Game Clock
                    </Label>
                  </div>
                  {/* Football always has clock - no toggle */}
                  {selectedSport !== "football" && (
                    <Switch
                      id="clock-toggle"
                      checked={clockEnabled}
                      onCheckedChange={setClockEnabled}
                      disabled={statMode === "advanced"} // Cannot disable clock in advanced mode
                      data-testid="clock-toggle"
                    />
                  )}
                  {selectedSport === "football" && (
                    <span className="text-sm text-green-600 font-medium">Always On</span>
                  )}
                </div>
                
                {statMode === "advanced" && !clockEnabled && selectedSport !== "football" && (
                  <p className="text-xs text-amber-600">Clock is required for Advanced Mode and has been enabled.</p>
                )}
                
                {/* Period Label - always shown for basketball (all 3 modes) */}
                {selectedSport !== "football" && (
                  <div className="pt-2 border-t">
                    <Label className="text-sm font-medium">Period Label</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Button
                        type="button"
                        variant={periodLabel === "Quarter" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriodLabel("Quarter")}
                        className={periodLabel === "Quarter" ? "bg-black hover:bg-gray-800" : ""}
                        data-testid="label-quarter"
                      >
                        Quarters (4)
                      </Button>
                      <Button
                        type="button"
                        variant={periodLabel === "Period" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriodLabel("Period")}
                        className={periodLabel === "Period" ? "bg-black hover:bg-gray-800" : ""}
                        data-testid="label-period"
                      >
                        Periods (4)
                      </Button>
                      <Button
                        type="button"
                        variant={periodLabel === "Half" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriodLabel("Half")}
                        className={periodLabel === "Half" ? "bg-black hover:bg-gray-800" : ""}
                        data-testid="label-half"
                      >
                        Halves (2)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {periodLabel === "Half" ? "Game will have 2 regulation halves (1st Half, 2nd Half)" : "Game will have 4 regulation periods"}
                    </p>
                  </div>
                )}
                
                {(clockEnabled || selectedSport === "football") && (
                  <div className="space-y-4 pt-2 border-t">
                    {/* Only show description for basketball */}
                    {selectedSport !== "football" && (
                      <p className="text-sm text-muted-foreground">
                        Enable clock to track player minutes and manage game time
                      </p>
                    )}
                    
                    {/* Period Duration */}
                    <div>
                      <Label className="text-sm font-medium">
                        {selectedSport === "football" ? "Quarter Length" : "Period Duration"}
                      </Label>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Minutes</Label>
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            value={periodMinutes}
                            onChange={(e) => setPeriodMinutes(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                            className="mt-1"
                            data-testid="period-minutes"
                          />
                        </div>
                        <span className="text-2xl font-bold pt-5">:</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Seconds</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={periodSeconds}
                            onChange={(e) => setPeriodSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                            className="mt-1"
                            data-testid="period-seconds"
                          />
                        </div>
                      </div>
                      {/* Time presets - only for basketball */}
                      {selectedSport !== "football" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setPeriodMinutes(12); setPeriodSeconds(0); }}
                            className="text-xs"
                          >
                            NBA (12:00)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setPeriodMinutes(8); setPeriodSeconds(0); }}
                            className="text-xs"
                          >
                            HS (8:00)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setPeriodMinutes(20); setPeriodSeconds(0); }}
                            className="text-xs"
                          >
                            College (20:00)
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">
                        <strong>Preview:</strong> {periodMinutes}:{periodSeconds.toString().padStart(2, '0')} per {periodLabel.toLowerCase()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Timeout Options - Only for Basketball */}
              {selectedSport === "basketball" && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-600" />
                  <Label className="text-base font-semibold">Timeouts</Label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={timeoutPreset === "high_school" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeoutPreset("high_school")}
                      className={timeoutPreset === "high_school" ? "bg-black hover:bg-gray-800" : ""}
                    >
                      High School (5)
                    </Button>
                    <Button
                      type="button"
                      variant={timeoutPreset === "college" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeoutPreset("college")}
                      className={timeoutPreset === "college" ? "bg-black hover:bg-gray-800" : ""}
                    >
                      College (4)
                    </Button>
                    <Button
                      type="button"
                      variant={timeoutPreset === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeoutPreset("custom")}
                      className={timeoutPreset === "custom" ? "bg-black hover:bg-gray-800" : ""}
                    >
                      Custom
                    </Button>
                  </div>
                  
                  {timeoutPreset === "custom" && (
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Timeouts per team:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={customTimeouts}
                        onChange={(e) => setCustomTimeouts(Math.max(1, Math.min(10, parseInt(e.target.value) || 4)))}
                        className="w-20"
                      />
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    Each team will have {timeoutPreset === "high_school" ? 5 : timeoutPreset === "college" ? 4 : customTimeouts} timeouts
                  </p>
                </div>
              </div>
              )}

              {/* Primetime Mode */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-purple-600" />
                    <Label className="text-base font-semibold">Primetime Mode</Label>
                  </div>
                  <Switch
                    checked={primetimeEnabled}
                    onCheckedChange={setPrimetimeEnabled}
                    data-testid="primetime-toggle"
                  />
                </div>
                
                {primetimeEnabled && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Add a video stream that will be displayed on the live stats page. Supports YouTube and m3u8 streams.
                    </p>
                    <div>
                      <Label htmlFor="video-url">Video URL</Label>
                      <Input
                        id="video-url"
                        placeholder="https://youtube.com/watch?v=... or https://example.com/stream.m3u8"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="mt-1"
                        data-testid="video-url-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Game Notes */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <Label className="text-base font-semibold">Game Notes</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add any notes or additional information about this game. These notes will be visible in the stat tracker.
                </p>
                <Textarea
                  placeholder="e.g., Tournament semifinal, Home team missing key player, etc."
                  value={gameNote}
                  onChange={(e) => setGameNote(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="game-note-input"
                />
              </div>

              {/* Season Linking (for school users) */}
              {schoolInfo && seasons.length > 0 && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-orange-600" />
                    <Label className="text-base font-semibold text-orange-900">Add to School Season (Optional)</Label>
                  </div>
                  <p className="text-sm text-orange-700">
                    Link this game to one of your school's seasons to track it in the school dashboard.
                  </p>
                  <Select
                    value={selectedSeasonId || "none"}
                    onValueChange={(v) => setSelectedSeasonId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="bg-white border-orange-300" data-testid="season-select">
                      <SelectValue placeholder="Select a season (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - Don't link to a season</SelectItem>
                      {seasons.map(season => (
                        <SelectItem key={season.season_id} value={season.season_id}>
                          {season.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-orange-600">
                    School: {schoolInfo.name}
                  </p>
                </div>
              )}

              {/* Start/Schedule Tabs */}
              <Tabs value={gameMode} onValueChange={setGameMode} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="start" className="gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Start Now
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="start" className="mt-4">
                  <Button 
                    onClick={handleStartGame} 
                    className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
                    disabled={!homeTeamId || !awayTeamId || creating}
                    data-testid="start-game-btn"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    {creating ? "Starting..." : "Start Game Now"}
                  </Button>
                </TabsContent>
                
                <TabsContent value="schedule" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="schedule-date" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date
                      </Label>
                      <Input
                        id="schedule-date"
                        type="date"
                        min={today}
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="mt-2"
                        data-testid="schedule-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="schedule-time" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time (optional)
                      </Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="mt-2"
                        data-testid="schedule-time"
                      />
                    </div>
                  </div>
                  
                  {scheduledDate && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-medium text-blue-800">
                        Game will be scheduled for{" "}
                        {new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                        {scheduledTime && (() => {
                          const [hours, minutes] = scheduledTime.split(':');
                          const hour = parseInt(hours, 10);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const hour12 = hour % 12 || 12;
                          return ` at ${hour12}:${minutes} ${ampm}`;
                        })()}
                      </p>
                      <p className="text-blue-600 mt-1">
                        You can start the game anytime from your dashboard.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleScheduleGame} 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                    disabled={!homeTeamId || !awayTeamId || !scheduledDate || creating}
                    data-testid="schedule-game-btn"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    {creating ? "Scheduling..." : "Schedule Game"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

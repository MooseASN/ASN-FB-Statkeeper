import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Users, Calendar, Clock, Timer, PlayCircle, Loader2, FileText } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EditGame({ user, onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [teams, setTeams] = useState([]);
  const [game, setGame] = useState(null);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Clock options
  const [clockEnabled, setClockEnabled] = useState(false);
  const [periodMinutes, setPeriodMinutes] = useState(12);
  const [periodSeconds, setPeriodSeconds] = useState(0);
  const [periodLabel, setPeriodLabel] = useState("Quarter");
  
  // Timeout options
  const [timeoutPreset, setTimeoutPreset] = useState("college");
  const [customTimeouts, setCustomTimeouts] = useState(4);

  // Primetime options
  const [primetimeEnabled, setPrimetimeEnabled] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  // Game mode option: "simple", "classic", "advanced"
  const [statMode, setStatMode] = useState("classic");

  // Game notes
  const [gameNote, setGameNote] = useState("");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      const [teamsRes, gameRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/games/${id}`)
      ]);
      
      setTeams(teamsRes.data);
      const gameData = gameRes.data;
      setGame(gameData);
      
      // Populate form with existing game data
      setHomeTeamId(gameData.home_team_id || "");
      setAwayTeamId(gameData.away_team_id || "");
      setScheduledDate(gameData.scheduled_date || "");
      setScheduledTime(gameData.scheduled_time || "");
      
      // Clock settings
      setClockEnabled(gameData.clock_enabled || false);
      if (gameData.period_duration) {
        setPeriodMinutes(Math.floor(gameData.period_duration / 60));
        setPeriodSeconds(gameData.period_duration % 60);
      }
      setPeriodLabel(gameData.period_label || "Quarter");
      
      // Timeout settings
      setTimeoutPreset(gameData.timeout_preset || "college");
      setCustomTimeouts(gameData.custom_timeouts || 4);
      
      // Primetime settings
      setPrimetimeEnabled(gameData.primetime_enabled || false);
      setVideoUrl(gameData.video_url || "");
      
      // Game note
      setGameNote(gameData.note || "");
      
      // Stat mode
      if (gameData.advanced_mode) {
        setStatMode("advanced");
      } else if (gameData.simple_mode) {
        setStatMode("simple");
      } else {
        setStatMode("classic");
      }
    } catch (error) {
      toast.error("Failed to load game data");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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

    setSaving(true);
    try {
      const updateData = {
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        simple_mode: statMode === "simple",
        advanced_mode: statMode === "advanced",
        clock_enabled: clockEnabled || statMode === "advanced",
        period_duration: clockEnabled || statMode === "advanced" ? (periodMinutes * 60) + periodSeconds : null,
        period_label: periodLabel,
        timeout_preset: timeoutPreset,
        custom_timeouts: timeoutPreset === "custom" ? customTimeouts : null,
        primetime_enabled: primetimeEnabled,
        video_url: primetimeEnabled ? videoUrl : null,
        note: gameNote || null
      };

      await axios.put(`${API}/games/${id}`, updateData);
      toast.success("Game updated!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to update game");
    } finally {
      setSaving(false);
    }
  };

  const selectedHome = teams.find(t => t.id === homeTeamId);
  const selectedAway = teams.find(t => t.id === awayTeamId);

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">Edit Scheduled Game</h1>
            <p className="text-muted-foreground">Update game settings before it starts</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Teams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Home Team */}
            <div>
              <Label className="text-base font-semibold text-[#000000]">Home Team</Label>
              <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select home team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TBD">
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
                <SelectTrigger className="mt-2">
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

            {/* Schedule Date/Time */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                <Label className="text-base font-semibold">Schedule</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schedule-date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-2"
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
                  />
                </div>
              </div>
            </div>

            {/* Game Mode Selection */}
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
                  <p className="text-xs text-slate-600">Basic stat tracking</p>
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
                  <p className="text-xs text-slate-600">Full stats</p>
                </button>
                
                {/* Advanced Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setStatMode("advanced");
                    setClockEnabled(true);
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    statMode === "advanced" 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-blue-700 mb-1">Advanced</div>
                  <p className="text-xs text-slate-600">Pro interface</p>
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

            {/* Clock Options */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="clock-toggle" className="text-base font-semibold cursor-pointer">
                    Game Clock
                  </Label>
                </div>
                <Switch
                  id="clock-toggle"
                  checked={clockEnabled}
                  onCheckedChange={setClockEnabled}
                  disabled={statMode === "advanced"}
                />
              </div>
              
              {statMode === "advanced" && !clockEnabled && (
                <p className="text-xs text-amber-600">Clock is required for Advanced Mode and has been enabled.</p>
              )}
              
              {clockEnabled && (
                <div className="space-y-4 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Enable clock to track player minutes and manage game time
                  </p>
                  
                  {/* Period Duration */}
                  <div>
                    <Label className="text-sm font-medium">Period Duration</Label>
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
                        />
                      </div>
                    </div>
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
                  </div>
                  
                  {/* Period Label */}
                  <div>
                    <Label className="text-sm font-medium">Period Label</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant={periodLabel === "Quarter" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriodLabel("Quarter")}
                        className={periodLabel === "Quarter" ? "bg-black hover:bg-gray-800" : ""}
                      >
                        Quarters (NBA/HS)
                      </Button>
                      <Button
                        type="button"
                        variant={periodLabel === "Period" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriodLabel("Period")}
                        className={periodLabel === "Period" ? "bg-black hover:bg-gray-800" : ""}
                      >
                        Periods (College)
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      <strong>Preview:</strong> {periodMinutes}:{periodSeconds.toString().padStart(2, '0')} per {periodLabel.toLowerCase()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Timeout Options */}
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
              />
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSave} 
              className="w-full bg-black hover:bg-gray-800 h-12 text-lg"
              disabled={!homeTeamId || !awayTeamId || !scheduledDate || saving}
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

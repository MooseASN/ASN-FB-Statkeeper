import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Play, Pause, Settings, HelpCircle, FileDown, Users, 
  RotateCcw, ChevronRight, AlertCircle, X, Plus, Link as LinkIcon, 
  UserPlus, Trash2, Loader2
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hotkey mappings
const HOTKEYS = {
  'j': '2pt', 'J': '2pt',
  'l': '3pt', 'L': '3pt',
  'f': 'ft', 'F': 'ft',
  's': 'steal', 'S': 'steal',
  't': 'turnover', 'T': 'turnover',
  'a': 'assist', 'A': 'assist',
  'r': 'rebound', 'R': 'rebound',
  'b': 'block', 'B': 'block',
  'u': 'substitution', 'U': 'substitution',
  'o': 'timeout', 'O': 'timeout',
  'g': 'gamecontrol', 'G': 'gamecontrol',
  'h': 'home_possession', 'H': 'home_possession',
  'v': 'away_possession', 'V': 'away_possession',
  ' ': 'toggle_clock',
};

export default function AdvancedLiveGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [game, setGame] = useState(null);
  const [homeStats, setHomeStats] = useState([]);
  const [awayStats, setAwayStats] = useState([]);
  const [playByPlay, setPlayByPlay] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [activeTab, setActiveTab] = useState("addplay"); // addplay, export, rosters
  const [leftPanel, setLeftPanel] = useState("plays"); // plays, summary, leaders
  const [clockRunning, setClockRunning] = useState(false);
  const [possession, setPossession] = useState("home");
  
  // Modal state
  const [activeAction, setActiveAction] = useState(null);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [showGameControlDialog, setShowGameControlDialog] = useState(false);
  const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
  const [showReboundDialog, setShowReboundDialog] = useState(false);
  const [showTurnoverDialog, setShowTurnoverDialog] = useState(false);
  const [showFoulDialog, setShowFoulDialog] = useState(false);
  const [showSetTimeDialog, setShowSetTimeDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showAdvanceQuarterDialog, setShowAdvanceQuarterDialog] = useState(false);
  
  // Roster import state
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [showSingleAddDialog, setShowSingleAddDialog] = useState(false);
  const [showLinkImportDialog, setShowLinkImportDialog] = useState(false);
  const [importTeam, setImportTeam] = useState("home");
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [bulkPlayers, setBulkPlayers] = useState([{ number: "", name: "" }]);
  const [newPlayer, setNewPlayer] = useState({ number: "", name: "" });
  
  // Time editing
  const [editMinutes, setEditMinutes] = useState(0);
  const [editSeconds, setEditSeconds] = useState(0);
  
  // Clock interval ref
  const clockIntervalRef = useRef(null);

  // Team colors
  const homeColor = game?.home_team_color || "#dc2626";
  const awayColor = game?.away_team_color || "#7c3aed";

  // Fetch game data
  const fetchGame = useCallback(async () => {
    try {
      const gameRes = await axios.get(`${API}/games/${id}`);
      setGame(gameRes.data);
      setPossession(gameRes.data.possession || "home");
      setClockRunning(gameRes.data.clock_running || false);
      
      // Stats are embedded in home_stats and away_stats
      setHomeStats(gameRes.data.home_stats || []);
      setAwayStats(gameRes.data.away_stats || []);
      setPlayByPlay((gameRes.data.play_by_play || []).slice().reverse());
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 5000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  // Clock management
  useEffect(() => {
    if (clockRunning && game?.clock_time > 0) {
      clockIntervalRef.current = setInterval(async () => {
        try {
          await axios.post(`${API}/games/${id}/clock/tick`);
          fetchGame();
        } catch (error) {
          console.error("Clock tick failed");
        }
      }, 1000);
    } else {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    }
    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    };
  }, [clockRunning, game?.clock_time, id, fetchGame]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const action = HOTKEYS[e.key];
      if (!action) return;
      
      e.preventDefault();
      
      if (action === 'home_possession') {
        handlePossessionChange("home");
      } else if (action === 'away_possession') {
        handlePossessionChange("away");
      } else if (action === 'toggle_clock') {
        handleToggleClock();
      } else if (action === 'substitution') {
        setShowSubstitutionDialog(true);
      } else if (action === 'timeout') {
        setShowTimeoutDialog(true);
      } else if (action === 'gamecontrol') {
        setShowGameControlDialog(true);
      } else if (action === 'rebound') {
        setShowReboundDialog(true);
      } else if (action === 'turnover') {
        setShowTurnoverDialog(true);
      } else if (action === 'ft' || action === '2pt' || action === '3pt' || 
                 action === 'steal' || action === 'assist' || action === 'block') {
        setActiveAction(action);
        setShowPlayerSelect(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [possession, clockRunning]);

  // Clock toggle
  const handleToggleClock = async () => {
    try {
      if (clockRunning) {
        await axios.post(`${API}/games/${id}/clock/stop`);
      } else {
        await axios.post(`${API}/games/${id}/clock/start`);
      }
      setClockRunning(!clockRunning);
      fetchGame();
    } catch (error) {
      toast.error("Failed to toggle clock");
    }
  };

  // Set clock time
  const handleSetTime = async () => {
    try {
      const newTime = (editMinutes * 60) + editSeconds;
      await axios.post(`${API}/games/${id}/clock/set`, { time: newTime });
      setShowSetTimeDialog(false);
      fetchGame();
      toast.success("Time updated");
    } catch (error) {
      toast.error("Failed to set time");
    }
  };

  // Possession change
  const handlePossessionChange = async (team) => {
    try {
      await axios.post(`${API}/games/${id}/possession`, { possession: team });
      setPossession(team);
    } catch (error) {
      console.error("Failed to update possession");
    }
  };

  // Handle stat actions
  const handleStatAction = async (playerId, action, extra = {}) => {
    const player = [...homeStats, ...awayStats].find(p => p.id === playerId);
    if (!player) return;
    
    try {
      if (action === '2pt' || action === '3pt' || action === 'ft') {
        await axios.post(`${API}/games/${id}/shot`, {
          player_id: playerId,
          shot_type: action === 'ft' ? 'ft' : action === '2pt' ? 'fg2' : 'fg3',
          made: true
        });
        toast.success(`${player.player_name} - ${action.toUpperCase()} Made`);
      } else {
        await axios.post(`${API}/games/${id}/stat`, {
          player_id: playerId,
          stat_type: action,
          ...extra
        });
        toast.success(`${player.player_name} - ${action.toUpperCase()}`);
      }
      fetchGame();
    } catch (error) {
      toast.error("Failed to record stat");
    }
  };

  // Team rebound/turnover
  const handleTeamStat = async (team, statType) => {
    try {
      await axios.post(`${API}/games/${id}/team-stat`, {
        team,
        stat_type: statType
      });
      toast.success(`Team ${statType}`);
      fetchGame();
    } catch (error) {
      toast.error("Failed to record team stat");
    }
  };

  // Timeout
  const handleTimeout = async (team, type) => {
    try {
      await axios.post(`${API}/games/${id}/timeout`, {
        team,
        timeout_type: type
      });
      toast.success(`${team === 'home' ? game.home_team_name : team === 'away' ? game.away_team_name : 'Media'} timeout`);
      setShowTimeoutDialog(false);
      fetchGame();
    } catch (error) {
      toast.error("Failed to record timeout");
    }
  };

  // Game control - advance quarter
  const handleAdvanceQuarter = async () => {
    try {
      await axios.post(`${API}/games/${id}/quarter/advance`);
      toast.success("Advanced to next quarter");
      fetchGame();
    } catch (error) {
      toast.error("Failed to advance quarter");
    }
  };

  // Game control - reset quarter
  const handleResetQuarter = async (quarter) => {
    try {
      await axios.put(`${API}/games/${id}`, { current_quarter: quarter });
      fetchGame();
      toast.success(`Set to quarter ${quarter}`);
    } catch (error) {
      toast.error("Failed to set quarter");
    }
  };

  // Format clock time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate team totals
  const calcTeamTotals = (stats) => {
    return stats.reduce((acc, p) => ({
      pts: acc.pts + p.ft_made + (p.fg2_made * 2) + (p.fg3_made * 3),
      reb: acc.reb + p.offensive_rebounds + p.defensive_rebounds,
      ast: acc.ast + p.assists,
      stl: acc.stl + p.steals,
      blk: acc.blk + p.blocks,
      to: acc.to + p.turnovers,
      pf: acc.pf + p.fouls,
      fg_made: acc.fg_made + p.fg2_made + p.fg3_made,
      fg_att: acc.fg_att + p.fg2_made + p.fg2_missed + p.fg3_made + p.fg3_missed,
      fg3_made: acc.fg3_made + p.fg3_made,
      fg3_att: acc.fg3_att + p.fg3_made + p.fg3_missed,
      ft_made: acc.ft_made + p.ft_made,
      ft_att: acc.ft_att + p.ft_made + p.ft_missed,
    }), { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, fg_made: 0, fg_att: 0, fg3_made: 0, fg3_att: 0, ft_made: 0, ft_att: 0 });
  };

  // Get players on floor
  const homeOnFloor = homeStats.filter(p => (game?.home_on_floor || []).includes(p.id));
  const awayOnFloor = awayStats.filter(p => (game?.away_on_floor || []).includes(p.id));
  
  const homeTotals = calcTeamTotals(homeStats);
  const awayTotals = calcTeamTotals(awayStats);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!game) return null;

  const currentTeamStats = possession === "home" ? homeStats : awayStats;
  const currentTeamName = possession === "home" ? game.home_team_name : game.away_team_name;
  const currentTeamColor = possession === "home" ? homeColor : awayColor;

  return (
    <div className="min-h-screen bg-black text-white" data-testid="advanced-live-game">
      {/* Top Header Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Running Score */}
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:bg-zinc-800">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Exit
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: homeColor }}></div>
                <span className="font-bold">{game.home_team_name}</span>
                <span className="text-2xl font-bold" style={{ color: homeColor }}>{homeTotals.pts}</span>
              </div>
              <span className="text-zinc-500">-</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: awayColor }}>{awayTotals.pts}</span>
                <span className="font-bold">{game.away_team_name}</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayColor }}></div>
              </div>
            </div>
          </div>

          {/* Center: Clock and Quarter */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleClock}
              className={`px-4 py-2 rounded-lg font-bold text-xl transition-colors ${
                clockRunning 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {clockRunning ? <Play className="w-5 h-5 inline mr-2" /> : <Pause className="w-5 h-5 inline mr-2" />}
              {formatTime(game.clock_time || 0)}
            </button>
            <div className="text-lg font-semibold bg-zinc-800 px-3 py-2 rounded">
              {game.period_label} {game.current_quarter}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditMinutes(Math.floor((game.clock_time || 0) / 60));
                setEditSeconds((game.clock_time || 0) % 60);
                setShowSetTimeDialog(true);
              }}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Set
            </Button>
          </div>

          {/* Right: Menu Tabs */}
          <div className="flex items-center gap-2">
            <Button 
              variant={activeTab === "addplay" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("addplay")}
              className={activeTab === "addplay" ? "bg-orange-500 hover:bg-orange-600" : "text-white hover:bg-zinc-800"}
            >
              Add Play
            </Button>
            <Button 
              variant={activeTab === "export" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("export")}
              className={activeTab === "export" ? "bg-orange-500 hover:bg-orange-600" : "text-white hover:bg-zinc-800"}
            >
              <FileDown className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button 
              variant={activeTab === "rosters" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("rosters")}
              className={activeTab === "rosters" ? "bg-orange-500 hover:bg-orange-600" : "text-white hover:bg-zinc-800"}
            >
              <Users className="w-4 h-4 mr-1" />
              Rosters
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHelpDialog(true)}
              className="text-white hover:bg-zinc-800"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Possession Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">Possession:</span>
          <button
            onClick={() => handlePossessionChange("home")}
            className={`px-4 py-2 rounded transition-all ${
              possession === "home" 
                ? 'ring-2 ring-white' 
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundColor: homeColor }}
          >
            {game.home_team_name} (H)
          </button>
          <button
            onClick={() => handlePossessionChange("away")}
            className={`px-4 py-2 rounded transition-all ${
              possession === "away" 
                ? 'ring-2 ring-white' 
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundColor: awayColor }}
          >
            {game.away_team_name} (V)
          </button>
          <span className="text-xs text-zinc-500 ml-4">Press H or V to change</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Left Panel - Play by Play / Summary / Leaders */}
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 h-[calc(100vh-120px)]">
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setLeftPanel("plays")}
              className={`flex-1 px-3 py-2 text-xs font-semibold ${leftPanel === "plays" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-850"}`}
            >
              Recent Plays
            </button>
            <button
              onClick={() => setLeftPanel("summary")}
              className={`flex-1 px-3 py-2 text-xs font-semibold ${leftPanel === "summary" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-850"}`}
            >
              Summary
            </button>
            <button
              onClick={() => setLeftPanel("leaders")}
              className={`flex-1 px-3 py-2 text-xs font-semibold ${leftPanel === "leaders" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-850"}`}
            >
              Leaders
            </button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-170px)]">
            {leftPanel === "plays" && (
              <div className="p-2 space-y-1">
                {playByPlay.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">No plays yet</p>
                ) : (
                  playByPlay.map((play, i) => (
                    <div key={play.id || i} className="text-xs p-2 bg-zinc-850 rounded border-l-2" style={{ borderColor: play.team === "home" ? homeColor : awayColor }}>
                      <div className="text-zinc-400">Q{play.quarter}</div>
                      <div className="font-semibold">{play.player_name} #{play.player_number}</div>
                      <div>{play.action}</div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {leftPanel === "summary" && (
              <div className="p-3 space-y-4">
                <div className="text-xs font-semibold text-zinc-400 mb-2">Team Comparison</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-400">
                      <th className="text-left">{game.home_team_name}</th>
                      <th></th>
                      <th className="text-right">{game.away_team_name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['PTS', homeTotals.pts, awayTotals.pts],
                      ['REB', homeTotals.reb, awayTotals.reb],
                      ['AST', homeTotals.ast, awayTotals.ast],
                      ['STL', homeTotals.stl, awayTotals.stl],
                      ['BLK', homeTotals.blk, awayTotals.blk],
                      ['TO', homeTotals.to, awayTotals.to],
                    ].map(([label, home, away]) => (
                      <tr key={label} className="border-b border-zinc-800">
                        <td className="py-1 font-semibold" style={{ color: homeColor }}>{home}</td>
                        <td className="text-center text-zinc-500">{label}</td>
                        <td className="py-1 text-right font-semibold" style={{ color: awayColor }}>{away}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {leftPanel === "leaders" && (
              <div className="p-3 space-y-4">
                <div className="text-xs font-semibold text-zinc-400">Points Leaders</div>
                {[...homeStats, ...awayStats]
                  .map(p => ({ ...p, pts: p.ft_made + p.fg2_made * 2 + p.fg3_made * 3 }))
                  .sort((a, b) => b.pts - a.pts)
                  .slice(0, 5)
                  .map(p => (
                    <div key={p.id} className="flex justify-between text-xs py-1">
                      <span>{p.player_name}</span>
                      <span className="font-bold">{p.pts}</span>
                    </div>
                  ))
                }
                <div className="text-xs font-semibold text-zinc-400 mt-4">Rebounds Leaders</div>
                {[...homeStats, ...awayStats]
                  .map(p => ({ ...p, reb: p.offensive_rebounds + p.defensive_rebounds }))
                  .sort((a, b) => b.reb - a.reb)
                  .slice(0, 5)
                  .map(p => (
                    <div key={p.id} className="flex justify-between text-xs py-1">
                      <span>{p.player_name}</span>
                      <span className="font-bold">{p.reb}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Panel */}
        <div className="flex-1 p-4">
          {activeTab === "addplay" && (
            <div className="space-y-4">
              {/* Adding Play For */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-zinc-400">Adding play for:</span>
                <span className="px-3 py-1 rounded font-bold" style={{ backgroundColor: currentTeamColor }}>
                  {currentTeamName}
                </span>
              </div>

              {/* Main Stat Buttons Grid */}
              <div className="grid grid-cols-4 gap-3">
                <StatButton label="2PT Shot" hotkey="J" onClick={() => { setActiveAction('2pt'); setShowPlayerSelect(true); }} color="blue" />
                <StatButton label="3PT Shot" hotkey="L" onClick={() => { setActiveAction('3pt'); setShowPlayerSelect(true); }} color="purple" />
                <StatButton label="Free Throw" hotkey="F" onClick={() => { setActiveAction('ft'); setShowPlayerSelect(true); }} color="green" />
                <StatButton label="Steal" hotkey="S" onClick={() => { setActiveAction('steal'); setShowPlayerSelect(true); }} color="teal" />
                
                <StatButton label="Turnover" hotkey="T" onClick={() => setShowTurnoverDialog(true)} color="red" />
                <StatButton label="Foul" hotkey="P" onClick={() => setShowFoulDialog(true)} color="orange" />
                <StatButton label="Assist" hotkey="A" onClick={() => { setActiveAction('assist'); setShowPlayerSelect(true); }} color="indigo" />
                <StatButton label="Rebound" hotkey="R" onClick={() => setShowReboundDialog(true)} color="emerald" />
                
                <StatButton label="Block" hotkey="B" onClick={() => { setActiveAction('block'); setShowPlayerSelect(true); }} color="slate" />
                <StatButton label="Substitution" hotkey="U" onClick={() => setShowSubstitutionDialog(true)} color="yellow" />
                <StatButton label="Timeout" hotkey="O" onClick={() => setShowTimeoutDialog(true)} color="pink" />
                <StatButton label="Game Ctrl" hotkey="G" onClick={() => setShowGameControlDialog(true)} color="cyan" />
              </div>

              {/* Players On Court Section */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                {/* Home Team On Court */}
                <div className="bg-zinc-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: homeColor }}></div>
                    <span className="font-semibold text-sm">{game.home_team_name} On Court ({homeOnFloor.length}/5)</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-800">
                        <th className="py-1 text-left">#</th>
                        <th className="py-1 text-left">Name</th>
                        <th className="py-1 text-center">FG</th>
                        <th className="py-1 text-center">3P</th>
                        <th className="py-1 text-center">FT</th>
                        <th className="py-1 text-center">R</th>
                        <th className="py-1 text-center">A</th>
                        <th className="py-1 text-center">PF</th>
                        <th className="py-1 text-center">TP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {homeOnFloor.map(p => (
                        <tr key={p.id} className="border-b border-zinc-800/50">
                          <td className="py-1 font-bold">{p.player_number}</td>
                          <td className="py-1 truncate max-w-[80px]">{p.player_name}</td>
                          <td className="py-1 text-center">{p.fg2_made + p.fg3_made}-{p.fg2_made + p.fg2_missed + p.fg3_made + p.fg3_missed}</td>
                          <td className="py-1 text-center">{p.fg3_made}-{p.fg3_made + p.fg3_missed}</td>
                          <td className="py-1 text-center">{p.ft_made}-{p.ft_made + p.ft_missed}</td>
                          <td className="py-1 text-center">{p.offensive_rebounds + p.defensive_rebounds}</td>
                          <td className="py-1 text-center">{p.assists}</td>
                          <td className="py-1 text-center">{p.fouls}</td>
                          <td className="py-1 text-center font-bold">{p.ft_made + p.fg2_made * 2 + p.fg3_made * 3}</td>
                        </tr>
                      ))}
                      {homeOnFloor.length === 0 && (
                        <tr><td colSpan={9} className="py-2 text-center text-zinc-500">No players on court</td></tr>
                      )}
                    </tbody>
                  </table>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                    <span>Team Fouls: {homeTotals.pf}</span>
                    <span>FG%: {homeTotals.fg_att > 0 ? Math.round(homeTotals.fg_made / homeTotals.fg_att * 100) : 0}%</span>
                    <span>3P%: {homeTotals.fg3_att > 0 ? Math.round(homeTotals.fg3_made / homeTotals.fg3_att * 100) : 0}%</span>
                    <span>FT%: {homeTotals.ft_att > 0 ? Math.round(homeTotals.ft_made / homeTotals.ft_att * 100) : 0}%</span>
                  </div>
                </div>

                {/* Away Team On Court */}
                <div className="bg-zinc-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayColor }}></div>
                    <span className="font-semibold text-sm">{game.away_team_name} On Court ({awayOnFloor.length}/5)</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-800">
                        <th className="py-1 text-left">#</th>
                        <th className="py-1 text-left">Name</th>
                        <th className="py-1 text-center">FG</th>
                        <th className="py-1 text-center">3P</th>
                        <th className="py-1 text-center">FT</th>
                        <th className="py-1 text-center">R</th>
                        <th className="py-1 text-center">A</th>
                        <th className="py-1 text-center">PF</th>
                        <th className="py-1 text-center">TP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awayOnFloor.map(p => (
                        <tr key={p.id} className="border-b border-zinc-800/50">
                          <td className="py-1 font-bold">{p.player_number}</td>
                          <td className="py-1 truncate max-w-[80px]">{p.player_name}</td>
                          <td className="py-1 text-center">{p.fg2_made + p.fg3_made}-{p.fg2_made + p.fg2_missed + p.fg3_made + p.fg3_missed}</td>
                          <td className="py-1 text-center">{p.fg3_made}-{p.fg3_made + p.fg3_missed}</td>
                          <td className="py-1 text-center">{p.ft_made}-{p.ft_made + p.ft_missed}</td>
                          <td className="py-1 text-center">{p.offensive_rebounds + p.defensive_rebounds}</td>
                          <td className="py-1 text-center">{p.assists}</td>
                          <td className="py-1 text-center">{p.fouls}</td>
                          <td className="py-1 text-center font-bold">{p.ft_made + p.fg2_made * 2 + p.fg3_made * 3}</td>
                        </tr>
                      ))}
                      {awayOnFloor.length === 0 && (
                        <tr><td colSpan={9} className="py-2 text-center text-zinc-500">No players on court</td></tr>
                      )}
                    </tbody>
                  </table>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                    <span>Team Fouls: {awayTotals.pf}</span>
                    <span>FG%: {awayTotals.fg_att > 0 ? Math.round(awayTotals.fg_made / awayTotals.fg_att * 100) : 0}%</span>
                    <span>3P%: {awayTotals.fg3_att > 0 ? Math.round(awayTotals.fg3_made / awayTotals.fg3_att * 100) : 0}%</span>
                    <span>FT%: {awayTotals.ft_att > 0 ? Math.round(awayTotals.ft_made / awayTotals.ft_att * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Export Options</h2>
              <div className="grid grid-cols-3 gap-4">
                <Button className="h-20 flex-col gap-2" variant="outline">
                  <FileDown className="w-6 h-6" />
                  <span>Printable Box Score</span>
                </Button>
                <Button className="h-20 flex-col gap-2" variant="outline">
                  <FileDown className="w-6 h-6" />
                  <span>Email Box Score</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/live/${game.share_code}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Live stats link copied!");
                  }}
                >
                  <ChevronRight className="w-6 h-6" />
                  <span>Live Stats Link</span>
                </Button>
              </div>
            </div>
          )}

          {activeTab === "rosters" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Roster Management</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-zinc-900 rounded-lg p-4">
                  <h3 className="font-bold mb-3" style={{ color: homeColor }}>{game.home_team_name}</h3>
                  <div className="space-y-2">
                    {homeStats.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800">
                        <span>#{p.player_number} {p.player_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4">
                  <h3 className="font-bold mb-3" style={{ color: awayColor }}>{game.away_team_name}</h3>
                  <div className="space-y-2">
                    {awayStats.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800">
                        <span>#{p.player_number} {p.player_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player Select Dialog */}
      <Dialog open={showPlayerSelect} onOpenChange={setShowPlayerSelect}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Select Player - {activeAction?.toUpperCase()}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2 mt-4">
            {currentTeamStats.map(player => (
              <button
                key={player.id}
                onClick={() => {
                  handleStatAction(player.id, activeAction);
                  setShowPlayerSelect(false);
                }}
                className="aspect-square rounded-lg font-bold text-xl hover:ring-2 ring-white transition-all"
                style={{ backgroundColor: currentTeamColor }}
              >
                {player.player_number}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Timeout Dialog */}
      <Dialog open={showTimeoutDialog} onOpenChange={setShowTimeoutDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Timeout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => handleTimeout("home", "full")} style={{ backgroundColor: homeColor }}>
                {game.home_team_name} Full
              </Button>
              <Button onClick={() => handleTimeout("away", "full")} style={{ backgroundColor: awayColor }}>
                {game.away_team_name} Full
              </Button>
              <Button onClick={() => handleTimeout("media", "media")} variant="secondary">
                Media
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleTimeout("home", "partial")} variant="outline" className="border-zinc-700">
                {game.home_team_name} Partial
              </Button>
              <Button onClick={() => handleTimeout("away", "partial")} variant="outline" className="border-zinc-700">
                {game.away_team_name} Partial
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Game Control Dialog */}
      <Dialog open={showGameControlDialog} onOpenChange={setShowGameControlDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Game Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleAdvanceQuarter} className="bg-blue-600 hover:bg-blue-700">
                Next {game.period_label}
              </Button>
              <Button onClick={() => {
                handleResetQuarter(1);
                setShowGameControlDialog(false);
              }} variant="outline" className="border-zinc-700">
                Reset to 1st
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(q => (
                <Button 
                  key={q}
                  onClick={() => {
                    handleResetQuarter(q);
                    setShowGameControlDialog(false);
                  }} 
                  variant={game.current_quarter === q ? "default" : "outline"}
                  className={game.current_quarter === q ? "bg-orange-500" : "border-zinc-700"}
                >
                  {game.period_label} {q}
                </Button>
              ))}
            </div>
            <Button 
              onClick={() => {
                // Reset team fouls logic would go here
                toast.success("Team fouls reset");
                setShowGameControlDialog(false);
              }}
              variant="outline"
              className="w-full border-zinc-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Team Fouls
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Substitution Dialog */}
      <Dialog open={showSubstitutionDialog} onOpenChange={setShowSubstitutionDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Substitutions</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="font-bold mb-2" style={{ color: homeColor }}>{game.home_team_name}</h3>
              <p className="text-xs text-zinc-400 mb-2">Click to toggle on/off court ({(game.home_on_floor || []).length}/5)</p>
              <div className="grid grid-cols-5 gap-2">
                {homeStats.map(p => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      const onFloor = game.home_on_floor || [];
                      const isOnFloor = onFloor.includes(p.id);
                      let newOnFloor;
                      if (isOnFloor) {
                        newOnFloor = onFloor.filter(id => id !== p.id);
                      } else if (onFloor.length < 5) {
                        newOnFloor = [...onFloor, p.id];
                      } else {
                        toast.error("5 players max on floor");
                        return;
                      }
                      await axios.put(`${API}/games/${id}`, { home_on_floor: newOnFloor });
                      fetchGame();
                    }}
                    className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                      (game.home_on_floor || []).includes(p.id) 
                        ? 'ring-2 ring-green-400' 
                        : 'opacity-50'
                    }`}
                    style={{ backgroundColor: homeColor }}
                  >
                    {p.player_number}
                  </button>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-zinc-700"
                onClick={async () => {
                  await axios.put(`${API}/games/${id}`, { home_on_floor: [] });
                  fetchGame();
                }}
              >
                Reset
              </Button>
            </div>
            <div>
              <h3 className="font-bold mb-2" style={{ color: awayColor }}>{game.away_team_name}</h3>
              <p className="text-xs text-zinc-400 mb-2">Click to toggle on/off court ({(game.away_on_floor || []).length}/5)</p>
              <div className="grid grid-cols-5 gap-2">
                {awayStats.map(p => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      const onFloor = game.away_on_floor || [];
                      const isOnFloor = onFloor.includes(p.id);
                      let newOnFloor;
                      if (isOnFloor) {
                        newOnFloor = onFloor.filter(id => id !== p.id);
                      } else if (onFloor.length < 5) {
                        newOnFloor = [...onFloor, p.id];
                      } else {
                        toast.error("5 players max on floor");
                        return;
                      }
                      await axios.put(`${API}/games/${id}`, { away_on_floor: newOnFloor });
                      fetchGame();
                    }}
                    className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                      (game.away_on_floor || []).includes(p.id) 
                        ? 'ring-2 ring-green-400' 
                        : 'opacity-50'
                    }`}
                    style={{ backgroundColor: awayColor }}
                  >
                    {p.player_number}
                  </button>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-zinc-700"
                onClick={async () => {
                  await axios.put(`${API}/games/${id}`, { away_on_floor: [] });
                  fetchGame();
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rebound Dialog */}
      <Dialog open={showReboundDialog} onOpenChange={setShowReboundDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Rebound</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => {
                  setActiveAction('oreb');
                  setShowReboundDialog(false);
                  setShowPlayerSelect(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Offensive
              </Button>
              <Button 
                onClick={() => {
                  setActiveAction('dreb');
                  setShowReboundDialog(false);
                  setShowPlayerSelect(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Defensive
              </Button>
            </div>
            <Button 
              onClick={() => {
                handleTeamStat(possession, 'team_rebound');
                setShowReboundDialog(false);
              }}
              variant="outline"
              className="w-full border-zinc-700"
            >
              Team Rebound
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Turnover Dialog */}
      <Dialog open={showTurnoverDialog} onOpenChange={setShowTurnoverDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Turnover</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Button 
              onClick={() => {
                setActiveAction('turnover');
                setShowTurnoverDialog(false);
                setShowPlayerSelect(true);
              }}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Player Turnover
            </Button>
            <Button 
              onClick={() => {
                handleTeamStat(possession, 'team_turnover');
                setShowTurnoverDialog(false);
              }}
              variant="outline"
              className="w-full border-zinc-700"
            >
              Team Turnover
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Foul Dialog */}
      <Dialog open={showFoulDialog} onOpenChange={setShowFoulDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Foul</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Button 
              onClick={() => {
                setActiveAction('foul');
                setShowFoulDialog(false);
                setShowPlayerSelect(true);
              }}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Common Foul
            </Button>
            <Button 
              onClick={() => {
                setActiveAction('technical');
                setShowFoulDialog(false);
                setShowPlayerSelect(true);
              }}
              variant="outline"
              className="w-full border-zinc-700"
            >
              Technical Foul
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Time Dialog */}
      <Dialog open={showSetTimeDialog} onOpenChange={setShowSetTimeDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Set Clock Time</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <Input
              type="number"
              min="0"
              max="59"
              value={editMinutes}
              onChange={(e) => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="w-20 text-center bg-zinc-800 border-zinc-700"
            />
            <span className="text-2xl">:</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={editSeconds}
              onChange={(e) => setEditSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="w-20 text-center bg-zinc-800 border-zinc-700"
            />
          </div>
          <Button onClick={handleSetTime} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
            Set Time
          </Button>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>2PT Shot</span><span className="font-mono bg-zinc-800 px-2 rounded">J</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>3PT Shot</span><span className="font-mono bg-zinc-800 px-2 rounded">L</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Free Throw</span><span className="font-mono bg-zinc-800 px-2 rounded">F</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Steal</span><span className="font-mono bg-zinc-800 px-2 rounded">S</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Turnover</span><span className="font-mono bg-zinc-800 px-2 rounded">T</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Assist</span><span className="font-mono bg-zinc-800 px-2 rounded">A</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Rebound</span><span className="font-mono bg-zinc-800 px-2 rounded">R</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Block</span><span className="font-mono bg-zinc-800 px-2 rounded">B</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Substitution</span><span className="font-mono bg-zinc-800 px-2 rounded">U</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Timeout</span><span className="font-mono bg-zinc-800 px-2 rounded">O</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Game Control</span><span className="font-mono bg-zinc-800 px-2 rounded">G</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Home Possession</span><span className="font-mono bg-zinc-800 px-2 rounded">H</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span>Away Possession</span><span className="font-mono bg-zinc-800 px-2 rounded">V</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800 col-span-2">
              <span>Start/Stop Clock</span><span className="font-mono bg-zinc-800 px-2 rounded">Space</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stat Button Component
const StatButton = ({ label, hotkey, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-zinc-700 hover:bg-zinc-600 px-4 py-4 rounded-lg font-bold transition-colors flex flex-col items-center justify-center gap-1 text-white"
    >
      <span className="text-lg">{label}</span>
      <span className="text-sm opacity-70">({hotkey})</span>
    </button>
  );
};

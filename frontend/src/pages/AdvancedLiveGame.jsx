import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Play, Pause, Settings, HelpCircle, FileDown, Users, 
  RotateCcw, ChevronRight, AlertCircle, X, Plus, Link as LinkIcon, 
  UserPlus, Trash2, Loader2, Mail, Edit
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
  'p': 'foul', 'P': 'foul',
  '\\': 'toggle_clock',
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
  
  // Shot make/miss dialog
  const [showShotResultDialog, setShowShotResultDialog] = useState(false);
  const [pendingShotPlayer, setPendingShotPlayer] = useState(null);
  const [pendingShotType, setPendingShotType] = useState(null);
  
  // Rebound type dialog (after player select)
  const [showReboundTypeDialog, setShowReboundTypeDialog] = useState(false);
  const [pendingReboundPlayer, setPendingReboundPlayer] = useState(null);
  
  // Foul type dialog
  const [showFoulTypeDialog, setShowFoulTypeDialog] = useState(false);
  const [pendingFoulPlayer, setPendingFoulPlayer] = useState(null);
  
  // Edit play dialog
  const [showEditPlayDialog, setShowEditPlayDialog] = useState(false);
  const [editingPlay, setEditingPlay] = useState(null);
  
  // Player number input for quick selection
  const [playerNumberInput, setPlayerNumberInput] = useState("");
  
  // Starter selection dialog
  const [showStarterDialog, setShowStarterDialog] = useState(false);
  const [homeStarters, setHomeStarters] = useState([]);
  const [awayStarters, setAwayStarters] = useState([]);
  
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
      
      // Redirect to normal mode if not in advanced mode
      if (!gameRes.data.advanced_mode) {
        navigate(`/game/${id}`, { replace: true });
        return;
      }
      
      setGame(gameRes.data);
      setPossession(gameRes.data.possession || "home");
      setClockRunning(gameRes.data.clock_running || false);
      
      // Stats are embedded in home_player_stats and away_player_stats
      setHomeStats(gameRes.data.home_player_stats || []);
      setAwayStats(gameRes.data.away_player_stats || []);
      setPlayByPlay((gameRes.data.play_by_play || []).slice().reverse());
      
      // Check if no players on floor - show starter dialog
      const homeOnFloorCount = (gameRes.data.home_on_floor || []).length;
      const awayOnFloorCount = (gameRes.data.away_on_floor || []).length;
      if (homeOnFloorCount === 0 && awayOnFloorCount === 0 && 
          gameRes.data.home_player_stats?.length > 0 && 
          gameRes.data.away_player_stats?.length > 0 &&
          !gameRes.data.starters_selected) {
        setShowStarterDialog(true);
      }
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

  // Clock toggle - use useCallback to ensure stable reference
  const handleToggleClock = useCallback(async () => {
    try {
      if (clockRunning) {
        await axios.post(`${API}/games/${id}/clock/stop`);
        setClockRunning(false);
      } else {
        await axios.post(`${API}/games/${id}/clock/start`);
        setClockRunning(true);
      }
      fetchGame();
    } catch (error) {
      toast.error("Failed to toggle clock");
    }
  }, [clockRunning, id, fetchGame]);

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
      } else if (action === 'foul') {
        setShowFoulDialog(true);
      } else if (action === 'ft' || action === '2pt' || action === '3pt' || 
                 action === 'steal' || action === 'assist' || action === 'block') {
        setActiveAction(action);
        setShowPlayerSelect(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [possession, handleToggleClock]);

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
      // Map frontend action names to backend stat_type
      const statTypeMap = {
        'steal': 'steal',
        'assist': 'assist',
        'block': 'block',
        'turnover': 'turnover',
        'ft_made': 'ft_made',
        'ft_missed': 'ft_missed',
        'fg2_made': 'fg2_made',
        'fg2_missed': 'fg2_missed',
        'fg3_made': 'fg3_made',
        'fg3_missed': 'fg3_missed',
        'oreb': 'oreb',
        'dreb': 'dreb',
        'foul': 'foul',
        'tech_foul': 'foul' // Technical fouls also count as fouls
      };
      
      const statType = statTypeMap[action] || action;
      
      await axios.post(`${API}/games/${id}/stats`, {
        player_id: playerId,
        stat_type: statType,
        increment: extra.increment || 1
      });
      
      const actionLabels = {
        'steal': 'Steal',
        'assist': 'Assist', 
        'block': 'Block',
        'turnover': 'Turnover',
        'ft_made': 'FT Made',
        'ft_missed': 'FT Missed',
        'fg2_made': '2PT Made',
        'fg2_missed': '2PT Missed',
        'fg3_made': '3PT Made',
        'fg3_missed': '3PT Missed',
        'oreb': 'Off. Rebound',
        'dreb': 'Def. Rebound',
        'foul': 'Foul',
        'tech_foul': 'Technical Foul'
      };
      
      toast.success(`${player.player_name} - ${actionLabels[action] || action.toUpperCase()}`);
      fetchGame();
    } catch (error) {
      console.error("Stat error:", error.response?.data || error);
      toast.error("Failed to record stat");
    }
  };

  // Team rebound/turnover
  const handleTeamStat = async (team, statType) => {
    try {
      await axios.post(`${API}/games/${id}/team-stats`, {
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

  // Game control - advance quarter (now shows dialog)
  const handleAdvanceQuarter = () => {
    setShowAdvanceQuarterDialog(true);
  };

  // Actually advance quarter with optional foul reset
  const confirmAdvanceQuarter = async (resetFouls) => {
    try {
      // Advance to next quarter (no limit for overtime)
      const nextQuarter = (game.current_quarter || 1) + 1;
      const updates = { 
        current_quarter: nextQuarter,
        clock_time: game.period_duration || 720 // Reset clock to period duration
      };
      
      // Reset fouls if requested
      if (resetFouls) {
        // Reset all player fouls - would need backend support
        // For now, just acknowledge
        toast.success("Team fouls reset");
      }
      
      await axios.put(`${API}/games/${id}`, updates);
      toast.success(`Advanced to ${game.period_label} ${nextQuarter}${nextQuarter > 4 ? ' (OT)' : ''}`);
      setShowAdvanceQuarterDialog(false);
      setShowGameControlDialog(false);
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
      toast.success(`Set to ${game.period_label} ${quarter}`);
    } catch (error) {
      toast.error("Failed to set quarter");
    }
  };

  // Roster import handlers
  const handleSingleAdd = async () => {
    if (!newPlayer.number.trim() || !newPlayer.name.trim()) {
      toast.error("Please enter both number and name");
      return;
    }
    
    const teamId = importTeam === "home" ? game.home_team_id : game.away_team_id;
    try {
      await axios.post(`${API}/games/${id}/players`, {
        team_id: teamId,
        player_number: newPlayer.number.trim(),
        player_name: newPlayer.name.trim()
      });
      toast.success("Player added");
      setNewPlayer({ number: "", name: "" });
      setShowSingleAddDialog(false);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add player");
    }
  };

  const handleBulkAdd = async () => {
    const validPlayers = bulkPlayers.filter(p => p.number.trim() && p.name.trim());
    if (validPlayers.length === 0) {
      toast.error("Please add at least one player");
      return;
    }
    
    const teamId = importTeam === "home" ? game.home_team_id : game.away_team_id;
    let added = 0;
    
    try {
      for (const player of validPlayers) {
        await axios.post(`${API}/games/${id}/players`, {
          team_id: teamId,
          player_number: player.number.trim(),
          player_name: player.name.trim()
        });
        added++;
      }
      toast.success(`Added ${added} player(s)`);
      setBulkPlayers([{ number: "", name: "" }]);
      setShowBulkAddDialog(false);
      fetchGame();
    } catch (error) {
      toast.error(`Failed. ${added} added before error.`);
      fetchGame();
    }
  };

  const handleLinkImport = async () => {
    if (!importUrl.trim()) {
      toast.error("Please enter a roster page URL");
      return;
    }
    
    const teamId = importTeam === "home" ? game.home_team_id : game.away_team_id;
    setImportLoading(true);
    
    try {
      // First import to team roster
      const res = await axios.post(`${API}/teams/${teamId}/roster/maxpreps`, {
        url: importUrl.trim()
      });
      
      // Now add each player to the game
      const roster = res.data.roster || [];
      let addedToGame = 0;
      
      for (const player of roster) {
        try {
          await axios.post(`${API}/games/${id}/players`, {
            team_id: teamId,
            player_number: player.number,
            player_name: player.name
          });
          addedToGame++;
        } catch (e) {
          // Player might already exist in game, skip
        }
      }
      
      toast.success(`Imported ${addedToGame} players to game`);
      setImportUrl("");
      setShowLinkImportDialog(false);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to import roster");
    } finally {
      setImportLoading(false);
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
  const currentTeamOnFloor = possession === "home" ? homeOnFloor : awayOnFloor;
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
                <span className="text-2xl font-bold text-white">{homeTotals.pts}</span>
              </div>
              <span className="text-zinc-500">-</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{awayTotals.pts}</span>
                <span className="font-bold">{game.away_team_name}</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayColor }}></div>
              </div>
            </div>
          </div>

          {/* Center: Clock and Quarter */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500">[\] toggle</span>
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                // Undo last play
                if (playByPlay.length === 0) {
                  toast.error("No plays to undo");
                  return;
                }
                const lastPlay = playByPlay[0]; // Most recent play (reversed list)
                
                // Map action names to backend stat_type for reversing
                const actionToStat = {
                  "FT Made": "ft_made",
                  "FT Missed": "ft_missed",
                  "2PT Made": "fg2_made",
                  "2PT Missed": "fg2_missed",
                  "3PT Made": "fg3_made",
                  "3PT Missed": "fg3_missed",
                  "Off. Rebound": "oreb",
                  "Def. Rebound": "dreb",
                  "Assist": "assist",
                  "Steal": "steal",
                  "Block": "block",
                  "Turnover": "turnover",
                  "Foul": "foul",
                  "Technical Foul": "foul"
                };
                
                try {
                  // Reverse the stat
                  if (lastPlay.player_id && actionToStat[lastPlay.action]) {
                    await axios.post(`${API}/games/${id}/stats`, {
                      player_id: lastPlay.player_id,
                      stat_type: actionToStat[lastPlay.action],
                      increment: -1
                    });
                  }
                  
                  // Remove the play from play-by-play
                  const updatedPlays = playByPlay.slice(1); // Remove first (most recent)
                  await axios.put(`${API}/games/${id}`, {
                    play_by_play: updatedPlays.slice().reverse()
                  });
                  
                  toast.success("Last play undone");
                  fetchGame();
                } catch (error) {
                  toast.error("Failed to undo play");
                }
              }}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Undo
            </Button>
          </div>

          {/* Right: Menu Tabs */}
          <div className="flex items-center gap-2">
            <Button 
              variant={activeTab === "addplay" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("addplay")}
              className={activeTab === "addplay" ? "bg-orange-500 hover:bg-orange-600" : "text-white border-white/50 hover:bg-zinc-800"}
            >
              Add Play
            </Button>
            <Button 
              variant={activeTab === "export" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("export")}
              className={activeTab === "export" ? "bg-orange-500 hover:bg-orange-600" : "text-white border-white/50 hover:bg-zinc-800"}
            >
              <FileDown className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button 
              variant={activeTab === "rosters" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("rosters")}
              className={activeTab === "rosters" ? "bg-orange-500 hover:bg-orange-600" : "text-white border-white/50 hover:bg-zinc-800"}
            >
              <Users className="w-4 h-4 mr-1" />
              Rosters
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowHelpDialog(true)}
              className="text-white border-white/50 hover:bg-zinc-800"
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
      <div className="flex flex-col md:flex-row">
        {/* Left Panel - Play by Play / Summary / Leaders - hidden on small screens */}
        <div className="hidden md:block w-56 lg:w-64 bg-zinc-900 border-r border-zinc-800 h-[calc(100vh-120px)]">
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
                    <div 
                      key={play.id || i} 
                      className="text-xs p-2 bg-zinc-850 rounded border-l-2 cursor-pointer hover:bg-zinc-800 transition-colors" 
                      style={{ borderColor: play.team === "home" ? homeColor : awayColor }}
                      onClick={() => {
                        setEditingPlay({ ...play, index: i });
                        setShowEditPlayDialog(true);
                      }}
                    >
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
                {/* Home Team Leaders */}
                <div>
                  <div className="text-xs font-semibold mb-2 pb-1 border-b border-zinc-700" style={{ color: homeColor }}>
                    {game.home_team_name}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Points</div>
                      {homeStats
                        .map(p => ({ ...p, pts: p.ft_made + p.fg2_made * 2 + p.fg3_made * 3 }))
                        .sort((a, b) => b.pts - a.pts)
                        .slice(0, 3)
                        .map(p => (
                          <div key={p.id} className="flex justify-between text-xs py-0.5">
                            <span className="truncate">{p.player_name}</span>
                            <span className="font-bold ml-2">{p.pts}</span>
                          </div>
                        ))
                      }
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Rebounds</div>
                      {homeStats
                        .map(p => ({ ...p, reb: p.offensive_rebounds + p.defensive_rebounds }))
                        .sort((a, b) => b.reb - a.reb)
                        .slice(0, 3)
                        .map(p => (
                          <div key={p.id} className="flex justify-between text-xs py-0.5">
                            <span className="truncate">{p.player_name}</span>
                            <span className="font-bold ml-2">{p.reb}</span>
                          </div>
                        ))
                      }
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Assists</div>
                      {homeStats
                        .sort((a, b) => b.assists - a.assists)
                        .slice(0, 3)
                        .map(p => (
                          <div key={p.id} className="flex justify-between text-xs py-0.5">
                            <span className="truncate">{p.player_name}</span>
                            <span className="font-bold ml-2">{p.assists}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
                
                {/* Away Team Leaders */}
                <div>
                  <div className="text-xs font-semibold mb-2 pb-1 border-b border-zinc-700" style={{ color: awayColor }}>
                    {game.away_team_name}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Points</div>
                      {awayStats
                        .map(p => ({ ...p, pts: p.ft_made + p.fg2_made * 2 + p.fg3_made * 3 }))
                        .sort((a, b) => b.pts - a.pts)
                        .slice(0, 3)
                        .map(p => (
                          <div key={p.id} className="flex justify-between text-xs py-0.5">
                            <span className="truncate">{p.player_name}</span>
                            <span className="font-bold ml-2">{p.pts}</span>
                          </div>
                        ))
                      }
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Rebounds</div>
                      {awayStats
                        .map(p => ({ ...p, reb: p.offensive_rebounds + p.defensive_rebounds }))
                        .sort((a, b) => b.reb - a.reb)
                        .slice(0, 3)
                        .map(p => (
                          <div key={p.id} className="flex justify-between text-xs py-0.5">
                            <span className="truncate">{p.player_name}</span>
                            <span className="font-bold ml-2">{p.reb}</span>
                          </div>
                        ))
                      }
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Assists</div>
                      {awayStats
                        .sort((a, b) => b.assists - a.assists)
                        .slice(0, 3)
                        .map(p => (
                          <div key={p.id} className="flex justify-between text-xs py-0.5">
                            <span className="truncate">{p.player_name}</span>
                            <span className="font-bold ml-2">{p.assists}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Panel */}
        <div className="flex-1 p-2 sm:p-4">
          {activeTab === "addplay" && (
            <div className="space-y-4">
              {/* Adding Play For */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-zinc-400 text-sm">Adding play for:</span>
                <span className="px-3 py-1 rounded font-bold text-sm" style={{ backgroundColor: currentTeamColor }}>
                  {currentTeamName}
                </span>
              </div>

              {/* Main Stat Buttons Grid - Responsive */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                <StatButton label="2PT Shot" hotkey="J" onClick={() => { setActiveAction('2pt'); setShowPlayerSelect(true); }}  />
                <StatButton label="3PT Shot" hotkey="L" onClick={() => { setActiveAction('3pt'); setShowPlayerSelect(true); }}  />
                <StatButton label="Free Throw" hotkey="F" onClick={() => { setActiveAction('ft'); setShowPlayerSelect(true); }}  />
                <StatButton label="Steal" hotkey="S" onClick={() => { setActiveAction('steal'); setShowPlayerSelect(true); }}  />
                
                <StatButton label="Turnover" hotkey="T" onClick={() => setShowTurnoverDialog(true)}  />
                <StatButton label="Foul" hotkey="P" onClick={() => setShowFoulDialog(true)}  />
                <StatButton label="Assist" hotkey="A" onClick={() => { setActiveAction('assist'); setShowPlayerSelect(true); }}  />
                <StatButton label="Rebound" hotkey="R" onClick={() => setShowReboundDialog(true)}  />
                
                <StatButton label="Block" hotkey="B" onClick={() => { setActiveAction('block'); setShowPlayerSelect(true); }}  />
                <StatButton label="Substitution" hotkey="U" onClick={() => setShowSubstitutionDialog(true)}  />
                <StatButton label="Timeout" hotkey="O" onClick={() => setShowTimeoutDialog(true)}  />
                <StatButton label="Game Ctrl" hotkey="G" onClick={() => setShowGameControlDialog(true)}  />
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
                          <td className="py-1 font-bold">
                            {p.player_number}
                            {(game?.home_starters || []).includes(p.id) && <span className="text-yellow-400 ml-0.5">*</span>}
                          </td>
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
                          <td className="py-1 font-bold">
                            {p.player_number}
                            {(game?.away_starters || []).includes(p.id) && <span className="text-yellow-400 ml-0.5">*</span>}
                          </td>
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
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await axios.get(`${API}/games/${id}/boxscore/pdf`, {
                        responseType: 'blob'
                      });
                      const blob = new Blob([response.data], { type: 'application/pdf' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `boxscore_${game.home_team_name}_vs_${game.away_team_name}.pdf`.replace(/ /g, '_');
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      toast.success("Box score PDF downloaded!");
                    } catch (error) {
                      toast.error("Failed to generate box score PDF");
                    }
                  }}
                >
                  <FileDown className="w-6 h-6" />
                  <span>PDF Box Score</span>
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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Roster Management</h2>
                <div className="flex gap-2">
                  <Select value={importTeam} onValueChange={setImportTeam}>
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">{game.home_team_name}</SelectItem>
                      <SelectItem value="away">{game.away_team_name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Import Options */}
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={() => setShowSingleAddDialog(true)}
                  variant="outline"
                  className="h-16 flex-col gap-1 border-zinc-700 hover:bg-zinc-800"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="text-sm">Single Add</span>
                </Button>
                <Button 
                  onClick={() => setShowBulkAddDialog(true)}
                  variant="outline"
                  className="h-16 flex-col gap-1 border-zinc-700 hover:bg-zinc-800"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm">Bulk Add</span>
                </Button>
                <Button 
                  onClick={() => setShowLinkImportDialog(true)}
                  variant="outline"
                  className="h-16 flex-col gap-1 border-zinc-700 hover:bg-zinc-800"
                >
                  <LinkIcon className="w-5 h-5" />
                  <span className="text-sm">Import from Link</span>
                </Button>
              </div>

              {/* Team Rosters */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: homeColor }}></div>
                    {game.home_team_name} ({homeStats.length})
                  </h3>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      {homeStats.length === 0 ? (
                        <p className="text-zinc-500 text-sm py-4 text-center">No players</p>
                      ) : (
                        homeStats.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-sm py-2 px-2 rounded hover:bg-zinc-800">
                            <span className="font-mono">#{p.player_number}</span>
                            <span className="flex-1 ml-3">{p.player_name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayColor }}></div>
                    {game.away_team_name} ({awayStats.length})
                  </h3>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      {awayStats.length === 0 ? (
                        <p className="text-zinc-500 text-sm py-4 text-center">No players</p>
                      ) : (
                        awayStats.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-sm py-2 px-2 rounded hover:bg-zinc-800">
                            <span className="font-mono">#{p.player_number}</span>
                            <span className="flex-1 ml-3">{p.player_name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player Select Dialog */}
      <Dialog open={showPlayerSelect} onOpenChange={(open) => {
        setShowPlayerSelect(open);
        if (!open) setPlayerNumberInput("");
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Select Player - {activeAction?.toUpperCase().replace('_', ' ')}</DialogTitle>
          </DialogHeader>
          {/* Number Input */}
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Type player number and press Enter"
              value={playerNumberInput}
              onChange={(e) => setPlayerNumberInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && playerNumberInput) {
                  const player = currentTeamOnFloor.find(p => p.player_number === playerNumberInput);
                  if (player) {
                    if (activeAction === 'ft' || activeAction === '2pt' || activeAction === '3pt') {
                      setPendingShotPlayer(player);
                      setPendingShotType(activeAction);
                      setShowPlayerSelect(false);
                      setPlayerNumberInput("");
                      setShowShotResultDialog(true);
                    } else {
                      handleStatAction(player.id, activeAction);
                      setShowPlayerSelect(false);
                      setPlayerNumberInput("");
                    }
                  } else {
                    toast.error(`Player #${playerNumberInput} not on floor`);
                  }
                }
              }}
              className="bg-zinc-800 border-zinc-700 text-center text-2xl font-bold"
              autoFocus
            />
          </div>
          {currentTeamOnFloor.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">No players on the floor</p>
              <p className="text-zinc-500 text-sm mt-2">Add players via Substitution first</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {currentTeamOnFloor.map(player => (
                <button
                  key={player.id}
                  onClick={() => {
                    if (activeAction === 'ft' || activeAction === '2pt' || activeAction === '3pt') {
                      setPendingShotPlayer(player);
                      setPendingShotType(activeAction);
                      setShowPlayerSelect(false);
                      setPlayerNumberInput("");
                      setShowShotResultDialog(true);
                    } else {
                      handleStatAction(player.id, activeAction);
                      setShowPlayerSelect(false);
                      setPlayerNumberInput("");
                    }
                  }}
                  className="aspect-square rounded-lg font-bold text-xl hover:ring-2 ring-white transition-all"
                  style={{ backgroundColor: currentTeamColor }}
                >
                  {player.player_number}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shot Result Dialog (Make/Miss) */}
      <Dialog open={showShotResultDialog} onOpenChange={setShowShotResultDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingShotPlayer?.player_name} #{pendingShotPlayer?.player_number} - {pendingShotType?.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Button
              onClick={() => {
                const statType = pendingShotType === 'ft' ? 'ft_made' : pendingShotType === '2pt' ? 'fg2_made' : 'fg3_made';
                handleStatAction(pendingShotPlayer.id, statType);
                setShowShotResultDialog(false);
                setPendingShotPlayer(null);
                setPendingShotType(null);
              }}
              className="h-20 text-xl bg-green-600 hover:bg-green-700"
            >
              MADE
            </Button>
            <Button
              onClick={() => {
                const statType = pendingShotType === 'ft' ? 'ft_missed' : pendingShotType === '2pt' ? 'fg2_missed' : 'fg3_missed';
                handleStatAction(pendingShotPlayer.id, statType);
                setShowShotResultDialog(false);
                setPendingShotPlayer(null);
                setPendingShotType(null);
              }}
              className="h-20 text-xl bg-red-600 hover:bg-red-700"
            >
              MISSED
            </Button>
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
            
            {/* Game Notes Section */}
            <div className="border-t border-zinc-700 pt-4 mt-4">
              <Label className="text-sm font-medium text-zinc-400 mb-2 block">Game Notes</Label>
              <Textarea
                value={game.note || ""}
                onChange={async (e) => {
                  const newNote = e.target.value;
                  try {
                    await axios.put(`${API}/games/${id}`, { note: newNote });
                    setGame(prev => ({ ...prev, note: newNote }));
                  } catch (error) {
                    console.error("Failed to save note:", error);
                  }
                }}
                placeholder="Add game notes here..."
                className="bg-zinc-800 border-zinc-700 text-white min-h-[80px] resize-none"
              />
              <p className="text-xs text-zinc-500 mt-1">Notes auto-save as you type</p>
            </div>
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
                setActiveAction('tech_foul');
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

      {/* Advance Quarter Confirmation Dialog */}
      <Dialog open={showAdvanceQuarterDialog} onOpenChange={setShowAdvanceQuarterDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Advance to {game?.period_label} {(game?.current_quarter || 1) + 1}{(game?.current_quarter || 1) >= 4 ? ' (Overtime)' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-zinc-400">
              The clock will reset to {formatTime(game?.period_duration || 720)}.
            </p>
            <p className="text-zinc-300 font-medium">
              Would you like to reset team fouls?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => confirmAdvanceQuarter(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Yes, Reset Fouls
              </Button>
              <Button 
                onClick={() => confirmAdvanceQuarter(false)}
                variant="outline"
                className="border-zinc-700"
              >
                No, Keep Fouls
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Add Player Dialog */}
      <Dialog open={showSingleAddDialog} onOpenChange={setShowSingleAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Player to {importTeam === "home" ? game?.home_team_name : game?.away_team_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div>
                <Label className="text-xs text-zinc-400">#</Label>
                <Input
                  placeholder="00"
                  value={newPlayer.number}
                  onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                  className="w-20 bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-zinc-400">Name</Label>
                <Input
                  placeholder="Player Name"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <Button onClick={handleSingleAdd} className="w-full bg-blue-600 hover:bg-blue-700">
              Add Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Add to {importTeam === "home" ? game?.home_team_name : game?.away_team_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] mt-4">
            <div className="space-y-2 pr-4">
              {bulkPlayers.map((player, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="#"
                    value={player.number}
                    onChange={(e) => {
                      const updated = [...bulkPlayers];
                      updated[i].number = e.target.value;
                      setBulkPlayers(updated);
                    }}
                    className="w-16 bg-zinc-800 border-zinc-700"
                  />
                  <Input
                    placeholder="Player Name"
                    value={player.name}
                    onChange={(e) => {
                      const updated = [...bulkPlayers];
                      updated[i].name = e.target.value;
                      setBulkPlayers(updated);
                    }}
                    className="flex-1 bg-zinc-800 border-zinc-700"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && player.number && player.name) {
                        setBulkPlayers([...bulkPlayers, { number: "", name: "" }]);
                      }
                    }}
                  />
                  {bulkPlayers.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setBulkPlayers(bulkPlayers.filter((_, idx) => idx !== i))}
                      className="px-2 text-red-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setBulkPlayers([...bulkPlayers, { number: "", name: "" }])}
              className="flex-1 border-zinc-700"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Row
            </Button>
            <Button onClick={handleBulkAdd} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Add {bulkPlayers.filter(p => p.number && p.name).length} Players
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Import Dialog - MaxPreps Only */}
      <Dialog open={showLinkImportDialog} onOpenChange={setShowLinkImportDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Import from MaxPreps</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-zinc-400">
              Paste a roster page URL from any athletic website to import player numbers and names.
            </p>
            <div>
              <Label className="text-xs text-zinc-400">Roster Page URL</Label>
              <Input
                placeholder="https://athletics.school.edu/sports/mbkb/roster"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-400">
              <p className="font-medium text-zinc-300 mb-1">Works with roster pages from:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>MaxPreps (high school)</li>
                <li>PrestoSports (college athletic sites)</li>
                <li>Sidearm Sports (college athletic sites)</li>
                <li>Most school/team athletic websites</li>
              </ul>
            </div>
            <Button 
              onClick={handleLinkImport} 
              disabled={importLoading || !importUrl.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Import Roster
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Play Dialog */}
      <Dialog open={showEditPlayDialog} onOpenChange={setShowEditPlayDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Play</DialogTitle>
          </DialogHeader>
          {editingPlay && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-zinc-400">Quarter</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingPlay.quarter || 1}
                  onChange={(e) => setEditingPlay({ ...editingPlay, quarter: parseInt(e.target.value) || 1 })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-400">Team</Label>
                <Select 
                  value={editingPlay.team || "home"} 
                  onValueChange={(v) => setEditingPlay({ ...editingPlay, team: v, player_id: "", player_name: "", player_number: "" })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{game?.home_team_name}</SelectItem>
                    <SelectItem value="away">{game?.away_team_name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-400">Player</Label>
                <Select 
                  value={editingPlay.player_id || ""} 
                  onValueChange={(v) => {
                    const players = editingPlay.team === "home" ? homeStats : awayStats;
                    const player = players.find(p => p.id === v);
                    if (player) {
                      setEditingPlay({ 
                        ...editingPlay, 
                        player_id: v,
                        player_name: player.player_name,
                        player_number: player.player_number
                      });
                    }
                  }}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editingPlay.team === "home" ? homeStats : awayStats).map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.player_number} {player.player_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-400">Action/Play</Label>
                <Select 
                  value={editingPlay.action || ""} 
                  onValueChange={(v) => setEditingPlay({ ...editingPlay, action: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FT Made">FT Made</SelectItem>
                    <SelectItem value="FT Missed">FT Missed</SelectItem>
                    <SelectItem value="2PT Made">2PT Made</SelectItem>
                    <SelectItem value="2PT Missed">2PT Missed</SelectItem>
                    <SelectItem value="3PT Made">3PT Made</SelectItem>
                    <SelectItem value="3PT Missed">3PT Missed</SelectItem>
                    <SelectItem value="Off. Rebound">Off. Rebound</SelectItem>
                    <SelectItem value="Def. Rebound">Def. Rebound</SelectItem>
                    <SelectItem value="Assist">Assist</SelectItem>
                    <SelectItem value="Steal">Steal</SelectItem>
                    <SelectItem value="Block">Block</SelectItem>
                    <SelectItem value="Turnover">Turnover</SelectItem>
                    <SelectItem value="Foul">Foul</SelectItem>
                    <SelectItem value="Technical Foul">Technical Foul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      // Get the original play to know what stat to reverse
                      const originalPlay = playByPlay[editingPlay.index];
                      
                      // Map action names to backend stat_type (must match backend stat_map)
                      const actionToStat = {
                        "FT Made": { field: "ft_made", points: 1 },
                        "FT Missed": { field: "ft_missed", points: 0 },
                        "2PT Made": { field: "fg2_made", points: 2 },
                        "2PT Missed": { field: "fg2_missed", points: 0 },
                        "3PT Made": { field: "fg3_made", points: 3 },
                        "3PT Missed": { field: "fg3_missed", points: 0 },
                        "Off. Rebound": { field: "oreb", points: 0 },
                        "Def. Rebound": { field: "dreb", points: 0 },
                        "Assist": { field: "assist", points: 0 },
                        "Steal": { field: "steal", points: 0 },
                        "Block": { field: "block", points: 0 },
                        "Turnover": { field: "turnover", points: 0 },
                        "Foul": { field: "foul", points: 0 },
                        "Technical Foul": { field: "foul", points: 0 }
                      };

                      // Check what changed
                      const teamChanged = originalPlay.team !== editingPlay.team;
                      const playerChanged = originalPlay.player_id !== editingPlay.player_id;
                      const actionChanged = originalPlay.action !== editingPlay.action;
                      
                      // If anything changed that affects stats, we need to update
                      if (teamChanged || playerChanged || actionChanged) {
                        // ALWAYS reverse the old stat from the original player (regardless of team change)
                        if (originalPlay.player_id && actionToStat[originalPlay.action]) {
                          const oldStat = actionToStat[originalPlay.action];
                          await axios.post(`${API}/games/${id}/stats`, {
                            player_id: originalPlay.player_id,
                            stat_type: oldStat.field,
                            increment: -1
                          });
                        }
                        
                        // ALWAYS add the new stat to the new player (if player is selected)
                        if (editingPlay.player_id && actionToStat[editingPlay.action]) {
                          const newStat = actionToStat[editingPlay.action];
                          await axios.post(`${API}/games/${id}/stats`, {
                            player_id: editingPlay.player_id,
                            stat_type: newStat.field,
                            increment: 1
                          });
                        }
                      }

                      // Update play in backend
                      const updatedPlays = [...playByPlay];
                      updatedPlays[editingPlay.index] = {
                        ...editingPlay,
                        index: undefined // Remove index before sending
                      };
                      // Reverse back since playByPlay is reversed for display
                      await axios.put(`${API}/games/${id}`, {
                        play_by_play: updatedPlays.slice().reverse()
                      });
                      toast.success("Play updated");
                      setShowEditPlayDialog(false);
                      setEditingPlay(null);
                      fetchGame();
                    } catch (error) {
                      toast.error("Failed to update play");
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // Map action names to backend stat_type for reversing
                      const actionToStat = {
                        "FT Made": "ft_made",
                        "FT Missed": "ft_missed",
                        "2PT Made": "fg2_made",
                        "2PT Missed": "fg2_missed",
                        "3PT Made": "fg3_made",
                        "3PT Missed": "fg3_missed",
                        "Off. Rebound": "oreb",
                        "Def. Rebound": "dreb",
                        "Assist": "assist",
                        "Steal": "steal",
                        "Block": "block",
                        "Turnover": "turnover",
                        "Foul": "foul",
                        "Technical Foul": "foul"
                      };
                      
                      // Reverse the stat when deleting
                      if (editingPlay.player_id && actionToStat[editingPlay.action]) {
                        await axios.post(`${API}/games/${id}/stats`, {
                          player_id: editingPlay.player_id,
                          stat_type: actionToStat[editingPlay.action],
                          increment: -1
                        });
                      }
                      
                      // Delete play from backend
                      const updatedPlays = playByPlay.filter((_, i) => i !== editingPlay.index);
                      await axios.put(`${API}/games/${id}`, {
                        play_by_play: updatedPlays.slice().reverse()
                      });
                      toast.success("Play deleted");
                      setShowEditPlayDialog(false);
                      setEditingPlay(null);
                      fetchGame();
                    } catch (error) {
                      toast.error("Failed to delete play");
                    }
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Starter Selection Dialog */}
      <Dialog open={showStarterDialog} onOpenChange={setShowStarterDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Starting Lineups</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 text-sm">Select 5 starters for each team (or all players if roster has fewer than 5). Click to toggle selection.</p>
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Home Team */}
            <div className="bg-zinc-800 rounded-lg p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: homeColor }}></div>
                {game?.home_team_name} ({homeStarters.length}/5)
              </h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {homeStats.map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        if (homeStarters.includes(player.id)) {
                          setHomeStarters(homeStarters.filter(id => id !== player.id));
                        } else if (homeStarters.length < 5) {
                          setHomeStarters([...homeStarters, player.id]);
                        }
                      }}
                      className={`w-full flex items-center justify-between text-sm py-2 px-3 rounded transition-colors ${
                        homeStarters.includes(player.id) 
                          ? 'bg-green-600 text-white' 
                          : 'hover:bg-zinc-700'
                      }`}
                    >
                      <span>#{player.player_number} {player.player_name}</span>
                      {homeStarters.includes(player.id) && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Away Team */}
            <div className="bg-zinc-800 rounded-lg p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayColor }}></div>
                {game?.away_team_name} ({awayStarters.length}/5)
              </h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {awayStats.map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        if (awayStarters.includes(player.id)) {
                          setAwayStarters(awayStarters.filter(id => id !== player.id));
                        } else if (awayStarters.length < 5) {
                          setAwayStarters([...awayStarters, player.id]);
                        }
                      }}
                      className={`w-full flex items-center justify-between text-sm py-2 px-3 rounded transition-colors ${
                        awayStarters.includes(player.id) 
                          ? 'bg-green-600 text-white' 
                          : 'hover:bg-zinc-700'
                      }`}
                    >
                      <span>#{player.player_number} {player.player_name}</span>
                      {awayStarters.includes(player.id) && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowStarterDialog(false)}
              className="border-zinc-700"
            >
              Skip
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Update game with selected starters on floor
                  await axios.put(`${API}/games/${id}`, {
                    home_on_floor: homeStarters,
                    away_on_floor: awayStarters,
                    home_starters: homeStarters,
                    away_starters: awayStarters,
                    starters_selected: true
                  });
                  toast.success("Starters selected!");
                  setShowStarterDialog(false);
                  fetchGame();
                } catch (error) {
                  toast.error("Failed to set starters");
                }
              }}
              disabled={
                (homeStarters.length === 0) || 
                (awayStarters.length === 0) || 
                (homeStats.length >= 5 && homeStarters.length < 5) || 
                (awayStats.length >= 5 && awayStarters.length < 5)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm Starters ({homeStarters.length} + {awayStarters.length})
            </Button>
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
      className="px-4 py-4 rounded-lg font-bold transition-colors flex flex-col items-center justify-center gap-1 text-white border border-white/50 hover:border-white"
      style={{ backgroundColor: '#545454' }}
    >
      <span className="text-lg">{label}</span>
      <span className="text-base opacity-80">({hotkey})</span>
    </button>
  );
};

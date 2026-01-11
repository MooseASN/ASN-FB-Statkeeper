import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingScreen } from "@/components/LoadingScreen";
import EmbedSnippetGenerator from "@/components/EmbedSnippetGenerator";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Flag,
  Trophy,
  Zap,
  AlertTriangle,
  Clock,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Plus,
  Minus,
  Share2,
  Code,
  ExternalLink
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Common penalties for football with type-to-search
const PENALTIES = [
  { name: "Holding", defaultYards: 10 },
  { name: "Offsides", defaultYards: 5 },
  { name: "False Start", defaultYards: 5 },
  { name: "Pass Interference", defaultYards: 15 },
  { name: "Defensive Pass Interference", defaultYards: 15 },
  { name: "Roughing the Passer", defaultYards: 15 },
  { name: "Facemask", defaultYards: 15 },
  { name: "Unnecessary Roughness", defaultYards: 15 },
  { name: "Illegal Block", defaultYards: 10 },
  { name: "Illegal Formation", defaultYards: 5 },
  { name: "Illegal Motion", defaultYards: 5 },
  { name: "Delay of Game", defaultYards: 5 },
  { name: "Encroachment", defaultYards: 5 },
  { name: "Neutral Zone Infraction", defaultYards: 5 },
  { name: "Too Many Men on Field", defaultYards: 5 },
  { name: "Intentional Grounding", defaultYards: 10 },
  { name: "Illegal Use of Hands", defaultYards: 10 },
  { name: "Personal Foul", defaultYards: 15 },
  { name: "Unsportsmanlike Conduct", defaultYards: 15 },
  { name: "Clipping", defaultYards: 15 },
  { name: "Illegal Contact", defaultYards: 5 },
  { name: "Ineligible Receiver Downfield", defaultYards: 5 },
];

// Player Number Input Component with Add to Roster functionality
const PlayerNumberInput = ({ 
  roster, 
  onSelect, 
  onCancel, 
  title, 
  rememberOption = false,
  rememberedPlayer = null,
  onRememberChange = null,
  onAddPlayer = null,
  teamName = ""
}) => {
  const [inputValue, setInputValue] = useState(rememberedPlayer || '');
  const [remember, setRemember] = useState(!!rememberedPlayer);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const inputRef = useRef(null);
  const nameInputRef = useRef(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    if (showAddPlayer) {
      nameInputRef.current?.focus();
    }
  }, [showAddPlayer]);
  
  const handleSubmit = (e) => {
    e?.preventDefault();
    const player = roster.find(p => p.player_number === inputValue);
    if (player) {
      if (rememberOption && onRememberChange) {
        onRememberChange(remember ? inputValue : null);
      }
      onSelect(player);
    } else if (inputValue && onAddPlayer) {
      // Player not found - show add to roster option
      setShowAddPlayer(true);
    } else if (inputValue) {
      toast.error(`Player #${inputValue} not found on roster`);
    }
  };
  
  const handleAddPlayer = () => {
    if (newPlayerName.trim() && inputValue) {
      const newPlayer = {
        player_number: inputValue,
        player_name: newPlayerName.trim(),
        position: ""
      };
      onAddPlayer(newPlayer);
      // Select the new player immediately
      if (rememberOption && onRememberChange) {
        onRememberChange(remember ? inputValue : null);
      }
      onSelect(newPlayer);
    }
  };
  
  const matchingPlayers = roster.filter(p => 
    p.player_number?.startsWith(inputValue) || 
    p.player_name?.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 5);
  
  // Show "Add to roster" prompt
  if (showAddPlayer) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-amber-400 text-sm font-medium mb-1">Player Not Found</div>
          <div className="text-white text-lg font-semibold">Add #{inputValue} to {teamName}?</div>
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">Player Name</label>
          <Input
            ref={nameInputRef}
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Enter player name"
            className="bg-zinc-800 border-zinc-700 text-white text-xl text-center h-14"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); }} className="flex-1 border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleAddPlayer} className="flex-1 bg-green-600 hover:bg-green-500" disabled={!newPlayerName.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add & Select
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-center text-lg font-semibold text-white mb-4">{title}</div>
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type player # and press Enter"
          className="bg-zinc-800 border-zinc-700 text-white text-2xl text-center h-16"
          autoFocus
        />
      </form>
      
      {matchingPlayers.length > 0 && inputValue && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {matchingPlayers.map(player => (
            <button
              key={player.player_number}
              onClick={() => {
                setInputValue(player.player_number);
                setTimeout(() => handleSubmit(), 100);
              }}
              className="w-full p-3 text-left bg-zinc-800 hover:bg-zinc-700 rounded-lg flex justify-between items-center"
            >
              <span className="text-white font-bold">#{player.player_number}</span>
              <span className="text-zinc-400">{player.player_name}</span>
            </button>
          ))}
        </div>
      )}
      
      {rememberOption && (
        <div className="flex items-center gap-2 pt-2">
          <Checkbox 
            id="remember" 
            checked={remember} 
            onCheckedChange={setRemember}
            className="border-zinc-600"
          />
          <label htmlFor="remember" className="text-sm text-zinc-400 cursor-pointer">
            Remember this player for future plays
          </label>
        </div>
      )}
      
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 border-zinc-700">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 bg-orange-600 hover:bg-orange-500">
          <Check className="w-4 h-4 mr-2" />
          Confirm
        </Button>
      </div>
    </div>
  );
};

// Yards Input Component
const YardsInput = ({ onSubmit, onCancel, title, showNoTackle = false, onNoTackle }) => {
  const [yards, setYards] = useState('');
  const inputRef = useRef(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = (e) => {
    e?.preventDefault();
    const yardValue = parseInt(yards) || 0;
    onSubmit(yardValue);
  };
  
  const quickYards = [5, 10, 15, 20, 25, 30, 40, 50];
  const lossYards = [-1, -2, -3, -5, -10];
  
  return (
    <div className="space-y-4">
      <div className="text-center text-lg font-semibold text-white mb-2">{title}</div>
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          type="number"
          value={yards}
          onChange={(e) => setYards(e.target.value)}
          placeholder="Enter yards"
          className="bg-zinc-800 border-zinc-700 text-white text-3xl text-center h-16"
        />
      </form>
      
      <div className="grid grid-cols-4 gap-2">
        {quickYards.map(y => (
          <Button
            key={y}
            variant="outline"
            onClick={() => setYards(y.toString())}
            className="border-zinc-700 text-green-400"
          >
            +{y}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {lossYards.map(y => (
          <Button
            key={y}
            variant="outline"
            onClick={() => setYards(y.toString())}
            className="border-zinc-700 text-red-400"
          >
            {y}
          </Button>
        ))}
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 border-zinc-700">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 bg-orange-600 hover:bg-orange-500">
          <Check className="w-4 h-4 mr-2" />
          Continue
        </Button>
      </div>
    </div>
  );
};

// Tackler Selection Component
const TacklerSelect = ({ roster, onSelect, onNoTackle, onCancel, title }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = (e) => {
    e?.preventDefault();
    const player = roster.find(p => p.player_number === inputValue);
    if (player) {
      onSelect(player);
    } else if (inputValue) {
      toast.error(`Player #${inputValue} not found`);
    }
  };
  
  const matchingPlayers = roster.filter(p => 
    p.player_number?.startsWith(inputValue)
  ).slice(0, 4);
  
  return (
    <div className="space-y-4">
      <div className="text-center text-lg font-semibold text-white mb-2">{title}</div>
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type tackler # and press Enter"
          className="bg-zinc-800 border-zinc-700 text-white text-xl text-center h-14"
        />
      </form>
      
      {matchingPlayers.length > 0 && inputValue && (
        <div className="space-y-1">
          {matchingPlayers.map(player => (
            <button
              key={player.player_number}
              onClick={() => onSelect(player)}
              className="w-full p-2 text-left bg-zinc-800 hover:bg-zinc-700 rounded-lg flex justify-between"
            >
              <span className="text-white font-bold">#{player.player_number}</span>
              <span className="text-zinc-400 text-sm">{player.player_name}</span>
            </button>
          ))}
        </div>
      )}
      
      <Button 
        variant="outline" 
        onClick={onNoTackle} 
        className="w-full border-zinc-700 text-zinc-400"
      >
        No Tackle / Out of Bounds
      </Button>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 border-zinc-700">
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Team Score Display (Compact)
const TeamScoreCard = ({ teamName, teamColor, score, hasPossession, timeouts, onPossessionClick, isHome }) => (
  <div 
    className={`relative p-3 rounded-xl transition-all cursor-pointer ${
      hasPossession ? 'ring-2 ring-yellow-400' : ''
    }`}
    style={{ backgroundColor: teamColor || (isHome ? '#dc2626' : '#2563eb') }}
    onClick={onPossessionClick}
  >
    {hasPossession && (
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs font-bold">
        🏈
      </div>
    )}
    <div className="text-center text-white">
      <div className="text-sm font-medium opacity-90 truncate">{teamName}</div>
      <div className="text-5xl font-black" data-testid={`${isHome ? 'home' : 'away'}-score`}>
        {score}
      </div>
      <div className="flex justify-center gap-1 mt-1">
        {[1, 2, 3].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full ${i <= (3 - timeouts) ? 'bg-white/30' : 'bg-white'}`} />
        ))}
      </div>
    </div>
  </div>
);

// Compact Game Clock with enhanced controls - Optional clock mode
const GameClock = ({ quarter, clockTime, isRunning, onToggle, onQuarterChange, onClockAdjust, gameStatus, clockEnabled, onToggleClockEnabled }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getQuarterLabel = () => {
    if (gameStatus === 'Halftime') return 'HALF';
    if (gameStatus === 'Final') return 'FINAL';
    if (quarter >= 5) return `${quarter - 4}OT`;
    return ['1st', '2nd', '3rd', '4th'][quarter - 1] || '1st';
  };
  
  return (
    <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-700">
      <div className="flex items-center justify-between gap-2">
        {/* Quarter Control */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onQuarterChange(-1)} 
            className="text-zinc-500 hover:text-white p-1 disabled:opacity-30" 
            disabled={quarter <= 1 || gameStatus === 'Final'}
            data-testid="quarter-down-btn"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="text-lg font-bold text-orange-500 w-12" data-testid="quarter-display">
            {getQuarterLabel()}
          </span>
          <button 
            onClick={() => onQuarterChange(1)} 
            className="text-zinc-500 hover:text-white p-1 disabled:opacity-30"
            disabled={gameStatus === 'Final'}
            data-testid="quarter-up-btn"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
        
        {/* Clock Display - Show toggle when disabled, show time when enabled */}
        {clockEnabled ? (
          <>
            <div className="text-4xl font-mono font-black text-white" data-testid="clock-display">
              {gameStatus === 'Halftime' || gameStatus === 'Final' ? '--:--' : formatTime(clockTime)}
            </div>
            
            {/* Clock Controls - Enhanced */}
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <div className="flex gap-1">
                <button 
                  onClick={() => onClockAdjust(-60)} 
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400"
                  data-testid="clock-minus-1min"
                >
                  -1m
                </button>
                <button 
                  onClick={() => onClockAdjust(-1)} 
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400"
                  data-testid="clock-minus-1sec"
                >
                  -1s
                </button>
              </div>
              <Button 
                onClick={onToggle} 
                size="sm" 
                variant={isRunning ? "destructive" : "default"}
                className="h-10 w-10"
                disabled={gameStatus === 'Halftime' || gameStatus === 'Final'}
                data-testid="clock-toggle-btn"
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <div className="flex gap-1">
                <button 
                  onClick={() => onClockAdjust(1)} 
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400"
                  data-testid="clock-plus-1sec"
                >
                  +1s
                </button>
                <button 
                  onClick={() => onClockAdjust(60)} 
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400"
                  data-testid="clock-plus-1min"
                >
                  +1m
                </button>
              </div>
              {/* Toggle to hide clock */}
              <button 
                onClick={onToggleClockEnabled}
                className="text-xs bg-zinc-800 hover:bg-red-900 px-2 py-1 rounded text-zinc-500 ml-1"
                title="Hide clock"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </>
        ) : (
          /* Clock Disabled - Show button to enable */
          <button
            onClick={onToggleClockEnabled}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
            data-testid="enable-clock-btn"
          >
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Enable Clock</span>
          </button>
        )}
      </div>
    </div>
  );
};

// Quick Stats (Compact horizontal)
const QuickStats = ({ homeStats, awayStats }) => (
  <div className="bg-zinc-900 rounded-xl p-2 border border-zinc-700">
    <div className="grid grid-cols-6 gap-1 text-center text-xs">
      <div className="text-zinc-500">Team</div>
      <div className="text-zinc-500">Rush</div>
      <div className="text-zinc-500">Pass</div>
      <div className="text-zinc-500">Total</div>
      <div className="text-zinc-500">TO</div>
      <div className="text-zinc-500">1st</div>
      
      <div className="text-white font-bold">HOME</div>
      <div className="text-white">{homeStats.rushYards}</div>
      <div className="text-white">{homeStats.passYards}</div>
      <div className="text-white font-bold">{homeStats.totalYards}</div>
      <div className="text-red-400">{homeStats.turnovers}</div>
      <div className="text-white">{homeStats.firstDowns}</div>
      
      <div className="text-white font-bold">AWAY</div>
      <div className="text-white">{awayStats.rushYards}</div>
      <div className="text-white">{awayStats.passYards}</div>
      <div className="text-white font-bold">{awayStats.totalYards}</div>
      <div className="text-red-400">{awayStats.turnovers}</div>
      <div className="text-white">{awayStats.firstDowns}</div>
    </div>
  </div>
);

// Main Component
export default function SimpleFootballLiveGame({ demoMode = false, initialDemoData = null }) {
  const params = useParams();
  const id = demoMode ? 'demo' : params.id;
  const navigate = useNavigate();
  
  // Game state
  const [game, setGame] = useState(initialDemoData);
  const [loading, setLoading] = useState(!demoMode);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [possession, setPossession] = useState('home');
  const [quarter, setQuarter] = useState(1);
  const [clockTime, setClockTime] = useState(900);
  const [clockRunning, setClockRunning] = useState(false);
  const [clockEnabled, setClockEnabled] = useState(true); // Optional clock for Simple mode
  const [homeTimeouts, setHomeTimeouts] = useState(0);
  const [awayTimeouts, setAwayTimeouts] = useState(0);
  const [gameStatus, setGameStatus] = useState('in_progress'); // 'in_progress', 'Halftime', 'Final'
  
  // Remembered QBs
  const [homeQB, setHomeQB] = useState(null);
  const [awayQB, setAwayQB] = useState(null);
  
  // Team stats
  const [homeStats, setHomeStats] = useState({ totalYards: 0, passYards: 0, rushYards: 0, turnovers: 0, firstDowns: 0 });
  const [awayStats, setAwayStats] = useState({ totalYards: 0, passYards: 0, rushYards: 0, turnovers: 0, firstDowns: 0 });
  
  // Player stats (for individual tracking)
  const [playerStats, setPlayerStats] = useState({});
  
  // Event log
  const [events, setEvents] = useState([]);
  
  // Undo
  const [undoHistory, setUndoHistory] = useState([]);
  
  // Workflow state
  const [activeWorkflow, setActiveWorkflow] = useState(null); // 'rush' | 'pass' | 'fg' | 'flag' | 'turnover'
  const [workflowStep, setWorkflowStep] = useState(0);
  const [workflowData, setWorkflowData] = useState({});
  
  // Quarter transition dialog
  const [showQuarterDialog, setShowQuarterDialog] = useState(false);
  const [pendingQuarterChange, setPendingQuarterChange] = useState(null);
  
  // Embed dialog
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  
  // Redo stack for undone plays
  const [redoHistory, setRedoHistory] = useState([]);
  
  // Demo data
  useEffect(() => {
    if (demoMode) {
      setGame({
        id: 'demo',
        home_team_name: 'Central Wolves',
        away_team_name: 'Riverside Panthers',
        home_team_color: '#dc2626',
        away_team_color: '#7c3aed',
        sport: 'football',
        home_roster: [
          { player_number: '1', player_name: 'Tom Brady', position: 'QB' },
          { player_number: '22', player_name: 'Derrick Henry', position: 'RB' },
          { player_number: '13', player_name: 'Mike Evans', position: 'WR' },
          { player_number: '87', player_name: 'Travis Kelce', position: 'TE' },
          { player_number: '55', player_name: 'Luke Kuechly', position: 'LB' },
          { player_number: '99', player_name: 'JJ Watt', position: 'DE' },
          { player_number: '3', player_name: 'Jake Moody', position: 'K' },
        ],
        away_roster: [
          { player_number: '10', player_name: 'Justin Herbert', position: 'QB' },
          { player_number: '26', player_name: 'Saquon Barkley', position: 'RB' },
          { player_number: '17', player_name: 'Davante Adams', position: 'WR' },
          { player_number: '85', player_name: 'George Kittle', position: 'TE' },
          { player_number: '52', player_name: 'Khalil Mack', position: 'LB' },
          { player_number: '97', player_name: 'Nick Bosa', position: 'DE' },
          { player_number: '4', player_name: 'Daniel Carlson', position: 'K' },
        ],
      });
      setLoading(false);
    } else {
      fetchGame();
    }
  }, [demoMode]);
  
  // Clock timer
  useEffect(() => {
    let interval;
    if (clockRunning && clockTime > 0) {
      interval = setInterval(() => setClockTime(prev => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [clockRunning, clockTime]);
  
  // Keyboard shortcuts - spacebar and backslash for clock control
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case ' ': // Spacebar
          e.preventDefault();
          if (gameStatus !== 'Halftime' && gameStatus !== 'Final') {
            setClockRunning(prev => !prev);
          }
          break;
        case '\\': // Backslash
          e.preventDefault();
          if (gameStatus !== 'Halftime' && gameStatus !== 'Final') {
            setClockRunning(prev => !prev);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus]);
  
  const fetchGame = async () => {
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
      if (res.data.home_score) setHomeScore(res.data.home_score);
      if (res.data.away_score) setAwayScore(res.data.away_score);
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };
  
  const saveState = useCallback(() => {
    setUndoHistory(prev => [...prev.slice(-19), {
      homeScore, awayScore, possession, quarter, clockTime, homeStats: {...homeStats}, 
      awayStats: {...awayStats}, events: [...events], homeTimeouts, awayTimeouts,
      playerStats: JSON.parse(JSON.stringify(playerStats)), gameStatus
    }]);
  }, [homeScore, awayScore, possession, quarter, clockTime, homeStats, awayStats, events, homeTimeouts, awayTimeouts, playerStats, gameStatus]);
  
  const handleUndo = () => {
    if (undoHistory.length === 0) { toast.error("Nothing to undo"); return; }
    const last = undoHistory[undoHistory.length - 1];
    
    // Save current state to redo history
    setRedoHistory(prev => [...prev, {
      homeScore, awayScore, possession, quarter, clockTime,
      homeStats: JSON.parse(JSON.stringify(homeStats)),
      awayStats: JSON.parse(JSON.stringify(awayStats)),
      events: [...events], homeTimeouts, awayTimeouts,
      playerStats: JSON.parse(JSON.stringify(playerStats)), gameStatus
    }]);
    
    setHomeScore(last.homeScore);
    setAwayScore(last.awayScore);
    setPossession(last.possession);
    setQuarter(last.quarter);
    setClockTime(last.clockTime);
    setHomeStats(last.homeStats);
    setAwayStats(last.awayStats);
    setEvents(last.events);
    setHomeTimeouts(last.homeTimeouts);
    setAwayTimeouts(last.awayTimeouts);
    setPlayerStats(last.playerStats);
    setGameStatus(last.gameStatus || 'in_progress');
    setUndoHistory(prev => prev.slice(0, -1));
    toast.success("Undone!");
  };
  
  const handleRedo = () => {
    if (redoHistory.length === 0) { toast.error("Nothing to redo"); return; }
    const last = redoHistory[redoHistory.length - 1];
    
    // Save current state to undo history
    setUndoHistory(prev => [...prev, {
      homeScore, awayScore, possession, quarter, clockTime,
      homeStats: JSON.parse(JSON.stringify(homeStats)),
      awayStats: JSON.parse(JSON.stringify(awayStats)),
      events: [...events], homeTimeouts, awayTimeouts,
      playerStats: JSON.parse(JSON.stringify(playerStats)), gameStatus
    }]);
    
    setHomeScore(last.homeScore);
    setAwayScore(last.awayScore);
    setPossession(last.possession);
    setQuarter(last.quarter);
    setClockTime(last.clockTime);
    setHomeStats(last.homeStats);
    setAwayStats(last.awayStats);
    setEvents(last.events);
    setHomeTimeouts(last.homeTimeouts);
    setAwayTimeouts(last.awayTimeouts);
    setPlayerStats(last.playerStats);
    setGameStatus(last.gameStatus || 'in_progress');
    setRedoHistory(prev => prev.slice(0, -1));
    toast.success("Redone!");
  };
  
  const addEvent = (desc) => {
    const qLabels = ['1Q', '2Q', '3Q', '4Q', 'OT'];
    const qLabel = quarter > 4 ? `${quarter - 4}OT` : qLabels[quarter - 1];
    setEvents(prev => [{ id: `e-${Date.now()}`, quarter: qLabel, description: desc }, ...prev]);
  };
  
  const updatePlayerStat = (playerNumber, team, statKey, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [`${team}_${playerNumber}`]: {
        ...prev[`${team}_${playerNumber}`],
        [statKey]: (prev[`${team}_${playerNumber}`]?.[statKey] || 0) + value
      }
    }));
  };
  
  // Add player to roster (for this game only)
  const addPlayerToRoster = (newPlayer, team) => {
    setGame(prev => {
      if (!prev) return prev;
      const rosterKey = team === 'home' ? 'home_roster' : 'away_roster';
      const currentRoster = prev[rosterKey] || [];
      // Check if player already exists
      if (currentRoster.some(p => p.player_number === newPlayer.player_number)) {
        return prev;
      }
      return {
        ...prev,
        [rosterKey]: [...currentRoster, newPlayer]
      };
    });
    toast.success(`#${newPlayer.player_number} ${newPlayer.player_name} added to roster`);
  };
  
  // Add to offense roster
  const addToOffenseRoster = (newPlayer) => {
    addPlayerToRoster(newPlayer, possession);
  };
  
  // Add to defense roster  
  const addToDefenseRoster = (newPlayer) => {
    addPlayerToRoster(newPlayer, defenseTeam);
  };
  
  const offenseRoster = possession === 'home' ? game?.home_roster : game?.away_roster;
  const defenseRoster = possession === 'home' ? game?.away_roster : game?.home_roster;
  const offenseTeamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
  const defenseTeamName = possession === 'home' ? game?.away_team_name : game?.home_team_name;
  const defenseTeam = possession === 'home' ? 'away' : 'home';
  const rememberedQB = possession === 'home' ? homeQB : awayQB;
  const setRememberedQB = possession === 'home' ? setHomeQB : setAwayQB;
  
  // Start workflows
  const startRushWorkflow = () => { setActiveWorkflow('rush'); setWorkflowStep(1); setWorkflowData({}); };
  const startPassWorkflow = () => { setActiveWorkflow('pass'); setWorkflowStep(1); setWorkflowData({}); };
  const startFGWorkflow = () => { setActiveWorkflow('fg'); setWorkflowStep(1); setWorkflowData({}); };
  const startFlagWorkflow = () => { setActiveWorkflow('flag'); setWorkflowStep(1); setWorkflowData({}); };
  const startTurnoverWorkflow = () => { setActiveWorkflow('turnover'); setWorkflowStep(1); setWorkflowData({}); };
  
  const closeWorkflow = () => { setActiveWorkflow(null); setWorkflowStep(0); setWorkflowData({}); };
  
  // Rush workflow handlers
  const handleRushPlayerSelect = (player) => {
    setWorkflowData(prev => ({ ...prev, rusher: player }));
    setWorkflowStep(2);
  };
  
  const handleRushYards = (yards) => {
    setWorkflowData(prev => ({ ...prev, yards }));
    setWorkflowStep(3);
  };
  
  const handleRushTackler = (tackler) => {
    saveState();
    const { rusher, yards } = workflowData;
    const setStats = possession === 'home' ? setHomeStats : setAwayStats;
    setStats(prev => ({ ...prev, rushYards: prev.rushYards + yards, totalYards: prev.totalYards + yards }));
    updatePlayerStat(rusher.player_number, possession, 'rushYards', yards);
    if (tackler) updatePlayerStat(tackler.player_number, defenseTeam, 'tackles', 1);
    addEvent(`#${rusher.player_number} ${rusher.player_name} rush for ${yards} yds${tackler ? ` (tackled by #${tackler.player_number})` : ''}`);
    closeWorkflow();
  };
  
  // Pass workflow handlers
  const handlePassQBSelect = (player) => {
    setWorkflowData(prev => ({ ...prev, qb: player }));
    setWorkflowStep(2);
  };
  
  const handlePassYards = (yards) => {
    setWorkflowData(prev => ({ ...prev, yards }));
    setWorkflowStep(3);
  };
  
  const handlePassReceiverSelect = (player) => {
    setWorkflowData(prev => ({ ...prev, receiver: player }));
    setWorkflowStep(4);
  };
  
  const handlePassTackler = (tackler) => {
    saveState();
    const { qb, yards, receiver } = workflowData;
    const setStats = possession === 'home' ? setHomeStats : setAwayStats;
    setStats(prev => ({ ...prev, passYards: prev.passYards + yards, totalYards: prev.totalYards + yards }));
    updatePlayerStat(qb.player_number, possession, 'passYards', yards);
    updatePlayerStat(receiver.player_number, possession, 'recYards', yards);
    if (tackler) updatePlayerStat(tackler.player_number, defenseTeam, 'tackles', 1);
    addEvent(`#${qb.player_number} pass to #${receiver.player_number} for ${yards} yds${tackler ? ` (tackled by #${tackler.player_number})` : ''}`);
    closeWorkflow();
  };
  
  // FG workflow handlers
  const handleFGKickerSelect = (player) => {
    setWorkflowData(prev => ({ ...prev, kicker: player }));
    setWorkflowStep(2);
  };
  
  const handleFGDistance = (dist) => {
    setWorkflowData(prev => ({ ...prev, distance: dist }));
    setWorkflowStep(3);
  };
  
  const handleFGResult = (good) => {
    saveState();
    const { kicker, distance } = workflowData;
    if (good) {
      if (possession === 'home') setHomeScore(prev => prev + 3);
      else setAwayScore(prev => prev + 3);
      addEvent(`#${kicker.player_number} ${distance}-yard FG GOOD!`);
      toast.success("Field Goal Good!");
    } else {
      addEvent(`#${kicker.player_number} ${distance}-yard FG NO GOOD`);
      setPossession(possession === 'home' ? 'away' : 'home');
      toast.info("Missed FG - Change of Possession");
    }
    closeWorkflow();
  };
  
  // Flag workflow handlers
  const [penaltySearch, setPenaltySearch] = useState('');
  
  const handleFlagTeamSelect = (team) => {
    setWorkflowData(prev => ({ ...prev, team }));
    setWorkflowStep(2);
  };
  
  const handleFlagPenaltySelect = (penalty) => {
    setWorkflowData(prev => ({ ...prev, penalty }));
    setWorkflowStep(3);
  };
  
  const handleFlagYards = (yards, forward) => {
    saveState();
    const { team, penalty } = workflowData;
    const actualYards = forward ? Math.abs(yards) : -Math.abs(yards);
    const teamName = team === 'home' ? game?.home_team_name : game?.away_team_name;
    addEvent(`FLAG: ${penalty.name} on ${teamName} - ${forward ? '+' : '-'}${Math.abs(yards)} yards`);
    closeWorkflow();
  };
  
  // Enhanced Turnover workflow handlers with player details
  const handleTurnoverType = (type) => {
    setWorkflowData(prev => ({ ...prev, turnoverType: type }));
    if (type === 'Turnover on Downs') {
      // No player details needed for turnover on downs
      saveState();
      const setStats = possession === 'home' ? setHomeStats : setAwayStats;
      setStats(prev => ({ ...prev, turnovers: prev.turnovers + 1 }));
      setPossession(possession === 'home' ? 'away' : 'home');
      addEvent(`TURNOVER: Turnover on Downs - ${offenseTeamName}`);
      toast.error("Turnover on Downs!");
      closeWorkflow();
    } else {
      setWorkflowStep(2); // Go to player selection
    }
  };
  
  // For interception: Step 2 = who threw it (offense), Step 3 = who intercepted (defense)
  const handleInterceptionThrower = (player) => {
    setWorkflowData(prev => ({ ...prev, thrower: player }));
    setWorkflowStep(3);
  };
  
  const handleInterceptionInterceptor = (player) => {
    saveState();
    const { thrower } = workflowData;
    const setStats = possession === 'home' ? setHomeStats : setAwayStats;
    setStats(prev => ({ ...prev, turnovers: prev.turnovers + 1 }));
    updatePlayerStat(thrower.player_number, possession, 'interceptions', 1);
    updatePlayerStat(player.player_number, defenseTeam, 'interceptedPasses', 1);
    setPossession(possession === 'home' ? 'away' : 'home');
    addEvent(`INTERCEPTION: #${thrower.player_number} pass intercepted by #${player.player_number} (${defenseTeamName})`);
    toast.error("Interception!");
    closeWorkflow();
  };
  
  // For fumble: Step 2 = who fumbled (offense), Step 3 = who recovered (either team)
  const handleFumbler = (player) => {
    setWorkflowData(prev => ({ ...prev, fumbler: player }));
    setWorkflowStep(3);
  };
  
  const handleFumbleRecovery = (player, recoveringTeam) => {
    saveState();
    const { fumbler } = workflowData;
    updatePlayerStat(fumbler.player_number, possession, 'fumblesLost', 1);
    updatePlayerStat(player.player_number, recoveringTeam, 'fumbleRecoveries', 1);
    
    const recoveryTeamName = recoveringTeam === 'home' ? game?.home_team_name : game?.away_team_name;
    
    if (recoveringTeam !== possession) {
      // Turnover - defense recovered
      const setStats = possession === 'home' ? setHomeStats : setAwayStats;
      setStats(prev => ({ ...prev, turnovers: prev.turnovers + 1 }));
      setPossession(recoveringTeam);
      addEvent(`FUMBLE: #${fumbler.player_number} fumbled, recovered by #${player.player_number} (${recoveryTeamName}) - TURNOVER`);
      toast.error("Fumble - Turnover!");
    } else {
      // Offense recovered their own fumble
      addEvent(`FUMBLE: #${fumbler.player_number} fumbled, recovered by #${player.player_number} (${recoveryTeamName})`);
      toast.info("Fumble recovered by offense");
    }
    closeWorkflow();
  };
  
  // Quick actions
  const handleFirstDown = () => {
    saveState();
    const setStats = possession === 'home' ? setHomeStats : setAwayStats;
    setStats(prev => ({ ...prev, firstDowns: prev.firstDowns + 1 }));
    addEvent(`First Down - ${offenseTeamName}`);
  };
  
  const handleTouchdown = () => {
    saveState();
    if (possession === 'home') setHomeScore(prev => prev + 6);
    else setAwayScore(prev => prev + 6);
    addEvent(`TOUCHDOWN! ${offenseTeamName}`);
    toast.success("Touchdown!");
  };
  
  const handleExtraPoint = () => {
    saveState();
    if (possession === 'home') setHomeScore(prev => prev + 1);
    else setAwayScore(prev => prev + 1);
    addEvent(`Extra Point Good - ${offenseTeamName}`);
  };
  
  const handleTwoPoint = () => {
    saveState();
    if (possession === 'home') setHomeScore(prev => prev + 2);
    else setAwayScore(prev => prev + 2);
    addEvent(`2-Point Conversion! ${offenseTeamName}`);
  };
  
  const handleSafety = () => {
    saveState();
    if (possession === 'home') setAwayScore(prev => prev + 2);
    else setHomeScore(prev => prev + 2);
    addEvent(`SAFETY!`);
  };
  
  const handleTimeout = (team) => {
    saveState();
    if (team === 'home' && homeTimeouts < 3) {
      setHomeTimeouts(prev => prev + 1);
      setClockRunning(false);
      addEvent(`Timeout - ${game?.home_team_name}`);
    } else if (team === 'away' && awayTimeouts < 3) {
      setAwayTimeouts(prev => prev + 1);
      setClockRunning(false);
      addEvent(`Timeout - ${game?.away_team_name}`);
    }
  };
  
  // Quarter change with confirmation dialogs
  const handleQuarterChange = (delta) => {
    const newQ = Math.max(1, quarter + delta);
    
    if (delta > 0) {
      // Going forward - check for special transitions
      if (quarter === 2) {
        // End of Q2 - prompt for halftime
        setPendingQuarterChange(3);
        setShowQuarterDialog(true);
        return;
      } else if (quarter === 4) {
        // End of Q4 - prompt for Final or Overtime
        setPendingQuarterChange(5);
        setShowQuarterDialog(true);
        return;
      } else {
        // Other quarter transitions - always confirm
        setPendingQuarterChange(newQ);
        setShowQuarterDialog(true);
        return;
      }
    } else {
      // Going backward - just do it
      if (newQ !== quarter) {
        saveState();
        setQuarter(newQ);
        setClockTime(900);
        setGameStatus('in_progress');
        addEvent(`Quarter ${newQ} begins`);
      }
    }
  };
  
  const confirmQuarterChange = (action) => {
    saveState();
    
    if (action === 'halftime') {
      setGameStatus('Halftime');
      setClockRunning(false);
      addEvent('HALFTIME');
      toast.info('Halftime!');
    } else if (action === 'start_3rd') {
      setQuarter(3);
      setClockTime(900);
      setGameStatus('in_progress');
      // Ask about timeout reset
      setShowQuarterDialog(false);
      setTimeout(() => {
        if (window.confirm('Reset timeouts for the second half?')) {
          setHomeTimeouts(0);
          setAwayTimeouts(0);
          toast.success('Timeouts reset for second half');
        }
      }, 100);
      addEvent('3rd Quarter begins');
      return;
    } else if (action === 'final') {
      setGameStatus('Final');
      setClockRunning(false);
      addEvent('FINAL');
      toast.success('Game Over!');
    } else if (action === 'overtime') {
      setQuarter(5);
      setClockTime(900);
      setGameStatus('in_progress');
      addEvent('1st Overtime begins');
      toast.info('Overtime!');
    } else if (action === 'next_quarter') {
      // Regular quarter transition
      setQuarter(pendingQuarterChange);
      setClockTime(900);
      setGameStatus('in_progress');
      addEvent(`Quarter ${pendingQuarterChange} begins`);
    }
    
    setShowQuarterDialog(false);
    setPendingQuarterChange(null);
  };
  
  if (loading) {
    return <LoadingScreen message="Loading game..." />;
  }
  
  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden" data-testid="simple-football-page">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(demoMode ? "/select-sport" : "/dashboard")} className="text-zinc-400" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex items-center gap-1 text-orange-500">
          <Trophy className="w-4 h-4" /><span className="font-bold text-sm">SIMPLE MODE</span>
          <span className="text-xs text-zinc-500 ml-2">(Space/\ = Clock)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const shareUrl = `${window.location.origin}/football/${id}/stats`;
              navigator.clipboard.writeText(shareUrl);
              toast.success("Live stat link copied!");
            }} 
            className="text-zinc-400 hover:text-white"
          >
            <Share2 className="w-4 h-4 mr-1" />Share
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowEmbedDialog(true)} 
            className="text-zinc-400 hover:text-white"
            data-testid="simple-football-embed-btn"
          >
            <Code className="w-4 h-4 mr-1" />Embed
          </Button>
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoHistory.length === 0} className={undoHistory.length > 0 ? 'text-amber-500' : 'text-zinc-600'} data-testid="undo-btn">
            <Undo2 className="w-4 h-4 mr-1" />Undo
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={redoHistory.length === 0} className={redoHistory.length > 0 ? 'text-green-500' : 'text-zinc-600'} data-testid="redo-btn">
            <Redo2 className="w-4 h-4 mr-1" />Redo
          </Button>
        </div>
      </div>
      
      {/* Main Content - No Scroll */}
      <div className="flex-1 p-3 grid grid-cols-4 gap-3 overflow-hidden">
        {/* Left: Scoreboard + Clock + Stats */}
        <div className="col-span-3 flex flex-col gap-3">
          {/* Scoreboard Row */}
          <div className="grid grid-cols-2 gap-3">
            <TeamScoreCard teamName={game?.home_team_name} teamColor={game?.home_team_color} score={homeScore} hasPossession={possession === 'home'} timeouts={homeTimeouts} onPossessionClick={() => { saveState(); setPossession('home'); }} isHome={true} />
            <TeamScoreCard teamName={game?.away_team_name} teamColor={game?.away_team_color} score={awayScore} hasPossession={possession === 'away'} timeouts={awayTimeouts} onPossessionClick={() => { saveState(); setPossession('away'); }} isHome={false} />
          </div>
          
          {/* Clock */}
          <GameClock 
            quarter={quarter} 
            clockTime={clockTime} 
            isRunning={clockRunning} 
            onToggle={() => setClockRunning(p => !p)} 
            onQuarterChange={handleQuarterChange} 
            onClockAdjust={(s) => setClockTime(p => Math.max(0, p + s))} 
            gameStatus={gameStatus}
            clockEnabled={clockEnabled}
            onToggleClockEnabled={() => setClockEnabled(p => !p)}
          />
          
          {/* Stats */}
          <QuickStats homeStats={homeStats} awayStats={awayStats} />
          
          {/* Action Buttons Grid - Updated styling */}
          <div className="grid grid-cols-5 gap-2 flex-1">
            {/* Scoring - Dark grey with white outline, larger text */}
            <button onClick={handleTouchdown} className="bg-zinc-700 hover:bg-zinc-600 border-2 border-white rounded-xl p-2 flex flex-col items-center justify-center" data-testid="td-btn">
              <span className="text-3xl font-black">+6</span><span className="text-sm font-semibold">TD</span>
            </button>
            <button onClick={handleExtraPoint} className="bg-zinc-700 hover:bg-zinc-600 border-2 border-white rounded-xl p-2 flex flex-col items-center justify-center" data-testid="xp-btn">
              <span className="text-3xl font-black">+1</span><span className="text-sm font-semibold">XP</span>
            </button>
            <button onClick={handleTwoPoint} className="bg-zinc-700 hover:bg-zinc-600 border-2 border-white rounded-xl p-2 flex flex-col items-center justify-center" data-testid="2pt-btn">
              <span className="text-3xl font-black">+2</span><span className="text-sm font-semibold">2PT</span>
            </button>
            <button onClick={startFGWorkflow} className="bg-zinc-700 hover:bg-zinc-600 border-2 border-white rounded-xl p-2 flex flex-col items-center justify-center" data-testid="fg-btn">
              <span className="text-3xl font-black">FG</span><span className="text-sm font-semibold">Field Goal</span>
            </button>
            <button onClick={handleSafety} className="bg-zinc-700 hover:bg-zinc-600 border-2 border-white rounded-xl p-2 flex flex-col items-center justify-center" data-testid="safety-btn">
              <span className="text-3xl font-black">+2</span><span className="text-sm font-semibold">Safety</span>
            </button>
            
            {/* Stats - Color coded */}
            <button onClick={startRushWorkflow} className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded-xl p-2 flex flex-col items-center justify-center" data-testid="rush-btn">
              <Zap className="w-6 h-6 text-white mb-1" /><span className="text-sm font-semibold">Rush Yds</span>
            </button>
            <button onClick={startPassWorkflow} className="bg-blue-700 hover:bg-blue-600 border border-blue-500 rounded-xl p-2 flex flex-col items-center justify-center" data-testid="pass-btn">
              <Zap className="w-6 h-6 text-white mb-1" /><span className="text-sm font-semibold">Pass Yds</span>
            </button>
            <button onClick={handleFirstDown} className="bg-amber-700 hover:bg-amber-600 border border-amber-500 rounded-xl p-2 flex flex-col items-center justify-center" data-testid="first-down-btn">
              <Flag className="w-6 h-6 text-white mb-1" /><span className="text-sm font-semibold">1st Down</span>
            </button>
            <button onClick={startTurnoverWorkflow} className="bg-red-700 hover:bg-red-600 border border-red-500 rounded-xl p-2 flex flex-col items-center justify-center" data-testid="turnover-btn">
              <AlertTriangle className="w-6 h-6 text-white mb-1" /><span className="text-sm font-semibold">Turnover</span>
            </button>
            <button onClick={startFlagWorkflow} className="bg-orange-700 hover:bg-orange-600 border border-orange-500 rounded-xl p-2 flex flex-col items-center justify-center" data-testid="penalty-btn">
              <Flag className="w-6 h-6 text-white mb-1" /><span className="text-sm font-semibold">Penalty</span>
            </button>
            
            {/* Timeouts */}
            <button onClick={() => handleTimeout('home')} disabled={homeTimeouts >= 3} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center disabled:opacity-50 col-span-2" data-testid="home-timeout-btn">
              <Clock className="w-4 h-4 mb-1" /><span className="text-xs">{game?.home_team_name?.slice(0,8)} TO ({3-homeTimeouts})</span>
            </button>
            <button onClick={() => handleTimeout('away')} disabled={awayTimeouts >= 3} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center disabled:opacity-50 col-span-2" data-testid="away-timeout-btn">
              <Clock className="w-4 h-4 mb-1" /><span className="text-xs">{game?.away_team_name?.slice(0,8)} TO ({3-awayTimeouts})</span>
            </button>
            <div></div>
          </div>
        </div>
        
        {/* Right: Event Log */}
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-700 flex flex-col overflow-hidden">
          <div className="text-zinc-500 text-xs font-semibold mb-2">GAME LOG</div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {events.length === 0 ? (
              <div className="text-zinc-600 text-center text-sm py-4">No events yet</div>
            ) : (
              events.slice(0, 15).map((e, i) => (
                <div key={e.id || i} className="text-xs flex gap-2">
                  <span className="text-orange-500 font-mono w-6">{e.quarter}</span>
                  <span className="text-zinc-300 flex-1">{e.description}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Rush Workflow Dialog */}
      <Dialog open={activeWorkflow === 'rush'} onOpenChange={() => closeWorkflow()}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Rush Play</DialogTitle></DialogHeader>
          {workflowStep === 1 && (
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handleRushPlayerSelect} onCancel={closeWorkflow} title="Select Ball Carrier" onAddPlayer={addToOffenseRoster} teamName={offenseTeamName} />
          )}
          {workflowStep === 2 && (
            <YardsInput onSubmit={handleRushYards} onCancel={closeWorkflow} title={`Rushing Yards for #${workflowData.rusher?.player_number}`} />
          )}
          {workflowStep === 3 && (
            <TacklerSelect roster={defenseRoster || []} onSelect={handleRushTackler} onNoTackle={() => handleRushTackler(null)} onCancel={closeWorkflow} title="Select Tackler" />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Pass Workflow Dialog */}
      <Dialog open={activeWorkflow === 'pass'} onOpenChange={() => closeWorkflow()}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Pass Play</DialogTitle></DialogHeader>
          {workflowStep === 1 && (
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handlePassQBSelect} onCancel={closeWorkflow} title="Select Quarterback" rememberOption={true} rememberedPlayer={rememberedQB} onRememberChange={setRememberedQB} onAddPlayer={addToOffenseRoster} teamName={offenseTeamName} />
          )}
          {workflowStep === 2 && (
            <YardsInput onSubmit={handlePassYards} onCancel={closeWorkflow} title={`Passing Yards from #${workflowData.qb?.player_number}`} />
          )}
          {workflowStep === 3 && (
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handlePassReceiverSelect} onCancel={closeWorkflow} title="Select Receiver" onAddPlayer={addToOffenseRoster} teamName={offenseTeamName} />
          )}
          {workflowStep === 4 && (
            <TacklerSelect roster={defenseRoster || []} onSelect={handlePassTackler} onNoTackle={() => handlePassTackler(null)} onCancel={closeWorkflow} title="Select Tackler" />
          )}
        </DialogContent>
      </Dialog>
      
      {/* FG Workflow Dialog */}
      <Dialog open={activeWorkflow === 'fg'} onOpenChange={() => closeWorkflow()}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Field Goal</DialogTitle></DialogHeader>
          {workflowStep === 1 && (
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handleFGKickerSelect} onCancel={closeWorkflow} title="Select Kicker" onAddPlayer={addToOffenseRoster} teamName={offenseTeamName} />
          )}
          {workflowStep === 2 && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">Field Goal Distance</div>
              <div className="grid grid-cols-4 gap-2">
                {[20, 25, 30, 35, 40, 45, 50, 55].map(d => (
                  <Button key={d} variant="outline" onClick={() => handleFGDistance(d)} className="border-zinc-700 text-lg">{d}</Button>
                ))}
              </div>
              <Button variant="outline" onClick={closeWorkflow} className="w-full border-zinc-700">Cancel</Button>
            </div>
          )}
          {workflowStep === 3 && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">{workflowData.distance}-Yard Field Goal</div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleFGResult(true)} className="h-20 text-2xl bg-green-600 hover:bg-green-500">GOOD</Button>
                <Button onClick={() => handleFGResult(false)} className="h-20 text-2xl bg-red-600 hover:bg-red-500">NO GOOD</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Flag/Penalty Workflow Dialog */}
      <Dialog open={activeWorkflow === 'flag'} onOpenChange={() => closeWorkflow()}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Penalty</DialogTitle></DialogHeader>
          {workflowStep === 1 && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">Penalty Against</div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleFlagTeamSelect('home')} className="h-16" style={{ backgroundColor: game?.home_team_color }}>{game?.home_team_name}</Button>
                <Button onClick={() => handleFlagTeamSelect('away')} className="h-16" style={{ backgroundColor: game?.away_team_color }}>{game?.away_team_name}</Button>
              </div>
              <Button variant="outline" onClick={closeWorkflow} className="w-full border-zinc-700">Cancel</Button>
            </div>
          )}
          {workflowStep === 2 && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">Select Penalty</div>
              <Command className="bg-zinc-800 border-zinc-700">
                <CommandInput placeholder="Search penalties..." value={penaltySearch} onValueChange={setPenaltySearch} />
                <CommandList className="max-h-48">
                  <CommandEmpty>No penalty found.</CommandEmpty>
                  <CommandGroup>
                    {PENALTIES.filter(p => p.name.toLowerCase().includes(penaltySearch.toLowerCase())).map(p => (
                      <CommandItem key={p.name} onSelect={() => handleFlagPenaltySelect(p)} className="cursor-pointer hover:bg-zinc-700">
                        {p.name} ({p.defaultYards} yds)
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              <Button variant="outline" onClick={closeWorkflow} className="w-full border-zinc-700">Cancel</Button>
            </div>
          )}
          {workflowStep === 3 && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">{workflowData.penalty?.name}</div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleFlagYards(workflowData.penalty?.defaultYards, true)} className="h-16 bg-green-600 hover:bg-green-500">
                  +{workflowData.penalty?.defaultYards} yards<br/><span className="text-xs">(Forward)</span>
                </Button>
                <Button onClick={() => handleFlagYards(workflowData.penalty?.defaultYards, false)} className="h-16 bg-red-600 hover:bg-red-500">
                  -{workflowData.penalty?.defaultYards} yards<br/><span className="text-xs">(Backward)</span>
                </Button>
              </div>
              <Button variant="outline" onClick={closeWorkflow} className="w-full border-zinc-700">Cancel</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Enhanced Turnover Workflow Dialog */}
      <Dialog open={activeWorkflow === 'turnover'} onOpenChange={() => closeWorkflow()}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Turnover</DialogTitle></DialogHeader>
          
          {/* Step 1: Select turnover type */}
          {workflowStep === 1 && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">Select Turnover Type</div>
              <div className="grid grid-cols-1 gap-3">
                <Button onClick={() => handleTurnoverType('Interception')} className="h-14 bg-red-700 hover:bg-red-600" data-testid="turnover-int-btn">
                  Interception
                </Button>
                <Button onClick={() => handleTurnoverType('Fumble')} className="h-14 bg-red-700 hover:bg-red-600" data-testid="turnover-fumble-btn">
                  Fumble
                </Button>
                <Button onClick={() => handleTurnoverType('Turnover on Downs')} className="h-14 bg-red-700 hover:bg-red-600" data-testid="turnover-downs-btn">
                  Turnover on Downs
                </Button>
              </div>
              <Button variant="outline" onClick={closeWorkflow} className="w-full border-zinc-700">Cancel</Button>
            </div>
          )}
          
          {/* Interception Step 2: Who threw it (offense) */}
          {workflowStep === 2 && workflowData.turnoverType === 'Interception' && (
            <PlayerNumberInput 
              roster={offenseRoster || []} 
              onSelect={handleInterceptionThrower} 
              onCancel={closeWorkflow} 
              title={`Who threw the interception? (${offenseTeamName})`}
              onAddPlayer={addToOffenseRoster}
              teamName={offenseTeamName}
            />
          )}
          
          {/* Interception Step 3: Who intercepted (defense) */}
          {workflowStep === 3 && workflowData.turnoverType === 'Interception' && (
            <PlayerNumberInput 
              roster={defenseRoster || []} 
              onSelect={handleInterceptionInterceptor} 
              onCancel={closeWorkflow} 
              title={`Who made the interception? (${defenseTeamName})`}
              onAddPlayer={addToDefenseRoster}
              teamName={defenseTeamName}
            />
          )}
          
          {/* Fumble Step 2: Who fumbled (offense) */}
          {workflowStep === 2 && workflowData.turnoverType === 'Fumble' && (
            <PlayerNumberInput 
              roster={offenseRoster || []} 
              onSelect={handleFumbler} 
              onCancel={closeWorkflow} 
              title={`Who fumbled? (${offenseTeamName})`}
              onAddPlayer={addToOffenseRoster}
              teamName={offenseTeamName}
            />
          )}
          
          {/* Fumble Step 3: Who recovered (either team) */}
          {workflowStep === 3 && workflowData.turnoverType === 'Fumble' && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">Who recovered the fumble?</div>
              <div className="text-center text-sm text-zinc-400 mb-2">
                #{workflowData.fumbler?.player_number} fumbled
              </div>
              
              {/* Offense recovery section */}
              <div className="border border-zinc-700 rounded-lg p-3">
                <div className="text-sm font-semibold text-green-400 mb-2">{offenseTeamName} (Offense)</div>
                <div className="grid grid-cols-4 gap-1">
                  {(offenseRoster || []).slice(0, 8).map(player => (
                    <button
                      key={player.player_number}
                      onClick={() => handleFumbleRecovery(player, possession)}
                      className="p-2 bg-zinc-800 hover:bg-green-700 rounded text-sm"
                    >
                      #{player.player_number}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Defense recovery section */}
              <div className="border border-zinc-700 rounded-lg p-3">
                <div className="text-sm font-semibold text-red-400 mb-2">{defenseTeamName} (Defense) - TURNOVER</div>
                <div className="grid grid-cols-4 gap-1">
                  {(defenseRoster || []).slice(0, 8).map(player => (
                    <button
                      key={player.player_number}
                      onClick={() => handleFumbleRecovery(player, defenseTeam)}
                      className="p-2 bg-zinc-800 hover:bg-red-700 rounded text-sm"
                    >
                      #{player.player_number}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button variant="outline" onClick={closeWorkflow} className="w-full border-zinc-700">Cancel</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Quarter Transition Dialog */}
      <Dialog open={showQuarterDialog} onOpenChange={setShowQuarterDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quarter === 2 ? 'End of 2nd Quarter' : quarter === 4 ? 'End of 4th Quarter' : 'Advance Quarter'}
            </DialogTitle>
          </DialogHeader>
          
          {/* End of Q2 - Halftime options */}
          {quarter === 2 && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-center">The 2nd quarter has ended. What would you like to do?</p>
              <div className="grid grid-cols-1 gap-3">
                <Button onClick={() => confirmQuarterChange('halftime')} className="h-14 bg-blue-600 hover:bg-blue-500">
                  Go to Halftime
                </Button>
                <Button onClick={() => confirmQuarterChange('start_3rd')} className="h-14 bg-green-600 hover:bg-green-500">
                  Start 3rd Quarter
                </Button>
              </div>
              <Button variant="outline" onClick={() => setShowQuarterDialog(false)} className="w-full border-zinc-700">
                Cancel
              </Button>
            </div>
          )}
          
          {/* End of Q4 - Final or Overtime */}
          {quarter === 4 && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-center">The 4th quarter has ended. What would you like to do?</p>
              <div className="grid grid-cols-1 gap-3">
                <Button onClick={() => confirmQuarterChange('final')} className="h-14 bg-green-600 hover:bg-green-500">
                  End Game (Final)
                </Button>
                <Button onClick={() => confirmQuarterChange('overtime')} className="h-14 bg-amber-600 hover:bg-amber-500">
                  Start 1st Overtime
                </Button>
              </div>
              <Button variant="outline" onClick={() => setShowQuarterDialog(false)} className="w-full border-zinc-700">
                Cancel
              </Button>
            </div>
          )}
          
          {/* Other quarter transitions */}
          {quarter !== 2 && quarter !== 4 && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-center">
                Advance to {pendingQuarterChange > 4 ? `Overtime ${pendingQuarterChange - 4}` : `Quarter ${pendingQuarterChange}`}?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => confirmQuarterChange('next_quarter')} className="h-12 bg-green-600 hover:bg-green-500">
                  Yes, Advance
                </Button>
                <Button variant="outline" onClick={() => setShowQuarterDialog(false)} className="h-12 border-zinc-700">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Embed Snippet Generator */}
      <EmbedSnippetGenerator
        open={showEmbedDialog}
        onOpenChange={setShowEmbedDialog}
        shareCode={game?.share_code || id}
        sport="football"
        gameTitle={`${game?.away_team_name || 'Away'} vs ${game?.home_team_name || 'Home'}`}
      />
    </div>
  );
}

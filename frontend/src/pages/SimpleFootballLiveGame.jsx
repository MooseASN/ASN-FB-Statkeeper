import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Flag,
  Trophy,
  Zap,
  AlertTriangle,
  Clock,
  ChevronUp,
  ChevronDown,
  Check,
  X
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

// Player Number Input Component
const PlayerNumberInput = ({ 
  roster, 
  onSelect, 
  onCancel, 
  title, 
  rememberOption = false,
  rememberedPlayer = null,
  onRememberChange = null 
}) => {
  const [inputValue, setInputValue] = useState(rememberedPlayer || '');
  const [remember, setRemember] = useState(!!rememberedPlayer);
  const inputRef = useRef(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = (e) => {
    e?.preventDefault();
    const player = roster.find(p => p.player_number === inputValue);
    if (player) {
      if (rememberOption && onRememberChange) {
        onRememberChange(remember ? inputValue : null);
      }
      onSelect(player);
    } else if (inputValue) {
      toast.error(`Player #${inputValue} not found on roster`);
    }
  };
  
  const matchingPlayers = roster.filter(p => 
    p.player_number?.startsWith(inputValue) || 
    p.player_name?.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 5);
  
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

// Compact Game Clock
const GameClock = ({ quarter, clockTime, isRunning, onToggle, onQuarterChange, onClockAdjust }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const quarterLabels = ['1st', '2nd', '3rd', '4th', 'OT'];
  
  return (
    <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => onQuarterChange(-1)} className="text-zinc-500 hover:text-white p-1" disabled={quarter <= 1}>
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="text-lg font-bold text-orange-500 w-10">{quarterLabels[quarter - 1]}</span>
          <button onClick={() => onQuarterChange(1)} className="text-zinc-500 hover:text-white p-1">
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-4xl font-mono font-black text-white">{formatTime(clockTime)}</div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => onClockAdjust(-10)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400">-10</button>
          <Button onClick={onToggle} size="sm" variant={isRunning ? "destructive" : "default"}>
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <button onClick={() => onClockAdjust(10)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400">+10</button>
        </div>
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
  const [homeTimeouts, setHomeTimeouts] = useState(0);
  const [awayTimeouts, setAwayTimeouts] = useState(0);
  
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
      playerStats: JSON.parse(JSON.stringify(playerStats))
    }]);
  }, [homeScore, awayScore, possession, quarter, clockTime, homeStats, awayStats, events, homeTimeouts, awayTimeouts, playerStats]);
  
  const handleUndo = () => {
    if (undoHistory.length === 0) { toast.error("Nothing to undo"); return; }
    const last = undoHistory[undoHistory.length - 1];
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
    setUndoHistory(prev => prev.slice(0, -1));
    toast.success("Undone!");
  };
  
  const addEvent = (desc) => {
    const qLabels = ['1Q', '2Q', '3Q', '4Q', 'OT'];
    setEvents(prev => [{ id: `e-${Date.now()}`, quarter: qLabels[quarter-1], description: desc }, ...prev]);
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
  
  const offenseRoster = possession === 'home' ? game?.home_roster : game?.away_roster;
  const defenseRoster = possession === 'home' ? game?.away_roster : game?.home_roster;
  const offenseTeamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
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
  
  // Turnover workflow handlers
  const handleTurnoverType = (type) => {
    saveState();
    const setStats = possession === 'home' ? setHomeStats : setAwayStats;
    setStats(prev => ({ ...prev, turnovers: prev.turnovers + 1 }));
    setPossession(possession === 'home' ? 'away' : 'home');
    addEvent(`TURNOVER: ${type} - ${offenseTeamName}`);
    toast.error("Turnover!");
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
  
  const handleQuarterChange = (delta) => {
    const newQ = Math.max(1, Math.min(5, quarter + delta));
    if (newQ !== quarter) {
      saveState();
      setQuarter(newQ);
      setClockTime(900);
      if (newQ === 3) { setHomeTimeouts(0); setAwayTimeouts(0); }
      addEvent(`Quarter ${newQ} begins`);
    }
  };
  
  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Loading...</div></div>;
  }
  
  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden" data-testid="simple-football-page">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(demoMode ? "/select-sport" : "/dashboard/football")} className="text-zinc-400">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex items-center gap-1 text-orange-500">
          <Trophy className="w-4 h-4" /><span className="font-bold text-sm">SIMPLE MODE</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoHistory.length === 0} className={undoHistory.length > 0 ? 'text-amber-500' : 'text-zinc-600'}>
          <Undo2 className="w-4 h-4 mr-1" />Undo
        </Button>
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
          <GameClock quarter={quarter} clockTime={clockTime} isRunning={clockRunning} onToggle={() => setClockRunning(p => !p)} onQuarterChange={handleQuarterChange} onClockAdjust={(s) => setClockTime(p => Math.max(0, Math.min(900, p + s)))} />
          
          {/* Stats */}
          <QuickStats homeStats={homeStats} awayStats={awayStats} />
          
          {/* Action Buttons Grid */}
          <div className="grid grid-cols-5 gap-2 flex-1">
            {/* Scoring */}
            <button onClick={handleTouchdown} className="bg-green-600 hover:bg-green-500 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">+6</span><span className="text-xs">TD</span>
            </button>
            <button onClick={handleExtraPoint} className="bg-blue-600 hover:bg-blue-500 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">+1</span><span className="text-xs">XP</span>
            </button>
            <button onClick={handleTwoPoint} className="bg-purple-600 hover:bg-purple-500 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">+2</span><span className="text-xs">2PT</span>
            </button>
            <button onClick={startFGWorkflow} className="bg-amber-600 hover:bg-amber-500 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">FG</span><span className="text-xs">Field Goal</span>
            </button>
            <button onClick={handleSafety} className="bg-red-600 hover:bg-red-500 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">+2</span><span className="text-xs">Safety</span>
            </button>
            
            {/* Stats */}
            <button onClick={startRushWorkflow} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center">
              <Zap className="w-5 h-5 text-green-400 mb-1" /><span className="text-xs">Rush</span>
            </button>
            <button onClick={startPassWorkflow} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400 mb-1" /><span className="text-xs">Pass</span>
            </button>
            <button onClick={handleFirstDown} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center">
              <Flag className="w-5 h-5 text-yellow-400 mb-1" /><span className="text-xs">1st Down</span>
            </button>
            <button onClick={startTurnoverWorkflow} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mb-1" /><span className="text-xs">Turnover</span>
            </button>
            <button onClick={startFlagWorkflow} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center">
              <Flag className="w-5 h-5 text-orange-400 mb-1" /><span className="text-xs">Penalty</span>
            </button>
            
            {/* Timeouts */}
            <button onClick={() => handleTimeout('home')} disabled={homeTimeouts >= 3} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center disabled:opacity-50 col-span-2">
              <Clock className="w-4 h-4 mb-1" /><span className="text-xs">{game?.home_team_name?.slice(0,8)} TO ({3-homeTimeouts})</span>
            </button>
            <button onClick={() => handleTimeout('away')} disabled={awayTimeouts >= 3} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center disabled:opacity-50 col-span-2">
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
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handleRushPlayerSelect} onCancel={closeWorkflow} title="Select Ball Carrier" />
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
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handlePassQBSelect} onCancel={closeWorkflow} title="Select Quarterback" rememberOption={true} rememberedPlayer={rememberedQB} onRememberChange={setRememberedQB} />
          )}
          {workflowStep === 2 && (
            <YardsInput onSubmit={handlePassYards} onCancel={closeWorkflow} title={`Passing Yards from #${workflowData.qb?.player_number}`} />
          )}
          {workflowStep === 3 && (
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handlePassReceiverSelect} onCancel={closeWorkflow} title="Select Receiver" />
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
            <PlayerNumberInput roster={offenseRoster || []} onSelect={handleFGKickerSelect} onCancel={closeWorkflow} title="Select Kicker" />
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
      
      {/* Turnover Workflow Dialog */}
      <Dialog open={activeWorkflow === 'turnover'} onOpenChange={() => closeWorkflow()}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Turnover</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-lg font-semibold">Select Turnover Type</div>
            <div className="grid grid-cols-1 gap-3">
              <Button onClick={() => handleTurnoverType('Fumble')} className="h-14 bg-red-700 hover:bg-red-600">Fumble</Button>
              <Button onClick={() => handleTurnoverType('Interception')} className="h-14 bg-red-700 hover:bg-red-600">Interception</Button>
              <Button onClick={() => handleTurnoverType('Turnover on Downs')} className="h-14 bg-red-700 hover:bg-red-600">Turnover on Downs</Button>
            </div>
            <Button variant="outline" onClick={closeWorkflow} className="w-full border-zinc-700">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

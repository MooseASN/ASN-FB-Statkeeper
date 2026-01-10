import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  ArrowLeftRight,
  Undo2,
  Flag,
  Trophy,
  Zap,
  AlertTriangle,
  Clock,
  ChevronUp,
  ChevronDown,
  Share2,
  FileText
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Quick Score Button Component
const QuickScoreButton = ({ label, points, color, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white font-bold py-4 px-6 rounded-xl text-lg 
      transition-all transform hover:scale-105 active:scale-95 
      disabled:opacity-50 disabled:cursor-not-allowed
      shadow-lg hover:shadow-xl`}
    data-testid={`score-btn-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="text-2xl font-black">+{points}</div>
    <div className="text-sm opacity-90">{label}</div>
  </button>
);

// Team Score Display
const TeamScoreCard = ({ 
  teamName, 
  teamColor, 
  score, 
  hasPossession, 
  timeouts,
  onPossessionClick,
  isHome 
}) => (
  <div 
    className={`relative p-6 rounded-2xl transition-all ${
      hasPossession ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
    }`}
    style={{ backgroundColor: teamColor || (isHome ? '#dc2626' : '#2563eb') }}
  >
    {hasPossession && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold">
        🏈 POSSESSION
      </div>
    )}
    <div className="text-center text-white">
      <div className="text-lg font-semibold opacity-90 truncate">{teamName}</div>
      <div className="text-7xl font-black my-2" data-testid={`${isHome ? 'home' : 'away'}-score`}>
        {score}
      </div>
      <div className="flex justify-center gap-2 mt-2">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full ${i <= (3 - timeouts) ? 'bg-white/30' : 'bg-white'}`}
            title={`Timeout ${i}`}
          />
        ))}
      </div>
      <button
        onClick={onPossessionClick}
        className="mt-3 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
      >
        {hasPossession ? 'Has Ball' : 'Give Ball'}
      </button>
    </div>
  </div>
);

// Game Clock Display
const GameClock = ({ 
  quarter, 
  clockTime, 
  isRunning, 
  onToggle, 
  onReset,
  onQuarterChange,
  onClockAdjust
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const quarterLabels = ['1st', '2nd', '3rd', '4th', 'OT'];
  
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 text-center border border-zinc-700">
      <div className="text-zinc-400 text-sm mb-1">Quarter</div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <button 
          onClick={() => onQuarterChange(-1)}
          className="text-zinc-500 hover:text-white p-1"
          disabled={quarter <= 1}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        <span className="text-3xl font-bold text-orange-500" data-testid="quarter-display">
          {quarterLabels[quarter - 1] || `Q${quarter}`}
        </span>
        <button 
          onClick={() => onQuarterChange(1)}
          className="text-zinc-500 hover:text-white p-1"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      </div>
      
      <div className="text-6xl font-mono font-black text-white mb-4" data-testid="clock-display">
        {formatTime(clockTime)}
      </div>
      
      <div className="flex justify-center gap-2">
        <Button
          onClick={onToggle}
          variant={isRunning ? "destructive" : "default"}
          size="lg"
          className="flex-1"
          data-testid="clock-toggle"
        >
          {isRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          data-testid="clock-reset"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex justify-center gap-2 mt-3">
        <button 
          onClick={() => onClockAdjust(-10)}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-zinc-300"
        >
          -10s
        </button>
        <button 
          onClick={() => onClockAdjust(-60)}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-zinc-300"
        >
          -1m
        </button>
        <button 
          onClick={() => onClockAdjust(60)}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-zinc-300"
        >
          +1m
        </button>
        <button 
          onClick={() => onClockAdjust(10)}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-zinc-300"
        >
          +10s
        </button>
      </div>
    </div>
  );
};

// Quick Stats Panel
const QuickStatsPanel = ({ homeStats, awayStats, homeTeamName, awayTeamName }) => {
  const StatRow = ({ label, home, away }) => (
    <div className="flex items-center py-2 border-b border-zinc-800">
      <div className="w-16 text-right text-white font-bold">{home}</div>
      <div className="flex-1 text-center text-zinc-400 text-sm px-2">{label}</div>
      <div className="w-16 text-left text-white font-bold">{away}</div>
    </div>
  );
  
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-700">
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-zinc-300 font-semibold truncate w-20">{homeTeamName?.slice(0, 10)}</span>
        <span className="text-zinc-500">TEAM STATS</span>
        <span className="text-zinc-300 font-semibold truncate w-20 text-right">{awayTeamName?.slice(0, 10)}</span>
      </div>
      <StatRow label="Total Yards" home={homeStats.totalYards} away={awayStats.totalYards} />
      <StatRow label="Pass Yards" home={homeStats.passYards} away={awayStats.passYards} />
      <StatRow label="Rush Yards" home={homeStats.rushYards} away={awayStats.rushYards} />
      <StatRow label="Turnovers" home={homeStats.turnovers} away={awayStats.turnovers} />
      <StatRow label="1st Downs" home={homeStats.firstDowns} away={awayStats.firstDowns} />
    </div>
  );
};

// Event Log
const EventLog = ({ events }) => (
  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-700 max-h-[300px] overflow-y-auto">
    <div className="text-zinc-500 text-sm font-semibold mb-3">GAME LOG</div>
    {events.length === 0 ? (
      <div className="text-zinc-600 text-center py-4">No events yet</div>
    ) : (
      <div className="space-y-2">
        {events.map((event, idx) => (
          <div key={event.id || idx} className="flex gap-3 text-sm">
            <span className="text-orange-500 font-mono w-12">{event.quarter}</span>
            <span className="text-zinc-300 flex-1">{event.description}</span>
          </div>
        ))}
      </div>
    )}
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
  
  // Score state
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  
  // Game control state
  const [possession, setPossession] = useState('home');
  const [quarter, setQuarter] = useState(1);
  const [clockTime, setClockTime] = useState(900); // 15:00
  const [clockRunning, setClockRunning] = useState(false);
  const [homeTimeouts, setHomeTimeouts] = useState(0);
  const [awayTimeouts, setAwayTimeouts] = useState(0);
  
  // Stats state
  const [homeStats, setHomeStats] = useState({
    totalYards: 0,
    passYards: 0,
    rushYards: 0,
    turnovers: 0,
    firstDowns: 0
  });
  const [awayStats, setAwayStats] = useState({
    totalYards: 0,
    passYards: 0,
    rushYards: 0,
    turnovers: 0,
    firstDowns: 0
  });
  
  // Event log
  const [events, setEvents] = useState([]);
  
  // Undo history
  const [undoHistory, setUndoHistory] = useState([]);
  
  // Dialog state
  const [showYardsDialog, setShowYardsDialog] = useState(false);
  const [yardsDialogType, setYardsDialogType] = useState(null); // 'pass' | 'rush' | 'penalty'
  const [yardsInput, setYardsInput] = useState('');
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  
  // Demo data
  useEffect(() => {
    if (demoMode) {
      setGame({
        id: 'demo',
        home_team_name: 'Central Wolves',
        away_team_name: 'Riverside Panthers',
        home_team_color: '#dc2626',
        away_team_color: '#7c3aed',
        sport: 'football'
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
      interval = setInterval(() => {
        setClockTime(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockRunning, clockTime]);
  
  // Auto-stop clock at 0
  useEffect(() => {
    if (clockTime === 0 && clockRunning) {
      setClockRunning(false);
      toast.info("Clock stopped at 0:00");
    }
  }, [clockTime, clockRunning]);
  
  const fetchGame = async () => {
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
      // Restore saved state if available
      if (res.data.home_score) setHomeScore(res.data.home_score);
      if (res.data.away_score) setAwayScore(res.data.away_score);
      if (res.data.quarter) setQuarter(res.data.quarter);
      if (res.data.clock_time) setClockTime(res.data.clock_time);
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };
  
  const saveState = useCallback(() => {
    const snapshot = {
      homeScore,
      awayScore,
      possession,
      quarter,
      clockTime,
      homeStats: { ...homeStats },
      awayStats: { ...awayStats },
      events: [...events],
      homeTimeouts,
      awayTimeouts
    };
    setUndoHistory(prev => [...prev.slice(-19), snapshot]);
  }, [homeScore, awayScore, possession, quarter, clockTime, homeStats, awayStats, events, homeTimeouts, awayTimeouts]);
  
  const handleUndo = () => {
    if (undoHistory.length === 0) {
      toast.error("Nothing to undo");
      return;
    }
    const lastState = undoHistory[undoHistory.length - 1];
    setHomeScore(lastState.homeScore);
    setAwayScore(lastState.awayScore);
    setPossession(lastState.possession);
    setQuarter(lastState.quarter);
    setClockTime(lastState.clockTime);
    setHomeStats(lastState.homeStats);
    setAwayStats(lastState.awayStats);
    setEvents(lastState.events);
    setHomeTimeouts(lastState.homeTimeouts);
    setAwayTimeouts(lastState.awayTimeouts);
    setUndoHistory(prev => prev.slice(0, -1));
    toast.success("Undone!");
  };
  
  const addEvent = (description) => {
    const quarterLabels = ['1Q', '2Q', '3Q', '4Q', 'OT'];
    setEvents(prev => [{
      id: `event-${Date.now()}`,
      quarter: quarterLabels[quarter - 1] || `Q${quarter}`,
      description,
      timestamp: new Date().toISOString()
    }, ...prev]);
  };
  
  // Score handlers
  const handleTouchdown = (team) => {
    saveState();
    if (team === 'home') {
      setHomeScore(prev => prev + 6);
    } else {
      setAwayScore(prev => prev + 6);
    }
    addEvent(`${team === 'home' ? game?.home_team_name : game?.away_team_name} TOUCHDOWN! 🏈`);
    toast.success("Touchdown!");
  };
  
  const handleExtraPoint = (team) => {
    saveState();
    if (team === 'home') {
      setHomeScore(prev => prev + 1);
    } else {
      setAwayScore(prev => prev + 1);
    }
    addEvent(`${team === 'home' ? game?.home_team_name : game?.away_team_name} Extra Point Good`);
  };
  
  const handleTwoPoint = (team) => {
    saveState();
    if (team === 'home') {
      setHomeScore(prev => prev + 2);
    } else {
      setAwayScore(prev => prev + 2);
    }
    addEvent(`${team === 'home' ? game?.home_team_name : game?.away_team_name} 2-Point Conversion!`);
  };
  
  const handleFieldGoal = (team) => {
    saveState();
    if (team === 'home') {
      setHomeScore(prev => prev + 3);
    } else {
      setAwayScore(prev => prev + 3);
    }
    addEvent(`${team === 'home' ? game?.home_team_name : game?.away_team_name} Field Goal Good!`);
    toast.success("Field Goal!");
  };
  
  const handleSafety = (team) => {
    saveState();
    // Safety scores for the OTHER team
    if (team === 'home') {
      setAwayScore(prev => prev + 2);
    } else {
      setHomeScore(prev => prev + 2);
    }
    addEvent(`SAFETY! Scored against ${team === 'home' ? game?.home_team_name : game?.away_team_name}`);
  };
  
  // Stat handlers
  const handleAddYards = (type, yards, team = possession) => {
    saveState();
    const setStats = team === 'home' ? setHomeStats : setAwayStats;
    const teamName = team === 'home' ? game?.home_team_name : game?.away_team_name;
    
    setStats(prev => ({
      ...prev,
      totalYards: prev.totalYards + yards,
      [type === 'pass' ? 'passYards' : 'rushYards']: prev[type === 'pass' ? 'passYards' : 'rushYards'] + yards
    }));
    
    addEvent(`${teamName} ${yards > 0 ? '+' : ''}${yards} ${type} yards`);
  };
  
  const handleTurnover = (team = possession) => {
    saveState();
    const setStats = team === 'home' ? setHomeStats : setAwayStats;
    const teamName = team === 'home' ? game?.home_team_name : game?.away_team_name;
    
    setStats(prev => ({
      ...prev,
      turnovers: prev.turnovers + 1
    }));
    
    setPossession(team === 'home' ? 'away' : 'home');
    addEvent(`TURNOVER! ${teamName} loses the ball`);
    toast.error("Turnover!");
  };
  
  const handleFirstDown = () => {
    saveState();
    const setStats = possession === 'home' ? setHomeStats : setAwayStats;
    const teamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    
    setStats(prev => ({
      ...prev,
      firstDowns: prev.firstDowns + 1
    }));
    
    addEvent(`${teamName} First Down`);
  };
  
  const handleTimeout = (team) => {
    saveState();
    if (team === 'home') {
      if (homeTimeouts >= 3) {
        toast.error("No timeouts remaining");
        return;
      }
      setHomeTimeouts(prev => prev + 1);
    } else {
      if (awayTimeouts >= 3) {
        toast.error("No timeouts remaining");
        return;
      }
      setAwayTimeouts(prev => prev + 1);
    }
    setClockRunning(false);
    addEvent(`Timeout - ${team === 'home' ? game?.home_team_name : game?.away_team_name}`);
  };
  
  const handleQuarterChange = (delta) => {
    const newQuarter = Math.max(1, Math.min(5, quarter + delta));
    if (newQuarter !== quarter) {
      saveState();
      setQuarter(newQuarter);
      setClockTime(900); // Reset to 15:00
      if (newQuarter === 3) {
        // Halftime - reset timeouts
        setHomeTimeouts(0);
        setAwayTimeouts(0);
      }
      addEvent(`Quarter ${newQuarter} begins`);
    }
  };
  
  const handleClockAdjust = (seconds) => {
    setClockTime(prev => Math.max(0, Math.min(900, prev + seconds)));
  };
  
  const handleYardsSubmit = () => {
    const yards = parseInt(yardsInput) || 0;
    if (yardsDialogType === 'pass' || yardsDialogType === 'rush') {
      handleAddYards(yardsDialogType, yards);
    }
    setShowYardsDialog(false);
    setYardsInput('');
    setYardsDialogType(null);
  };
  
  const openYardsDialog = (type) => {
    setYardsDialogType(type);
    setYardsInput('');
    setShowYardsDialog(true);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  const currentTeamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
  
  return (
    <div className="min-h-screen bg-black text-white" data-testid="simple-football-page">
      {/* Demo Banner */}
      {demoMode && (
        <div className="bg-orange-600 text-center py-2 text-sm font-semibold">
          DEMO MODE - Stats will not be saved
        </div>
      )}
      
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(demoMode ? "/select-sport" : "/dashboard/football")}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2 text-orange-500">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">SIMPLE MODE</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={undoHistory.length === 0}
              className={undoHistory.length > 0 ? 'text-amber-500' : 'text-zinc-600'}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Undo
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Scoreboard & Clock */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scoreboard */}
            <div className="grid grid-cols-2 gap-4">
              <TeamScoreCard
                teamName={game?.home_team_name || 'Home'}
                teamColor={game?.home_team_color}
                score={homeScore}
                hasPossession={possession === 'home'}
                timeouts={homeTimeouts}
                onPossessionClick={() => { saveState(); setPossession('home'); }}
                isHome={true}
              />
              <TeamScoreCard
                teamName={game?.away_team_name || 'Away'}
                teamColor={game?.away_team_color}
                score={awayScore}
                hasPossession={possession === 'away'}
                timeouts={awayTimeouts}
                onPossessionClick={() => { saveState(); setPossession('away'); }}
                isHome={false}
              />
            </div>
            
            {/* Clock */}
            <GameClock
              quarter={quarter}
              clockTime={clockTime}
              isRunning={clockRunning}
              onToggle={() => setClockRunning(prev => !prev)}
              onReset={() => setClockTime(900)}
              onQuarterChange={handleQuarterChange}
              onClockAdjust={handleClockAdjust}
            />
            
            {/* Quick Score Buttons - For team with possession */}
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
              <div className="text-center mb-4">
                <span className="text-zinc-400 text-sm">SCORING FOR </span>
                <span className="text-white font-bold">{currentTeamName}</span>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <QuickScoreButton
                  label="TD"
                  points={6}
                  color="bg-green-600 hover:bg-green-500"
                  onClick={() => handleTouchdown(possession)}
                />
                <QuickScoreButton
                  label="XP"
                  points={1}
                  color="bg-blue-600 hover:bg-blue-500"
                  onClick={() => handleExtraPoint(possession)}
                />
                <QuickScoreButton
                  label="2PT"
                  points={2}
                  color="bg-purple-600 hover:bg-purple-500"
                  onClick={() => handleTwoPoint(possession)}
                />
                <QuickScoreButton
                  label="FG"
                  points={3}
                  color="bg-amber-600 hover:bg-amber-500"
                  onClick={() => handleFieldGoal(possession)}
                />
                <QuickScoreButton
                  label="Safety"
                  points={2}
                  color="bg-red-600 hover:bg-red-500"
                  onClick={() => handleSafety(possession)}
                />
              </div>
              
              <div className="text-center mt-3 text-xs text-zinc-500">
                Safety gives 2 points to the OTHER team
              </div>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                onClick={() => openYardsDialog('pass')}
                variant="outline"
                className="h-16 text-lg border-zinc-700 hover:bg-zinc-800"
              >
                <Zap className="w-5 h-5 mr-2 text-blue-400" />
                Pass Yards
              </Button>
              <Button
                onClick={() => openYardsDialog('rush')}
                variant="outline"
                className="h-16 text-lg border-zinc-700 hover:bg-zinc-800"
              >
                <Zap className="w-5 h-5 mr-2 text-green-400" />
                Rush Yards
              </Button>
              <Button
                onClick={handleFirstDown}
                variant="outline"
                className="h-16 text-lg border-zinc-700 hover:bg-zinc-800"
              >
                <Flag className="w-5 h-5 mr-2 text-yellow-400" />
                1st Down
              </Button>
              <Button
                onClick={() => handleTurnover()}
                variant="outline"
                className="h-16 text-lg border-zinc-700 hover:bg-zinc-800 hover:bg-red-900/30"
              >
                <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                Turnover
              </Button>
            </div>
            
            {/* Timeout Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleTimeout('home')}
                variant="outline"
                className="h-12 border-zinc-700 hover:bg-zinc-800"
                disabled={homeTimeouts >= 3}
              >
                <Clock className="w-4 h-4 mr-2" />
                {game?.home_team_name} Timeout ({3 - homeTimeouts} left)
              </Button>
              <Button
                onClick={() => handleTimeout('away')}
                variant="outline"
                className="h-12 border-zinc-700 hover:bg-zinc-800"
                disabled={awayTimeouts >= 3}
              >
                <Clock className="w-4 h-4 mr-2" />
                {game?.away_team_name} Timeout ({3 - awayTimeouts} left)
              </Button>
            </div>
          </div>
          
          {/* Right Column - Stats & Log */}
          <div className="space-y-6">
            <QuickStatsPanel
              homeStats={homeStats}
              awayStats={awayStats}
              homeTeamName={game?.home_team_name}
              awayTeamName={game?.away_team_name}
            />
            <EventLog events={events} />
          </div>
        </div>
      </div>
      
      {/* Yards Input Dialog */}
      <Dialog open={showYardsDialog} onOpenChange={setShowYardsDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {yardsDialogType === 'pass' ? 'Pass Yards' : 'Rush Yards'} for {currentTeamName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              value={yardsInput}
              onChange={(e) => setYardsInput(e.target.value)}
              placeholder="Enter yards (use negative for loss)"
              className="bg-zinc-800 border-zinc-700 text-white text-2xl text-center h-16"
              autoFocus
            />
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20, 25, 30, 40, 50].map(yards => (
                <Button
                  key={yards}
                  variant="outline"
                  onClick={() => setYardsInput(yards.toString())}
                  className="border-zinc-700"
                >
                  +{yards}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[-2, -5, -10, -15].map(yards => (
                <Button
                  key={yards}
                  variant="outline"
                  onClick={() => setYardsInput(yards.toString())}
                  className="border-zinc-700 text-red-400"
                >
                  {yards}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowYardsDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleYardsSubmit}
                className="flex-1 bg-orange-600 hover:bg-orange-500"
              >
                Add Yards
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

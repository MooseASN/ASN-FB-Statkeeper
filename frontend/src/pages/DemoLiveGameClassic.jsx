import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Play, Pause, Settings, HelpCircle, FileDown, Users, 
  RotateCcw, ChevronDown, ChevronUp, AlertCircle, X, Plus, Minus, 
  Share2, Clock, UserMinus, UserPlus, Trash2, Edit, Link, 
  Clipboard, CheckCircle, ExternalLink, Code, Monitor
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Demo Mode Bar
const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider shadow-lg">
    Demo Mode - Stats will not be saved
  </div>
);

// Shot Modal for make/miss
const ShotModal = ({ isOpen, onClose, shotType, playerName, onMake, onMiss }) => {
  if (!isOpen) return null;
  
  const shotLabel = shotType === 'ft' ? 'Free Throw' : shotType === 'fg2' ? '2-Point Shot' : '3-Point Shot';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{shotLabel}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-600 mb-6">{playerName}</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onMake}
            className="py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl rounded-xl transition-colors"
          >
            MAKE
          </button>
          <button
            onClick={onMiss}
            className="py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-bold text-xl rounded-xl transition-colors"
          >
            MISS
          </button>
        </div>
      </div>
    </div>
  );
};

// Player Card Component
const PlayerCard = ({ player, teamColor, onShotClick, onStatUpdate, isOnFloor, onToggleFloor }) => {
  const pts = (player.ft_made || 0) + ((player.fg2_made || 0) * 2) + ((player.fg3_made || 0) * 3);
  const totalReb = (player.offensive_rebounds || 0) + (player.defensive_rebounds || 0);
  
  return (
    <div 
      className={`rounded-xl p-4 transition-all ${isOnFloor ? 'ring-2 ring-offset-2' : 'opacity-60'}`}
      style={{ 
        backgroundColor: `${teamColor}15`,
        borderLeft: `4px solid ${teamColor}`,
        ringColor: teamColor
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold" style={{ color: teamColor }}>
            #{player.player_number}
          </span>
          <span className="font-medium text-gray-800">{player.player_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: teamColor }}>{pts}</span>
          <span className="text-gray-400 text-sm">PTS</span>
        </div>
      </div>
      
      {/* Shot Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => onShotClick(player, 'ft')}
          className="py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold transition-colors"
        >
          FT
        </button>
        <button
          onClick={() => onShotClick(player, 'fg2')}
          className="py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold transition-colors"
        >
          2PT
        </button>
        <button
          onClick={() => onShotClick(player, 'fg3')}
          className="py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold transition-colors"
        >
          3PT
        </button>
      </div>
      
      {/* Stat Buttons */}
      <div className="grid grid-cols-5 gap-1 text-xs">
        <button
          onClick={() => onStatUpdate(player, 'assist')}
          className="py-1.5 rounded bg-cyan-100 hover:bg-cyan-200 text-cyan-700 font-medium"
        >
          AST {player.assists || 0}
        </button>
        <button
          onClick={() => onStatUpdate(player, 'rebound')}
          className="py-1.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium"
        >
          REB {totalReb}
        </button>
        <button
          onClick={() => onStatUpdate(player, 'steal')}
          className="py-1.5 rounded bg-teal-100 hover:bg-teal-200 text-teal-700 font-medium"
        >
          STL {player.steals || 0}
        </button>
        <button
          onClick={() => onStatUpdate(player, 'block')}
          className="py-1.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium"
        >
          BLK {player.blocks || 0}
        </button>
        <button
          onClick={() => onStatUpdate(player, 'turnover')}
          className="py-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium"
        >
          TO {player.turnovers || 0}
        </button>
      </div>
      
      {/* Floor Toggle */}
      <button
        onClick={() => onToggleFloor(player)}
        className={`mt-2 w-full py-1.5 rounded text-xs font-medium transition-colors ${
          isOnFloor 
            ? 'bg-gray-200 hover:bg-gray-300 text-gray-600' 
            : 'bg-green-100 hover:bg-green-200 text-green-700'
        }`}
      >
        {isOnFloor ? 'Sub Out' : 'Sub In'}
      </button>
    </div>
  );
};

export default function DemoBasketballClassic() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [homeStats, setHomeStats] = useState([]);
  const [awayStats, setAwayStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockRunning, setClockRunning] = useState(false);
  const [clockTime, setClockTime] = useState(720);
  
  // Modal state
  const [shotModalOpen, setShotModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedShotType, setSelectedShotType] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  
  // Clock interval ref
  const clockRef = useRef(null);
  
  // Fetch demo game data
  useEffect(() => {
    const fetchDemoGame = async () => {
      try {
        const res = await axios.get(`${API}/demo/basketball/classic`);
        setGame(res.data);
        setHomeStats(res.data.home_player_stats || []);
        setAwayStats(res.data.away_player_stats || []);
        setClockTime(res.data.clock_time || 720);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load demo game:", error);
        toast.error("Failed to load demo");
        setLoading(false);
      }
    };
    fetchDemoGame();
  }, []);
  
  // Clock countdown
  useEffect(() => {
    if (clockRunning && clockTime > 0) {
      clockRef.current = setInterval(() => {
        setClockTime(prev => {
          if (prev <= 1) {
            setClockRunning(false);
            toast.info("Period ended!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [clockRunning]);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleShotClick = (player, shotType) => {
    setSelectedPlayer(player);
    setSelectedShotType(shotType);
    setShotModalOpen(true);
  };
  
  const handleShotMake = () => {
    if (!selectedPlayer || !selectedShotType) return;
    
    const isHome = homeStats.some(p => p.id === selectedPlayer.id);
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const updatedStats = statsArray.map(p => {
      if (p.id === selectedPlayer.id) {
        const newStats = { ...p };
        if (selectedShotType === 'ft') {
          newStats.ft_made = (newStats.ft_made || 0) + 1;
        } else if (selectedShotType === 'fg2') {
          newStats.fg2_made = (newStats.fg2_made || 0) + 1;
        } else if (selectedShotType === 'fg3') {
          newStats.fg3_made = (newStats.fg3_made || 0) + 1;
        }
        return newStats;
      }
      return p;
    });
    
    setStats(updatedStats);
    
    // Update score
    const points = selectedShotType === 'ft' ? 1 : selectedShotType === 'fg2' ? 2 : 3;
    setGame(prev => ({
      ...prev,
      [isHome ? 'home_score' : 'away_score']: (prev[isHome ? 'home_score' : 'away_score'] || 0) + points
    }));
    
    toast.success(`${selectedPlayer.player_name || selectedPlayer.name}: ${selectedShotType.toUpperCase()} Made!`);
    setShotModalOpen(false);
  };
  
  const handleShotMiss = () => {
    if (!selectedPlayer || !selectedShotType) return;
    
    const isHome = homeStats.some(p => p.id === selectedPlayer.id);
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const updatedStats = statsArray.map(p => {
      if (p.id === selectedPlayer.id) {
        const newStats = { ...p };
        if (selectedShotType === 'ft') {
          newStats.ft_missed = (newStats.ft_missed || 0) + 1;
        } else if (selectedShotType === 'fg2') {
          newStats.fg2_missed = (newStats.fg2_missed || 0) + 1;
        } else if (selectedShotType === 'fg3') {
          newStats.fg3_missed = (newStats.fg3_missed || 0) + 1;
        }
        return newStats;
      }
      return p;
    });
    
    setStats(updatedStats);
    toast.info(`${selectedPlayer.player_name || selectedPlayer.name}: ${selectedShotType.toUpperCase()} Missed`);
    setShotModalOpen(false);
  };
  
  const handleStatUpdate = (player, statType) => {
    const isHome = homeStats.some(p => p.id === player.id);
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const updatedStats = statsArray.map(p => {
      if (p.id === player.id) {
        const newStats = { ...p };
        switch (statType) {
          case 'assist':
            newStats.assists = (newStats.assists || 0) + 1;
            break;
          case 'rebound':
            newStats.defensive_rebounds = (newStats.defensive_rebounds || 0) + 1;
            break;
          case 'steal':
            newStats.steals = (newStats.steals || 0) + 1;
            break;
          case 'block':
            newStats.blocks = (newStats.blocks || 0) + 1;
            break;
          case 'turnover':
            newStats.turnovers = (newStats.turnovers || 0) + 1;
            break;
          case 'foul':
            newStats.fouls = (newStats.fouls || 0) + 1;
            break;
        }
        return newStats;
      }
      return p;
    });
    
    setStats(updatedStats);
    toast.success(`${player.player_name || player.name}: +1 ${statType}`);
  };
  
  const handleToggleFloor = (player) => {
    const isHome = homeStats.some(p => p.id === player.id);
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const currentOnFloor = statsArray.filter(p => p.onFloor).length;
    const isCurrentlyOnFloor = player.onFloor;
    
    if (!isCurrentlyOnFloor && currentOnFloor >= 5) {
      toast.error("Already 5 players on floor. Sub someone out first.");
      return;
    }
    
    const updatedStats = statsArray.map(p => {
      if (p.id === player.id) {
        return { ...p, onFloor: !p.onFloor };
      }
      return p;
    });
    
    setStats(updatedStats);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!game) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-gray-500">Failed to load demo game</p>
      </div>
    );
  }
  
  // Convert stats to player format expected by PlayerCard
  const formatPlayers = (stats) => stats.map(s => ({
    ...s,
    player_number: s.number || s.player_number,
    player_name: s.name || s.player_name,
    ft_made: s.ft_made || s.stats?.ftMade || 0,
    ft_missed: s.ft_missed || s.stats?.ftAttempted - s.stats?.ftMade || 0,
    fg2_made: s.fg2_made || s.stats?.fgMade || 0,
    fg2_missed: s.fg2_missed || 0,
    fg3_made: s.fg3_made || s.stats?.threePtMade || 0,
    fg3_missed: s.fg3_missed || 0,
    assists: s.assists || s.stats?.assists || 0,
    offensive_rebounds: s.offensive_rebounds || s.stats?.offRebounds || 0,
    defensive_rebounds: s.defensive_rebounds || s.stats?.defRebounds || 0,
    steals: s.steals || s.stats?.steals || 0,
    blocks: s.blocks || s.stats?.blocks || 0,
    turnovers: s.turnovers || s.stats?.turnovers || 0,
    fouls: s.fouls || s.stats?.fouls || 0,
    onFloor: s.onFloor
  }));
  
  const homePlayers = formatPlayers(homeStats);
  const awayPlayers = formatPlayers(awayStats);
  const homeOnFloor = homePlayers.filter(p => p.onFloor);
  const awayOnFloor = awayPlayers.filter(p => p.onFloor);
  
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Demo Mode Bar */}
      <DemoModeBar />
      
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/demo/basketball")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Demo • Classic Mode</p>
              <h1 className="font-bold text-lg">
                {game.home_team_name} vs {game.away_team_name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowEmbedDialog(true)}
            >
              <Code className="w-4 h-4 mr-2" />
              Embed
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/jumbotron/demo-classic', '_blank')}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Jumbotron
            </Button>
          </div>
        </div>
      </header>
      
      {/* Scoreboard */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 text-center">
              <div 
                className="inline-block px-8 py-4 rounded-xl"
                style={{ backgroundColor: `${game.home_team_color}15` }}
              >
                <p className="text-gray-500 text-xs uppercase mb-1">Home</p>
                <p className="font-bold text-xl mb-1" style={{ color: game.home_team_color }}>
                  {game.home_team_name}
                </p>
                <p className="text-6xl font-black" style={{ color: game.home_team_color }}>
                  {game.home_score}
                </p>
              </div>
            </div>
            
            {/* Clock & Period */}
            <div className="text-center px-8">
              <div className="text-5xl font-mono font-bold mb-2">
                {formatTime(clockTime)}
              </div>
              <div className="text-gray-500 mb-3">
                {game.period_label || `Q${game.period}`}
              </div>
              <Button
                size="lg"
                onClick={() => setClockRunning(!clockRunning)}
                className={clockRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
              >
                {clockRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
            </div>
            
            {/* Away Team */}
            <div className="flex-1 text-center">
              <div 
                className="inline-block px-8 py-4 rounded-xl"
                style={{ backgroundColor: `${game.away_team_color}15` }}
              >
                <p className="text-gray-500 text-xs uppercase mb-1">Away</p>
                <p className="font-bold text-xl mb-1" style={{ color: game.away_team_color }}>
                  {game.away_team_name}
                </p>
                <p className="text-6xl font-black" style={{ color: game.away_team_color }}>
                  {game.away_score}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Player Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Home Team */}
          <div>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: game.home_team_color }}
              />
              {game.home_team_name}
              <span className="text-gray-400 text-sm font-normal">({homeOnFloor.length} on floor)</span>
            </h2>
            <div className="space-y-3">
              {homePlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  teamColor={game.home_team_color}
                  onShotClick={handleShotClick}
                  onStatUpdate={handleStatUpdate}
                  isOnFloor={player.onFloor}
                  onToggleFloor={handleToggleFloor}
                />
              ))}
            </div>
          </div>
          
          {/* Away Team */}
          <div>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: game.away_team_color }}
              />
              {game.away_team_name}
              <span className="text-gray-400 text-sm font-normal">({awayOnFloor.length} on floor)</span>
            </h2>
            <div className="space-y-3">
              {awayPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  teamColor={game.away_team_color}
                  onShotClick={handleShotClick}
                  onStatUpdate={handleStatUpdate}
                  isOnFloor={player.onFloor}
                  onToggleFloor={handleToggleFloor}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Shot Modal */}
      <ShotModal
        isOpen={shotModalOpen}
        onClose={() => setShotModalOpen(false)}
        shotType={selectedShotType}
        playerName={selectedPlayer?.player_name || selectedPlayer?.name}
        onMake={handleShotMake}
        onMiss={handleShotMiss}
      />
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Live Stats</DialogTitle>
            <DialogDescription>
              Share this link to let others view live stats
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={`${window.location.origin}/live/demo-classic`}
                readOnly
              />
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/live/demo-classic`);
                  toast.success("Link copied!");
                }}
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              This is a demo. In a real game, viewers would see live updates.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Embed Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Add live stats to your website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm break-all">
              {`<iframe src="${window.location.origin}/embed/demo-classic" width="400" height="300" frameborder="0"></iframe>`}
            </div>
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed/demo-classic" width="400" height="300" frameborder="0"></iframe>`);
                toast.success("Embed code copied!");
              }}
              className="w-full"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Copy Embed Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

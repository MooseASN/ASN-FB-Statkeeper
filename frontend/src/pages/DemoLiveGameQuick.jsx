import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Play, Pause, Share2, Code, Monitor, Clipboard
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Demo Mode Bar
const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider shadow-lg">
    Demo Mode - Stats will not be saved
  </div>
);

// Simple Player Card - Scoring focused
const SimplePlayerCard = ({ player, teamColor, onScore }) => {
  const pts = (player.ft_made || 0) + ((player.fg2_made || 0) * 2) + ((player.fg3_made || 0) * 3);
  
  return (
    <div 
      className="rounded-xl p-4 bg-white shadow-sm border-l-4"
      style={{ borderColor: teamColor }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold" style={{ color: teamColor }}>
            #{player.player_number}
          </span>
          <span className="font-medium text-gray-800">{player.player_name}</span>
        </div>
        <div className="text-3xl font-black" style={{ color: teamColor }}>{pts}</div>
      </div>
      
      {/* Big Score Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onScore(player, 'ft', true)}
          className="py-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg transition-colors"
        >
          +1
        </button>
        <button
          onClick={() => onScore(player, 'fg2', true)}
          className="py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors"
        >
          +2
        </button>
        <button
          onClick={() => onScore(player, 'fg3', true)}
          className="py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg transition-colors"
        >
          +3
        </button>
      </div>
    </div>
  );
};

export default function DemoBasketballSimple() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [homeStats, setHomeStats] = useState([]);
  const [awayStats, setAwayStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockRunning, setClockRunning] = useState(false);
  const [clockTime, setClockTime] = useState(720);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const clockRef = useRef(null);
  
  useEffect(() => {
    const fetchDemoGame = async () => {
      try {
        const res = await axios.get(`${API}/demo/basketball/simple`);
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
  
  const handleScore = (player, shotType, made) => {
    const isHome = homeStats.some(p => p.id === player.id);
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const updatedStats = statsArray.map(p => {
      if (p.id === player.id) {
        const newStats = { ...p };
        if (shotType === 'ft') {
          newStats.ft_made = (newStats.ft_made || 0) + 1;
        } else if (shotType === 'fg2') {
          newStats.fg2_made = (newStats.fg2_made || 0) + 1;
        } else if (shotType === 'fg3') {
          newStats.fg3_made = (newStats.fg3_made || 0) + 1;
        }
        return newStats;
      }
      return p;
    });
    
    setStats(updatedStats);
    
    const points = shotType === 'ft' ? 1 : shotType === 'fg2' ? 2 : 3;
    setGame(prev => ({
      ...prev,
      [isHome ? 'home_score' : 'away_score']: (prev[isHome ? 'home_score' : 'away_score'] || 0) + points
    }));
    
    toast.success(`+${points} ${player.player_name || player.name}`);
  };
  
  if (loading || !game) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  const formatPlayers = (stats) => stats.map(s => ({
    ...s,
    player_number: s.number || s.player_number,
    player_name: s.name || s.player_name,
    ft_made: s.ft_made || 0,
    fg2_made: s.fg2_made || 0,
    fg3_made: s.fg3_made || 0,
  }));
  
  const homePlayers = formatPlayers(homeStats);
  const awayPlayers = formatPlayers(awayStats);
  
  return (
    <div className="min-h-screen bg-gray-100">
      <DemoModeBar />
      
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/demo/basketball")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Demo • Simple Mode</p>
              <h1 className="font-bold text-lg">{game.home_team_name} vs {game.away_team_name}</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </header>
      
      {/* Large Scoreboard */}
      <div className="bg-gradient-to-r from-orange-500 to-blue-500 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between text-white">
            <div className="text-center flex-1">
              <p className="text-white/80 text-sm uppercase mb-1">{game.home_team_name}</p>
              <p className="text-7xl font-black">{game.home_score}</p>
            </div>
            
            <div className="text-center px-8">
              <div className="text-4xl font-mono font-bold mb-2">{formatTime(clockTime)}</div>
              <div className="text-white/80 mb-3">Q{game.period}</div>
              <Button
                size="lg"
                onClick={() => setClockRunning(!clockRunning)}
                className={clockRunning ? "bg-white/20 hover:bg-white/30" : "bg-white/20 hover:bg-white/30"}
              >
                {clockRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
            </div>
            
            <div className="text-center flex-1">
              <p className="text-white/80 text-sm uppercase mb-1">{game.away_team_name}</p>
              <p className="text-7xl font-black">{game.away_score}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Player Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Home Team */}
          <div>
            <h2 className="font-bold text-lg mb-4" style={{ color: game.home_team_color }}>
              {game.home_team_name}
            </h2>
            <div className="space-y-3">
              {homePlayers.slice(0, 5).map(player => (
                <SimplePlayerCard
                  key={player.id}
                  player={player}
                  teamColor={game.home_team_color}
                  onScore={handleScore}
                />
              ))}
            </div>
          </div>
          
          {/* Away Team */}
          <div>
            <h2 className="font-bold text-lg mb-4" style={{ color: game.away_team_color }}>
              {game.away_team_name}
            </h2>
            <div className="space-y-3">
              {awayPlayers.slice(0, 5).map(player => (
                <SimplePlayerCard
                  key={player.id}
                  player={player}
                  teamColor={game.away_team_color}
                  onScore={handleScore}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Live Stats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={`${window.location.origin}/live/demo-simple`} readOnly />
            <Button onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/live/demo-simple`);
              toast.success("Link copied!");
            }} className="w-full">
              <Clipboard className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Play, Pause, Share2, Code, Monitor, Clipboard, X, FileDown
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Demo Mode Bar
const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider shadow-lg">
    Demo Mode - Stats will not be saved
  </div>
);

export default function DemoBasketballAdvanced() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [homeStats, setHomeStats] = useState([]);
  const [awayStats, setAwayStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockRunning, setClockRunning] = useState(false);
  const [clockTime, setClockTime] = useState(720);
  const [selectedTeam, setSelectedTeam] = useState("home");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playByPlay, setPlayByPlay] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showShotModal, setShowShotModal] = useState(false);
  const [shotType, setShotType] = useState(null);
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [pendingShot, setPendingShot] = useState(null);
  
  const clockRef = useRef(null);
  
  useEffect(() => {
    const fetchDemoGame = async () => {
      try {
        const res = await axios.get(`${API}/demo/basketball/advanced`);
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
  
  const formatPlayers = (stats) => stats.map(s => ({
    ...s,
    player_number: s.number || s.player_number,
    player_name: s.name || s.player_name,
    ft_made: s.ft_made || 0,
    fg2_made: s.fg2_made || 0,
    fg3_made: s.fg3_made || 0,
    assists: s.assists || 0,
    offensive_rebounds: s.offensive_rebounds || 0,
    defensive_rebounds: s.defensive_rebounds || 0,
    steals: s.steals || 0,
    blocks: s.blocks || 0,
    turnovers: s.turnovers || 0,
    fouls: s.fouls || 0,
  }));
  
  const handleShotClick = (type) => {
    if (!selectedPlayer) {
      toast.error("Select a player first");
      return;
    }
    setShotType(type);
    setShowShotModal(true);
  };
  
  const handleShotMake = () => {
    if (!selectedPlayer || !shotType) return;
    
    const isHome = selectedTeam === "home";
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const updatedStats = statsArray.map(p => {
      if (p.id === selectedPlayer.id) {
        const newStats = { ...p };
        if (shotType === 'ft') newStats.ft_made = (newStats.ft_made || 0) + 1;
        else if (shotType === 'fg2') newStats.fg2_made = (newStats.fg2_made || 0) + 1;
        else if (shotType === 'fg3') newStats.fg3_made = (newStats.fg3_made || 0) + 1;
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
    
    // For 2PT and 3PT, ask for assist
    if (shotType !== 'ft') {
      setPendingShot({ player: selectedPlayer, type: shotType, points });
      setShowShotModal(false);
      setShowAssistModal(true);
    } else {
      addPlayByPlay(`${selectedPlayer.player_name || selectedPlayer.name} made FT`);
      setShowShotModal(false);
    }
  };
  
  const handleShotMiss = () => {
    if (!selectedPlayer || !shotType) return;
    
    const isHome = selectedTeam === "home";
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const updatedStats = statsArray.map(p => {
      if (p.id === selectedPlayer.id) {
        const newStats = { ...p };
        if (shotType === 'ft') newStats.ft_missed = (newStats.ft_missed || 0) + 1;
        else if (shotType === 'fg2') newStats.fg2_missed = (newStats.fg2_missed || 0) + 1;
        else if (shotType === 'fg3') newStats.fg3_missed = (newStats.fg3_missed || 0) + 1;
        return newStats;
      }
      return p;
    });
    
    setStats(updatedStats);
    addPlayByPlay(`${selectedPlayer.player_name || selectedPlayer.name} missed ${shotType.toUpperCase()}`);
    setShowShotModal(false);
  };
  
  const handleAssistSelect = (assister) => {
    if (pendingShot && assister) {
      const isHome = selectedTeam === "home";
      const statsArray = isHome ? homeStats : awayStats;
      const setStats = isHome ? setHomeStats : setAwayStats;
      
      const updatedStats = statsArray.map(p => {
        if (p.id === assister.id) {
          return { ...p, assists: (p.assists || 0) + 1 };
        }
        return p;
      });
      
      setStats(updatedStats);
      addPlayByPlay(`${pendingShot.player.player_name || pendingShot.player.name} made ${pendingShot.type.toUpperCase()} (assist: ${assister.player_name || assister.name})`);
    } else if (pendingShot) {
      addPlayByPlay(`${pendingShot.player.player_name || pendingShot.player.name} made ${pendingShot.type.toUpperCase()} (unassisted)`);
    }
    setPendingShot(null);
    setShowAssistModal(false);
  };
  
  const handleStatUpdate = (stat) => {
    if (!selectedPlayer) {
      toast.error("Select a player first");
      return;
    }
    
    const isHome = selectedTeam === "home";
    const statsArray = isHome ? homeStats : awayStats;
    const setStats = isHome ? setHomeStats : setAwayStats;
    
    const updatedStats = statsArray.map(p => {
      if (p.id === selectedPlayer.id) {
        return { ...p, [stat]: (p[stat] || 0) + 1 };
      }
      return p;
    });
    
    setStats(updatedStats);
    addPlayByPlay(`${selectedPlayer.player_name || selectedPlayer.name}: +1 ${stat}`);
    toast.success(`+1 ${stat}`);
  };
  
  const addPlayByPlay = (text) => {
    setPlayByPlay(prev => [{
      time: formatTime(clockTime),
      period: game?.period || 1,
      text,
      timestamp: Date.now()
    }, ...prev]);
  };
  
  if (loading || !game) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  const homePlayers = formatPlayers(homeStats);
  const awayPlayers = formatPlayers(awayStats);
  const currentPlayers = selectedTeam === "home" ? homePlayers : awayPlayers;
  const currentTeamColor = selectedTeam === "home" ? game.home_team_color : game.away_team_color;
  const currentTeamName = selectedTeam === "home" ? game.home_team_name : game.away_team_name;
  
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <DemoModeBar />
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/demo/basketball")} className="text-white hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Demo • Advanced Mode</p>
              <h1 className="font-bold text-lg">{game.home_team_name} vs {game.away_team_name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <FileDown className="w-4 h-4 mr-2" />
              Box Score
            </Button>
          </div>
        </div>
      </header>
      
      {/* Scoreboard */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Home */}
          <button
            onClick={() => setSelectedTeam("home")}
            className={`flex-1 p-4 rounded-lg transition-all ${selectedTeam === "home" ? "ring-2 ring-orange-500" : ""}`}
            style={{ backgroundColor: `${game.home_team_color}20` }}
          >
            <p className="text-slate-400 text-xs uppercase">Home</p>
            <p className="font-bold text-lg">{game.home_team_name}</p>
            <p className="text-4xl font-black">{game.home_score}</p>
          </button>
          
          {/* Clock */}
          <div className="px-8 text-center">
            <div className="text-4xl font-mono font-bold mb-2">{formatTime(clockTime)}</div>
            <div className="text-slate-400 mb-2">Q{game.period}</div>
            <Button
              onClick={() => setClockRunning(!clockRunning)}
              className={clockRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            >
              {clockRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Away */}
          <button
            onClick={() => setSelectedTeam("away")}
            className={`flex-1 p-4 rounded-lg transition-all text-right ${selectedTeam === "away" ? "ring-2 ring-orange-500" : ""}`}
            style={{ backgroundColor: `${game.away_team_color}20` }}
          >
            <p className="text-slate-400 text-xs uppercase">Away</p>
            <p className="font-bold text-lg">{game.away_team_name}</p>
            <p className="text-4xl font-black">{game.away_score}</p>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Player Selection */}
          <div className="col-span-3">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentTeamColor }} />
                {currentTeamName}
              </h3>
              <div className="space-y-1">
                {currentPlayers.slice(0, 10).map(player => {
                  const pts = (player.ft_made || 0) + ((player.fg2_made || 0) * 2) + ((player.fg3_made || 0) * 3);
                  return (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`w-full p-2 rounded text-left text-sm transition-all flex justify-between ${
                        selectedPlayer?.id === player.id ? "bg-orange-500" : "bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      <span>#{player.player_number} {player.player_name}</span>
                      <span className="font-bold">{pts}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="col-span-5">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3">
                {selectedPlayer ? `#${selectedPlayer.player_number} ${selectedPlayer.player_name}` : "Select a Player"}
              </h3>
              
              {/* Shots */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={() => handleShotClick('ft')} disabled={!selectedPlayer}
                  className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 rounded-lg font-bold">FT</button>
                <button onClick={() => handleShotClick('fg2')} disabled={!selectedPlayer}
                  className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 rounded-lg font-bold">2PT</button>
                <button onClick={() => handleShotClick('fg3')} disabled={!selectedPlayer}
                  className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-bold">3PT</button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handleStatUpdate('defensive_rebounds')} disabled={!selectedPlayer}
                  className="p-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 rounded text-sm font-medium">REB</button>
                <button onClick={() => handleStatUpdate('steals')} disabled={!selectedPlayer}
                  className="p-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-700 rounded text-sm font-medium">STL</button>
                <button onClick={() => handleStatUpdate('blocks')} disabled={!selectedPlayer}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 rounded text-sm font-medium">BLK</button>
                <button onClick={() => handleStatUpdate('turnovers')} disabled={!selectedPlayer}
                  className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 rounded text-sm font-medium">TO</button>
              </div>
            </div>
          </div>
          
          {/* Play-by-Play */}
          <div className="col-span-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Play-by-Play</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {playByPlay.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No plays recorded</p>
                  ) : (
                    playByPlay.map((play, idx) => (
                      <div key={idx} className="text-sm p-2 bg-slate-700/50 rounded">
                        <span className="text-slate-400 font-mono">{play.time}</span>
                        <span className="text-slate-500 mx-2">Q{play.period}</span>
                        <span className="text-white">{play.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
      
      {/* Shot Modal */}
      {showShotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShotModal(false)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">{shotType === 'ft' ? 'Free Throw' : shotType === 'fg2' ? '2-Point Shot' : '3-Point Shot'}</h3>
              <button onClick={() => setShowShotModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-400 mb-4">{selectedPlayer?.player_name}</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleShotMake} className="py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xl">MAKE</button>
              <button onClick={handleShotMiss} className="py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-xl">MISS</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Assist Modal */}
      {showAssistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => handleAssistSelect(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Who assisted?</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {currentPlayers.filter(p => p.id !== selectedPlayer?.id).slice(0, 8).map(player => (
                <button
                  key={player.id}
                  onClick={() => handleAssistSelect(player)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                >
                  #{player.player_number} {player.player_name?.split(' ')[0]}
                </button>
              ))}
            </div>
            <button onClick={() => handleAssistSelect(null)} className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded">
              No Assist (Unassisted)
            </button>
          </div>
        </div>
      )}
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader><DialogTitle>Share Live Stats</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={`${window.location.origin}/live/demo-advanced`} readOnly className="bg-slate-900 border-slate-600" />
            <Button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/live/demo-advanced`); toast.success("Copied!"); }} className="w-full">
              <Clipboard className="w-4 h-4 mr-2" />Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

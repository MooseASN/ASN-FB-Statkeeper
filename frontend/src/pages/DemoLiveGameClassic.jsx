import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Share2, FileDown, Copy, Check, Undo2, X, Plus, Code, RotateCcw, Play, Pause, ChevronUp, ChevronDown, Monitor } from "lucide-react";
import { basketballDemoTeams, createBasketballDemoGame, initializeBasketballPlayerStats } from "@/data/demoData";
import { DemoModeBar } from "./BasketballDemoSelector";

// Demo Live Game - Classic Mode
export default function DemoLiveGameClassic() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("home");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showShotModal, setShowShotModal] = useState(false);
  const [shotType, setShotType] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [clockRunning, setClockRunning] = useState(false);
  const [clockTime, setClockTime] = useState(720); // 12 minutes

  // Initialize demo game
  useEffect(() => {
    const demoGame = createBasketballDemoGame();
    // Set starting 5 for each team
    demoGame.home_players[0].onFloor = true;
    demoGame.home_players[1].onFloor = true;
    demoGame.home_players[2].onFloor = true;
    demoGame.home_players[3].onFloor = true;
    demoGame.home_players[4].onFloor = true;
    demoGame.away_players[0].onFloor = true;
    demoGame.away_players[1].onFloor = true;
    demoGame.away_players[2].onFloor = true;
    demoGame.away_players[3].onFloor = true;
    demoGame.away_players[4].onFloor = true;
    setGame(demoGame);
  }, []);

  // Clock countdown
  useEffect(() => {
    let interval;
    if (clockRunning && clockTime > 0) {
      interval = setInterval(() => {
        setClockTime(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockRunning, clockTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStatAction = (statType) => {
    if (!selectedPlayer) {
      toast.error("Select a player first");
      return;
    }

    if (["ft", "fg2", "fg3"].includes(statType)) {
      setShotType(statType);
      setShowShotModal(true);
      return;
    }

    updatePlayerStat(statType, 1);
  };

  const updatePlayerStat = (statType, value) => {
    if (!selectedPlayer || !game) return;

    const teamKey = selectedTeam === "home" ? "home_players" : "away_players";
    const updatedPlayers = game[teamKey].map(p => {
      if (p.id === selectedPlayer.id) {
        const newStats = { ...p.stats };
        
        switch (statType) {
          case "points":
            newStats.points += value;
            break;
          case "fgMade":
            newStats.fgMade += 1;
            newStats.fgAttempted += 1;
            newStats.points += 2;
            break;
          case "fgMiss":
            newStats.fgAttempted += 1;
            break;
          case "threePtMade":
            newStats.threePtMade += 1;
            newStats.threePtAttempted += 1;
            newStats.points += 3;
            break;
          case "threePtMiss":
            newStats.threePtAttempted += 1;
            break;
          case "ftMade":
            newStats.ftMade += 1;
            newStats.ftAttempted += 1;
            newStats.points += 1;
            break;
          case "ftMiss":
            newStats.ftAttempted += 1;
            break;
          case "assist":
            newStats.assists += 1;
            break;
          case "rebound":
            newStats.defRebounds += 1;
            break;
          case "steal":
            newStats.steals += 1;
            break;
          case "block":
            newStats.blocks += 1;
            break;
          case "turnover":
            newStats.turnovers += 1;
            break;
          case "foul":
            newStats.fouls += 1;
            break;
          default:
            break;
        }

        return { ...p, stats: newStats };
      }
      return p;
    });

    // Update scores
    let homeScore = game.home_score;
    let awayScore = game.away_score;
    
    if (["fgMade", "threePtMade", "ftMade"].includes(statType)) {
      const pointsToAdd = statType === "threePtMade" ? 3 : statType === "fgMade" ? 2 : 1;
      if (selectedTeam === "home") {
        homeScore += pointsToAdd;
      } else {
        awayScore += pointsToAdd;
      }
    }

    setGame({
      ...game,
      [teamKey]: updatedPlayers,
      home_score: homeScore,
      away_score: awayScore
    });

    // Add to action history
    setActionHistory(prev => [{
      player: selectedPlayer.name,
      action: statType,
      team: selectedTeam,
      timestamp: Date.now()
    }, ...prev.slice(0, 49)]);

    toast.success(`${selectedPlayer.name}: ${statType}`);
  };

  const handleShotMake = () => {
    if (shotType === "ft") updatePlayerStat("ftMade", 1);
    else if (shotType === "fg2") updatePlayerStat("fgMade", 1);
    else if (shotType === "fg3") updatePlayerStat("threePtMade", 1);
    setShowShotModal(false);
    setShotType(null);
  };

  const handleShotMiss = () => {
    if (shotType === "ft") updatePlayerStat("ftMiss", 1);
    else if (shotType === "fg2") updatePlayerStat("fgMiss", 1);
    else if (shotType === "fg3") updatePlayerStat("threePtMiss", 1);
    setShowShotModal(false);
    setShotType(null);
  };

  const undoLastAction = () => {
    if (actionHistory.length === 0) return;
    toast.info("Undo not available in demo mode");
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPlayers = selectedTeam === "home" ? game.home_players : game.away_players;
  const playersOnFloor = currentPlayers.filter(p => p.onFloor);
  const teamColor = selectedTeam === "home" ? game.home_team_color : game.away_team_color;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Demo Mode Bar */}
      <DemoModeBar />

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/demo/basketball")}
              className="text-white hover:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Demo • Classic Mode</p>
              <h1 className="text-white font-bold">
                {game.home_team_name} vs {game.away_team_name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowEmbedDialog(true)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Code className="w-4 h-4 mr-2" />
              Embed
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/jumbotron/demo-basketball`, '_blank')}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Jumbotron
            </Button>
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="bg-slate-800 px-4 py-4 border-b border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div 
              className={`flex-1 p-4 rounded-lg cursor-pointer transition-all ${
                selectedTeam === "home" ? "ring-2 ring-orange-500" : ""
              }`}
              style={{ backgroundColor: `${game.home_team_color}20` }}
              onClick={() => setSelectedTeam("home")}
            >
              <p className="text-slate-400 text-xs uppercase mb-1">Home</p>
              <p className="text-white font-bold text-lg">{game.home_team_name}</p>
              <p className="text-5xl font-black text-white">{game.home_score}</p>
            </div>

            {/* Clock & Period */}
            <div className="px-8 text-center">
              <div className="text-4xl font-mono font-bold text-white mb-2">
                {formatTime(clockTime)}
              </div>
              <div className="text-slate-400 text-sm mb-2">Q{game.period}</div>
              <Button
                size="sm"
                variant={clockRunning ? "destructive" : "default"}
                onClick={() => setClockRunning(!clockRunning)}
                className={clockRunning ? "" : "bg-green-600 hover:bg-green-700"}
              >
                {clockRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>

            {/* Away Team */}
            <div 
              className={`flex-1 p-4 rounded-lg cursor-pointer transition-all text-right ${
                selectedTeam === "away" ? "ring-2 ring-orange-500" : ""
              }`}
              style={{ backgroundColor: `${game.away_team_color}20` }}
              onClick={() => setSelectedTeam("away")}
            >
              <p className="text-slate-400 text-xs uppercase mb-1">Away</p>
              <p className="text-white font-bold text-lg">{game.away_team_name}</p>
              <p className="text-5xl font-black text-white">{game.away_score}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Players on Floor */}
          <div className="col-span-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: teamColor }}
                />
                {selectedTeam === "home" ? game.home_team_name : game.away_team_name} - On Floor
              </h3>
              <div className="space-y-2">
                {playersOnFloor.map(player => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedPlayer?.id === player.id
                        ? "bg-orange-500 text-white"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg w-8">#{player.number}</span>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <span className="font-bold">{player.stats.points} pts</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stat Buttons */}
          <div className="col-span-5">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4">
                {selectedPlayer ? `Recording for #${selectedPlayer.number} ${selectedPlayer.name}` : "Select a player"}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleStatAction("fg2")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  2PT
                </button>
                <button
                  onClick={() => handleStatAction("fg3")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  3PT
                </button>
                <button
                  onClick={() => handleStatAction("ft")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  FT
                </button>
                <button
                  onClick={() => handleStatAction("assist")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  AST
                </button>
                <button
                  onClick={() => handleStatAction("rebound")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  REB
                </button>
                <button
                  onClick={() => handleStatAction("steal")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  STL
                </button>
                <button
                  onClick={() => handleStatAction("block")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  BLK
                </button>
                <button
                  onClick={() => handleStatAction("turnover")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  TO
                </button>
                <button
                  onClick={() => handleStatAction("foul")}
                  disabled={!selectedPlayer}
                  className="p-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  FOUL
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={undoLastAction}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo
                </Button>
              </div>
            </div>
          </div>

          {/* Action History */}
          <div className="col-span-3">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4">Recent Actions</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {actionHistory.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No actions yet</p>
                  ) : (
                    actionHistory.map((action, idx) => (
                      <div key={idx} className="text-sm p-2 bg-slate-700/50 rounded">
                        <span className="text-white font-medium">{action.player}</span>
                        <span className="text-slate-400"> - {action.action}</span>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-white">
                {shotType === "ft" ? "Free Throw" : shotType === "fg2" ? "2-Point Shot" : "3-Point Shot"}
              </h3>
              <button onClick={() => setShowShotModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 mb-6">{selectedPlayer?.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleShotMake}
                className="py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl rounded-xl transition-colors"
              >
                MAKE
              </button>
              <button
                onClick={handleShotMiss}
                className="py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-bold text-xl rounded-xl transition-colors"
              >
                MISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Share Live Stats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Share Link</Label>
              <div className="flex gap-2 mt-2">
                <Input 
                  value={`${window.location.origin}/live/demo-basketball`}
                  readOnly
                  className="bg-slate-900 border-slate-600 text-white"
                />
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/live/demo-basketball`);
                    toast.success("Link copied!");
                  }}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              This is a demo link. In a real game, this would show live stats to viewers.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Embed this on your website</Label>
              <div className="mt-2 p-3 bg-slate-900 rounded-lg font-mono text-sm text-slate-300 break-all">
                {`<iframe src="${window.location.origin}/embed/demo-basketball" width="400" height="300" frameborder="0"></iframe>`}
              </div>
            </div>
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed/demo-basketball" width="400" height="300" frameborder="0"></iframe>`);
                toast.success("Embed code copied!");
              }}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Embed Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

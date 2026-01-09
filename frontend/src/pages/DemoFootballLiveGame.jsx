import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Share2, Code, Monitor, Play, Pause, ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
import { footballDemoTeams, createFootballDemoGame } from "@/data/demoData";

// Demo Mode Bar
const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider">
    Demo Mode
  </div>
);

export default function DemoFootballLiveGame() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [clockTime, setClockTime] = useState(900); // 15 minutes
  const [clockRunning, setClockRunning] = useState(false);
  const [possession, setPossession] = useState("home");
  const [down, setDown] = useState(1);
  const [distance, setDistance] = useState(10);
  const [ballPosition, setBallPosition] = useState(25);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [playLog, setPlayLog] = useState([]);
  const [showPlayDialog, setShowPlayDialog] = useState(false);
  const [selectedPlayType, setSelectedPlayType] = useState(null);

  // Initialize demo game
  useEffect(() => {
    const demoGame = createFootballDemoGame();
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

  const getYardLineText = () => {
    if (ballPosition === 50) return "50";
    if (possession === "home") {
      return ballPosition <= 50 ? `OWN ${ballPosition}` : `OPP ${100 - ballPosition}`;
    } else {
      return ballPosition <= 50 ? `OPP ${ballPosition}` : `OWN ${100 - ballPosition}`;
    }
  };

  const handlePlay = (type, yards) => {
    let newPosition = possession === "home" ? ballPosition + yards : ballPosition - yards;
    newPosition = Math.max(0, Math.min(100, newPosition));

    // Check for touchdown
    if ((possession === "home" && newPosition >= 100) || (possession === "away" && newPosition <= 0)) {
      toast.success("TOUCHDOWN!");
      setGame(prev => ({
        ...prev,
        [possession === "home" ? "home_score" : "away_score"]: prev[possession === "home" ? "home_score" : "away_score"] + 6
      }));
      setBallPosition(25);
      setDown(1);
      setDistance(10);
      setPossession(possession === "home" ? "away" : "home");
      return;
    }

    // Check for first down
    const yardsGained = possession === "home" ? newPosition - ballPosition : ballPosition - newPosition;
    if (yardsGained >= distance) {
      setDown(1);
      setDistance(10);
      toast.success("First Down!");
    } else {
      if (down >= 4) {
        // Turnover on downs
        toast.info("Turnover on Downs");
        setPossession(possession === "home" ? "away" : "home");
        setDown(1);
        setDistance(10);
      } else {
        setDown(prev => prev + 1);
        setDistance(prev => Math.max(0, prev - yardsGained));
      }
    }

    setBallPosition(newPosition);
    setPlayLog(prev => [{
      type,
      yards: yardsGained,
      down,
      distance,
      position: getYardLineText(),
      timestamp: Date.now()
    }, ...prev.slice(0, 49)]);
    setShowPlayDialog(false);
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const homeColor = game.home_team_color;
  const awayColor = game.away_team_color;

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
              onClick={() => navigate("/")}
              className="text-white hover:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Demo • Football</p>
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
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="bg-slate-800 px-4 py-6 border-b border-slate-700">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 text-center">
              <div 
                className="inline-block px-6 py-3 rounded-lg"
                style={{ backgroundColor: `${homeColor}30` }}
              >
                <p className="text-slate-400 text-xs uppercase mb-1">Home</p>
                <p className="text-white font-bold text-xl mb-1">{game.home_team_name}</p>
                <p className="text-6xl font-black text-white">{game.home_score}</p>
                {possession === "home" && (
                  <span className="inline-block mt-2 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                    POSSESSION
                  </span>
                )}
              </div>
            </div>

            {/* Clock & Game Info */}
            <div className="px-8 text-center">
              <div className="text-5xl font-mono font-bold text-white mb-2">
                {formatTime(clockTime)}
              </div>
              <div className="text-slate-400 text-lg mb-3">Q{game.quarter}</div>
              <Button
                size="lg"
                variant={clockRunning ? "destructive" : "default"}
                onClick={() => setClockRunning(!clockRunning)}
                className={clockRunning ? "" : "bg-green-600 hover:bg-green-700"}
              >
                {clockRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              
              {/* Down & Distance */}
              <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                <p className="text-2xl font-bold text-white">
                  {down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : "4th"} & {distance}
                </p>
                <p className="text-slate-400">Ball on {getYardLineText()}</p>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center">
              <div 
                className="inline-block px-6 py-3 rounded-lg"
                style={{ backgroundColor: `${awayColor}30` }}
              >
                <p className="text-slate-400 text-xs uppercase mb-1">Away</p>
                <p className="text-white font-bold text-xl mb-1">{game.away_team_name}</p>
                <p className="text-6xl font-black text-white">{game.away_score}</p>
                {possession === "away" && (
                  <span className="inline-block mt-2 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                    POSSESSION
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Visualization */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-green-800 rounded-xl p-4 relative h-24 overflow-hidden">
          {/* Yard lines */}
          <div className="absolute inset-0 flex">
            {[0, 10, 20, 30, 40, 50, 40, 30, 20, 10, 0].map((yard, idx) => (
              <div key={idx} className="flex-1 border-r border-white/20 flex items-end justify-center pb-1">
                <span className="text-white/40 text-xs">{yard}</span>
              </div>
            ))}
          </div>
          {/* Ball position */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full shadow-lg transition-all duration-300"
            style={{ left: `${ballPosition}%` }}
          />
          {/* End zones */}
          <div className="absolute left-0 top-0 bottom-0 w-[9%] bg-red-700/50 flex items-center justify-center">
            <span className="text-white/50 text-xs font-bold rotate-90">END ZONE</span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-[9%] bg-purple-700/50 flex items-center justify-center">
            <span className="text-white/50 text-xs font-bold -rotate-90">END ZONE</span>
          </div>
        </div>
      </div>

      {/* Play Buttons */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-4">
          <Button
            onClick={() => { setSelectedPlayType("run"); setShowPlayDialog(true); }}
            className="h-20 bg-green-600 hover:bg-green-700 text-white font-bold text-lg"
          >
            RUN
          </Button>
          <Button
            onClick={() => { setSelectedPlayType("pass"); setShowPlayDialog(true); }}
            className="h-20 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg"
          >
            PASS
          </Button>
          <Button
            onClick={() => handlePlay("punt", -40)}
            className="h-20 bg-amber-600 hover:bg-amber-700 text-white font-bold text-lg"
          >
            PUNT
          </Button>
          <Button
            onClick={() => {
              toast.success("Field Goal Attempt!");
              if (Math.random() > 0.3) {
                setGame(prev => ({
                  ...prev,
                  [possession === "home" ? "home_score" : "away_score"]: prev[possession === "home" ? "home_score" : "away_score"] + 3
                }));
                toast.success("Field Goal GOOD!");
              } else {
                toast.error("Field Goal MISSED!");
              }
              setBallPosition(possession === "home" ? 25 : 75);
              setPossession(possession === "home" ? "away" : "home");
              setDown(1);
              setDistance(10);
            }}
            className="h-20 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg"
          >
            FIELD GOAL
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Button
            onClick={() => setPossession(possession === "home" ? "away" : "home")}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Switch Possession
          </Button>
          <Button
            onClick={() => {
              setDown(1);
              setDistance(10);
            }}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Reset Down
          </Button>
        </div>
      </div>

      {/* Play Log */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Play Log</h3>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {playLog.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No plays recorded yet</p>
              ) : (
                playLog.map((play, idx) => (
                  <div key={idx} className="text-sm p-2 bg-slate-700/50 rounded flex justify-between">
                    <span className="text-white font-medium">{play.type.toUpperCase()}</span>
                    <span className="text-slate-400">
                      {play.yards > 0 ? "+" : ""}{play.yards} yards • {play.down}&{play.distance} at {play.position}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Play Dialog */}
      <Dialog open={showPlayDialog} onOpenChange={setShowPlayDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{selectedPlayType === "run" ? "Run Play" : "Pass Play"} - Select Yards</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {[-5, -2, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 30, 50].map(yards => (
              <Button
                key={yards}
                onClick={() => handlePlay(selectedPlayType, yards)}
                variant={yards < 0 ? "destructive" : "default"}
                className={yards >= 0 ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {yards > 0 ? `+${yards}` : yards}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => handlePlay(selectedPlayType, 0)}
            variant="outline"
            className="w-full mt-2 border-slate-600"
          >
            Incomplete / No Gain
          </Button>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Share Live Stats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              This is a demo. In a real game, you can share live stats with viewers.
            </p>
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/live/demo-football`);
                toast.success("Link copied!");
              }}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Share Link
            </Button>
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
            <div className="p-3 bg-slate-900 rounded-lg font-mono text-sm text-slate-300 break-all">
              {`<iframe src="${window.location.origin}/embed/demo-football" width="400" height="300" frameborder="0"></iframe>`}
            </div>
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed/demo-football" width="400" height="300" frameborder="0"></iframe>`);
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

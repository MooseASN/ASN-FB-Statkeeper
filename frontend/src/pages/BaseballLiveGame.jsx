import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronUp, 
  ChevronDown, 
  Share2, 
  FileText,
  RotateCcw,
  Settings,
  Users,
  ArrowLeft
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Demo Mode Bar Component
const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider shadow-lg">
    Demo Mode - Stats will not be saved
  </div>
);

// Ball/Strike/Out Indicator Component
const CountIndicator = ({ label, count, maxCount, activeColor, inactiveColor = "bg-zinc-700" }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
    <div className="flex gap-1">
      {Array.from({ length: maxCount }).map((_, i) => (
        <div 
          key={i} 
          className={`w-4 h-4 rounded-full ${i < count ? activeColor : inactiveColor}`}
        />
      ))}
    </div>
  </div>
);

// Scoreboard Component
const Scoreboard = ({ game, onInningChange }) => {
  const innings = game?.inning_scores || { home: [], away: [] };
  const totalInnings = game?.total_innings || 9;
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      {/* Team Scores */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div 
            className="w-4 h-8 rounded"
            style={{ backgroundColor: game?.away_team_color || "#3b82f6" }}
          />
          <span className="text-xl font-bold text-white">{game?.away_team_name || "Away"}</span>
          <span className="text-3xl font-bold text-white">{game?.away_score || 0}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent ${game?.inning_half === 'top' ? 'border-b-yellow-500' : 'border-b-zinc-600'}`} />
            <span className="text-2xl font-bold text-yellow-500">{game?.current_inning || 1}</span>
            <div className={`w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent ${game?.inning_half === 'bottom' ? 'border-t-yellow-500' : 'border-t-zinc-600'}`} />
          </div>
          <span className="text-xs text-zinc-500 uppercase">{game?.inning_half === 'top' ? 'Top' : 'Bottom'}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold text-white">{game?.home_score || 0}</span>
          <span className="text-xl font-bold text-white">{game?.home_team_name || "Home"}</span>
          <div 
            className="w-4 h-8 rounded"
            style={{ backgroundColor: game?.home_team_color || "#f97316" }}
          />
        </div>
      </div>
      
      {/* Count Indicators */}
      <div className="flex justify-center gap-8">
        <CountIndicator label="Balls" count={game?.balls || 0} maxCount={4} activeColor="bg-green-500" />
        <CountIndicator label="Strikes" count={game?.strikes || 0} maxCount={3} activeColor="bg-red-500" />
        <CountIndicator label="Outs" count={game?.outs || 0} maxCount={3} activeColor="bg-yellow-500" />
      </div>
    </div>
  );
};

// Current Batter/Pitcher Info Component
const CurrentPlayerInfo = ({ batter, pitcher, batterStats, pitcherStats }) => (
  <div className="flex gap-4 mb-4">
    {/* At Bat */}
    <div className="flex-1 bg-blue-600 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-blue-200 uppercase">At Bat</span>
          <div className="text-white font-bold">
            #{batter?.player_number || "?"} {batter?.player_name || "No Batter"}
          </div>
        </div>
        <div className="text-right text-sm text-blue-100">
          <div>Today: {batterStats?.hits || 0}-{batterStats?.at_bats || 0}</div>
          <div>{batterStats?.hits || 0} H, {batterStats?.strikeouts_batting || 0} K</div>
        </div>
      </div>
    </div>
    
    {/* Pitching */}
    <div className="flex-1 bg-red-600 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-red-200 uppercase">Pitching</span>
          <div className="text-white font-bold">
            #{pitcher?.player_number || "?"} {pitcher?.player_name || "No Pitcher"}
          </div>
        </div>
        <div className="text-right text-sm text-red-100">
          <div>Today: {pitcherStats?.pitches_thrown || 0} P</div>
          <div>{pitcherStats?.strikeouts_pitching || 0} K, {pitcherStats?.earned_runs || 0} ER</div>
        </div>
      </div>
    </div>
  </div>
);

// Baseball Diamond Component
const BaseballDiamond = ({ bases, fieldingPositions }) => {
  const positions = {
    pitcher: { top: '55%', left: '50%' },
    catcher: { top: '88%', left: '50%' },
    first: { top: '58%', left: '78%' },
    second: { top: '32%', left: '50%' },
    third: { top: '58%', left: '22%' },
    shortstop: { top: '45%', left: '35%' },
    left: { top: '12%', left: '18%' },
    center: { top: '5%', left: '50%' },
    right: { top: '12%', left: '82%' },
  };
  
  return (
    <div className="relative w-full aspect-square max-w-md mx-auto overflow-hidden rounded-t-full">
      {/* Outfield grass with realistic gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a5f2a 0%, #228b22 30%, #2d8c3e 60%, #1e7a32 100%)'
        }}
      />
      
      {/* Grass mowing pattern stripes */}
      <div className="absolute inset-0" style={{ opacity: 0.15 }}>
        {[...Array(12)].map((_, i) => (
          <div 
            key={i}
            className="absolute w-full h-6"
            style={{
              top: `${i * 8}%`,
              background: i % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }}
          />
        ))}
      </div>
      
      {/* Faded StatMoose logo in centerfield */}
      <div 
        className="absolute"
        style={{
          top: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0.15,
          width: '30%',
        }}
      >
        <img 
          src="/logo-white.png" 
          alt=""
          className="w-full h-auto"
          style={{ filter: 'brightness(1.2) contrast(0.8)' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      
      {/* Warning track (darker ring around outfield) */}
      <div 
        className="absolute inset-0 rounded-t-full"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, transparent 60%, #8B4513 62%, #8B4513 65%, transparent 67%)',
          opacity: 0.6
        }}
      />
      
      {/* Outfield wall */}
      <div 
        className="absolute inset-0 rounded-t-full"
        style={{
          boxShadow: 'inset 0 -3px 0 0 #1a472a, inset 0 3px 8px 0 rgba(0,0,0,0.3)'
        }}
      />
      
      {/* Infield dirt - more realistic diamond shape */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        {/* Infield dirt arc and diamond */}
        <defs>
          <radialGradient id="dirtGradient" cx="50%" cy="100%" r="60%" fx="50%" fy="90%">
            <stop offset="0%" stopColor="#c4a77d" />
            <stop offset="50%" stopColor="#a0845c" />
            <stop offset="100%" stopColor="#8b6f47" />
          </radialGradient>
          <radialGradient id="moundGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c4a77d" />
            <stop offset="100%" stopColor="#8b6f47" />
          </radialGradient>
        </defs>
        
        {/* Infield dirt area */}
        <path 
          d="M 50 92 
             Q 20 75 15 50 
             Q 20 35 50 25 
             Q 80 35 85 50 
             Q 80 75 50 92 Z" 
          fill="url(#dirtGradient)"
        />
        
        {/* Base paths with chalk lines */}
        <path 
          d="M 50 88 L 78 55 L 50 22 L 22 55 Z" 
          fill="none" 
          stroke="rgba(255,255,255,0.9)" 
          strokeWidth="1.5"
        />
        
        {/* Batter's box area */}
        <rect x="42" y="86" width="16" height="8" fill="#a0845c" rx="1" />
        
        {/* Home plate */}
        <polygon 
          points="50,90 46,86 46,84 54,84 54,86" 
          fill="white" 
          stroke="#666"
          strokeWidth="0.3"
        />
        
        {/* First base */}
        <rect 
          x="76" y="53" width="5" height="5" 
          fill={bases?.first ? "#22c55e" : "white"} 
          stroke={bases?.first ? "#16a34a" : "#ccc"}
          strokeWidth="0.5"
          transform="rotate(45 78.5 55.5)"
        />
        
        {/* Second base */}
        <rect 
          x="47.5" y="19.5" width="5" height="5" 
          fill={bases?.second ? "#22c55e" : "white"} 
          stroke={bases?.second ? "#16a34a" : "#ccc"}
          strokeWidth="0.5"
          transform="rotate(45 50 22)"
        />
        
        {/* Third base */}
        <rect 
          x="19.5" y="53" width="5" height="5" 
          fill={bases?.third ? "#22c55e" : "white"} 
          stroke={bases?.third ? "#16a34a" : "#ccc"}
          strokeWidth="0.5"
          transform="rotate(45 22 55.5)"
        />
        
        {/* Pitcher's mound */}
        <ellipse cx="50" cy="55" rx="6" ry="5" fill="url(#moundGradient)" />
        <ellipse cx="50" cy="55" rx="3.5" ry="2.5" fill="#a0845c" />
        {/* Pitcher's rubber */}
        <rect x="48" y="54" width="4" height="1" fill="white" rx="0.3" />
        
        {/* Foul lines extending to outfield */}
        <line x1="50" y1="88" x2="5" y2="45" stroke="white" strokeWidth="0.8" />
        <line x1="50" y1="88" x2="95" y2="45" stroke="white" strokeWidth="0.8" />
        
        {/* On-deck circles */}
        <circle cx="35" cy="92" r="2.5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.7" />
        <circle cx="65" cy="92" r="2.5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.7" />
        
        {/* Coaches boxes */}
        <rect x="18" y="68" width="6" height="10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
        <rect x="76" y="68" width="6" height="10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
      </svg>
      
      {/* Fielding position labels */}
      {Object.entries(positions).map(([pos, coords]) => (
        <div 
          key={pos}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] text-white whitespace-nowrap border border-white/20 shadow-lg">
            {fieldingPositions?.[pos] ? (
              <>#{fieldingPositions[pos].number}</>
            ) : (
              <span className="text-zinc-400 uppercase text-[9px] tracking-wider">{pos}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Batting Order Component
const BattingOrder = ({ players, currentBatterIndex, onSelectBatter }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Batting Order</h3>
    </div>
    <div className="max-h-64 overflow-y-auto">
      {players?.map((player, index) => (
        <div 
          key={player.id || index}
          className={`flex items-center justify-between px-4 py-2 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 ${
            index === currentBatterIndex ? 'bg-blue-900/50 border-l-4 border-l-blue-500' : ''
          }`}
          onClick={() => onSelectBatter(index)}
        >
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 w-4">{index + 1}.</span>
            <span className="text-white font-medium">#{player.player_number} {player.player_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm">
              {player.hits || 0}-{player.at_bats || 0}
            </span>
            <div className="flex flex-col">
              <ChevronUp className="w-3 h-3 text-zinc-600" />
              <ChevronDown className="w-3 h-3 text-zinc-600" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Play by Play Log Component
const PlayByPlayLog = ({ plays }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Play by Play Log</h3>
    </div>
    <div className="max-h-48 overflow-y-auto p-4">
      {plays?.length > 0 ? (
        plays.map((play, index) => (
          <div key={index} className="text-sm text-zinc-300 mb-2 pb-2 border-b border-zinc-800">
            <span className="text-zinc-500">{play.inning} - </span>
            {play.description}
          </div>
        ))
      ) : (
        <div className="text-zinc-500 text-center py-4">No plays yet</div>
      )}
    </div>
  </div>
);

// Pitch Result Buttons Component
const PitchResultButtons = ({ onPitchResult, disabled }) => {
  const pitchButtons = [
    { label: "Foul Ball", type: "foul", color: "bg-zinc-700 hover:bg-zinc-600" },
    { label: "Swinging Strike", type: "strike_swinging", color: "bg-red-700 hover:bg-red-600" },
    { label: "Looking Strike", type: "strike_looking", color: "bg-red-700 hover:bg-red-600" },
    { label: "Ball", type: "ball", color: "bg-green-700 hover:bg-green-600" },
    { label: "Int. Walk", type: "intentional_walk", color: "bg-green-800 hover:bg-green-700" },
    { label: "Hit By Pitch", type: "hbp", color: "bg-yellow-700 hover:bg-yellow-600" },
    { label: "In Play", type: "in_play", color: "bg-blue-700 hover:bg-blue-600" },
  ];
  
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Pitch Result</h3>
      {pitchButtons.map((btn) => (
        <Button
          key={btn.type}
          onClick={() => onPitchResult(btn.type)}
          disabled={disabled}
          className={`w-full ${btn.color} text-white font-bold py-3 rounded-lg transition-colors`}
          data-testid={`pitch-${btn.type}`}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
};

// In Play Result Modal
const InPlayModal = ({ isOpen, onClose, onResult }) => {
  if (!isOpen) return null;
  
  const hitTypes = [
    { label: "Single", type: "single", bases: 1 },
    { label: "Double", type: "double", bases: 2 },
    { label: "Triple", type: "triple", bases: 3 },
    { label: "Home Run", type: "home_run", bases: 4 },
  ];
  
  const outTypes = [
    { label: "Ground Out", type: "ground_out" },
    { label: "Fly Out", type: "fly_out" },
    { label: "Line Out", type: "line_out" },
    { label: "Pop Out", type: "pop_out" },
    { label: "Strikeout", type: "strikeout" },
  ];
  
  const otherTypes = [
    { label: "Fielder's Choice", type: "fielders_choice" },
    { label: "Error", type: "error" },
    { label: "Sacrifice Fly", type: "sacrifice_fly" },
    { label: "Sacrifice Bunt", type: "sacrifice_bunt" },
    { label: "Double Play", type: "double_play" },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">In Play Result</h2>
        
        {/* Hits */}
        <div className="mb-4">
          <h3 className="text-sm text-zinc-400 uppercase mb-2">Hits</h3>
          <div className="grid grid-cols-2 gap-2">
            {hitTypes.map((hit) => (
              <Button
                key={hit.type}
                onClick={() => onResult(hit.type)}
                className="bg-green-700 hover:bg-green-600 text-white font-bold py-3"
              >
                {hit.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Outs */}
        <div className="mb-4">
          <h3 className="text-sm text-zinc-400 uppercase mb-2">Outs</h3>
          <div className="grid grid-cols-2 gap-2">
            {outTypes.map((out) => (
              <Button
                key={out.type}
                onClick={() => onResult(out.type)}
                className="bg-red-700 hover:bg-red-600 text-white font-bold py-3"
              >
                {out.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Other */}
        <div className="mb-4">
          <h3 className="text-sm text-zinc-400 uppercase mb-2">Other</h3>
          <div className="grid grid-cols-2 gap-2">
            {otherTypes.map((other) => (
              <Button
                key={other.type}
                onClick={() => onResult(other.type)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3"
              >
                {other.label}
              </Button>
            ))}
          </div>
        </div>
        
        <Button onClick={onClose} variant="outline" className="w-full mt-2">
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Stats Tabs Component
const StatsTabs = ({ activeTab, onTabChange, homeStats, awayStats }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div className="flex border-b border-zinc-700">
      {["home", "away", "comparison"].map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === tab 
              ? 'bg-zinc-800 text-white' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          {tab === "home" ? "Home Stats" : tab === "away" ? "Away Stats" : "Comparison"}
        </button>
      ))}
    </div>
    <div className="p-4 max-h-48 overflow-y-auto">
      {activeTab === "comparison" ? (
        <div className="text-zinc-500 text-center">Stat comparison coming soon</div>
      ) : (
        <div className="text-zinc-500 text-center">
          {activeTab === "home" ? "Home" : "Away"} team stats
        </div>
      )}
    </div>
  </div>
);

// Main BaseballLiveGame Component
export default function BaseballLiveGame({ demoMode = false, initialDemoData = null }) {
  const params = useParams();
  const id = demoMode ? 'demo' : params.id;
  const navigate = useNavigate();
  
  // Game state
  const [game, setGame] = useState(initialDemoData);
  const [loading, setLoading] = useState(!demoMode);
  const [homeRoster, setHomeRoster] = useState(initialDemoData?.home_roster || []);
  const [awayRoster, setAwayRoster] = useState(initialDemoData?.away_roster || []);
  const [homeStats, setHomeStats] = useState(initialDemoData?.home_player_stats || []);
  const [awayStats, setAwayStats] = useState(initialDemoData?.away_player_stats || []);
  const [playByPlay, setPlayByPlay] = useState([]);
  
  // UI state
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0);
  const [currentPitcherIndex, setCurrentPitcherIndex] = useState(0);
  const [showInPlayModal, setShowInPlayModal] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState("home");
  
  // Get current batting team's roster and stats
  const battingTeamIsHome = game?.inning_half === "bottom";
  const battingRoster = battingTeamIsHome ? homeRoster : awayRoster;
  const battingStats = battingTeamIsHome ? homeStats : awayStats;
  const pitchingRoster = battingTeamIsHome ? awayRoster : homeRoster;
  const pitchingStats = battingTeamIsHome ? awayStats : homeStats;
  
  const currentBatter = battingRoster[currentBatterIndex];
  const currentBatterStats = battingStats.find(s => s.player_number === currentBatter?.player_number);
  const currentPitcher = pitchingRoster[currentPitcherIndex];
  const currentPitcherStats = pitchingStats.find(s => s.player_number === currentPitcher?.player_number);
  
  // Fetch game data
  const fetchGame = useCallback(async () => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
      setHomeStats(res.data.home_player_stats || []);
      setAwayStats(res.data.away_player_stats || []);
      setPlayByPlay(res.data.play_by_play || []);
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, demoMode]);
  
  useEffect(() => {
    if (!demoMode) {
      fetchGame();
    } else {
      setLoading(false);
    }
    document.title = "StatMoose BB";
  }, [id, demoMode, fetchGame]);
  
  // Handle pitch result
  const handlePitchResult = useCallback((resultType) => {
    if (resultType === "in_play") {
      setShowInPlayModal(true);
      return;
    }
    
    setGame(prev => {
      if (!prev) return prev;
      
      let newBalls = prev.balls;
      let newStrikes = prev.strikes;
      let newOuts = prev.outs;
      let newInningHalf = prev.inning_half;
      let newInning = prev.current_inning;
      let description = "";
      
      switch (resultType) {
        case "ball":
          newBalls = prev.balls + 1;
          if (newBalls >= 4) {
            // Walk
            description = `Walk to #${currentBatter?.player_number} ${currentBatter?.player_name}`;
            newBalls = 0;
            newStrikes = 0;
            // TODO: Advance runner, move to next batter
            setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
          } else {
            description = `Ball ${newBalls}`;
          }
          break;
          
        case "strike_swinging":
        case "strike_looking":
          newStrikes = prev.strikes + 1;
          if (newStrikes >= 3) {
            // Strikeout
            description = `Strikeout ${resultType === "strike_swinging" ? "(swinging)" : "(looking)"} - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
            newStrikes = 0;
            newBalls = 0;
            newOuts = prev.outs + 1;
            setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
          } else {
            description = `Strike ${newStrikes} (${resultType === "strike_swinging" ? "swinging" : "looking"})`;
          }
          break;
          
        case "foul":
          if (prev.strikes < 2) {
            newStrikes = prev.strikes + 1;
          }
          description = `Foul ball (${newStrikes}-${newBalls})`;
          break;
          
        case "hbp":
          description = `Hit by pitch - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newBalls = 0;
          newStrikes = 0;
          // TODO: Advance runner
          setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
          break;
          
        case "intentional_walk":
          description = `Intentional walk - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newBalls = 0;
          newStrikes = 0;
          // TODO: Advance runner
          setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
          break;
          
        default:
          break;
      }
      
      // Check for end of half inning
      if (newOuts >= 3) {
        newOuts = 0;
        newBalls = 0;
        newStrikes = 0;
        if (newInningHalf === "top") {
          newInningHalf = "bottom";
        } else {
          newInningHalf = "top";
          newInning = prev.current_inning + 1;
        }
        description += " - Side retired";
        setCurrentBatterIndex(0);
      }
      
      // Add to play by play
      if (description) {
        setPlayByPlay(plays => [{
          inning: `${prev.current_inning}${prev.inning_half === 'top' ? '▲' : '▼'}`,
          description,
          timestamp: new Date().toISOString()
        }, ...plays]);
      }
      
      return {
        ...prev,
        balls: newBalls,
        strikes: newStrikes,
        outs: newOuts,
        inning_half: newInningHalf,
        current_inning: newInning
      };
    });
  }, [currentBatter, battingRoster.length]);
  
  // Handle in-play result
  const handleInPlayResult = useCallback((resultType) => {
    setShowInPlayModal(false);
    
    setGame(prev => {
      if (!prev) return prev;
      
      let newOuts = prev.outs;
      let newHomeScore = prev.home_score;
      let newAwayScore = prev.away_score;
      let newInningHalf = prev.inning_half;
      let newInning = prev.current_inning;
      let description = "";
      
      const isHomeTeamBatting = prev.inning_half === "bottom";
      
      switch (resultType) {
        case "single":
          description = `Single by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          break;
        case "double":
          description = `Double by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          break;
        case "triple":
          description = `Triple by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          break;
        case "home_run":
          description = `HOME RUN by #${currentBatter?.player_number} ${currentBatter?.player_name}!`;
          // Score a run
          if (isHomeTeamBatting) {
            newHomeScore += 1;
          } else {
            newAwayScore += 1;
          }
          break;
        case "ground_out":
        case "fly_out":
        case "line_out":
        case "pop_out":
          description = `${resultType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newOuts += 1;
          break;
        case "double_play":
          description = `Double play - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newOuts += 2;
          break;
        case "sacrifice_fly":
        case "sacrifice_bunt":
          description = `${resultType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newOuts += 1;
          break;
        case "error":
          description = `Error - #${currentBatter?.player_number} ${currentBatter?.player_name} reaches on error`;
          break;
        case "fielders_choice":
          description = `Fielder's choice - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          break;
        default:
          break;
      }
      
      // Reset count and advance batter
      setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
      
      // Check for end of half inning
      if (newOuts >= 3) {
        newOuts = 0;
        if (newInningHalf === "top") {
          newInningHalf = "bottom";
        } else {
          newInningHalf = "top";
          newInning = prev.current_inning + 1;
        }
        description += " - Side retired";
        setCurrentBatterIndex(0);
      }
      
      // Add to play by play
      setPlayByPlay(plays => [{
        inning: `${prev.current_inning}${prev.inning_half === 'top' ? '▲' : '▼'}`,
        description,
        timestamp: new Date().toISOString()
      }, ...plays]);
      
      return {
        ...prev,
        balls: 0,
        strikes: 0,
        outs: newOuts,
        home_score: newHomeScore,
        away_score: newAwayScore,
        inning_half: newInningHalf,
        current_inning: newInning
      };
    });
  }, [currentBatter, battingRoster.length]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl animate-bounce">⚾</span>
          <p className="mt-4 text-zinc-400">Loading game...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen bg-black text-white ${demoMode ? 'pt-10' : ''}`}>
      {/* Demo Mode Bar */}
      {demoMode && <DemoModeBar />}
      
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(demoMode ? "/" : "/dashboard")}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-2xl">⚾</span>
            <span className="text-lg font-bold">Baseball</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Box Score
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Scoreboard */}
        <Scoreboard game={game} />
        
        {/* Current Batter/Pitcher */}
        <div className="mt-4">
          <CurrentPlayerInfo 
            batter={currentBatter}
            pitcher={currentPitcher}
            batterStats={currentBatterStats}
            pitcherStats={currentPitcherStats}
          />
        </div>
        
        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4 mt-4">
          {/* Left Column - Play by Play & Batting Order */}
          <div className="col-span-3 space-y-4">
            <PlayByPlayLog plays={playByPlay} />
            <StatsTabs 
              activeTab={activeStatsTab}
              onTabChange={setActiveStatsTab}
              homeStats={homeStats}
              awayStats={awayStats}
            />
          </div>
          
          {/* Center - Batting Order & Diamond */}
          <div className="col-span-6 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                Batting: {battingTeamIsHome ? game?.home_team_name : game?.away_team_name}
              </h3>
              <BattingOrder 
                players={battingRoster}
                currentBatterIndex={currentBatterIndex}
                onSelectBatter={setCurrentBatterIndex}
              />
            </div>
            
            <BaseballDiamond 
              bases={game?.bases}
              fieldingPositions={null}
            />
          </div>
          
          {/* Right Column - Pitch Results */}
          <div className="col-span-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <PitchResultButtons 
                onPitchResult={handlePitchResult}
                disabled={false}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* In Play Modal */}
      <InPlayModal 
        isOpen={showInPlayModal}
        onClose={() => setShowInPlayModal(false)}
        onResult={handleInPlayResult}
      />
    </div>
  );
}

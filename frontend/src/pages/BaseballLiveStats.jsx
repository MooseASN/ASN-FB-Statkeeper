import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, Circle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * BaseballLiveStats - Public/shareable view of baseball live stats
 * Similar to MLB GameDay, StatBroadcast, PrestoSports, Sidearm Sports
 */

// Format player name as "F. LastName"
const formatPlayerName = (name) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name;
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return `${firstName.charAt(0)}. ${lastName}`;
};

// Diamond visualization component (simplified)
const DiamondVisualization = ({ bases, outs, balls, strikes }) => {
  const basePositions = {
    first: { x: 70, y: 50 },
    second: { x: 50, y: 25 },
    third: { x: 30, y: 50 },
    home: { x: 50, y: 75 }
  };
  
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Diamond outline */}
        <polygon 
          points="50,15 85,50 50,85 15,50" 
          fill="none" 
          stroke="#52525b" 
          strokeWidth="2"
        />
        {/* Bases */}
        <rect 
          x={basePositions.second.x - 6} y={basePositions.second.y - 6} 
          width="12" height="12" 
          fill={bases?.second ? "#fbbf24" : "#3f3f46"}
          transform={`rotate(45, ${basePositions.second.x}, ${basePositions.second.y})`}
        />
        <rect 
          x={basePositions.first.x - 6} y={basePositions.first.y - 6} 
          width="12" height="12" 
          fill={bases?.first ? "#fbbf24" : "#3f3f46"}
          transform={`rotate(45, ${basePositions.first.x}, ${basePositions.first.y})`}
        />
        <rect 
          x={basePositions.third.x - 6} y={basePositions.third.y - 6} 
          width="12" height="12" 
          fill={bases?.third ? "#fbbf24" : "#3f3f46"}
          transform={`rotate(45, ${basePositions.third.x}, ${basePositions.third.y})`}
        />
        {/* Home plate */}
        <polygon 
          points="50,75 45,80 45,85 55,85 55,80" 
          fill="#f4f4f5"
        />
      </svg>
      
      {/* Count display below diamond */}
      <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">B</span>
          <div className="flex gap-0.5">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < balls ? 'bg-green-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">S</span>
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < strikes ? 'bg-yellow-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">O</span>
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < outs ? 'bg-red-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Linescore component (inning-by-inning)
const Linescore = ({ game, awayTeamName, homeTeamName, awayColor, homeColor }) => {
  const maxInning = Math.max(9, game?.current_inning || 9, game?.total_innings || 9);
  const innings = Array.from({ length: maxInning }, (_, i) => i + 1);
  const inningScores = game?.inning_scores || {};
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-800">
            <th className="text-left px-2 py-1.5 font-semibold border-b border-zinc-700 min-w-[100px]"></th>
            {innings.map(inning => (
              <th key={inning} className={`text-center px-1.5 py-1.5 font-semibold border-b border-zinc-700 w-6 
                ${inning === game?.current_inning ? 'bg-amber-500/20' : ''}`}>
                {inning}
              </th>
            ))}
            <th className="text-center px-2 py-1.5 font-bold border-b border-zinc-700 bg-zinc-700 w-8">R</th>
            <th className="text-center px-2 py-1.5 font-bold border-b border-zinc-700 bg-zinc-700 w-8">H</th>
            <th className="text-center px-2 py-1.5 font-bold border-b border-zinc-700 bg-zinc-700 w-8">E</th>
          </tr>
        </thead>
        <tbody>
          {/* Away */}
          <tr className="border-b border-zinc-800">
            <td className="text-left px-2 py-1.5 font-medium" style={{ color: awayColor }}>
              {awayTeamName}
            </td>
            {innings.map(inning => (
              <td key={inning} className={`text-center px-1.5 py-1.5 text-zinc-300 
                ${inning === game?.current_inning && game?.inning_half === 'top' ? 'bg-amber-500/20' : ''}`}>
                {inningScores[`away_${inning}`] ?? (inning < (game?.current_inning || 1) ? '0' : '-')}
              </td>
            ))}
            <td className="text-center px-2 py-1.5 font-bold text-white bg-zinc-800">{game?.away_score || 0}</td>
            <td className="text-center px-2 py-1.5 text-zinc-300 bg-zinc-800">{game?.away_hits || 0}</td>
            <td className="text-center px-2 py-1.5 text-zinc-300 bg-zinc-800">{game?.away_errors || 0}</td>
          </tr>
          {/* Home */}
          <tr>
            <td className="text-left px-2 py-1.5 font-medium" style={{ color: homeColor }}>
              {homeTeamName}
            </td>
            {innings.map(inning => (
              <td key={inning} className={`text-center px-1.5 py-1.5 text-zinc-300
                ${inning === game?.current_inning && game?.inning_half === 'bottom' ? 'bg-amber-500/20' : ''}`}>
                {inningScores[`home_${inning}`] ?? (inning < (game?.current_inning || 1) || (inning === (game?.current_inning || 1) && game?.inning_half === 'bottom') ? '0' : '-')}
              </td>
            ))}
            <td className="text-center px-2 py-1.5 font-bold text-white bg-zinc-800">{game?.home_score || 0}</td>
            <td className="text-center px-2 py-1.5 text-zinc-300 bg-zinc-800">{game?.home_hits || 0}</td>
            <td className="text-center px-2 py-1.5 text-zinc-300 bg-zinc-800">{game?.home_errors || 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Batting Stats Table
const BattingTable = ({ teamName, teamColor, players, stats }) => {
  const playerStats = players?.map(player => {
    const stat = stats?.find(s => s.player_number === player.player_number) || {};
    return {
      ...player,
      ab: stat.at_bats || 0,
      r: stat.runs || 0,
      h: stat.hits || 0,
      rbi: stat.rbis || 0,
      bb: stat.walks || 0,
      so: stat.strikeouts_batting || 0,
    };
  }).filter(p => p.ab > 0 || p.r > 0 || p.h > 0) || [];
  
  const totals = playerStats.reduce((acc, p) => ({
    ab: acc.ab + p.ab, r: acc.r + p.r, h: acc.h + p.h, rbi: acc.rbi + p.rbi, bb: acc.bb + p.bb, so: acc.so + p.so,
  }), { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0 });
  
  if (playerStats.length === 0) return null;
  
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-t" style={{ backgroundColor: teamColor || '#374151' }}>
        <span className="text-white font-bold text-sm">{teamName}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-800 text-zinc-300">
              <th className="text-left px-2 py-1 min-w-[120px]">Batter</th>
              <th className="text-center px-1.5 py-1 w-8">AB</th>
              <th className="text-center px-1.5 py-1 w-8">R</th>
              <th className="text-center px-1.5 py-1 w-8">H</th>
              <th className="text-center px-1.5 py-1 w-8">RBI</th>
              <th className="text-center px-1.5 py-1 w-8">BB</th>
              <th className="text-center px-1.5 py-1 w-8">K</th>
            </tr>
          </thead>
          <tbody>
            {playerStats.map((p, i) => (
              <tr key={p.player_number} className={i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/50'}>
                <td className="text-left px-2 py-1 text-white">
                  <span className="text-zinc-500 mr-1">#{p.player_number}</span>
                  {formatPlayerName(p.player_name)}
                </td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.ab}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.r}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.h}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.rbi}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.bb}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.so}</td>
              </tr>
            ))}
            <tr className="bg-zinc-700 font-bold text-white">
              <td className="text-left px-2 py-1">Totals</td>
              <td className="text-center px-1.5 py-1">{totals.ab}</td>
              <td className="text-center px-1.5 py-1">{totals.r}</td>
              <td className="text-center px-1.5 py-1">{totals.h}</td>
              <td className="text-center px-1.5 py-1">{totals.rbi}</td>
              <td className="text-center px-1.5 py-1">{totals.bb}</td>
              <td className="text-center px-1.5 py-1">{totals.so}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Pitching Stats Table
const PitchingTable = ({ teamName, teamColor, stats }) => {
  const pitchers = stats?.filter(s => s.pitches_thrown > 0 || s.innings_pitched > 0) || [];
  
  if (pitchers.length === 0) return null;
  
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-t" style={{ backgroundColor: teamColor || '#374151' }}>
        <span className="text-white font-bold text-sm">{teamName} Pitching</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-800 text-zinc-300">
              <th className="text-left px-2 py-1 min-w-[120px]">Pitcher</th>
              <th className="text-center px-1.5 py-1 w-8">IP</th>
              <th className="text-center px-1.5 py-1 w-8">H</th>
              <th className="text-center px-1.5 py-1 w-8">R</th>
              <th className="text-center px-1.5 py-1 w-8">ER</th>
              <th className="text-center px-1.5 py-1 w-8">BB</th>
              <th className="text-center px-1.5 py-1 w-8">K</th>
              <th className="text-center px-1.5 py-1 w-10">NP</th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map((p, i) => (
              <tr key={p.player_number} className={i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/50'}>
                <td className="text-left px-2 py-1 text-white">
                  <span className="text-zinc-500 mr-1">#{p.player_number}</span>
                  {formatPlayerName(p.player_name)}
                </td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.innings_pitched?.toFixed(1) || 0}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.hits_allowed || 0}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.runs_allowed || 0}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.earned_runs || 0}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.walks_allowed || 0}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.strikeouts_pitching || 0}</td>
                <td className="text-center px-1.5 py-1 text-zinc-300">{p.pitches_thrown || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Play-by-Play component
const PlayByPlay = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8">
        No plays recorded yet
      </div>
    );
  }
  
  // Group events by inning
  const groupedEvents = events.reduce((acc, event) => {
    const inning = event.inning || 1;
    const half = event.half || 'top';
    const key = `${half === 'top' ? '▲' : '▼'} ${inning}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
  
  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).reverse().map(([inningKey, inningEvents]) => (
        <div key={inningKey}>
          <div className="sticky top-0 bg-zinc-800 px-3 py-1.5 text-sm font-bold text-amber-400 border-b border-zinc-700">
            {inningKey}
          </div>
          <div className="divide-y divide-zinc-800">
            {inningEvents.map((event, i) => (
              <div key={event.id || i} className="px-3 py-2 text-sm">
                <div className="text-white">{event.description || event.result}</div>
                {event.score_after && (
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Score: {event.score_after}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Main component
export default function BaseballLiveStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('box'); // 'box' | 'plays'

  useEffect(() => {
    document.title = "StatMoose Baseball";
  }, []);

  // Polling for live updates
  useEffect(() => {
    let mounted = true;
    let hasLoadedOnce = false;
    
    const fetchGameData = async () => {
      try {
        const res = await axios.get(`${API}/games/public/${id}`);
        if (mounted) {
          setGame(res.data);
          setLastUpdate(new Date());
          hasLoadedOnce = true;
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (mounted && !hasLoadedOnce) {
          setError('Game not found or not accessible');
          setLoading(false);
        }
      }
    };

    fetchGameData();
    const interval = setInterval(fetchGameData, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">Loading game stats...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Game not found'}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const homeColor = game.home_team_color || '#dc2626';
  const awayColor = game.away_team_color || '#2563eb';
  const isLive = game.status === 'active' || game.status === 'in_progress';
  const isFinal = game.status === 'completed' || game.status === 'final';
  
  // Get inning display
  const getInningDisplay = () => {
    if (isFinal) return 'FINAL';
    if (!isLive) return 'SCHEDULED';
    const half = game.inning_half === 'top' ? '▲' : '▼';
    return `${half} ${game.current_inning || 1}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                LIVE
              </span>
            )}
            <span className="text-xs text-zinc-500">
              StatMoose ⚾
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleShare}
            className="text-zinc-400 hover:text-white"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Away Team */}
            <div className="text-center">
              {game.away_team_logo && (
                <img src={game.away_team_logo} alt="" className="w-12 h-12 mx-auto mb-1 object-contain" />
              )}
              <div className="font-bold text-sm" style={{ color: awayColor }}>
                {game.away_team_name}
              </div>
              <div className="text-4xl font-black mt-1">{game.away_score || 0}</div>
            </div>
            
            {/* Game Status + Diamond */}
            <div className="text-center">
              <div className={`text-lg font-bold mb-2 ${isLive ? 'text-amber-400' : isFinal ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {getInningDisplay()}
              </div>
              {isLive && (
                <DiamondVisualization 
                  bases={game.bases} 
                  outs={game.outs || 0}
                  balls={game.balls || 0}
                  strikes={game.strikes || 0}
                />
              )}
            </div>
            
            {/* Home Team */}
            <div className="text-center">
              {game.home_team_logo && (
                <img src={game.home_team_logo} alt="" className="w-12 h-12 mx-auto mb-1 object-contain" />
              )}
              <div className="font-bold text-sm" style={{ color: homeColor }}>
                {game.home_team_name}
              </div>
              <div className="text-4xl font-black mt-1">{game.home_score || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Linescore */}
      <div className="bg-zinc-900/50 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Linescore 
            game={game} 
            awayTeamName={game.away_team_name}
            homeTeamName={game.home_team_name}
            awayColor={awayColor}
            homeColor={homeColor}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('box')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'box' 
                  ? 'border-amber-500 text-white' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Box Score
            </button>
            <button
              onClick={() => setActiveTab('plays')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'plays' 
                  ? 'border-amber-500 text-white' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Play-by-Play
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'box' && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Away Team Stats */}
            <div>
              <BattingTable 
                teamName={game.away_team_name}
                teamColor={awayColor}
                players={game.away_roster}
                stats={game.away_batting_stats}
              />
              <PitchingTable 
                teamName={game.away_team_name}
                teamColor={awayColor}
                stats={game.away_pitching_stats}
              />
            </div>
            
            {/* Home Team Stats */}
            <div>
              <BattingTable 
                teamName={game.home_team_name}
                teamColor={homeColor}
                players={game.home_roster}
                stats={game.home_batting_stats}
              />
              <PitchingTable 
                teamName={game.home_team_name}
                teamColor={homeColor}
                stats={game.home_pitching_stats}
              />
            </div>
          </div>
        )}

        {activeTab === 'plays' && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 max-h-[500px] overflow-y-auto">
            <PlayByPlay events={game.events || game.play_by_play || []} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-zinc-900 border-t border-zinc-800 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {lastUpdate && `Last updated: ${lastUpdate.toLocaleTimeString()}`}
          </span>
          <span>Powered by StatMoose</span>
        </div>
      </div>
    </div>
  );
}

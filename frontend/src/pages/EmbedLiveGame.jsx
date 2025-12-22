import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ExternalLink } from "lucide-react";
import MooseIcon from "@/components/MooseIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmbedLiveGame() {
  const { shareCode } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGame = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/share/${shareCode}`);
      setGame(res.data);
      setError(null);
    } catch (err) {
      setError("Game not found");
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchGame]);

  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const getQuarterLabel = (q) => {
    const label = game?.period_label === "Period" ? "P" : "Q";
    if (q <= 4) return `${label}${q}`;
    return `OT${q - 4}`;
  };

  const getLeadingScorer = (stats) => {
    if (!stats || stats.length === 0) return null;
    
    const withPoints = stats.map(p => ({
      ...p,
      points: p.ft_made + (p.fg2_made * 2) + (p.fg3_made * 3)
    }));
    
    const sorted = withPoints.sort((a, b) => b.points - a.points);
    return sorted[0];
  };

  const fullViewUrl = `${window.location.origin}/live/${shareCode}`;

  if (loading) {
    return (
      <div className="w-[1920px] h-[300px] bg-black flex items-center justify-center">
        <MooseIcon className="w-12 h-12 animate-pulse text-white" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="w-[1920px] h-[300px] bg-black flex items-center justify-center">
        <p className="text-white text-xl">Game not available</p>
      </div>
    );
  }

  const homeScore = calculateScore("home");
  const awayScore = calculateScore("away");
  const homeLeader = getLeadingScorer(game.home_player_stats);
  const awayLeader = getLeadingScorer(game.away_player_stats);
  
  const homeColor = game.home_team_color || "#dc2626";
  const awayColor = game.away_team_color || "#7c3aed";

  return (
    <div 
      className="w-[1920px] h-[300px] bg-black flex items-center justify-between px-16 relative overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Background decorations */}
      <div 
        className="absolute left-0 top-0 w-1/3 h-full opacity-15"
        style={{ background: `linear-gradient(135deg, ${homeColor} 0%, transparent 100%)` }}
      />
      <div 
        className="absolute right-0 top-0 w-1/3 h-full opacity-15"
        style={{ background: `linear-gradient(225deg, ${awayColor} 0%, transparent 100%)` }}
      />

      {/* Home Team Section */}
      <div className="flex items-center gap-8 z-10">
        {/* Team Logo */}
        <div className="w-32 h-32 rounded-full flex items-center justify-center bg-white/5 border-4" style={{ borderColor: homeColor }}>
          {game.home_team_logo ? (
            <img src={game.home_team_logo} alt={game.home_team_name} className="w-24 h-24 object-contain" />
          ) : (
            <span className="text-5xl font-bold text-white">{game.home_team_name?.charAt(0)}</span>
          )}
        </div>
        
        <div className="text-left">
          <h2 className="text-3xl font-bold text-white mb-2">{game.home_team_name}</h2>
          {homeLeader && homeLeader.points > 0 && (
            <div className="text-white/70">
              <span className="text-sm">Leading:</span>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: homeColor }}
                >
                  {homeLeader.player_number}
                </span>
                <span className="text-lg font-semibold text-white">{homeLeader.player_name}</span>
                <span className="text-2xl font-bold" style={{ color: homeColor }}>{homeLeader.points} PTS</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Score Section */}
      <div className="text-center z-10">
        {/* Clock (if enabled) - above score */}
        {game.clock_enabled && (
          <div className="mb-2">
            <span className="text-4xl font-mono font-bold text-white">
              {Math.floor((game.clock_time || 0) / 60)}:{((game.clock_time || 0) % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Score */}
        <div className="flex items-center gap-8">
          <span className="text-8xl font-black text-white" style={{ textShadow: `0 0 40px ${homeColor}` }}>
            {homeScore}
          </span>
          <span className="text-4xl text-white/30 font-light">-</span>
          <span className="text-8xl font-black text-white" style={{ textShadow: `0 0 40px ${awayColor}` }}>
            {awayScore}
          </span>
        </div>

        {/* Quarter/Period - below score */}
        <div className="mt-4">
          {game.status === "active" ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 rounded-full text-white font-bold text-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              {game.is_halftime ? 'HALFTIME' : `LIVE - ${game.period_label === 'Period' ? 'P' : 'Q'}${game.current_quarter}`}
            </span>
          ) : (
            <span className="inline-flex items-center px-4 py-2 bg-gray-700 rounded-full text-white font-bold text-sm">
              FINAL
            </span>
          )}
        </div>
      </div>

      {/* Away Team Section */}
      <div className="flex items-center gap-8 z-10">
        <div className="text-right">
          <h2 className="text-3xl font-bold text-white mb-2">{game.away_team_name}</h2>
          {awayLeader && awayLeader.points > 0 && (
            <div className="text-white/70">
              <span className="text-sm">Leading:</span>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span className="text-2xl font-bold" style={{ color: awayColor }}>{awayLeader.points} PTS</span>
                <span className="text-lg font-semibold text-white">{awayLeader.player_name}</span>
                <span 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: awayColor }}
                >
                  {awayLeader.player_number}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Team Logo */}
        <div className="w-32 h-32 rounded-full flex items-center justify-center bg-white/5 border-4" style={{ borderColor: awayColor }}>
          {game.away_team_logo ? (
            <img src={game.away_team_logo} alt={game.away_team_name} className="w-24 h-24 object-contain" />
          ) : (
            <span className="text-5xl font-bold text-white">{game.away_team_name?.charAt(0)}</span>
          )}
        </div>
      </div>

      {/* Full Stats Button */}
      <a 
        href={fullViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-6 right-6 flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-colors z-20"
      >
        <span>Full Live Stats</span>
        <ExternalLink className="w-5 h-5" />
      </a>
    </div>
  );
}

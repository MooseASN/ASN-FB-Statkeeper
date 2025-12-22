import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import MooseIcon from "@/components/MooseIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper function to calculate player stats - moved outside component
const calculatePlayerStats = (stats) => {
  const pts = stats.ft_made + (stats.fg2_made * 2) + (stats.fg3_made * 3);
  const totalReb = stats.offensive_rebounds + stats.defensive_rebounds;
  const fg_made = stats.fg2_made + stats.fg3_made;
  const fg_att = fg_made + stats.fg2_missed + stats.fg3_missed;
  const fg_pct = fg_att > 0 ? Math.round((fg_made / fg_att) * 100) : 0;
  const fg3_att = stats.fg3_made + stats.fg3_missed;
  const fg3_pct = fg3_att > 0 ? Math.round((stats.fg3_made / fg3_att) * 100) : 0;
  const ft_att = stats.ft_made + stats.ft_missed;
  const ft_pct = ft_att > 0 ? Math.round((stats.ft_made / ft_att) * 100) : 0;
  
  return { pts, totalReb, fg_made, fg_att, fg_pct, fg3_att, fg3_pct, ft_att, ft_pct };
};

// Sort players by jersey number numerically
const sortByNumber = (players) => {
  return [...players].sort((a, b) => {
    const numA = parseInt(a.player_number, 10) || 0;
    const numB = parseInt(b.player_number, 10) || 0;
    return numA - numB;
  });
};

// Sponsor Banner Slideshow component
const SponsorSlideshow = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  
  const bannerContent = (
    <div className="relative w-full h-24 md:h-32 bg-slate-100 rounded-lg overflow-hidden">
      <img 
        src={currentBanner.image_data} 
        alt={currentBanner.filename}
        className="w-full h-full object-contain"
      />
      {currentBanner.link_url && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          <span>Sponsor</span>
        </div>
      )}
    </div>
  );

  if (currentBanner.link_url) {
    return (
      <a 
        href={currentBanner.link_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        {bannerContent}
      </a>
    );
  }

  return bannerContent;
};

// TeamTable component - moved outside main component to avoid re-creation on render
const TeamTable = ({ teamName, stats, totals, teamColor }) => (
  <div className="mb-6 md:mb-8">
    <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3 flex items-center gap-2" style={{ color: teamColor }}>
      <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: teamColor }}></div>
      {teamName}
    </h3>
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <div className="min-w-[800px] sm:min-w-0 px-3 sm:px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="w-10 md:w-12 text-xs md:text-sm">#</TableHead>
              <TableHead className="text-xs md:text-sm">Player</TableHead>
              <TableHead className="text-center w-10 md:w-auto text-xs md:text-sm">PTS</TableHead>
              <TableHead className="text-center w-12 md:w-auto text-xs md:text-sm">FG</TableHead>
              <TableHead className="text-center w-10 md:w-auto text-xs md:text-sm">FG%</TableHead>
              <TableHead className="text-center w-12 md:w-auto text-xs md:text-sm">3PT</TableHead>
              <TableHead className="text-center w-10 md:w-auto text-xs md:text-sm">3P%</TableHead>
              <TableHead className="text-center w-12 md:w-auto text-xs md:text-sm">FT</TableHead>
              <TableHead className="text-center w-10 md:w-auto text-xs md:text-sm">FT%</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">OREB</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">DREB</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">REB</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">AST</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">STL</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">BLK</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">TO</TableHead>
              <TableHead className="text-center w-8 md:w-auto text-xs md:text-sm">PF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortByNumber(stats).map(s => {
              const calc = calculatePlayerStats(s);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-bold text-xs md:text-sm" style={{ color: teamColor }}>{s.player_number}</TableCell>
                  <TableCell className="font-medium text-xs md:text-sm whitespace-nowrap">{s.player_name}</TableCell>
                  <TableCell className="text-center font-bold text-xs md:text-sm">{calc.pts}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{calc.fg_made}-{calc.fg_att}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{calc.fg_pct}%</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.fg3_made}-{calc.fg3_att}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{calc.fg3_pct}%</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.ft_made}-{calc.ft_att}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{calc.ft_pct}%</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.offensive_rebounds}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.defensive_rebounds}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{calc.totalReb}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.assists}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.steals}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.blocks}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.turnovers}</TableCell>
                  <TableCell className="text-center text-xs md:text-sm">{s.fouls >= 5 ? <span className="text-red-500 font-bold">{s.fouls}</span> : s.fouls}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-slate-100 font-bold">
              <TableCell className="text-xs md:text-sm"></TableCell>
              <TableCell className="text-xs md:text-sm">TOTALS</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.pts}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.fg_made}-{totals.fg_att}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.fg_pct}%</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.fg3_made}-{totals.fg3_att}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.fg3_pct}%</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.ft_made}-{totals.ft_att}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.ft_pct}%</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.oreb}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.dreb}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.reb}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.ast}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.stl}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.blk}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.to}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{totals.pf}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
);

export default function LiveView() {
  const { shareCode } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [sponsorBanners, setSponsorBanners] = useState([]);

  const fetchGame = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/share/${shareCode}`);
      setGame(res.data);
      setLastUpdated(new Date());
      setError(null);
      
      // Fetch sponsor banners for this game's user
      if (res.data.user_id) {
        try {
          const bannersRes = await axios.get(`${API}/sponsor-banners/public/${res.data.user_id}`);
          setSponsorBanners(bannersRes.data);
        } catch (bannerErr) {
          console.error("Error fetching sponsor banners:", bannerErr);
        }
      }
    } catch (err) {
      setError("Game not found");
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const calculateTeamTotals = (statsArray) => {
    const totals = {
      pts: 0, fg_made: 0, fg_att: 0, fg3_made: 0, fg3_att: 0,
      ft_made: 0, ft_att: 0, oreb: 0, dreb: 0, reb: 0,
      ast: 0, stl: 0, blk: 0, to: 0, pf: 0
    };
    
    statsArray.forEach(s => {
      const calc = calculatePlayerStats(s);
      totals.pts += calc.pts;
      totals.fg_made += calc.fg_made;
      totals.fg_att += calc.fg_att;
      totals.fg3_made += s.fg3_made;
      totals.fg3_att += calc.fg3_att;
      totals.ft_made += s.ft_made;
      totals.ft_att += calc.ft_att;
      totals.oreb += s.offensive_rebounds;
      totals.dreb += s.defensive_rebounds;
      totals.reb += calc.totalReb;
      totals.ast += s.assists;
      totals.stl += s.steals;
      totals.blk += s.blocks;
      totals.to += s.turnovers;
      totals.pf += s.fouls;
    });

    // Calculate percentages
    totals.fg_pct = totals.fg_att > 0 ? Math.round((totals.fg_made / totals.fg_att) * 100) : 0;
    totals.fg3_pct = totals.fg3_att > 0 ? Math.round((totals.fg3_made / totals.fg3_att) * 100) : 0;
    totals.ft_pct = totals.ft_att > 0 ? Math.round((totals.ft_made / totals.ft_att) * 100) : 0;
    
    return totals;
  };

  const getQuarterLabel = (q) => {
    const label = game?.period_label === "Period" ? "P" : "Q";
    if (q <= 4) return `${label}${q}`;
    return `OT${q - 4}`;
  };

  // Get status label for game
  const getStatusLabel = () => {
    if (game.status === "active") return "LIVE";
    if (game.status === "scheduled") return "NOT STARTED";
    return "FINAL";
  };

  // Format clock time
  const formatClockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#000000]" />
          <p className="mt-4 text-muted-foreground">Loading live stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <MooseIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-[#000000] mb-2">Game Not Found</h2>
          <p className="text-muted-foreground">This share link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];
  const homeTotals = calculateTeamTotals(homeStats);
  const awayTotals = calculateTeamTotals(awayStats);
  const playByPlay = game.play_by_play || [];
  
  // Team colors from game data
  const homeColor = game.home_team_color || "#dc2626";
  const awayColor = game.away_team_color || "#7c3aed";
  
  // Determine quarters
  const homeScores = game.quarter_scores?.home || [0, 0, 0, 0];
  const awayScores = game.quarter_scores?.away || [0, 0, 0, 0];
  const totalQuarters = Math.max(4, homeScores.length, game.current_quarter);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="live-view-page">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MooseIcon className="w-6 h-6 text-[#000000]" />
              <span className="font-bold text-[#000000]">StatMoose</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              <span>Auto-refresh</span>
              {game.status === "active" && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  LIVE
                </span>
              )}
              {game.status === "scheduled" && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  NOT STARTED
                </span>
              )}
              {game.status === "completed" && (
                <span className="ml-2 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                  FINAL
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Title Banner */}
      <div className="bg-[#000000] text-white py-3 md:py-4">
        <div className="max-w-6xl mx-auto px-3 md:px-4 text-center">
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold" data-testid="game-title">
            {game.home_team_name} vs {game.away_team_name}
          </h1>
          {game.note && (
            <p className="text-white/80 text-sm mt-1">{game.note}</p>
          )}
          <p className="text-white/70 text-xs sm:text-sm mt-1">
            {game.status === "active" ? `Live - ${getQuarterLabel(game.current_quarter)}` : 
             game.status === "scheduled" ? "Scheduled" : "Final Score"}
          </p>
        </div>
      </div>

      {/* Scoreboard - Mobile Optimized */}
      <div className="bg-gradient-to-r from-[#000000] to-[#333333] text-white">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 md:py-8">
          {/* Mobile: Stack vertically, Desktop: Side by side */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            
            {/* Home Team */}
            <div className="text-center flex-1 w-full md:w-auto">
              <div className="flex md:flex-col items-center justify-center gap-3 md:gap-0">
                {/* Logo */}
                <div 
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 md:border-4 overflow-hidden flex-shrink-0"
                  style={{ borderColor: homeColor, backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  {game.home_team_logo ? (
                    <img src={game.home_team_logo} alt={game.home_team_name} className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain" />
                  ) : (
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{game.home_team_name?.charAt(0)}</span>
                  )}
                </div>
                {/* Team Info */}
                <div className="md:mt-2">
                  <div className="flex items-center justify-center gap-2 mb-1 md:mb-2">
                    <div className="w-3 h-3 md:w-4 md:h-4 rounded-full" style={{ backgroundColor: homeColor }}></div>
                    <p className="text-sm sm:text-base md:text-lg font-semibold">{game.home_team_name}</p>
                  </div>
                  <p className="text-4xl sm:text-5xl md:text-6xl font-bold score-display text-white" data-testid="home-score">
                    {calculateScore("home")}
                  </p>
                  <p className="text-xs md:text-sm text-white/60 mt-1">Fouls: {homeTotals.pf}</p>
                </div>
              </div>
            </div>
            
            {/* Center - Clock & Quarter Info */}
            <div className="px-2 sm:px-4 md:px-8 text-center order-first md:order-none w-full md:w-auto">
              {/* Clock display when enabled */}
              {game.clock_enabled && game.status === "active" && (
                <div className="mb-2 md:mb-3">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-white">
                    {formatClockTime(game.clock_time || 0)}
                  </span>
                </div>
              )}
              
              <div className="mb-3 md:mb-4">
                <span className={`text-base sm:text-lg md:text-xl font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${
                  game.status === "active" ? "bg-orange-500" : 
                  game.status === "scheduled" ? "bg-blue-500" : "bg-white/20"
                }`}>
                  {game.status === "active" ? (game.is_halftime ? "HALFTIME" : getQuarterLabel(game.current_quarter)) : 
                   game.status === "scheduled" ? "NOT STARTED" : "FINAL"}
                </span>
              </div>
              
              {/* Quarter-by-quarter scores - horizontal scroll on mobile */}
              <div className="overflow-x-auto pb-2">
                <div className="grid gap-2 md:gap-3 text-xs sm:text-sm min-w-max mx-auto" style={{ gridTemplateColumns: `auto repeat(${totalQuarters}, minmax(28px, 1fr))` }}>
                  <div></div>
                  {Array.from({ length: totalQuarters }, (_, i) => i + 1).map(q => (
                    <div key={q} className="text-white/60">{getQuarterLabel(q)}</div>
                  ))}
                  <div className="text-left pr-2" style={{ color: homeColor }}>{game.home_team_name?.substring(0, 8)}</div>
                  {Array.from({ length: totalQuarters }, (_, i) => (
                    <div key={i} className="font-bold">{homeScores[i] || 0}</div>
                  ))}
                  <div className="text-left pr-2" style={{ color: awayColor }}>{game.away_team_name?.substring(0, 8)}</div>
                  {Array.from({ length: totalQuarters }, (_, i) => (
                    <div key={i} className="font-bold">{awayScores[i] || 0}</div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Away Team */}
            <div className="text-center flex-1 w-full md:w-auto">
              <div className="flex md:flex-col items-center justify-center gap-3 md:gap-0 flex-row-reverse md:flex-col">
                {/* Logo */}
                <div 
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 md:border-4 overflow-hidden flex-shrink-0"
                  style={{ borderColor: awayColor, backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  {game.away_team_logo ? (
                    <img src={game.away_team_logo} alt={game.away_team_name} className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain" />
                  ) : (
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{game.away_team_name?.charAt(0)}</span>
                  )}
                </div>
                {/* Team Info */}
                <div className="md:mt-2">
                  <div className="flex items-center justify-center gap-2 mb-1 md:mb-2">
                    <div className="w-3 h-3 md:w-4 md:h-4 rounded-full" style={{ backgroundColor: awayColor }}></div>
                    <p className="text-sm sm:text-base md:text-lg font-semibold">{game.away_team_name}</p>
                  </div>
                  <p className="text-4xl sm:text-5xl md:text-6xl font-bold score-display text-white" data-testid="away-score">
                    {calculateScore("away")}
                  </p>
                  <p className="text-xs md:text-sm text-white/60 mt-1">Fouls: {awayTotals.pf}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsor Banner Slideshow - Above Team Statistics */}
      {sponsorBanners.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <SponsorSlideshow banners={sponsorBanners} />
        </div>
      )}

      {/* Team Stats Summary */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 md:py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-[#000000] mb-3 md:mb-4">Team Statistics</h2>
          
          {/* Shooting Stats - Stack on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-6">
            <div>
              <p className="font-semibold mb-2 text-sm md:text-base" style={{ color: homeColor }}>{game.home_team_name} Shooting</p>
              <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                <div className="bg-slate-50 rounded-lg p-2 md:p-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground">FG</p>
                  <p className="font-bold text-xs md:text-sm">{homeTotals.fg_made}/{homeTotals.fg_att}</p>
                  <p className="text-sm md:text-lg font-bold" style={{ color: homeColor }}>{homeTotals.fg_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 md:p-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground">3PT</p>
                  <p className="font-bold text-xs md:text-sm">{homeTotals.fg3_made}/{homeTotals.fg3_att}</p>
                  <p className="text-sm md:text-lg font-bold" style={{ color: homeColor }}>{homeTotals.fg3_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 md:p-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground">FT</p>
                  <p className="font-bold text-xs md:text-sm">{homeTotals.ft_made}/{homeTotals.ft_att}</p>
                  <p className="text-sm md:text-lg font-bold" style={{ color: homeColor }}>{homeTotals.ft_pct}%</p>
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-2 text-sm md:text-base" style={{ color: awayColor }}>{game.away_team_name} Shooting</p>
              <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                <div className="bg-slate-50 rounded-lg p-2 md:p-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground">FG</p>
                  <p className="font-bold text-xs md:text-sm">{awayTotals.fg_made}/{awayTotals.fg_att}</p>
                  <p className="text-sm md:text-lg font-bold" style={{ color: awayColor }}>{awayTotals.fg_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 md:p-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground">3PT</p>
                  <p className="font-bold text-xs md:text-sm">{awayTotals.fg3_made}/{awayTotals.fg3_att}</p>
                  <p className="text-sm md:text-lg font-bold" style={{ color: awayColor }}>{awayTotals.fg3_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 md:p-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground">FT</p>
                  <p className="font-bold text-xs md:text-sm">{awayTotals.ft_made}/{awayTotals.ft_att}</p>
                  <p className="text-sm md:text-lg font-bold" style={{ color: awayColor }}>{awayTotals.ft_pct}%</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Other Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Off. Reb</p>
              <p className="text-lg font-bold" style={{ color: homeColor }}>{homeTotals.oreb}</p>
              <p className="text-lg font-bold" style={{ color: awayColor }}>{awayTotals.oreb}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Def. Reb</p>
              <p className="text-lg font-bold" style={{ color: homeColor }}>{homeTotals.dreb}</p>
              <p className="text-lg font-bold" style={{ color: awayColor }}>{awayTotals.dreb}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Reb</p>
              <p className="text-lg font-bold" style={{ color: homeColor }}>{homeTotals.reb}</p>
              <p className="text-lg font-bold" style={{ color: awayColor }}>{awayTotals.reb}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Assists</p>
              <p className="text-lg font-bold" style={{ color: homeColor }}>{homeTotals.ast}</p>
              <p className="text-lg font-bold" style={{ color: awayColor }}>{awayTotals.ast}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Steals</p>
              <p className="text-lg font-bold" style={{ color: homeColor }}>{homeTotals.stl}</p>
              <p className="text-lg font-bold" style={{ color: awayColor }}>{awayTotals.stl}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Turnovers</p>
              <p className="text-lg font-bold" style={{ color: homeColor }}>{homeTotals.to}</p>
              <p className="text-lg font-bold" style={{ color: awayColor }}>{awayTotals.to}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Fouls</p>
              <p className="text-lg font-bold" style={{ color: homeColor }}>{homeTotals.pf}</p>
              <p className="text-lg font-bold" style={{ color: awayColor }}>{awayTotals.pf}</p>
            </div>
          </div>
          
          {/* Game Flow Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Lead Changes</p>
              <p className="text-2xl font-bold text-[#000000]">{game.game_stats?.lead_changes || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Times Tied</p>
              <p className="text-2xl font-bold text-[#000000]">{game.game_stats?.ties || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">{game.home_team_name} Lead</p>
              <p className="text-2xl font-bold" style={{ color: homeColor }}>{game.game_stats?.home_largest_lead || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">{game.away_team_name} Lead</p>
              <p className="text-2xl font-bold" style={{ color: awayColor }}>{game.game_stats?.away_largest_lead || 0}</p>
            </div>
          </div>
          
          <div className="flex justify-center gap-8 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: homeColor }}></div>
              <span>{game.home_team_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayColor }}></div>
              <span>{game.away_team_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box Score Tables and Play-by-Play */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Box Score */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="text-center mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-[#000000]" data-testid="boxscore-title">
                {game.home_team_name} vs {game.away_team_name}
              </h2>
              <p className="text-muted-foreground">Box Score</p>
            </div>
            
            <TeamTable 
              teamName={game.home_team_name} 
              stats={homeStats} 
              totals={homeTotals}
              teamColor={homeColor}
            />
            
            <TeamTable 
              teamName={game.away_team_name} 
              stats={awayStats} 
              totals={awayTotals}
              teamColor={awayColor}
            />
          </div>
          
          {/* Play by Play */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#000000] mb-4">Play-by-Play</h2>
            <ScrollArea className="h-[600px]">
              {playByPlay.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No plays recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {[...playByPlay].reverse().map((play, idx) => (
                    <div 
                      key={play.id || idx} 
                      className={`p-3 rounded text-sm ${play.team === 'home' ? 'bg-red-50 border-l-2 border-red-500' : 'bg-purple-50 border-l-2 border-purple-500'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">#{play.player_number} {play.player_name}</span>
                          <p className="text-muted-foreground">{play.action}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">{getQuarterLabel(play.quarter)}</span>
                          <p className="font-bold">{play.home_score}-{play.away_score}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

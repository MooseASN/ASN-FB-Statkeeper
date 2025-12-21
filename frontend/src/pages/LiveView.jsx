import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { RefreshCw } from "lucide-react";
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

// TeamTable component - moved outside main component to avoid re-creation on render
const TeamTable = ({ teamName, stats, totals, isHome }) => (
  <div className="mb-8">
    <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isHome ? 'text-[#dc2626]' : 'text-[#7c3aed]'}`}>
      <div className={`w-3 h-3 rounded-full ${isHome ? 'bg-[#dc2626]' : 'bg-[#7c3aed]'}`}></div>
      {teamName}
    </h3>
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-center">PTS</TableHead>
            <TableHead className="text-center">FG</TableHead>
            <TableHead className="text-center">FG%</TableHead>
            <TableHead className="text-center">3PT</TableHead>
            <TableHead className="text-center">3P%</TableHead>
            <TableHead className="text-center">FT</TableHead>
            <TableHead className="text-center">FT%</TableHead>
            <TableHead className="text-center">OREB</TableHead>
            <TableHead className="text-center">DREB</TableHead>
            <TableHead className="text-center">REB</TableHead>
            <TableHead className="text-center">AST</TableHead>
            <TableHead className="text-center">STL</TableHead>
            <TableHead className="text-center">BLK</TableHead>
            <TableHead className="text-center">TO</TableHead>
            <TableHead className="text-center">PF</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortByNumber(stats).map(s => {
            const calc = calculatePlayerStats(s);
            return (
              <TableRow key={s.id}>
                <TableCell className="font-bold">{s.player_number}</TableCell>
                <TableCell className="font-medium">{s.player_name}</TableCell>
                <TableCell className="text-center font-bold">{calc.pts}</TableCell>
                <TableCell className="text-center">{calc.fg_made}-{calc.fg_att}</TableCell>
                <TableCell className="text-center">{calc.fg_pct}%</TableCell>
                <TableCell className="text-center">{s.fg3_made}-{calc.fg3_att}</TableCell>
                <TableCell className="text-center">{calc.fg3_pct}%</TableCell>
                <TableCell className="text-center">{s.ft_made}-{calc.ft_att}</TableCell>
                <TableCell className="text-center">{calc.ft_pct}%</TableCell>
                <TableCell className="text-center">{s.offensive_rebounds}</TableCell>
                <TableCell className="text-center">{s.defensive_rebounds}</TableCell>
                <TableCell className="text-center">{calc.totalReb}</TableCell>
                <TableCell className="text-center">{s.assists}</TableCell>
                <TableCell className="text-center">{s.steals}</TableCell>
                <TableCell className="text-center">{s.blocks}</TableCell>
                <TableCell className="text-center">{s.turnovers}</TableCell>
                <TableCell className="text-center">{s.fouls >= 5 ? <span className="text-red-500 font-bold">{s.fouls}</span> : s.fouls}</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-slate-100 font-bold">
            <TableCell></TableCell>
            <TableCell>TOTALS</TableCell>
            <TableCell className="text-center">{totals.pts}</TableCell>
            <TableCell className="text-center">{totals.fg_made}-{totals.fg_att}</TableCell>
            <TableCell className="text-center">{totals.fg_pct}%</TableCell>
            <TableCell className="text-center">{totals.fg3_made}-{totals.fg3_att}</TableCell>
            <TableCell className="text-center">{totals.fg3_pct}%</TableCell>
            <TableCell className="text-center">{totals.ft_made}-{totals.ft_att}</TableCell>
            <TableCell className="text-center">{totals.ft_pct}%</TableCell>
            <TableCell className="text-center">{totals.oreb}</TableCell>
            <TableCell className="text-center">{totals.dreb}</TableCell>
            <TableCell className="text-center">{totals.reb}</TableCell>
            <TableCell className="text-center">{totals.ast}</TableCell>
            <TableCell className="text-center">{totals.stl}</TableCell>
            <TableCell className="text-center">{totals.blk}</TableCell>
            <TableCell className="text-center">{totals.to}</TableCell>
            <TableCell className="text-center">{totals.pf}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
);

export default function LiveView() {
  const { shareCode } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchGame = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/share/${shareCode}`);
      setGame(res.data);
      setLastUpdated(new Date());
      setError(null);
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
    if (q <= 4) return `Q${q}`;
    return `OT${q - 4}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#1e3a5f]" />
          <p className="mt-4 text-muted-foreground">Loading live stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2">Game Not Found</h2>
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
              <Trophy className="w-6 h-6 text-[#1e3a5f]" />
              <span className="font-bold text-[#1e3a5f]">Court Metrics</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              <span>Auto-refresh</span>
              {game.status === "active" && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  LIVE
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
      <div className="bg-[#1e3a5f] text-white py-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="game-title">
            {game.home_team_name} vs {game.away_team_name}
          </h1>
          <p className="text-white/70 mt-1">
            {game.status === "active" ? `Live - ${getQuarterLabel(game.current_quarter)}` : "Final Score"}
          </p>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-lg font-semibold">{game.home_team_name}</p>
              <p className="text-6xl font-bold score-display mt-2" data-testid="home-score">
                {calculateScore("home")}
              </p>
              <p className="text-sm text-white/60 mt-1">Team Fouls: {homeTotals.pf}</p>
            </div>
            
            <div className="px-8 text-center">
              <div className="mb-4">
                <span className={`text-xl font-bold px-4 py-2 rounded-lg ${
                  game.status === "active" ? "bg-orange-500" : "bg-white/20"
                }`}>
                  {game.status === "active" ? getQuarterLabel(game.current_quarter) : "FINAL"}
                </span>
              </div>
              <div className="grid gap-3 text-sm" style={{ gridTemplateColumns: `auto repeat(${totalQuarters}, 1fr)` }}>
                <div></div>
                {Array.from({ length: totalQuarters }, (_, i) => i + 1).map(q => (
                  <div key={q} className="text-white/60">{getQuarterLabel(q)}</div>
                ))}
                <div className="text-left">Home</div>
                {Array.from({ length: totalQuarters }, (_, i) => (
                  <div key={i} className="font-bold">{homeScores[i] || 0}</div>
                ))}
                <div className="text-left">Away</div>
                {Array.from({ length: totalQuarters }, (_, i) => (
                  <div key={i} className="font-bold">{awayScores[i] || 0}</div>
                ))}
              </div>
            </div>
            
            <div className="text-center flex-1">
              <p className="text-lg font-semibold">{game.away_team_name}</p>
              <p className="text-6xl font-bold score-display mt-2" data-testid="away-score">
                {calculateScore("away")}
              </p>
              <p className="text-sm text-white/60 mt-1">Team Fouls: {awayTotals.pf}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats Summary */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Team Statistics</h2>
          
          {/* Shooting Stats */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="font-semibold text-[#dc2626] mb-2">{game.home_team_name} Shooting</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">FG</p>
                  <p className="font-bold">{homeTotals.fg_made}/{homeTotals.fg_att}</p>
                  <p className="text-lg font-bold text-[#dc2626]">{homeTotals.fg_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">3PT</p>
                  <p className="font-bold">{homeTotals.fg3_made}/{homeTotals.fg3_att}</p>
                  <p className="text-lg font-bold text-[#dc2626]">{homeTotals.fg3_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">FT</p>
                  <p className="font-bold">{homeTotals.ft_made}/{homeTotals.ft_att}</p>
                  <p className="text-lg font-bold text-[#dc2626]">{homeTotals.ft_pct}%</p>
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-[#7c3aed] mb-2">{game.away_team_name} Shooting</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">FG</p>
                  <p className="font-bold">{awayTotals.fg_made}/{awayTotals.fg_att}</p>
                  <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.fg_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">3PT</p>
                  <p className="font-bold">{awayTotals.fg3_made}/{awayTotals.fg3_att}</p>
                  <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.fg3_pct}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">FT</p>
                  <p className="font-bold">{awayTotals.ft_made}/{awayTotals.ft_att}</p>
                  <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.ft_pct}%</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Other Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Off. Reb</p>
              <p className="text-lg font-bold text-[#dc2626]">{homeTotals.oreb}</p>
              <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.oreb}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Def. Reb</p>
              <p className="text-lg font-bold text-[#dc2626]">{homeTotals.dreb}</p>
              <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.dreb}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Reb</p>
              <p className="text-lg font-bold text-[#dc2626]">{homeTotals.reb}</p>
              <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.reb}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Assists</p>
              <p className="text-lg font-bold text-[#dc2626]">{homeTotals.ast}</p>
              <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.ast}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Steals</p>
              <p className="text-lg font-bold text-[#dc2626]">{homeTotals.stl}</p>
              <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.stl}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Turnovers</p>
              <p className="text-lg font-bold text-[#dc2626]">{homeTotals.to}</p>
              <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.to}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Fouls</p>
              <p className="text-lg font-bold text-[#dc2626]">{homeTotals.pf}</p>
              <p className="text-lg font-bold text-[#7c3aed]">{awayTotals.pf}</p>
            </div>
          </div>
          <div className="flex justify-center gap-8 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#dc2626]"></div>
              <span>{game.home_team_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#7c3aed]"></div>
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
              <h2 className="text-2xl font-bold text-[#1e3a5f]" data-testid="boxscore-title">
                {game.home_team_name} vs {game.away_team_name}
              </h2>
              <p className="text-muted-foreground">Box Score</p>
            </div>
            
            <TeamTable 
              teamName={game.home_team_name} 
              stats={homeStats} 
              totals={homeTotals}
              isHome={true}
            />
            
            <TeamTable 
              teamName={game.away_team_name} 
              stats={awayStats} 
              totals={awayTotals}
              isHome={false}
            />
          </div>
          
          {/* Play by Play */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Play-by-Play</h2>
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

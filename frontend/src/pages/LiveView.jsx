import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Trophy, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

  const calculatePlayerStats = (stats) => {
    const pts = stats.ft_made + (stats.fg2_made * 2) + (stats.fg3_made * 3);
    const totalReb = stats.offensive_rebounds + stats.defensive_rebounds;
    const fg_made = stats.fg2_made + stats.fg3_made;
    const fg_att = fg_made + stats.fg2_missed + stats.fg3_missed;
    const fg3_att = stats.fg3_made + stats.fg3_missed;
    const ft_att = stats.ft_made + stats.ft_missed;
    
    return { pts, totalReb, fg_made, fg_att, fg3_att, ft_att };
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
    
    return totals;
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

  const TeamTable = ({ teamName, stats, totals, isHome }) => (
    <div className="mb-8">
      <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isHome ? 'text-[#1e3a5f]' : 'text-orange-500'}`}>
        <div className={`w-3 h-3 rounded-full ${isHome ? 'bg-[#1e3a5f]' : 'bg-orange-500'}`}></div>
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
              <TableHead className="text-center">3PT</TableHead>
              <TableHead className="text-center">FT</TableHead>
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
            {stats.map(s => {
              const calc = calculatePlayerStats(s);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-bold">{s.player_number}</TableCell>
                  <TableCell className="font-medium">{s.player_name}</TableCell>
                  <TableCell className="text-center font-bold">{calc.pts}</TableCell>
                  <TableCell className="text-center">{calc.fg_made}-{calc.fg_att}</TableCell>
                  <TableCell className="text-center">{s.fg3_made}-{calc.fg3_att}</TableCell>
                  <TableCell className="text-center">{s.ft_made}-{calc.ft_att}</TableCell>
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
              <TableCell className="text-center">{totals.fg3_made}-{totals.fg3_att}</TableCell>
              <TableCell className="text-center">{totals.ft_made}-{totals.ft_att}</TableCell>
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
            </div>
          </div>
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
                  {game.status === "active" ? `Q${game.current_quarter}` : "FINAL"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3 text-sm">
                <div></div>
                {[1, 2, 3, 4].map(q => (
                  <div key={q} className="text-white/60">Q{q}</div>
                ))}
                <div className="text-left">Home</div>
                {game.quarter_scores?.home?.map((s, i) => (
                  <div key={i} className="font-bold">{s}</div>
                ))}
                <div className="text-left">Away</div>
                {game.quarter_scores?.away?.map((s, i) => (
                  <div key={i} className="font-bold">{s}</div>
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

      {/* Box Score Tables */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-6">Box Score</h2>
          
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
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

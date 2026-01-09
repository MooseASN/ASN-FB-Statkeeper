import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Trophy, Users, Calendar, BarChart3, 
  ChevronRight, MapPin, Clock
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper to format 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function SeasonStats() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(null);
  const [school, setSchool] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [games, setGames] = useState([]);
  const [record, setRecord] = useState({ wins: 0, losses: 0, ties: 0 });

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("session_token") || sessionStorage.getItem("session_token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      // Get school info
      const schoolRes = await axios.get(`${API}/schools/my-school`);
      setSchool(schoolRes.data);
      const schoolId = schoolRes.data.school_id;
      
      // Get season details
      const seasonRes = await axios.get(`${API}/schools/${schoolId}/seasons/${seasonId}`);
      setSeason(seasonRes.data);
      
      // Get season games
      const gamesRes = await axios.get(`${API}/schools/${schoolId}/seasons/${seasonId}/games`);
      const seasonGames = gamesRes.data || [];
      setGames(seasonGames);
      
      // Calculate record
      let wins = 0, losses = 0, ties = 0;
      seasonGames.forEach(game => {
        if (game.status === "final") {
          const ourTeamId = seasonRes.data.team_id;
          const isHome = game.home_team_id === ourTeamId;
          const ourScore = isHome ? game.home_score : game.away_score;
          const theirScore = isHome ? game.away_score : game.home_score;
          
          if (ourScore > theirScore) wins++;
          else if (ourScore < theirScore) losses++;
          else ties++;
        }
      });
      setRecord({ wins, losses, ties });
      
      // Calculate player stats from games
      const playerStatsMap = {};
      
      seasonGames.forEach(game => {
        if (game.status === "final" && game.stats) {
          // Process stats for each player
          Object.entries(game.stats).forEach(([playerId, stats]) => {
            if (!playerStatsMap[playerId]) {
              playerStatsMap[playerId] = {
                id: playerId,
                name: stats.name || `Player ${playerId}`,
                number: stats.number || "",
                games: 0,
                points: 0,
                rebounds: 0,
                assists: 0,
                steals: 0,
                blocks: 0,
                turnovers: 0,
                fgm: 0, fga: 0,
                tpm: 0, tpa: 0,
                ftm: 0, fta: 0,
                // Football stats
                passingYards: 0, passingTDs: 0,
                rushingYards: 0, rushingTDs: 0,
                receivingYards: 0, receivingTDs: 0,
                tackles: 0, sacks: 0, interceptions: 0
              };
            }
            
            const p = playerStatsMap[playerId];
            p.games++;
            
            // Basketball stats
            if (stats.points !== undefined) p.points += stats.points || 0;
            if (stats.rebounds !== undefined) p.rebounds += (stats.offensive_rebounds || 0) + (stats.defensive_rebounds || 0);
            if (stats.assists !== undefined) p.assists += stats.assists || 0;
            if (stats.steals !== undefined) p.steals += stats.steals || 0;
            if (stats.blocks !== undefined) p.blocks += stats.blocks || 0;
            if (stats.turnovers !== undefined) p.turnovers += stats.turnovers || 0;
            
            // Football stats
            if (stats.passing_yards !== undefined) p.passingYards += stats.passing_yards || 0;
            if (stats.passing_tds !== undefined) p.passingTDs += stats.passing_tds || 0;
            if (stats.rushing_yards !== undefined) p.rushingYards += stats.rushing_yards || 0;
            if (stats.rushing_tds !== undefined) p.rushingTDs += stats.rushing_tds || 0;
            if (stats.receiving_yards !== undefined) p.receivingYards += stats.receiving_yards || 0;
            if (stats.receiving_tds !== undefined) p.receivingTDs += stats.receiving_tds || 0;
            if (stats.tackles !== undefined) p.tackles += stats.tackles || 0;
            if (stats.sacks !== undefined) p.sacks += stats.sacks || 0;
            if (stats.interceptions !== undefined) p.interceptions += stats.interceptions || 0;
          });
        }
      });
      
      setPlayerStats(Object.values(playerStatsMap).sort((a, b) => b.points - a.points));
      
      // Calculate team totals
      const teamTotals = Object.values(playerStatsMap).reduce((acc, p) => ({
        points: acc.points + p.points,
        rebounds: acc.rebounds + p.rebounds,
        assists: acc.assists + p.assists,
        steals: acc.steals + p.steals,
        blocks: acc.blocks + p.blocks,
        turnovers: acc.turnovers + p.turnovers,
        passingYards: acc.passingYards + p.passingYards,
        rushingYards: acc.rushingYards + p.rushingYards,
        receivingYards: acc.receivingYards + p.receivingYards
      }), { 
        points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
        passingYards: 0, rushingYards: 0, receivingYards: 0
      });
      
      const gamesPlayed = seasonGames.filter(g => g.status === "final").length;
      setTeamStats({
        ...teamTotals,
        gamesPlayed,
        avgPoints: gamesPlayed ? (teamTotals.points / gamesPlayed).toFixed(1) : 0,
        avgRebounds: gamesPlayed ? (teamTotals.rebounds / gamesPlayed).toFixed(1) : 0,
        avgAssists: gamesPlayed ? (teamTotals.assists / gamesPlayed).toFixed(1) : 0
      });
      
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Failed to load stats");
      }
    } finally {
      setLoading(false);
    }
  }, [seasonId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-orange-500 mx-auto animate-pulse" />
          <p className="text-slate-400 mt-4">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Season not found</p>
          <Button onClick={() => navigate("/school-dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isBasketball = season.sport === "basketball";

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/school-dashboard")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isBasketball ? "🏀" : "🏈"}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{season.name}</h1>
              <p className="text-sm text-slate-400">{school?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Record Summary */}
        <div className="mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Season Record</h2>
                  <p className="text-3xl font-bold text-orange-500 mt-2">
                    {record.wins}-{record.losses}{record.ties > 0 && `-${record.ties}`}
                  </p>
                </div>
                <Trophy className="w-12 h-12 text-orange-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="team" className="space-y-4">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="team">Team Stats</TabsTrigger>
            <TabsTrigger value="players">Player Stats</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* Team Stats Tab */}
          <TabsContent value="team">
            {teamStats && teamStats.gamesPlayed > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isBasketball ? (
                  <>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Avg Points</p>
                        <p className="text-2xl font-bold text-white">{teamStats.avgPoints}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Avg Rebounds</p>
                        <p className="text-2xl font-bold text-white">{teamStats.avgRebounds}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Avg Assists</p>
                        <p className="text-2xl font-bold text-white">{teamStats.avgAssists}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Total Points</p>
                        <p className="text-2xl font-bold text-white">{teamStats.points}</p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Passing Yards</p>
                        <p className="text-2xl font-bold text-white">{teamStats.passingYards}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Rushing Yards</p>
                        <p className="text-2xl font-bold text-white">{teamStats.rushingYards}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Receiving Yards</p>
                        <p className="text-2xl font-bold text-white">{teamStats.receivingYards}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-400 text-sm">Games Played</p>
                        <p className="text-2xl font-bold text-white">{teamStats.gamesPlayed}</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No completed games yet</p>
                  <p className="text-slate-500 text-sm mt-2">Stats will appear after games are completed</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Player Stats Tab */}
          <TabsContent value="players">
            {playerStats.length > 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-800">
                        <tr className="border-b border-slate-700">
                          <th className="text-left text-slate-400 text-sm p-3">Player</th>
                          <th className="text-center text-slate-400 text-sm p-3">GP</th>
                          {isBasketball ? (
                            <>
                              <th className="text-center text-slate-400 text-sm p-3">PTS</th>
                              <th className="text-center text-slate-400 text-sm p-3">REB</th>
                              <th className="text-center text-slate-400 text-sm p-3">AST</th>
                              <th className="text-center text-slate-400 text-sm p-3">STL</th>
                              <th className="text-center text-slate-400 text-sm p-3">BLK</th>
                            </>
                          ) : (
                            <>
                              <th className="text-center text-slate-400 text-sm p-3">PASS YDS</th>
                              <th className="text-center text-slate-400 text-sm p-3">RUSH YDS</th>
                              <th className="text-center text-slate-400 text-sm p-3">REC YDS</th>
                              <th className="text-center text-slate-400 text-sm p-3">TKL</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats.map(player => (
                          <tr key={player.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-orange-400 font-bold">#{player.number}</span>
                                <span className="text-white">{player.name}</span>
                              </div>
                            </td>
                            <td className="text-center p-3 text-slate-300">{player.games}</td>
                            {isBasketball ? (
                              <>
                                <td className="text-center p-3 text-white font-semibold">{player.points}</td>
                                <td className="text-center p-3 text-slate-300">{player.rebounds}</td>
                                <td className="text-center p-3 text-slate-300">{player.assists}</td>
                                <td className="text-center p-3 text-slate-300">{player.steals}</td>
                                <td className="text-center p-3 text-slate-300">{player.blocks}</td>
                              </>
                            ) : (
                              <>
                                <td className="text-center p-3 text-slate-300">{player.passingYards}</td>
                                <td className="text-center p-3 text-slate-300">{player.rushingYards}</td>
                                <td className="text-center p-3 text-slate-300">{player.receivingYards}</td>
                                <td className="text-center p-3 text-slate-300">{player.tackles}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No player stats yet</p>
                  <p className="text-slate-500 text-sm mt-2">Play some games to see individual stats</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <div className="space-y-3">
              {games.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No games scheduled</p>
                  </CardContent>
                </Card>
              ) : (
                games
                  .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                  .map(game => (
                    <Card key={game.id} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[80px]">
                              <div className="text-sm font-medium text-white">{game.scheduled_date}</div>
                              <div className="text-xs text-slate-500">{formatTime12Hour(game.scheduled_time)}</div>
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                {game.home_team_name} vs {game.away_team_name}
                              </div>
                              {game.location && (
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {game.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {game.status === "final" ? (
                              <div>
                                <p className="text-2xl font-bold text-white">
                                  {game.home_score} - {game.away_score}
                                </p>
                                <Badge variant="secondary">Final</Badge>
                              </div>
                            ) : game.status === "active" ? (
                              <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-600">Scheduled</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, History, PlayCircle, Code, Check, Calendar, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import MooseIcon from "@/components/MooseIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeGames, setActiveGames] = useState([]);
  const [scheduledGames, setScheduledGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [startingGameId, setStartingGameId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, teamsRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/teams`)
      ]);
      
      const games = gamesRes.data;
      setActiveGames(games.filter(g => g.status === "active"));
      setScheduledGames(games.filter(g => g.status === "scheduled").sort((a, b) => {
        // Sort by scheduled date
        if (a.scheduled_date && b.scheduled_date) {
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }
        return 0;
      }));
      setRecentGames(games.filter(g => g.status === "completed").slice(0, 5));
      setTeams(teamsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (quarterScores, team) => {
    return quarterScores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const copyEmbedCode = () => {
    const embedUrl = `${window.location.origin}/embed/latest/${user.user_id}`;
    const embedCode = `<iframe src="${embedUrl}" width="1920" height="300" frameborder="0" style="max-width:100%;" allowfullscreen></iframe>`;
    
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    toast.success("Embed code copied! It will always show your latest live game.");
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const handleStartScheduledGame = async (gameId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setStartingGameId(gameId);
    try {
      await axios.post(`${API}/games/${gameId}/start`);
      toast.success("Game started!");
      navigate(`/game/${gameId}`);
    } catch (error) {
      toast.error("Failed to start game");
    } finally {
      setStartingGameId(null);
    }
  };

  const formatScheduledDate = (dateStr, timeStr) => {
    if (!dateStr) return "No date set";
    
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateText;
    if (date.getTime() === today.getTime()) {
      dateText = "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      dateText = "Tomorrow";
    } else {
      dateText = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    if (timeStr) {
      return `${dateText} at ${timeStr}`;
    }
    return dateText;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-8" data-testid="dashboard">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#000000] to-[#333333] rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <MooseIcon className="w-10 h-10" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">StatMoose Basketball</h1>
          </div>
          <p className="text-white/80 text-lg mb-6 max-w-xl">
            Track basketball statistics in real-time. Share live stats with your audience.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/new-game">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" data-testid="start-game-btn">
                <PlayCircle className="w-5 h-5 mr-2" />
                New Game
              </Button>
            </Link>
            <Link to="/teams">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="manage-teams-btn">
                <Users className="w-5 h-5 mr-2" />
                Manage Teams
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#000000]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-3xl font-bold text-[#000000]">{teams.length}</p>
                </div>
                <Users className="w-10 h-10 text-[#000000]/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="text-3xl font-bold text-blue-500">{scheduledGames.length}</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Live</p>
                  <p className="text-3xl font-bold text-orange-500">{activeGames.length}</p>
                </div>
                <PlayCircle className="w-10 h-10 text-orange-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-emerald-500">{recentGames.length}</p>
                </div>
                <History className="w-10 h-10 text-emerald-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Games */}
        {scheduledGames.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-500" />
              Scheduled Games
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledGames.map(game => (
                <Card key={game.id} className="border-2 border-blue-200" data-testid={`scheduled-game-${game.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        <p className="font-semibold text-lg">{game.home_team_name}</p>
                        <p className="text-sm text-muted-foreground">Home</p>
                      </div>
                      <div className="px-4">
                        <span className="text-lg font-bold text-slate-400">VS</span>
                      </div>
                      <div className="text-center flex-1">
                        <p className="font-semibold text-lg">{game.away_team_name}</p>
                        <p className="text-sm text-muted-foreground">Away</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {formatScheduledDate(game.scheduled_date, game.scheduled_time)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={(e) => handleStartScheduledGame(game.id, e)}
                        disabled={startingGameId === game.id}
                        data-testid={`start-scheduled-${game.id}`}
                      >
                        <PlayCircle className="w-4 h-4 mr-1" />
                        {startingGameId === game.id ? "Starting..." : "Start Now"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Games */}
        {activeGames.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-orange-500" />
                Live Games
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={copyEmbedCode}
                className="gap-2"
                data-testid="copy-embed-btn"
              >
                {embedCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4" />
                    Copy Embed Code
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The embed will always show your latest live game and auto-updates every 5 seconds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGames.map(game => (
                <Link key={game.id} to={`/game/${game.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-orange-200" data-testid={`active-game-${game.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <p className="font-semibold text-lg">{game.home_team_name}</p>
                          <p className="text-4xl font-bold score-display text-[#000000]">
                            {calculateScore(game.quarter_scores, "home")}
                          </p>
                        </div>
                        <div className="px-4">
                          <span className="text-sm bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
                            Q{game.current_quarter}
                          </span>
                        </div>
                        <div className="text-center flex-1">
                          <p className="font-semibold text-lg">{game.away_team_name}</p>
                          <p className="text-4xl font-bold score-display text-[#000000]">
                            {calculateScore(game.quarter_scores, "away")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                Recent Games
              </h2>
              <Link to="/history">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentGames.map(game => (
                <Link key={game.id} to={`/game/${game.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`recent-game-${game.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{game.home_team_name}</span>
                          <span className="text-2xl font-bold score-display">
                            {calculateScore(game.quarter_scores, "home")} - {calculateScore(game.quarter_scores, "away")}
                          </span>
                          <span className="font-medium">{game.away_team_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(game.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && teams.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first team to start tracking games</p>
              <Link to="/teams">
                <Button data-testid="create-first-team-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

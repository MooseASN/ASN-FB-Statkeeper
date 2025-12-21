import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, ChevronRight, FileDown, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GameHistory({ user, onLogout }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await axios.get(`${API}/games`);
      setGames(res.data);
    } catch (error) {
      toast.error("Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (game, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await axios.get(`${API}/games/${game.id}/boxscore/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `boxscore_${game.home_team_name}_vs_${game.away_team_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const calculateScore = (quarterScores, team) => {
    return quarterScores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="game-history-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">Game History</h1>
          <p className="text-muted-foreground">View past games and download box scores</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading games...</div>
        ) : games.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <History className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Games Yet</h3>
              <p className="text-muted-foreground mb-4">Start a new game to see it here</p>
              <Link to="/new-game">
                <Button>Start New Game</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {games.map(game => {
              const homeScore = calculateScore(game.quarter_scores, "home");
              const awayScore = calculateScore(game.quarter_scores, "away");
              const isHomeWinner = homeScore > awayScore;
              const isAwayWinner = awayScore > homeScore;
              
              return (
                <Link key={game.id} to={`/game/${game.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`game-card-${game.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className={`flex-1 ${isHomeWinner ? 'font-bold' : ''}`}>
                              <span className="text-[#000000]">{game.home_team_name}</span>
                              <span className="ml-2 text-2xl score-display">{homeScore}</span>
                            </div>
                            <div className="text-slate-300">-</div>
                            <div className={`flex-1 text-right ${isAwayWinner ? 'font-bold' : ''}`}>
                              <span className="text-2xl score-display">{awayScore}</span>
                              <span className="ml-2 text-orange-500">{game.away_team_name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{new Date(game.created_at).toLocaleDateString()}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              game.status === "active" 
                                ? "bg-green-100 text-green-700" 
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {game.status === "active" ? "In Progress" : "Final"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDownloadPDF(game, e)}
                            data-testid={`download-pdf-${game.id}`}
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

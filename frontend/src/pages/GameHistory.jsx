import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { History, ChevronRight, FileDown, Trash2, Search, Filter, Calendar, Clock } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GameHistory({ user, onLogout }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "scheduled", "active", "completed"
  const [deleteGameId, setDeleteGameId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteGame = async () => {
    if (!deleteGameId) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/games/${deleteGameId}`);
      setGames(games.filter(g => g.id !== deleteGameId));
      toast.success("Game deleted successfully");
    } catch (error) {
      toast.error("Failed to delete game");
    } finally {
      setDeleting(false);
      setDeleteGameId(null);
    }
  };

  const calculateScore = (quarterScores, team) => {
    return quarterScores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const formatScheduledDate = (dateStr, timeStr) => {
    if (!dateStr) return null;
    
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

  const getStatusBadge = (game) => {
    if (game.status === "scheduled") {
      return {
        className: "bg-blue-100 text-blue-700",
        label: "Scheduled"
      };
    }
    if (game.status === "active") {
      return {
        className: "bg-green-100 text-green-700",
        label: "In Progress"
      };
    }
    return {
      className: "bg-slate-100 text-slate-600",
      label: "Final"
    };
  };

  // Filter games based on search query and status
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // Status filter
      if (statusFilter !== "all" && game.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const homeTeam = game.home_team_name?.toLowerCase() || "";
        const awayTeam = game.away_team_name?.toLowerCase() || "";
        const date = new Date(game.created_at).toLocaleDateString().toLowerCase();
        
        return homeTeam.includes(query) || 
               awayTeam.includes(query) || 
               date.includes(query);
      }
      
      return true;
    });
  }, [games, searchQuery, statusFilter]);

  const gameToDelete = games.find(g => g.id === deleteGameId);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="game-history-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">Game History</h1>
          <p className="text-muted-foreground">View past games and download box scores</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by team name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={statusFilter === "all" ? "bg-black hover:bg-gray-800" : ""}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "scheduled" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("scheduled")}
              className={statusFilter === "scheduled" ? "bg-blue-600 hover:bg-blue-700" : ""}
              data-testid="filter-scheduled"
            >
              <Calendar className="w-3 h-3 mr-1" />
              Scheduled
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className={statusFilter === "active" ? "bg-green-600 hover:bg-green-700" : ""}
              data-testid="filter-active"
            >
              <Filter className="w-3 h-3 mr-1" />
              Active
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("completed")}
              className={statusFilter === "completed" ? "bg-slate-600 hover:bg-slate-700" : ""}
              data-testid="filter-completed"
            >
              <Filter className="w-3 h-3 mr-1" />
              Completed
            </Button>
          </div>
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
        ) : filteredGames.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Matching Games</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Results count */}
            <p className="text-sm text-muted-foreground">
              Showing {filteredGames.length} of {games.length} games
            </p>
            
            {filteredGames.map(game => {
              const homeScore = calculateScore(game.quarter_scores, "home");
              const awayScore = calculateScore(game.quarter_scores, "away");
              const isHomeWinner = homeScore > awayScore;
              const isAwayWinner = awayScore > homeScore;
              const statusBadge = getStatusBadge(game);
              const isScheduled = game.status === "scheduled";
              const scheduledInfo = isScheduled ? formatScheduledDate(game.scheduled_date, game.scheduled_time) : null;
              
              return (
                <Link key={game.id} to={`/game/${game.id}`}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isScheduled ? 'border-2 border-blue-200' : ''}`} data-testid={`game-card-${game.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className={`flex-1 ${!isScheduled && isHomeWinner ? 'font-bold' : ''}`}>
                              <span className="text-[#000000]">{game.home_team_name}</span>
                              {!isScheduled && (
                                <span className="ml-2 text-2xl score-display">{homeScore}</span>
                              )}
                            </div>
                            <div className="text-slate-300">{isScheduled ? 'VS' : '-'}</div>
                            <div className={`flex-1 text-right ${!isScheduled && isAwayWinner ? 'font-bold' : ''}`}>
                              {!isScheduled && (
                                <span className="text-2xl score-display">{awayScore}</span>
                              )}
                              <span className={`${isScheduled ? '' : 'ml-2'} text-orange-500`}>{game.away_team_name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {isScheduled && scheduledInfo ? (
                              <span className="flex items-center gap-1 text-blue-600 font-medium">
                                <Clock className="w-3 h-3" />
                                {scheduledInfo}
                              </span>
                            ) : (
                              <span>{new Date(game.created_at).toLocaleDateString()}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!isScheduled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDownloadPDF(game, e)}
                              data-testid={`download-pdf-${game.id}`}
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteGameId(game.id);
                            }}
                            data-testid={`delete-game-${game.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteGameId} onOpenChange={() => setDeleteGameId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Game?</AlertDialogTitle>
            <AlertDialogDescription>
              {gameToDelete && (
                <>
                  Are you sure you want to delete the game between{" "}
                  <strong>{gameToDelete.home_team_name}</strong> and{" "}
                  <strong>{gameToDelete.away_team_name}</strong>?
                  <br /><br />
                  This action cannot be undone. All game statistics will be permanently deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGame}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete"
            >
              {deleting ? "Deleting..." : "Delete Game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

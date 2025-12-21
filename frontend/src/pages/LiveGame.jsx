import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Share2, FileDown, Plus, CheckCircle, XCircle, UserPlus, Copy, Check } from "lucide-react";
import Layout from "@/components/Layout";
import PlayerStatRow from "@/components/PlayerStatRow";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LiveGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState("home");
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ number: "", name: "" });
  const [copied, setCopied] = useState(false);

  const fetchGame = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 5000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const handleStatUpdate = async (playerId, statType, increment = 1) => {
    try {
      await axios.post(`${API}/games/${id}/stats`, {
        player_id: playerId,
        stat_type: statType,
        increment: increment
      });
      fetchGame();
    } catch (error) {
      toast.error("Failed to update stat");
    }
  };

  const handleQuarterChange = async (quarter) => {
    try {
      await axios.put(`${API}/games/${id}`, { current_quarter: quarter });
      fetchGame();
    } catch (error) {
      toast.error("Failed to update quarter");
    }
  };

  const handleEndGame = async () => {
    if (!window.confirm("Are you sure you want to end this game?")) return;
    
    try {
      await axios.put(`${API}/games/${id}`, { status: "completed" });
      toast.success("Game ended");
      fetchGame();
    } catch (error) {
      toast.error("Failed to end game");
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayer.number.trim() || !newPlayer.name.trim()) {
      toast.error("Both number and name are required");
      return;
    }

    const teamId = activeTeam === "home" ? game.home_team_id : game.away_team_id;

    try {
      await axios.post(`${API}/games/${id}/players`, {
        team_id: teamId,
        player_number: newPlayer.number.trim(),
        player_name: newPlayer.name.trim()
      });
      toast.success("Player added");
      setNewPlayer({ number: "", name: "" });
      setAddPlayerOpen(false);
      fetchGame();
    } catch (error) {
      toast.error("Failed to add player");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/games/${id}/boxscore/pdf`, {
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

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/live/${game.share_code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Share link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const calculateTeamFouls = (stats) => {
    return stats?.reduce((total, p) => total + (p.fouls || 0), 0) || 0;
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Loading game...</div>
      </Layout>
    );
  }

  if (!game) return null;

  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];
  const currentStats = activeTeam === "home" ? homeStats : awayStats;

  return (
    <Layout>
      <div className="space-y-4" data-testid="live-game-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Live Game</h1>
              <p className="text-sm text-muted-foreground">
                {game.status === "active" ? "In Progress" : "Completed"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="share-btn">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} data-testid="download-pdf-btn">
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="scoreboard rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              {game.home_team_logo && (
                <img src={game.home_team_logo} alt="" className="w-12 h-12 mx-auto rounded-full mb-2" />
              )}
              <p className="font-semibold text-lg">{game.home_team_name}</p>
              <p className="text-5xl font-bold score-display mt-2" data-testid="home-score">
                {calculateScore("home")}
              </p>
              <p className="text-sm text-white/60 mt-1">Team Fouls: {calculateTeamFouls(homeStats)}</p>
            </div>
            
            <div className="px-6 text-center">
              <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3, 4].map(q => (
                  <button
                    key={q}
                    onClick={() => game.status === "active" && handleQuarterChange(q)}
                    className={`quarter-tab ${game.current_quarter === q ? 'active' : ''}`}
                    disabled={game.status !== "active"}
                    data-testid={`quarter-${q}-btn`}
                  >
                    Q{q}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs text-white/80">
                <div></div>
                {[1, 2, 3, 4].map(q => (
                  <div key={q}>Q{q}</div>
                ))}
                <div className="text-left">Home</div>
                {game.quarter_scores?.home?.map((s, i) => (
                  <div key={i}>{s}</div>
                ))}
                <div className="text-left">Away</div>
                {game.quarter_scores?.away?.map((s, i) => (
                  <div key={i}>{s}</div>
                ))}
              </div>
            </div>
            
            <div className="text-center flex-1">
              {game.away_team_logo && (
                <img src={game.away_team_logo} alt="" className="w-12 h-12 mx-auto rounded-full mb-2" />
              )}
              <p className="font-semibold text-lg">{game.away_team_name}</p>
              <p className="text-5xl font-bold score-display mt-2" data-testid="away-score">
                {calculateScore("away")}
              </p>
              <p className="text-sm text-white/60 mt-1">Team Fouls: {calculateTeamFouls(awayStats)}</p>
            </div>
          </div>
        </div>

        {/* Team Tabs */}
        <Tabs value={activeTeam} onValueChange={setActiveTeam}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="home" className="gap-2" data-testid="home-tab">
                <div className="w-3 h-3 rounded-full bg-[#1e3a5f]"></div>
                {game.home_team_name}
              </TabsTrigger>
              <TabsTrigger value="away" className="gap-2" data-testid="away-tab">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                {game.away_team_name}
              </TabsTrigger>
            </TabsList>
            
            {game.status === "active" && (
              <div className="flex gap-2">
                <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="add-player-btn">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Player
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Player to {activeTeam === "home" ? game.home_team_name : game.away_team_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="#"
                          value={newPlayer.number}
                          onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                          className="w-20"
                          data-testid="new-player-number"
                        />
                        <Input
                          placeholder="Player Name"
                          value={newPlayer.name}
                          onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                          className="flex-1"
                          data-testid="new-player-name"
                        />
                      </div>
                      <Button onClick={handleAddPlayer} className="w-full" data-testid="confirm-add-player">
                        Add Player
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button variant="destructive" size="sm" onClick={handleEndGame} data-testid="end-game-btn">
                  End Game
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="home" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {homeStats.length > 0 ? (
                    homeStats.map(player => (
                      <PlayerStatRow 
                        key={player.id} 
                        player={player} 
                        onStatUpdate={handleStatUpdate}
                        disabled={game.status !== "active"}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No players in roster
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="away" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {awayStats.length > 0 ? (
                    awayStats.map(player => (
                      <PlayerStatRow 
                        key={player.id} 
                        player={player} 
                        onStatUpdate={handleStatUpdate}
                        disabled={game.status !== "active"}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No players in roster
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, PlayCircle, Users } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewGame({ user, onLogout }) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API}/teams`);
      setTeams(res.data);
    } catch (error) {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!homeTeamId || !awayTeamId) {
      toast.error("Please select both teams");
      return;
    }

    if (homeTeamId === awayTeamId) {
      toast.error("Please select different teams");
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post(`${API}/games`, {
        home_team_id: homeTeamId,
        away_team_id: awayTeamId
      });
      toast.success("Game started!");
      navigate(`/game/${res.data.id}`);
    } catch (error) {
      toast.error("Failed to create game");
    } finally {
      setCreating(false);
    }
  };

  const selectedHome = teams.find(t => t.id === homeTeamId);
  const selectedAway = teams.find(t => t.id === awayTeamId);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="new-game-page">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">Start New Game</h1>
            <p className="text-muted-foreground">Select teams to begin tracking</p>
          </div>
        </div>

        {teams.length < 2 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Need More Teams</h3>
              <p className="text-muted-foreground mb-4">You need at least 2 teams to start a game</p>
              <Link to="/teams">
                <Button data-testid="create-teams-btn">Create Teams</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select Teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Home Team */}
              <div>
                <Label className="text-base font-semibold text-[#000000]">Home Team</Label>
                <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                  <SelectTrigger className="mt-2" data-testid="home-team-select">
                    <SelectValue placeholder="Select home team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id} disabled={team.id === awayTeamId}>
                        {team.name} ({team.roster?.length || 0} players)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedHome && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Roster: {selectedHome.roster?.length || 0} players
                  </p>
                )}
              </div>

              {/* VS */}
              <div className="text-center">
                <span className="text-2xl font-bold text-slate-300">VS</span>
              </div>

              {/* Away Team */}
              <div>
                <Label className="text-base font-semibold text-orange-500">Away Team</Label>
                <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                  <SelectTrigger className="mt-2" data-testid="away-team-select">
                    <SelectValue placeholder="Select away team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id} disabled={team.id === homeTeamId}>
                        {team.name} ({team.roster?.length || 0} players)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAway && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Roster: {selectedAway.roster?.length || 0} players
                  </p>
                )}
              </div>

              {/* Preview */}
              {homeTeamId && awayTeamId && (
                <div className="bg-gradient-to-r from-[#000000] to-[#333333] rounded-xl p-6 text-white text-center">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{selectedHome?.name}</p>
                      <p className="text-white/60 text-sm">Home</p>
                    </div>
                    <div className="text-3xl font-bold">VS</div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{selectedAway?.name}</p>
                      <p className="text-white/60 text-sm">Away</p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleStartGame} 
                className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
                disabled={!homeTeamId || !awayTeamId || creating}
                data-testid="start-game-btn"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                {creating ? "Starting..." : "Start Game"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

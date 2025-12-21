import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Share2, FileDown, UserPlus, Copy, Check, Undo2, Trophy } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Player Card Component
const PlayerCard = ({ player, teamColor, onStatUpdate, disabled }) => {
  const pts = player.ft_made + (player.fg2_made * 2) + (player.fg3_made * 3);
  
  return (
    <div className="bg-white rounded-lg p-3 mb-3 shadow-sm border" data-testid={`player-card-${player.id}`}>
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: teamColor }}
        >
          {player.player_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm truncate">{player.player_name}</h4>
            <span className="text-lg font-bold ml-2">{pts}</span>
          </div>
          
          {/* Stat Buttons Row */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onStatUpdate(player.id, "ft_made")}
              disabled={disabled}
              className="w-10 h-10 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50"
              data-testid={`ft-btn-${player.id}`}
            >
              FT
            </button>
            <button
              onClick={() => onStatUpdate(player.id, "fg2_made")}
              disabled={disabled}
              className="w-10 h-10 rounded-full border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50"
              data-testid={`fg2-btn-${player.id}`}
            >
              2PT
            </button>
            <button
              onClick={() => onStatUpdate(player.id, "fg3_made")}
              disabled={disabled}
              className="w-10 h-10 rounded-full border-2 border-slate-300 hover:border-orange-500 hover:bg-orange-50 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50"
              data-testid={`fg3-btn-${player.id}`}
            >
              3PT
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-slate-500">F({player.fouls})</span>
              <button
                onClick={() => onStatUpdate(player.id, "foul")}
                disabled={disabled}
                className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold transition-colors disabled:opacity-50"
                data-testid={`foul-btn-${player.id}`}
              >
                +
              </button>
            </div>
          </div>
          
          {/* Secondary Stats */}
          <div className="flex gap-1 mt-2 flex-wrap">
            <button
              onClick={() => onStatUpdate(player.id, "assist")}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
              data-testid={`ast-btn-${player.id}`}
            >
              AST {player.assists}
            </button>
            <button
              onClick={() => onStatUpdate(player.id, "steal")}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
              data-testid={`stl-btn-${player.id}`}
            >
              STL {player.steals}
            </button>
            <button
              onClick={() => onStatUpdate(player.id, "block")}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
              data-testid={`blk-btn-${player.id}`}
            >
              BLK {player.blocks}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Side Action Button
const SideActionButton = ({ label, onClick, color, position, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`fixed ${position} w-12 py-8 text-white text-xs font-bold writing-mode-vertical flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-50 z-40`}
    style={{ 
      backgroundColor: color,
      writingMode: "vertical-rl",
      textOrientation: "mixed"
    }}
    data-testid={`side-${label.toLowerCase().replace(' ', '-')}`}
  >
    {label}
  </button>
);

export default function LiveGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addPlayerTeam, setAddPlayerTeam] = useState("home");
  const [newPlayer, setNewPlayer] = useState({ number: "", name: "" });
  const [copied, setCopied] = useState(false);
  const [lastAction, setLastAction] = useState(null);

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
      setLastAction({ playerId, statType, increment });
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

  const handleUndo = async () => {
    if (!lastAction) return;
    try {
      await axios.post(`${API}/games/${id}/stats`, {
        player_id: lastAction.playerId,
        stat_type: lastAction.statType,
        increment: -lastAction.increment
      });
      setLastAction(null);
      fetchGame();
      toast.success("Action undone");
    } catch (error) {
      toast.error("Failed to undo");
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

    const teamId = addPlayerTeam === "home" ? game.home_team_id : game.away_team_id;

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

  // Quick team stat handlers
  const handleTeamRebound = (team, type) => {
    // Find first player of team and add rebound
    const stats = team === "home" ? game.home_player_stats : game.away_player_stats;
    if (stats && stats.length > 0) {
      handleStatUpdate(stats[0].id, type);
    }
  };

  const handleTeamTurnover = (team) => {
    const stats = team === "home" ? game.home_player_stats : game.away_player_stats;
    if (stats && stats.length > 0) {
      handleStatUpdate(stats[0].id, "turnover");
    }
  };

  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const calculateTeamStats = (stats) => {
    if (!stats) return { rebounds: 0, turnovers: 0, assists: 0, steals: 0, blocks: 0, fouls: 0 };
    return stats.reduce((acc, p) => ({
      rebounds: acc.rebounds + p.offensive_rebounds + p.defensive_rebounds,
      turnovers: acc.turnovers + p.turnovers,
      assists: acc.assists + p.assists,
      steals: acc.steals + p.steals,
      blocks: acc.blocks + p.blocks,
      fouls: acc.fouls + p.fouls
    }), { rebounds: 0, turnovers: 0, assists: 0, steals: 0, blocks: 0, fouls: 0 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-12 h-12 animate-pulse mx-auto text-[#1e3a5f]" />
          <p className="mt-4 text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];
  const homeTeamStats = calculateTeamStats(homeStats);
  const awayTeamStats = calculateTeamStats(awayStats);
  const isActive = game.status === "active";

  return (
    <div className="min-h-screen bg-slate-100" data-testid="live-game-page">
      {/* Side Action Buttons */}
      <SideActionButton 
        label="Away Rebound" 
        onClick={() => handleTeamRebound("away", "dreb")} 
        color="#7c3aed" 
        position="left-0 top-1/4"
        disabled={!isActive}
      />
      <SideActionButton 
        label="Away Turnover" 
        onClick={() => handleTeamTurnover("away")} 
        color="#7c3aed" 
        position="left-0 top-1/2"
        disabled={!isActive}
      />
      <SideActionButton 
        label="Home Rebound" 
        onClick={() => handleTeamRebound("home", "dreb")} 
        color="#dc2626" 
        position="right-0 top-1/4"
        disabled={!isActive}
      />
      <SideActionButton 
        label="Home Turnover" 
        onClick={() => handleTeamTurnover("home")} 
        color="#dc2626" 
        position="right-0 top-1/2"
        disabled={!isActive}
      />

      {/* Top Navigation Bar */}
      <header className="bg-[#1e3a5f] text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/")} 
                className="text-white hover:bg-white/10"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                <span className="font-bold hidden sm:block">Court Metrics</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {lastAction && isActive && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUndo}
                  className="bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                  data-testid="undo-btn"
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  Undo
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={copyShareLink} className="text-white hover:bg-white/10" data-testid="share-btn">
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                Share
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownloadPDF} className="text-white hover:bg-white/10" data-testid="download-pdf-btn">
                <FileDown className="w-4 h-4 mr-1" />
                PDF
              </Button>
              {isActive && (
                <Button variant="destructive" size="sm" onClick={handleEndGame} data-testid="end-game-btn">
                  End Game
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-4 ml-14 mr-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left Column - Home Team */}
          <div className="order-1 lg:order-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#dc2626]"></div>
                <h2 className="font-bold text-lg">{game.home_team_name}</h2>
              </div>
              {isActive && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setAddPlayerTeam("home"); setAddPlayerOpen(true); }}
                  data-testid="add-home-player-btn"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {homeStats.map(player => (
                <PlayerCard 
                  key={player.id}
                  player={player}
                  teamColor="#dc2626"
                  onStatUpdate={handleStatUpdate}
                  disabled={!isActive}
                />
              ))}
              {homeStats.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players in roster
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Scoreboard & Stats */}
          <div className="order-3 lg:order-2">
            {/* Scoreboard */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-sm text-muted-foreground">{game.home_team_name}</p>
                  <p className="text-5xl font-bold text-[#dc2626]" data-testid="home-score">
                    {calculateScore("home")}
                  </p>
                </div>
                <div className="px-4 text-2xl text-slate-300">-</div>
                <div className="text-center flex-1">
                  <p className="text-sm text-muted-foreground">{game.away_team_name}</p>
                  <p className="text-5xl font-bold text-[#7c3aed]" data-testid="away-score">
                    {calculateScore("away")}
                  </p>
                </div>
              </div>
              
              {/* Period Selection */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground mr-2">Period:</span>
                {[1, 2, 3, 4].map(q => (
                  <button
                    key={q}
                    onClick={() => isActive && handleQuarterChange(q)}
                    disabled={!isActive}
                    className={`w-10 h-10 rounded-full font-bold transition-colors ${
                      game.current_quarter === q 
                        ? "bg-orange-500 text-white" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    } disabled:opacity-50`}
                    data-testid={`quarter-${q}-btn`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Quarter by Quarter */}
              <div className="border-t pt-3">
                <div className="grid grid-cols-5 gap-2 text-xs text-center">
                  <div></div>
                  {[1, 2, 3, 4].map(q => (
                    <div key={q} className="text-muted-foreground">Q{q}</div>
                  ))}
                  <div className="text-left font-medium">Home</div>
                  {game.quarter_scores?.home?.map((s, i) => (
                    <div key={i} className="font-bold">{s}</div>
                  ))}
                  <div className="text-left font-medium">Away</div>
                  {game.quarter_scores?.away?.map((s, i) => (
                    <div key={i} className="font-bold">{s}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Stats */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h3 className="font-bold mb-3 text-sm">Team Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#dc2626]">{game.home_team_name}</p>
                  <p className="text-muted-foreground">Rebounds: {homeTeamStats.rebounds}</p>
                  <p className="text-muted-foreground">Turnovers: {homeTeamStats.turnovers}</p>
                  <p className="text-muted-foreground">Assists: {homeTeamStats.assists}</p>
                  <p className="text-muted-foreground">Team Fouls: {homeTeamStats.fouls}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#7c3aed]">{game.away_team_name}</p>
                  <p className="text-muted-foreground">Rebounds: {awayTeamStats.rebounds}</p>
                  <p className="text-muted-foreground">Turnovers: {awayTeamStats.turnovers}</p>
                  <p className="text-muted-foreground">Assists: {awayTeamStats.assists}</p>
                  <p className="text-muted-foreground">Team Fouls: {awayTeamStats.fouls}</p>
                </div>
              </div>
            </div>

            {/* Miss Buttons */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-bold mb-3 text-sm">Quick Miss</h3>
              <p className="text-xs text-muted-foreground mb-2">Select a player first, then click miss</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium mb-1 text-[#dc2626]">Home</p>
                  <select 
                    className="w-full text-xs p-2 border rounded mb-2"
                    id="home-miss-player"
                    data-testid="home-miss-select"
                  >
                    <option value="">Select player</option>
                    {homeStats.map(p => (
                      <option key={p.id} value={p.id}>#{p.player_number} {p.player_name}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const sel = document.getElementById('home-miss-player');
                        if (sel.value) handleStatUpdate(sel.value, "ft_missed");
                      }}
                      disabled={!isActive}
                      className="flex-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded disabled:opacity-50"
                    >
                      FT Miss
                    </button>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('home-miss-player');
                        if (sel.value) handleStatUpdate(sel.value, "fg2_missed");
                      }}
                      disabled={!isActive}
                      className="flex-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded disabled:opacity-50"
                    >
                      2PT Miss
                    </button>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('home-miss-player');
                        if (sel.value) handleStatUpdate(sel.value, "fg3_missed");
                      }}
                      disabled={!isActive}
                      className="flex-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded disabled:opacity-50"
                    >
                      3PT Miss
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1 text-[#7c3aed]">Away</p>
                  <select 
                    className="w-full text-xs p-2 border rounded mb-2"
                    id="away-miss-player"
                    data-testid="away-miss-select"
                  >
                    <option value="">Select player</option>
                    {awayStats.map(p => (
                      <option key={p.id} value={p.id}>#{p.player_number} {p.player_name}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const sel = document.getElementById('away-miss-player');
                        if (sel.value) handleStatUpdate(sel.value, "ft_missed");
                      }}
                      disabled={!isActive}
                      className="flex-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded disabled:opacity-50"
                    >
                      FT Miss
                    </button>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('away-miss-player');
                        if (sel.value) handleStatUpdate(sel.value, "fg2_missed");
                      }}
                      disabled={!isActive}
                      className="flex-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded disabled:opacity-50"
                    >
                      2PT Miss
                    </button>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('away-miss-player');
                        if (sel.value) handleStatUpdate(sel.value, "fg3_missed");
                      }}
                      disabled={!isActive}
                      className="flex-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded disabled:opacity-50"
                    >
                      3PT Miss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Away Team */}
          <div className="order-2 lg:order-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#7c3aed]"></div>
                <h2 className="font-bold text-lg">{game.away_team_name}</h2>
              </div>
              {isActive && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setAddPlayerTeam("away"); setAddPlayerOpen(true); }}
                  data-testid="add-away-player-btn"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {awayStats.map(player => (
                <PlayerCard 
                  key={player.id}
                  player={player}
                  teamColor="#7c3aed"
                  onStatUpdate={handleStatUpdate}
                  disabled={!isActive}
                />
              ))}
              {awayStats.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players in roster
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Player Dialog */}
      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Player to {addPlayerTeam === "home" ? game.home_team_name : game.away_team_name}
            </DialogTitle>
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
    </div>
  );
}

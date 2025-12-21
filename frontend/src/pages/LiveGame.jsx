import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Share2, FileDown, UserPlus, Copy, Check, Undo2, Trophy, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Shot Selection Modal
const ShotModal = ({ isOpen, onClose, shotType, playerName, onMake, onMiss }) => {
  if (!isOpen) return null;
  
  const shotLabels = {
    ft: "Free Throw",
    fg2: "2-Point Shot",
    fg3: "3-Point Shot"
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{shotLabels[shotType]}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-6">{playerName}</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onMake}
            className="py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl rounded-xl transition-colors"
            data-testid="shot-make-btn"
          >
            MAKE
          </button>
          <button
            onClick={onMiss}
            className="py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-bold text-xl rounded-xl transition-colors"
            data-testid="shot-miss-btn"
          >
            MISS
          </button>
        </div>
      </div>
    </div>
  );
};

// Player Card Component
const PlayerCard = ({ player, teamColor, onShotClick, onStatUpdate, disabled }) => {
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
              onClick={() => onShotClick(player, "ft")}
              disabled={disabled}
              className="w-10 h-10 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50"
              data-testid={`ft-btn-${player.id}`}
            >
              FT
            </button>
            <button
              onClick={() => onShotClick(player, "fg2")}
              disabled={disabled}
              className="w-10 h-10 rounded-full border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50"
              data-testid={`fg2-btn-${player.id}`}
            >
              2PT
            </button>
            <button
              onClick={() => onShotClick(player, "fg3")}
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
              onClick={() => onStatUpdate(player.id, "oreb")}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors disabled:opacity-50"
              data-testid={`oreb-btn-${player.id}`}
            >
              OREB {player.offensive_rebounds}
            </button>
            <button
              onClick={() => onStatUpdate(player.id, "dreb")}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors disabled:opacity-50"
              data-testid={`dreb-btn-${player.id}`}
            >
              DREB {player.defensive_rebounds}
            </button>
            <button
              onClick={() => onStatUpdate(player.id, "steal")}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded transition-colors disabled:opacity-50"
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
            <button
              onClick={() => onStatUpdate(player.id, "turnover")}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50"
              data-testid={`to-btn-${player.id}`}
            >
              TO {player.turnovers}
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
  
  // Shot modal state
  const [shotModalOpen, setShotModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedShotType, setSelectedShotType] = useState(null);

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

  const handleShotClick = (player, shotType) => {
    setSelectedPlayer(player);
    setSelectedShotType(shotType);
    setShotModalOpen(true);
  };

  const handleShotResult = async (made) => {
    if (!selectedPlayer || !selectedShotType) return;
    
    const statType = made ? `${selectedShotType}_made` : `${selectedShotType}_missed`;
    await handleStatUpdate(selectedPlayer.id, statType);
    setShotModalOpen(false);
    setSelectedPlayer(null);
    setSelectedShotType(null);
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
      toast.success("PDF downloaded!");
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
    if (!stats) return { oreb: 0, dreb: 0, totalReb: 0, turnovers: 0, assists: 0, steals: 0, blocks: 0, fouls: 0 };
    return stats.reduce((acc, p) => ({
      oreb: acc.oreb + p.offensive_rebounds,
      dreb: acc.dreb + p.defensive_rebounds,
      totalReb: acc.totalReb + p.offensive_rebounds + p.defensive_rebounds,
      turnovers: acc.turnovers + p.turnovers,
      assists: acc.assists + p.assists,
      steals: acc.steals + p.steals,
      blocks: acc.blocks + p.blocks,
      fouls: acc.fouls + p.fouls
    }), { oreb: 0, dreb: 0, totalReb: 0, turnovers: 0, assists: 0, steals: 0, blocks: 0, fouls: 0 });
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
      {/* Shot Modal */}
      <ShotModal
        isOpen={shotModalOpen}
        onClose={() => setShotModalOpen(false)}
        shotType={selectedShotType}
        playerName={selectedPlayer?.player_name}
        onMake={() => handleShotResult(true)}
        onMiss={() => handleShotResult(false)}
      />

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
                  onShotClick={handleShotClick}
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
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-bold mb-3 text-sm">Team Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#dc2626] mb-2">{game.home_team_name}</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>Off. Rebounds: <span className="font-medium text-foreground">{homeTeamStats.oreb}</span></p>
                    <p>Def. Rebounds: <span className="font-medium text-foreground">{homeTeamStats.dreb}</span></p>
                    <p>Total Rebounds: <span className="font-medium text-foreground">{homeTeamStats.totalReb}</span></p>
                    <p>Assists: <span className="font-medium text-foreground">{homeTeamStats.assists}</span></p>
                    <p>Steals: <span className="font-medium text-foreground">{homeTeamStats.steals}</span></p>
                    <p>Blocks: <span className="font-medium text-foreground">{homeTeamStats.blocks}</span></p>
                    <p>Turnovers: <span className="font-medium text-foreground">{homeTeamStats.turnovers}</span></p>
                    <p>Team Fouls: <span className="font-medium text-foreground">{homeTeamStats.fouls}</span></p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-[#7c3aed] mb-2">{game.away_team_name}</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>Off. Rebounds: <span className="font-medium text-foreground">{awayTeamStats.oreb}</span></p>
                    <p>Def. Rebounds: <span className="font-medium text-foreground">{awayTeamStats.dreb}</span></p>
                    <p>Total Rebounds: <span className="font-medium text-foreground">{awayTeamStats.totalReb}</span></p>
                    <p>Assists: <span className="font-medium text-foreground">{awayTeamStats.assists}</span></p>
                    <p>Steals: <span className="font-medium text-foreground">{awayTeamStats.steals}</span></p>
                    <p>Blocks: <span className="font-medium text-foreground">{awayTeamStats.blocks}</span></p>
                    <p>Turnovers: <span className="font-medium text-foreground">{awayTeamStats.turnovers}</span></p>
                    <p>Team Fouls: <span className="font-medium text-foreground">{awayTeamStats.fouls}</span></p>
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
                  onShotClick={handleShotClick}
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

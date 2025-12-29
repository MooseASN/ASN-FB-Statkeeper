import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Save, Plus, Trash2, ExternalLink, Video, BarChart3 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BracketEditor({ bracketId, teams = [], onSave, onClose }) {
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchBracket();
  }, [bracketId]);

  const fetchBracket = async () => {
    try {
      const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
      const res = await axios.get(`${API}/brackets/${bracketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBracket(res.data);
    } catch (error) {
      console.error('Error fetching bracket:', error);
      toast.error('Failed to load bracket');
    } finally {
      setLoading(false);
    }
  };

  const initializeBracket = async () => {
    try {
      const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
      await axios.post(`${API}/brackets/${bracketId}/initialize-16-team`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Bracket initialized with 16-team structure');
      fetchBracket();
    } catch (error) {
      console.error('Error initializing bracket:', error);
      toast.error('Failed to initialize bracket');
    }
  };

  const handleGameClick = (game) => {
    setSelectedGame({ ...game });
    setEditDialogOpen(true);
  };

  const handleGameUpdate = async () => {
    if (!selectedGame) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
      await axios.put(`${API}/brackets/${bracketId}/games/${selectedGame.game_id}`, selectedGame, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Game updated');
      setEditDialogOpen(false);
      fetchBracket();
    } catch (error) {
      console.error('Error updating game:', error);
      toast.error('Failed to update game');
    } finally {
      setSaving(false);
    }
  };

  const getGamesByRound = (roundNumber) => {
    return bracket?.games?.filter(g => g.round_number === roundNumber) || [];
  };

  const getRoundName = (roundNumber) => {
    const names = {
      1: 'First Round',
      2: 'Quarterfinals',
      3: 'Semifinals',
      4: 'Championship'
    };
    return names[roundNumber] || `Round ${roundNumber}`;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading bracket...</div>;
  }

  if (!bracket) {
    return <div className="p-8 text-center text-red-500">Bracket not found</div>;
  }

  const hasGames = bracket.games && bracket.games.length > 0;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{bracket.name}</h2>
          <p className="text-muted-foreground capitalize">{bracket.gender} • {bracket.bracket_type.replace('_', ' ')}</p>
        </div>
        <div className="flex gap-2">
          {!hasGames && (
            <Button onClick={initializeBracket} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Initialize 16-Team Bracket
            </Button>
          )}
          {onClose && (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>

      {!hasGames ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No games in this bracket yet.</p>
            <Button onClick={initializeBracket}>
              <Plus className="w-4 h-4 mr-2" />
              Initialize 16-Team Bracket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-[1200px] p-4">
            {[1, 2, 3, 4].map(round => {
              const games = getGamesByRound(round);
              const roundHeight = round === 1 ? 'h-24' : round === 2 ? 'h-48' : round === 3 ? 'h-96' : 'h-96';
              
              return (
                <div key={round} className="flex-1 min-w-[250px]">
                  <h3 className="text-sm font-semibold mb-3 text-center text-muted-foreground uppercase tracking-wide">
                    {getRoundName(round)}
                  </h3>
                  <div className={`flex flex-col justify-around ${round === 4 ? 'h-[600px]' : ''}`} style={{ gap: round === 1 ? '8px' : round === 2 ? '40px' : round === 3 ? '120px' : '0' }}>
                    {games.sort((a, b) => a.position - b.position).map(game => (
                      <div
                        key={game.game_id}
                        onClick={() => handleGameClick(game)}
                        className={`bg-white border rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 transition-all ${round === 4 ? 'my-auto' : ''}`}
                      >
                        {/* Team 1 */}
                        <div className={`flex items-center justify-between px-3 py-2 border-b ${game.winner_id === game.team1_id ? 'bg-green-50' : ''}`}>
                          <div className="flex items-center gap-2">
                            {game.team1_seed && (
                              <span className="text-xs font-bold text-muted-foreground w-5">{game.team1_seed}</span>
                            )}
                            <span className={`text-sm font-medium truncate max-w-[150px] ${game.winner_id === game.team1_id ? 'font-bold' : ''}`}>
                              {game.team1_name || 'TBD'}
                            </span>
                          </div>
                          <span className={`text-sm font-bold min-w-[24px] text-right ${game.winner_id === game.team1_id ? 'text-green-600' : ''}`}>
                            {game.team1_score ?? '-'}
                          </span>
                        </div>
                        {/* Team 2 */}
                        <div className={`flex items-center justify-between px-3 py-2 ${game.winner_id === game.team2_id ? 'bg-green-50' : ''}`}>
                          <div className="flex items-center gap-2">
                            {game.team2_seed && (
                              <span className="text-xs font-bold text-muted-foreground w-5">{game.team2_seed}</span>
                            )}
                            <span className={`text-sm font-medium truncate max-w-[150px] ${game.winner_id === game.team2_id ? 'font-bold' : ''}`}>
                              {game.team2_name || 'TBD'}
                            </span>
                          </div>
                          <span className={`text-sm font-bold min-w-[24px] text-right ${game.winner_id === game.team2_id ? 'text-green-600' : ''}`}>
                            {game.team2_score ?? '-'}
                          </span>
                        </div>
                        {/* Game Info */}
                        <div className="px-3 py-1 bg-slate-50 text-xs text-muted-foreground flex items-center justify-between">
                          <span>{game.game_time || 'TBD'}</span>
                          <span className="truncate max-w-[100px]">{game.venue || ''}</span>
                          <div className="flex gap-1">
                            {game.broadcast_link && <Video className="w-3 h-3 text-blue-500" />}
                            {game.live_stats_link && <BarChart3 className="w-3 h-3 text-green-500" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Game Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Game {selectedGame?.game_id}</DialogTitle>
          </DialogHeader>
          
          {selectedGame && (
            <div className="space-y-4">
              {/* Team 1 */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                <Label className="font-semibold">Team 1 (Top)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Team</Label>
                    <Select
                      value={selectedGame.team1_id || ''}
                      onValueChange={(value) => {
                        const team = teams.find(t => t.id === value);
                        setSelectedGame({
                          ...selectedGame,
                          team1_id: value,
                          team1_name: team?.name || 'TBD'
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">TBD</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Score</Label>
                    <Input
                      type="number"
                      value={selectedGame.team1_score ?? ''}
                      onChange={(e) => setSelectedGame({
                        ...selectedGame,
                        team1_score: e.target.value ? parseInt(e.target.value) : null
                      })}
                      placeholder="-"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Seed</Label>
                  <Input
                    type="number"
                    value={selectedGame.team1_seed ?? ''}
                    onChange={(e) => setSelectedGame({
                      ...selectedGame,
                      team1_seed: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="Seed #"
                  />
                </div>
              </div>

              {/* Team 2 */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                <Label className="font-semibold">Team 2 (Bottom)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Team</Label>
                    <Select
                      value={selectedGame.team2_id || ''}
                      onValueChange={(value) => {
                        const team = teams.find(t => t.id === value);
                        setSelectedGame({
                          ...selectedGame,
                          team2_id: value,
                          team2_name: team?.name || 'TBD'
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">TBD</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Score</Label>
                    <Input
                      type="number"
                      value={selectedGame.team2_score ?? ''}
                      onChange={(e) => setSelectedGame({
                        ...selectedGame,
                        team2_score: e.target.value ? parseInt(e.target.value) : null
                      })}
                      placeholder="-"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Seed</Label>
                  <Input
                    type="number"
                    value={selectedGame.team2_seed ?? ''}
                    onChange={(e) => setSelectedGame({
                      ...selectedGame,
                      team2_seed: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="Seed #"
                  />
                </div>
              </div>

              {/* Winner Selection */}
              <div>
                <Label>Winner</Label>
                <Select
                  value={selectedGame.winner_id || ''}
                  onValueChange={(value) => setSelectedGame({ ...selectedGame, winner_id: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select winner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not decided</SelectItem>
                    {selectedGame.team1_id && (
                      <SelectItem value={selectedGame.team1_id}>{selectedGame.team1_name}</SelectItem>
                    )}
                    {selectedGame.team2_id && (
                      <SelectItem value={selectedGame.team2_id}>{selectedGame.team2_name}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Game Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedGame.game_date || ''}
                    onChange={(e) => setSelectedGame({ ...selectedGame, game_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={selectedGame.game_time || ''}
                    onChange={(e) => setSelectedGame({ ...selectedGame, game_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Venue</Label>
                <Input
                  value={selectedGame.venue || ''}
                  onChange={(e) => setSelectedGame({ ...selectedGame, venue: e.target.value })}
                  placeholder="e.g., SEC, Tiger Gym, Timpson"
                />
              </div>

              <div>
                <Label>Game Status</Label>
                <Select
                  value={selectedGame.game_status || 'scheduled'}
                  onValueChange={(value) => setSelectedGame({ ...selectedGame, game_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Links */}
              <div>
                <Label>Broadcast Link</Label>
                <Input
                  value={selectedGame.broadcast_link || ''}
                  onChange={(e) => setSelectedGame({ ...selectedGame, broadcast_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Live Stats Link</Label>
                <Input
                  value={selectedGame.live_stats_link || ''}
                  onChange={(e) => setSelectedGame({ ...selectedGame, live_stats_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleGameUpdate} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

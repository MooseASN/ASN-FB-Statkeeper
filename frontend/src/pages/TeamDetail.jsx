import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Upload, Save } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [newPlayer, setNewPlayer] = useState({ number: "", name: "" });
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const res = await axios.get(`${API}/teams/${id}`);
        setTeam(res.data);
        setTeamName(res.data.name);
        setTeamLogo(res.data.logo_url || "");
        setRoster(res.data.roster || []);
      } catch (error) {
        toast.error("Failed to load team");
        navigate("/teams");
      } finally {
        setLoading(false);
      }
    };
    loadTeam();
  }, [id, navigate]);

  const fetchTeam = async () => {
    try {
      const res = await axios.get(`${API}/teams/${id}`);
      setTeam(res.data);
      setTeamName(res.data.name);
      setTeamLogo(res.data.logo_url || "");
      setRoster(res.data.roster || []);
    } catch (error) {
      toast.error("Failed to load team");
      navigate("/teams");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = () => {
    if (!newPlayer.number.trim() || !newPlayer.name.trim()) {
      toast.error("Both number and name are required");
      return;
    }
    
    if (roster.some(p => p.number === newPlayer.number.trim())) {
      toast.error("Player number already exists");
      return;
    }

    setRoster([...roster, { number: newPlayer.number.trim(), name: newPlayer.name.trim() }]);
    setNewPlayer({ number: "", name: "" });
  };

  const handleRemovePlayer = (index) => {
    setRoster(roster.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API}/teams/${id}`, {
        name: teamName,
        logo_url: teamLogo || null,
        roster: roster
      });
      toast.success("Team updated successfully");
    } catch (error) {
      toast.error("Failed to update team");
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API}/teams/${id}/roster/csv`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setRoster(res.data.roster);
      toast.success(res.data.message);
    } catch (error) {
      toast.error("Failed to upload CSV");
    }
    
    e.target.value = "";
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="team-detail-page">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teams")} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a5f]">{team?.name}</h1>
            <p className="text-muted-foreground">Manage team details and roster</p>
          </div>
        </div>

        {/* Team Info */}
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  data-testid="edit-team-name"
                />
              </div>
              <div>
                <Label htmlFor="teamLogo">Logo URL</Label>
                <Input
                  id="teamLogo"
                  value={teamLogo}
                  onChange={(e) => setTeamLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  data-testid="edit-team-logo"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roster */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Roster ({roster.length} players)</CardTitle>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCSVUpload}
                  accept=".csv"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-csv-btn"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Add Player */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="#"
                value={newPlayer.number}
                onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                className="w-20"
                data-testid="player-number-input"
              />
              <Input
                placeholder="Player Name"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                className="flex-1"
                data-testid="player-name-input"
              />
              <Button onClick={handleAddPlayer} data-testid="add-player-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Players Table */}
            {roster.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((player, index) => (
                    <TableRow key={index} data-testid={`player-row-${index}`}>
                      <TableCell className="font-bold">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleRemovePlayer(index)}
                          data-testid={`remove-player-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No players added yet. Add players manually or upload a CSV file.
              </div>
            )}

            <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-muted-foreground">
              <strong>CSV Format:</strong> Your CSV should have columns for "number" (or "#") and "name" (or "player").
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d5a87]" data-testid="save-team-btn">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </Layout>
  );
}

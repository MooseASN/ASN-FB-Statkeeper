import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Trash2, ChevronRight, Link as LinkIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { ChromePicker } from "react-color";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Advanced Color Picker Component with color map and hex input
const ColorPicker = ({ value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  
  const presetColors = [
    "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0d9488",
    "#2563eb", "#7c3aed", "#db2777", "#000000", "#4b5563"
  ];
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 hover:border-slate-400 transition-colors"
            style={{ backgroundColor: value }}
            data-testid="color-picker-trigger"
          />
          {showPicker && (
            <div className="absolute z-50 top-14 left-0">
              <div 
                className="fixed inset-0" 
                onClick={() => setShowPicker(false)}
              />
              <div className="relative">
                <ChromePicker
                  color={value}
                  onChange={(color) => onChange(color.hex)}
                  disableAlpha
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Hex Code</Label>
          <Input
            value={value}
            onChange={(e) => {
              const hex = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(hex) || hex === "") {
                onChange(hex.startsWith("#") ? hex : `#${hex}`);
              }
            }}
            placeholder="#000000"
            className="font-mono text-sm"
            data-testid="color-hex-input"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
              value === color ? 'border-black ring-2 ring-offset-1 ring-black/20' : 'border-white shadow-sm'
            }`}
            style={{ backgroundColor: color }}
            data-testid={`preset-color-${color.slice(1)}`}
          />
        ))}
      </div>
    </div>
  );
};

export default function Teams({ user, onLogout }) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", logo_url: "", color: "#dc2626" });

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

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.error("Team name is required");
      return;
    }

    try {
      await axios.post(`${API}/teams`, newTeam);
      toast.success("Team created successfully");
      setNewTeam({ name: "", logo_url: "", color: "#dc2626" });
      setIsDialogOpen(false);
      fetchTeams();
    } catch (error) {
      toast.error("Failed to create team");
    }
  };

  const handleDeleteTeam = async (teamId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this team?")) return;

    try {
      await axios.delete(`${API}/teams/${teamId}`);
      toast.success("Team deleted");
      fetchTeams();
    } catch (error) {
      toast.error("Failed to delete team");
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="teams-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">Teams</h1>
            <p className="text-muted-foreground">Manage your basketball teams and rosters</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#000000] hover:bg-[#333333]" data-testid="create-team-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter team name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    data-testid="team-name-input"
                  />
                </div>
                <div>
                  <Label>Team Color</Label>
                  <div className="mt-2">
                    <ColorPicker 
                      value={newTeam.color} 
                      onChange={(color) => setNewTeam({ ...newTeam, color })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="logo">Logo URL (optional)</Label>
                  <Input
                    id="logo"
                    placeholder="https://example.com/logo.png"
                    value={newTeam.logo_url}
                    onChange={(e) => setNewTeam({ ...newTeam, logo_url: e.target.value })}
                    data-testid="team-logo-input"
                  />
                </div>
                <Button onClick={handleCreateTeam} className="w-full" data-testid="submit-team-btn">
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading teams...</div>
        ) : teams.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first team to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Link key={team.id} to={`/teams/${team.id}`}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group" style={{ borderLeft: `4px solid ${team.color || '#000000'}` }} data-testid={`team-card-${team.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {team.logo_url ? (
                        <img 
                          src={team.logo_url} 
                          alt={team.name} 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: team.color || '#000000' }}
                        >
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-[#000000] transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {team.roster?.length || 0} players
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#000000] transition-colors" />
                    </div>
                    <div className="flex justify-end mt-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => handleDeleteTeam(team.id, e)}
                        data-testid={`delete-team-${team.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

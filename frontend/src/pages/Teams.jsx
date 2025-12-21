import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Trash2, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TEAM_COLORS = [
  { name: "Red", value: "#dc2626" },
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Orange", value: "#ea580c" },
  { name: "Navy", value: "#1e3a5f" },
  { name: "Teal", value: "#0d9488" },
  { name: "Pink", value: "#db2777" },
  { name: "Yellow", value: "#ca8a04" },
  { name: "Gray", value: "#4b5563" },
];

export default function Teams() {
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
    <Layout>
      <div className="space-y-6" data-testid="teams-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a5f]">Teams</h1>
            <p className="text-muted-foreground">Manage your basketball teams and rosters</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2d5a87]" data-testid="create-team-btn">
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {TEAM_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewTeam({ ...newTeam, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newTeam.color === color.value ? 'border-black scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        data-testid={`color-${color.name.toLowerCase()}`}
                      />
                    ))}
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
                <Card className="hover:shadow-lg transition-all cursor-pointer group" data-testid={`team-card-${team.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {team.logo_url ? (
                        <img 
                          src={team.logo_url} 
                          alt={team.name} 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="logo-placeholder">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-[#1e3a5f] transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {team.roster?.length || 0} players
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#1e3a5f] transition-colors" />
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

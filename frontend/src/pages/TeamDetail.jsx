import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2, Upload, Save, Users, Link as LinkIcon, Loader2, Lock, Crown } from "lucide-react";
import Layout from "@/components/Layout";
import { ChromePicker } from "react-color";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";

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
            <div className="absolute z-[100] top-14 left-0">
              <div 
                className="fixed inset-0 z-[99]" 
                onClick={() => setShowPicker(false)}
              />
              <div className="relative z-[100]">
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
            onClick={() => {
              onChange(color);
              setShowPicker(false);  // Close picker when preset is selected
            }}
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

export default function TeamDetail({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Subscription features for logo upload gating
  const { canAccess, getRequiredTierFor } = useSubscriptionFeatures();
  
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roster, setRoster] = useState([]);
  const [newPlayer, setNewPlayer] = useState({ number: "", name: "" });
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");
  const [teamColor, setTeamColor] = useState("#000000");
  const [teamSport, setTeamSport] = useState("basketball"); // CRITICAL: Track team sport to preserve on save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Bulk add state
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkPlayers, setBulkPlayers] = useState(() => 
    Array.from({ length: 10 }, () => ({ number: "", name: "" }))
  );
  
  // MaxPreps import state
  const [maxPrepsOpen, setMaxPrepsOpen] = useState(false);
  const [maxPrepsUrl, setMaxPrepsUrl] = useState("");
  const [maxPrepsLoading, setMaxPrepsLoading] = useState(false);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const res = await axios.get(`${API}/teams/${id}`);
        setTeam(res.data);
        setTeamName(res.data.name);
        setTeamLogo(res.data.logo_url || "");
        setTeamColor(res.data.color || "#000000");
        setTeamSport(res.data.sport || "basketball"); // CRITICAL: Store the team's sport
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
      setTeamColor(res.data.color || "#000000");
      setTeamSport(res.data.sport || "basketball"); // CRITICAL: Store the team's sport
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

    const updatedRoster = [...roster, { number: newPlayer.number.trim(), name: newPlayer.name.trim() }];
    setRoster(updatedRoster);
    setNewPlayer({ number: "", name: "" });
    setHasUnsavedChanges(true);
    
    // Auto-save after adding player
    autoSaveRoster(updatedRoster);
  };

  const handleRemovePlayer = (index) => {
    const updatedRoster = roster.filter((_, i) => i !== index);
    setRoster(updatedRoster);
    setHasUnsavedChanges(true);
    
    // Auto-save after removing player
    autoSaveRoster(updatedRoster);
  };
  
  // Auto-save roster changes
  const autoSaveRoster = async (rosterData) => {
    try {
      await axios.put(`${API}/teams/${id}`, {
        name: teamName,
        logo_url: teamLogo || null,
        color: teamColor,
        roster: rosterData,
        sport: teamSport  // CRITICAL: Preserve the team's sport to avoid switching to default
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  // Handle logo file upload
  const handleLogoUpload = async (e) => {
    // Check if user has access to custom logos
    if (!canAccess('custom_team_logos')) {
      toast.error(`Custom team logos require ${getRequiredTierFor('custom_team_logos')} tier. Upgrade at /pricing`);
      e.target.value = '';
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: PNG, JPG, GIF, WEBP');
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await axios.post(`${API}/teams/${id}/logo/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setTeamLogo(res.data.logo_url);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    
    setSaving(true);
    try {
      await axios.put(`${API}/teams/${id}`, {
        name: teamName,
        logo_url: teamLogo || null,
        color: teamColor,
        roster: roster,
        sport: teamSport  // CRITICAL: Preserve the team's sport to avoid switching to default
      });
      setHasUnsavedChanges(false);
      toast.success("Team saved successfully");
    } catch (error) {
      toast.error("Failed to save team");
    } finally {
      setSaving(false);
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

  // Bulk add handlers
  const openBulkAdd = () => {
    setBulkPlayers(Array.from({ length: 10 }, () => ({ number: "", name: "" })));
    setBulkAddOpen(true);
  };

  const handleBulkPlayerChange = (index, field, value) => {
    const updated = [...bulkPlayers];
    updated[index] = { ...updated[index], [field]: value };
    setBulkPlayers(updated);
  };

  const addBulkRow = () => {
    setBulkPlayers([...bulkPlayers, { number: "", name: "" }]);
  };

  const removeBulkRow = (index) => {
    if (bulkPlayers.length <= 1) return;
    setBulkPlayers(bulkPlayers.filter((_, i) => i !== index));
  };

  const handleBulkAddPlayers = () => {
    // Filter out empty rows
    const validPlayers = bulkPlayers.filter(p => p.number.trim() && p.name.trim());
    
    if (validPlayers.length === 0) {
      toast.error("Please fill in at least one player");
      return;
    }

    // Check for duplicate numbers within bulk add
    const numbers = validPlayers.map(p => p.number.trim());
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      toast.error("Duplicate player numbers found in bulk add");
      return;
    }

    // Check for conflicts with existing roster
    const existingNumbers = roster.map(p => p.number);
    const conflicts = validPlayers.filter(p => existingNumbers.includes(p.number.trim()));
    if (conflicts.length > 0) {
      toast.error(`Player number(s) already exist: ${conflicts.map(p => p.number).join(", ")}`);
      return;
    }

    // Add all valid players to roster
    const newPlayers = validPlayers.map(p => ({
      number: p.number.trim(),
      name: p.name.trim()
    }));
    
    setRoster([...roster, ...newPlayers]);
    setBulkAddOpen(false);
    toast.success(`Added ${newPlayers.length} player(s) to roster`);
  };

  // Roster URL import handler
  const handleMaxPrepsImport = async () => {
    if (!maxPrepsUrl.trim()) {
      toast.error("Please enter a roster page URL");
      return;
    }
    
    setMaxPrepsLoading(true);
    try {
      const res = await axios.post(`${API}/teams/${id}/roster/maxpreps`, {
        url: maxPrepsUrl.trim()
      });
      setRoster(res.data.roster);
      toast.success(res.data.message);
      setMaxPrepsOpen(false);
      setMaxPrepsUrl("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to import roster from URL");
    } finally {
      setMaxPrepsLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="team-detail-page">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teams")} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">{team?.name}</h1>
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
                <Label htmlFor="teamLogo">Team Logo</Label>
                <div className="flex items-center gap-4 mt-2">
                  {/* Logo Preview */}
                  <div className="relative">
                    {teamLogo ? (
                      <img 
                        src={teamLogo} 
                        alt="Team Logo" 
                        className="w-20 h-20 rounded-lg object-contain border border-slate-200 bg-white"
                        data-testid="logo-preview"
                      />
                    ) : (
                      <div 
                        className="w-20 h-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
                        style={{ backgroundColor: teamColor || '#000000' }}
                      >
                        {teamName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Controls - Gated by custom_team_logos feature */}
                  <div className="flex-1 space-y-2">
                    {canAccess('custom_team_logos') ? (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="file"
                            id="logoUpload"
                            onChange={handleLogoUpload}
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            className="hidden"
                            data-testid="logo-file-input"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => document.getElementById('logoUpload').click()}
                            disabled={uploadingLogo}
                            data-testid="upload-logo-btn"
                          >
                            {uploadingLogo ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload Image
                          </Button>
                          {teamLogo && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setTeamLogo("")}
                              className="text-red-500 hover:text-red-600"
                              data-testid="remove-logo-btn"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF or WEBP. Max 5MB.
                        </p>
                        <Input
                          id="teamLogo"
                          value={teamLogo}
                          onChange={(e) => setTeamLogo(e.target.value)}
                          placeholder="Or paste image URL..."
                          className="text-sm"
                          data-testid="edit-team-logo"
                        />
                      </>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700 mb-1">
                          <Lock className="w-4 h-4" />
                          <span className="font-medium flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Gold Feature
                          </span>
                        </div>
                        <p className="text-sm text-amber-600">
                          Custom team logos require {getRequiredTierFor('custom_team_logos')} tier.
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-amber-700 p-0 h-auto mt-1"
                          onClick={() => navigate('/pricing')}
                        >
                          Upgrade to add logos →
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Label>Team Color</Label>
              <div className="mt-2">
                <ColorPicker 
                  value={teamColor} 
                  onChange={setTeamColor}
                />
              </div>
            </div>
            
            {/* Save Button - moved here below color selector */}
            <div className="pt-4 border-t">
              <Button 
                onClick={handleSave} 
                className="w-full bg-[#000000] hover:bg-[#333333]" 
                data-testid="save-team-btn"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setMaxPrepsOpen(true)}
                  data-testid="import-maxpreps-btn"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Import from URL
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
              <Button variant="outline" onClick={openBulkAdd} data-testid="bulk-add-btn">
                <Users className="w-4 h-4 mr-2" />
                Bulk Add
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
              <div className="text-center py-8 sm:py-12 border-2 border-dashed border-slate-200 rounded-lg">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-600">No Players Added Yet</h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                  Add players manually, upload a CSV file, or import from a roster website.
                </p>
              </div>
            )}

            <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-muted-foreground">
              <strong>CSV Format:</strong> Your CSV should have columns for &quot;number&quot; (or &quot;#&quot;) and &quot;name&quot; (or &quot;player&quot;).
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkAddOpen} onOpenChange={setBulkAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Add Players</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fill in multiple players at once. Empty rows will be ignored.
            </p>
            
            {/* Header */}
            <div className="flex gap-2 items-center px-1">
              <div className="w-20 text-sm font-medium text-muted-foreground">#</div>
              <div className="flex-1 text-sm font-medium text-muted-foreground">Player Name</div>
              <div className="w-10"></div>
            </div>
            
            {/* Scrollable rows */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {bulkPlayers.map((player, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="#"
                      value={player.number}
                      onChange={(e) => handleBulkPlayerChange(index, "number", e.target.value)}
                      className="w-20"
                      data-testid={`bulk-number-${index}`}
                    />
                    <Input
                      placeholder="Player Name"
                      value={player.name}
                      onChange={(e) => handleBulkPlayerChange(index, "name", e.target.value)}
                      className="flex-1"
                      data-testid={`bulk-name-${index}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeBulkRow(index)}
                      disabled={bulkPlayers.length <= 1}
                      data-testid={`bulk-remove-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Add Row Button */}
            <Button
              variant="outline"
              onClick={addBulkRow}
              className="w-full"
              data-testid="add-bulk-row-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
            
            {/* Footer with count and actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {bulkPlayers.filter(p => p.number.trim() && p.name.trim()).length} player(s) to add
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBulkAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkAddPlayers} data-testid="confirm-bulk-add-btn">
                  <Users className="w-4 h-4 mr-2" />
                  Add All Players
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MaxPreps Import Dialog */}
      <Dialog open={maxPrepsOpen} onOpenChange={setMaxPrepsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Roster from Website</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Paste a roster page URL from any athletic website (school, college, or team sites).
            </p>
            <div>
              <Label htmlFor="maxpreps-url">Roster Page URL</Label>
              <Input
                id="maxpreps-url"
                placeholder="https://www.schoolathletics.com/sports/mbkb/roster"
                value={maxPrepsUrl}
                onChange={(e) => setMaxPrepsUrl(e.target.value)}
                className="mt-1"
                data-testid="maxpreps-url-input"
              />
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-muted-foreground space-y-1">
              <p><strong>Works with sites powered by:</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>PrestoSports (college athletic sites)</li>
                <li>Sidearm Sports (college athletic sites)</li>
                <li>MaxPreps (high school)</li>
                <li>Most athletic website roster pages</li>
              </ul>
              <p className="mt-2 text-xs text-slate-400">Example: apacheathletics.com/sports/mbkb/2025-26/roster</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setMaxPrepsOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleMaxPrepsImport} 
                disabled={maxPrepsLoading || !maxPrepsUrl.trim()}
                className="flex-1"
                data-testid="import-maxpreps-submit"
              >
                {maxPrepsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Import Roster
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

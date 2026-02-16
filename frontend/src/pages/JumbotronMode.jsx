import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Monitor, Plus, Trash2, Copy, ExternalLink, 
  Calendar, Clock, Link as LinkIcon, Settings, Play, Tv2,
  ChevronDown, ChevronUp, GripVertical
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Preset sizes for jumbotron
const PRESET_SIZES = [
  { label: "1080p (1920×1080)", width: 1920, height: 1080 },
  { label: "720p (1280×720)", width: 1280, height: 720 },
  { label: "4K (3840×2160)", width: 3840, height: 2160 },
  { label: "Square (1080×1080)", width: 1080, height: 1080 },
  { label: "Vertical (1080×1920)", width: 1080, height: 1920 },
  { label: "Custom", width: 0, height: 0 }
];

// Schedule Item Component
const ScheduleItem = ({ item, index, onUpdate, onDelete, userGames }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-800/50 overflow-hidden">
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-700/30"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-zinc-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {item.label || `Slot ${index + 1}`}
          </p>
          <p className="text-xs text-zinc-400 truncate">
            {item.source_type === 'statmoose' ? 'StatMoose Game' : 'PrestoSports'}
            {item.start_time && ` • Starts: ${new Date(item.start_time).toLocaleString()}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-zinc-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-zinc-700 space-y-4">
          <div>
            <Label className="text-zinc-300">Slot Name</Label>
            <Input
              value={item.label || ""}
              onChange={(e) => onUpdate({ ...item, label: e.target.value })}
              placeholder="e.g., Game 1, Finals, etc."
              className="mt-1 bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          
          <div>
            <Label className="text-zinc-300">Source Type</Label>
            <Select
              value={item.source_type}
              onValueChange={(value) => onUpdate({ ...item, source_type: value, source_url: "" })}
            >
              <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="statmoose">StatMoose Game</SelectItem>
                <SelectItem value="prestosports">PrestoSports Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {item.source_type === 'statmoose' ? (
            <div>
              <Label className="text-zinc-300">Select Game or Paste Share Link</Label>
              <div className="mt-1 space-y-2">
                {userGames && userGames.length > 0 && (
                  <Select
                    value={item.source_url}
                    onValueChange={(value) => onUpdate({ ...item, source_url: value })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Select a game..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userGames.map((game) => (
                        <SelectItem key={game.id} value={game.share_code}>
                          {game.home_team_name} vs {game.away_team_name} ({game.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="text-xs text-zinc-500 text-center">or</div>
                <Input
                  value={item.source_url}
                  onChange={(e) => onUpdate({ ...item, source_url: e.target.value })}
                  placeholder="Paste share code or full jumbotron URL"
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-zinc-300">PrestoSports XML URL</Label>
              <Input
                value={item.source_url}
                onChange={(e) => onUpdate({ ...item, source_url: e.target.value })}
                placeholder="https://example.com/sports/wbkb/2025-26/boxscores/game.xml"
                className="mt-1 bg-zinc-900 border-zinc-700 text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Enter the full URL to the PrestoSports box score XML
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-300">Start Time</Label>
              <Input
                type="datetime-local"
                value={item.start_time ? item.start_time.slice(0, 16) : ""}
                onChange={(e) => onUpdate({ ...item, start_time: new Date(e.target.value).toISOString() })}
                className="mt-1 bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">End Time (Optional)</Label>
              <Input
                type="datetime-local"
                value={item.end_time ? item.end_time.slice(0, 16) : ""}
                onChange={(e) => onUpdate({ ...item, end_time: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="mt-1 bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Slot
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function JumbotronMode() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userGames, setUserGames] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Create/Edit dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configName, setConfigName] = useState("");
  const [configWidth, setConfigWidth] = useState(1920);
  const [configHeight, setConfigHeight] = useState(1080);
  const [schedule, setSchedule] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState("1080p (1920×1080)");
  const [saving, setSaving] = useState(false);
  
  // Output dialog
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [outputConfig, setOutputConfig] = useState(null);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      // Check if user is logged in
      const profileRes = await axios.get(`${API}/account/profile`);
      if (profileRes.data) {
        setIsLoggedIn(true);
        
        // Fetch user's jumbotron configs
        const configsRes = await axios.get(`${API}/jumbotron/configs`);
        setConfigs(configsRes.data.configs || []);
        
        // Fetch user's games for selection
        const gamesRes = await axios.get(`${API}/jumbotron/user-games`);
        setUserGames(gamesRes.data.games || []);
      }
    } catch (error) {
      // User not logged in - that's ok, show demo/guest mode
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingConfig(null);
    setConfigName("");
    setConfigWidth(1920);
    setConfigHeight(1080);
    setSelectedPreset("1080p (1920×1080)");
    setSchedule([{
      id: `slot_${Date.now()}`,
      source_type: "statmoose",
      source_url: "",
      start_time: new Date().toISOString(),
      end_time: null,
      label: "Game 1"
    }]);
    setShowDialog(true);
  };

  const openEditDialog = (config) => {
    setEditingConfig(config);
    setConfigName(config.name);
    setConfigWidth(config.width);
    setConfigHeight(config.height);
    setSchedule(config.schedule || []);
    
    // Find matching preset
    const preset = PRESET_SIZES.find(p => p.width === config.width && p.height === config.height);
    setSelectedPreset(preset ? preset.label : "Custom");
    
    setShowDialog(true);
  };

  const handlePresetChange = (presetLabel) => {
    setSelectedPreset(presetLabel);
    const preset = PRESET_SIZES.find(p => p.label === presetLabel);
    if (preset && preset.width > 0) {
      setConfigWidth(preset.width);
      setConfigHeight(preset.height);
    }
  };

  const addScheduleSlot = () => {
    setSchedule([...schedule, {
      id: `slot_${Date.now()}`,
      source_type: "statmoose",
      source_url: "",
      start_time: new Date().toISOString(),
      end_time: null,
      label: `Game ${schedule.length + 1}`
    }]);
  };

  const updateScheduleSlot = (index, updatedItem) => {
    const newSchedule = [...schedule];
    newSchedule[index] = updatedItem;
    setSchedule(newSchedule);
  };

  const deleteScheduleSlot = (slotId) => {
    setSchedule(schedule.filter(s => s.id !== slotId));
  };

  const handleSave = async () => {
    if (!configName.trim()) {
      toast.error("Please enter a name for your jumbotron");
      return;
    }
    
    if (schedule.length === 0) {
      toast.error("Please add at least one game/source");
      return;
    }
    
    // Validate schedule items
    for (const item of schedule) {
      if (!item.source_url) {
        toast.error(`Please select a game or enter a URL for "${item.label || 'slot'}"`);
        return;
      }
    }
    
    setSaving(true);
    try {
      const payload = {
        name: configName,
        width: configWidth,
        height: configHeight,
        schedule: schedule
      };
      
      if (editingConfig) {
        await axios.put(`${API}/jumbotron/configs/${editingConfig.id}`, payload);
        toast.success("Jumbotron updated!");
      } else {
        await axios.post(`${API}/jumbotron/configs`, payload);
        toast.success("Jumbotron created!");
      }
      
      setShowDialog(false);
      checkAuthAndFetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save jumbotron");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (configId) => {
    if (!confirm("Are you sure you want to delete this jumbotron configuration?")) return;
    
    try {
      await axios.delete(`${API}/jumbotron/configs/${configId}`);
      toast.success("Jumbotron deleted");
      checkAuthAndFetchData();
    } catch (error) {
      toast.error("Failed to delete jumbotron");
    }
  };

  const showOutput = (config) => {
    setOutputConfig(config);
    setShowOutputDialog(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const getJumbotronUrl = (config) => {
    const baseUrl = process.env.REACT_APP_BACKEND_URL?.replace('-api', '') || window.location.origin;
    return `${baseUrl}/jumbotron/live/${config.embed_code}`;
  };

  const getIframeCode = (config) => {
    const url = getJumbotronUrl(config);
    return `<iframe src="${url}" width="${config.width}" height="${config.height}" frameborder="0" allowfullscreen></iframe>`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Tv2 className="w-12 h-12 text-orange-500 animate-pulse mx-auto" />
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-white.png" alt="StatMoose" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                    Sign In
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-zinc-400 hover:text-white mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Tv2 className="w-8 h-8 text-orange-500" />
                Jumbotron Mode
              </h1>
              <p className="text-zinc-400 mt-2">
                Create custom scoreboard displays for venue screens and jumbotrons
              </p>
            </div>
            {isLoggedIn && (
              <Button onClick={openCreateDialog} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                New Jumbotron
              </Button>
            )}
          </div>

          {/* Not Logged In State */}
          {!isLoggedIn && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="text-center">
                <CardTitle className="text-white">Sign In Required</CardTitle>
                <CardDescription className="text-zinc-400">
                  Create an account or sign in to create and manage jumbotron displays
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-4">
                <Link to="/login">
                  <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                    Sign In
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    Get Started Free
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Logged In - Config List */}
          {isLoggedIn && (
            <div className="space-y-4">
              {configs.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-12 text-center">
                    <Tv2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Jumbotrons Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      Create your first jumbotron display for venue scoreboards
                    </p>
                    <Button onClick={openCreateDialog} className="bg-orange-500 hover:bg-orange-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Jumbotron
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                configs.map((config) => (
                  <Card key={config.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-orange-500" />
                            {config.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
                            <span>{config.width}×{config.height}px</span>
                            <span>•</span>
                            <span>{config.schedule?.length || 0} game(s) scheduled</span>
                          </div>
                          {config.schedule && config.schedule.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {config.schedule.slice(0, 3).map((slot, i) => (
                                <p key={slot.id} className="text-xs text-zinc-500">
                                  {slot.label || `Slot ${i + 1}`}: {slot.source_type === 'statmoose' ? 'StatMoose' : 'PrestoSports'}
                                  {slot.start_time && ` - ${new Date(slot.start_time).toLocaleString()}`}
                                </p>
                              ))}
                              {config.schedule.length > 3 && (
                                <p className="text-xs text-zinc-500">+{config.schedule.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showOutput(config)}
                            className="border-zinc-700 text-white hover:bg-zinc-800"
                          >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Get Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(config)}
                            className="border-zinc-700 text-white hover:bg-zinc-800"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(config.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Feature Info */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <Calendar className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">Schedule Games</h3>
                <p className="text-sm text-zinc-400">
                  Queue multiple games for tournaments with automatic switching
                </p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <Monitor className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">Custom Sizes</h3>
                <p className="text-sm text-zinc-400">
                  Set exact dimensions to match your venue's display requirements
                </p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <LinkIcon className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">Easy Embed</h3>
                <p className="text-sm text-zinc-400">
                  Get a simple link or iframe code for any display system
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tv2 className="w-5 h-5 text-orange-500" />
              {editingConfig ? "Edit Jumbotron" : "Create Jumbotron"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure your jumbotron display settings and schedule games
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Name */}
            <div>
              <Label className="text-zinc-300">Jumbotron Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g., Main Court Display, Tournament Board"
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            
            {/* Size */}
            <div>
              <Label className="text-zinc-300">Display Size</Label>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_SIZES.map((preset) => (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={configWidth}
                    onChange={(e) => {
                      setConfigWidth(parseInt(e.target.value) || 0);
                      setSelectedPreset("Custom");
                    }}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Width"
                  />
                  <span className="text-zinc-500">×</span>
                  <Input
                    type="number"
                    value={configHeight}
                    onChange={(e) => {
                      setConfigHeight(parseInt(e.target.value) || 0);
                      setSelectedPreset("Custom");
                    }}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Height"
                  />
                  <span className="text-zinc-500 text-sm">px</span>
                </div>
              </div>
            </div>
            
            {/* Schedule */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-zinc-300">Game Schedule</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addScheduleSlot}
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Game
                </Button>
              </div>
              
              <div className="space-y-3">
                {schedule.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-zinc-700 rounded-lg">
                    <p className="text-zinc-500 text-sm">No games scheduled. Click "Add Game" to get started.</p>
                  </div>
                ) : (
                  schedule.map((item, index) => (
                    <ScheduleItem
                      key={item.id}
                      item={item}
                      index={index}
                      onUpdate={(updated) => updateScheduleSlot(index, updated)}
                      onDelete={deleteScheduleSlot}
                      userGames={userGames}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? "Saving..." : (editingConfig ? "Save Changes" : "Create Jumbotron")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Output Dialog */}
      <Dialog open={showOutputDialog} onOpenChange={setShowOutputDialog}>
        <DialogContent className="max-w-xl bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-orange-500" />
              Jumbotron Output
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Use these links to display your jumbotron
            </DialogDescription>
          </DialogHeader>
          
          {outputConfig && (
            <div className="space-y-6 py-4">
              {/* Direct Link */}
              <div>
                <Label className="text-zinc-300 mb-2 block">Direct Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getJumbotronUrl(outputConfig)}
                    className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getJumbotronUrl(outputConfig))}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(getJumbotronUrl(outputConfig), '_blank')}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Open this link in full screen on your display
                </p>
              </div>
              
              {/* Iframe Code */}
              <div>
                <Label className="text-zinc-300 mb-2 block">Embed Code (iframe)</Label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={getIframeCode(outputConfig)}
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-3 text-white font-mono text-xs resize-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getIframeCode(outputConfig))}
                    className="absolute top-2 right-2 border-zinc-600 hover:bg-zinc-700"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Paste this code into your website or display system
                </p>
              </div>
              
              {/* Size Info */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-sm text-zinc-300">
                  <strong>Display Size:</strong> {outputConfig.width}×{outputConfig.height}px
                </p>
                <p className="text-sm text-zinc-300 mt-1">
                  <strong>Scheduled Games:</strong> {outputConfig.schedule?.length || 0}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowOutputDialog(false)} className="bg-orange-500 hover:bg-orange-600">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

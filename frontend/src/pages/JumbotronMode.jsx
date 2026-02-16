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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Monitor, Plus, Trash2, Copy, ExternalLink, 
  Calendar, Clock, Link as LinkIcon, Settings, Tv2,
  ChevronDown, ChevronUp, GripVertical, Layers, LayoutGrid
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Preset sizes for jumbotron displays
const DISPLAY_PRESETS = [
  { label: "HD Overhead (1920×1080)", width: 1920, height: 1080, layout: "full", description: "Full stats display" },
  { label: "4K Display (3840×2160)", width: 3840, height: 2160, layout: "full", description: "Full stats display" },
  { label: "Scorers Table Wide (1920×400)", width: 1920, height: 400, layout: "scorers", description: "Stat leaders + score" },
  { label: "Scorers Table Ultra-Wide (2560×400)", width: 2560, height: 400, layout: "scorers", description: "Stat leaders + score" },
  { label: "Minimal Score (1280×200)", width: 1280, height: 200, layout: "minimal", description: "Score only" },
  { label: "Square (1080×1080)", width: 1080, height: 1080, layout: "full", description: "Full stats display" },
  { label: "Custom", width: 0, height: 0, layout: "full", description: "Set your own dimensions" }
];

// Layout types
const LAYOUT_TYPES = [
  { value: "full", label: "Full Stats", description: "Complete player stats table with team headers" },
  { value: "scorers", label: "Scorers Table", description: "Stat leaders + score (horizontal layout)" },
  { value: "minimal", label: "Minimal Score", description: "Just team names, logos, and scores" }
];

// Preview Component - Shows a scaled preview of the jumbotron output
const JumbotronPreview = ({ display }) => {
  const { width, height, layout } = display;
  const aspectRatio = width / height;
  
  // Scale to fit in preview container (max 400px width)
  const previewWidth = Math.min(400, width / 4);
  const previewHeight = previewWidth / aspectRatio;
  
  // Demo data for preview
  const demoData = {
    homeTeam: "TIGERS",
    awayTeam: "EAGLES",
    homeScore: 72,
    awayScore: 68,
    homeColor: "#f97316",
    awayColor: "#3b82f6"
  };
  
  if (layout === "scorers") {
    return (
      <div 
        className="rounded border border-zinc-600 overflow-hidden"
        style={{ 
          width: previewWidth, 
          height: Math.max(previewHeight, 80),
          background: '#0a0a12',
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        <div className="h-full flex items-center justify-between px-2" style={{ fontSize: '8px' }}>
          {/* Home Stats */}
          <div className="flex items-center gap-1">
            <div className="flex flex-col gap-0.5">
              <div className="text-gray-400 font-bold">PTS <span className="text-white">24</span></div>
              <div className="text-gray-400 font-bold">REB <span className="text-white">8</span></div>
              <div className="text-gray-400 font-bold">AST <span className="text-white">5</span></div>
            </div>
            <div className="text-white font-bold text-center" style={{ fontSize: '6px' }}>{demoData.homeTeam}</div>
            <div className="font-black text-lg" style={{ color: demoData.homeColor }}>{demoData.homeScore}</div>
          </div>
          
          {/* VS */}
          <div className="px-2 py-1 rounded bg-zinc-800 text-white font-bold" style={{ fontSize: '7px' }}>VS</div>
          
          {/* Away Stats */}
          <div className="flex items-center gap-1">
            <div className="font-black text-lg" style={{ color: demoData.awayColor }}>{demoData.awayScore}</div>
            <div className="text-white font-bold text-center" style={{ fontSize: '6px' }}>{demoData.awayTeam}</div>
            <div className="flex flex-col gap-0.5 text-right">
              <div className="text-gray-400 font-bold"><span className="text-white">22</span> PTS</div>
              <div className="text-gray-400 font-bold"><span className="text-white">6</span> REB</div>
              <div className="text-gray-400 font-bold"><span className="text-white">7</span> AST</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (layout === "minimal") {
    return (
      <div 
        className="rounded border border-zinc-600 overflow-hidden"
        style={{ 
          width: previewWidth, 
          height: Math.max(previewHeight, 60),
          background: '#0a0a12',
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        <div className="h-full flex items-center justify-center gap-4" style={{ fontSize: '10px' }}>
          <div className="text-center">
            <div className="text-white font-bold">{demoData.homeTeam}</div>
            <div className="font-black text-2xl" style={{ color: demoData.homeColor }}>{demoData.homeScore}</div>
          </div>
          <div className="text-gray-500 font-bold">—</div>
          <div className="text-center">
            <div className="text-white font-bold">{demoData.awayTeam}</div>
            <div className="font-black text-2xl" style={{ color: demoData.awayColor }}>{demoData.awayScore}</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Full layout preview
  return (
    <div 
      className="rounded border border-zinc-600 overflow-hidden"
      style={{ 
        width: previewWidth, 
        height: Math.max(previewHeight, 100),
        background: '#0a0a12',
        fontFamily: "'Montserrat', sans-serif"
      }}
    >
      <div className="h-full flex flex-col">
        {/* Home Team */}
        <div className="flex-1 flex flex-col" style={{ borderBottom: '1px solid #1a1a2e' }}>
          <div className="px-2 py-1 flex items-center justify-between" style={{ backgroundColor: demoData.homeColor }}>
            <span className="text-white font-bold" style={{ fontSize: '8px' }}>{demoData.homeTeam}</span>
            <span className="text-white font-bold" style={{ fontSize: '6px' }}>TO: 5 | FOULS: 3</span>
          </div>
          <div className="flex-1 px-1 py-0.5 text-white" style={{ fontSize: '5px' }}>
            <div className="grid grid-cols-9 gap-0.5 font-bold text-gray-400 mb-0.5">
              <span>#</span><span>PLAYER</span><span>FG</span><span>3PT</span><span>FT</span><span>REB</span><span>AST</span><span>PF</span><span className="text-yellow-400">PTS</span>
            </div>
            <div className="grid grid-cols-9 gap-0.5">
              <span>23</span><span>Johnson</span><span>4-8</span><span>2-4</span><span>2-2</span><span>5</span><span>3</span><span>2</span><span className="text-yellow-400 font-bold">12</span>
            </div>
          </div>
        </div>
        {/* Away Team */}
        <div className="flex-1 flex flex-col">
          <div className="px-2 py-1 flex items-center justify-between" style={{ backgroundColor: demoData.awayColor }}>
            <span className="text-white font-bold" style={{ fontSize: '8px' }}>{demoData.awayTeam}</span>
            <span className="text-white font-bold" style={{ fontSize: '6px' }}>TO: 4 | FOULS: 5</span>
          </div>
          <div className="flex-1 px-1 py-0.5 text-white" style={{ fontSize: '5px' }}>
            <div className="grid grid-cols-9 gap-0.5 font-bold text-gray-400 mb-0.5">
              <span>#</span><span>PLAYER</span><span>FG</span><span>3PT</span><span>FT</span><span>REB</span><span>AST</span><span>PF</span><span className="text-yellow-400">PTS</span>
            </div>
            <div className="grid grid-cols-9 gap-0.5">
              <span>11</span><span>Williams</span><span>5-10</span><span>1-3</span><span>3-4</span><span>7</span><span>4</span><span>3</span><span className="text-yellow-400 font-bold">14</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Display Output Component
const DisplayOutput = ({ display, index, onUpdate, onDelete, schedule, configId }) => {
  const [expanded, setExpanded] = useState(index === 0);
  const [showLivePreview, setShowLivePreview] = useState(false);
  
  // Get the first game from schedule for live preview
  const firstGame = schedule?.find(s => s.game_id);
  const previewUrl = firstGame && configId ? 
    `${process.env.REACT_APP_BACKEND_URL}/jumbotron/live/${configId}?layout=${display.layout}&display=${display.id}` : 
    null;
  
  // Scale preview to fit container
  const getScaledPreviewSize = () => {
    const maxWidth = 500;
    const scale = maxWidth / display.width;
    return {
      width: maxWidth,
      height: Math.round(display.height * scale)
    };
  };
  const scaledSize = getScaledPreviewSize();
  
  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-800/50 overflow-hidden">
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-700/30"
        onClick={() => setExpanded(!expanded)}
      >
        <Monitor className="w-4 h-4 text-orange-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {display.name || `Display ${index + 1}`}
          </p>
          <p className="text-xs text-zinc-400">
            {display.width}×{display.height}px • {LAYOUT_TYPES.find(l => l.value === display.layout)?.label || 'Full Stats'}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-zinc-400" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-zinc-700 space-y-4">
          <div>
            <Label className="text-zinc-300">Display Name</Label>
            <Input
              value={display.name || ""}
              onChange={(e) => onUpdate({ ...display, name: e.target.value })}
              placeholder="e.g., Main Jumbotron, Scorers Table"
              className="mt-1 bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          
          <div>
            <Label className="text-zinc-300">Preset Size</Label>
            <Select
              value={DISPLAY_PRESETS.find(p => p.width === display.width && p.height === display.height)?.label || "Custom"}
              onValueChange={(val) => {
                const preset = DISPLAY_PRESETS.find(p => p.label === val);
                if (preset && preset.width > 0) {
                  onUpdate({ ...display, width: preset.width, height: preset.height, layout: preset.layout });
                }
              }}
            >
              <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    <div>
                      <span>{preset.label}</span>
                      {preset.description && <span className="text-zinc-500 ml-2 text-xs">({preset.description})</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-300">Width (px)</Label>
              <Input
                type="number"
                value={display.width}
                onChange={(e) => onUpdate({ ...display, width: parseInt(e.target.value) || 0 })}
                className="mt-1 bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Height (px)</Label>
              <Input
                type="number"
                value={display.height}
                onChange={(e) => onUpdate({ ...display, height: parseInt(e.target.value) || 0 })}
                className="mt-1 bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-zinc-300">Layout Style</Label>
            <Select value={display.layout || "full"} onValueChange={(val) => onUpdate({ ...display, layout: val })}>
              <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_TYPES.map((layout) => (
                  <SelectItem key={layout.value} value={layout.value}>
                    <div>
                      <span className="font-medium">{layout.label}</span>
                      <span className="text-zinc-500 ml-2 text-xs">- {layout.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Preview */}
          <div>
            <Label className="text-zinc-300 mb-2 block">Preview</Label>
            <div className="bg-zinc-900 rounded-lg p-4 flex items-center justify-center">
              <JumbotronPreview display={display} />
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              Scaled preview • Actual size: {display.width}×{display.height}px
            </p>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(display.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Display
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Schedule Item Component
const ScheduleItem = ({ item, index, onUpdate, onDelete, userGames }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-800/50 overflow-hidden">
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-700/30"
        onClick={() => setExpanded(!expanded)}
      >
        <Calendar className="w-4 h-4 text-blue-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {item.label || `Game ${index + 1}`}
          </p>
          <p className="text-xs text-zinc-400 truncate">
            {item.source_type === 'statmoose' ? 'StatMoose' : 'PrestoSports'}
            {item.start_time && ` • ${new Date(item.start_time).toLocaleString()}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-zinc-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-zinc-700 space-y-4">
          <div>
            <Label className="text-zinc-300">Game Name</Label>
            <Input
              value={item.label || ""}
              onChange={(e) => onUpdate({ ...item, label: e.target.value })}
              placeholder="e.g., Game 1, Championship, etc."
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
              <Label className="text-zinc-300">Select Game or Paste Share Code</Label>
              <div className="mt-1 space-y-2">
                {userGames && userGames.length > 0 && (
                  <Select value={item.source_url} onValueChange={(value) => onUpdate({ ...item, source_url: value })}>
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
                <Input
                  value={item.source_url}
                  onChange={(e) => onUpdate({ ...item, source_url: e.target.value })}
                  placeholder="Or paste share code"
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
                placeholder="https://example.com/sports/wbkb/boxscores/game.xml"
                className="mt-1 bg-zinc-900 border-zinc-700 text-white"
              />
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
            <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Game
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
  const [displays, setDisplays] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("displays");
  
  // Output dialog
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [outputConfig, setOutputConfig] = useState(null);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const profileRes = await axios.get(`${API}/account/profile`);
      if (profileRes.data) {
        setIsLoggedIn(true);
        const configsRes = await axios.get(`${API}/jumbotron/configs`);
        setConfigs(configsRes.data.configs || []);
        const gamesRes = await axios.get(`${API}/jumbotron/user-games`);
        setUserGames(gamesRes.data.games || []);
      }
    } catch (error) {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingConfig(null);
    setConfigName("");
    setDisplays([
      { id: `disp_${Date.now()}`, name: "Main Jumbotron", width: 1920, height: 1080, layout: "full" }
    ]);
    setSchedule([{
      id: `slot_${Date.now()}`,
      source_type: "statmoose",
      source_url: "",
      start_time: new Date().toISOString(),
      end_time: null,
      label: "Game 1"
    }]);
    setActiveTab("displays");
    setShowDialog(true);
  };

  const openEditDialog = (config) => {
    setEditingConfig(config);
    setConfigName(config.name);
    // Support legacy single-display configs
    if (config.displays && config.displays.length > 0) {
      setDisplays(config.displays);
    } else {
      setDisplays([{ id: `disp_${Date.now()}`, name: "Main Display", width: config.width, height: config.height, layout: "full" }]);
    }
    setSchedule(config.schedule || []);
    setActiveTab("displays");
    setShowDialog(true);
  };

  const addDisplay = () => {
    setDisplays([...displays, {
      id: `disp_${Date.now()}`,
      name: `Display ${displays.length + 1}`,
      width: 1920,
      height: 400,
      layout: "scorers"
    }]);
  };

  const updateDisplay = (index, updated) => {
    const newDisplays = [...displays];
    newDisplays[index] = updated;
    setDisplays(newDisplays);
  };

  const deleteDisplay = (dispId) => {
    if (displays.length <= 1) {
      toast.error("You need at least one display");
      return;
    }
    setDisplays(displays.filter(d => d.id !== dispId));
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

  const updateScheduleSlot = (index, updated) => {
    const newSchedule = [...schedule];
    newSchedule[index] = updated;
    setSchedule(newSchedule);
  };

  const deleteScheduleSlot = (slotId) => {
    setSchedule(schedule.filter(s => s.id !== slotId));
  };

  const handleSave = async () => {
    if (!configName.trim()) {
      toast.error("Please enter an event name");
      return;
    }
    if (displays.length === 0) {
      toast.error("Please add at least one display");
      return;
    }
    if (schedule.length === 0) {
      toast.error("Please add at least one game");
      return;
    }
    for (const item of schedule) {
      if (!item.source_url) {
        toast.error(`Please select a game source for "${item.label || 'slot'}"`);
        return;
      }
    }
    
    setSaving(true);
    try {
      const payload = {
        name: configName,
        width: displays[0].width, // Primary display for backwards compat
        height: displays[0].height,
        displays: displays,
        schedule: schedule
      };
      
      if (editingConfig) {
        await axios.put(`${API}/jumbotron/configs/${editingConfig.id}`, payload);
        toast.success("Event updated!");
      } else {
        await axios.post(`${API}/jumbotron/configs`, payload);
        toast.success("Event created!");
      }
      
      setShowDialog(false);
      checkAuthAndFetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (configId) => {
    if (!confirm("Delete this jumbotron event?")) return;
    try {
      await axios.delete(`${API}/jumbotron/configs/${configId}`);
      toast.success("Deleted");
      checkAuthAndFetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const showOutput = (config) => {
    setOutputConfig(config);
    setShowOutputDialog(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const getJumbotronUrl = (config, display = null) => {
    const baseUrl = process.env.REACT_APP_BACKEND_URL?.replace('-api', '') || window.location.origin;
    let url = `${baseUrl}/jumbotron/live/${config.embed_code}`;
    if (display && display.layout) {
      url += `?layout=${display.layout}`;
    }
    return url;
  };

  const getIframeCode = (config, display) => {
    const url = getJumbotronUrl(config, display);
    return `<iframe src="${url}" width="${display.width}" height="${display.height}" frameborder="0" allowfullscreen style="border:0;"></iframe>`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-center">
          <Tv2 className="w-12 h-12 text-orange-500 animate-pulse mx-auto" />
          <p className="mt-4 text-zinc-400 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');`}</style>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-white.png" alt="StatMoose" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold">Sign In</Button></Link>
                <Link to="/pricing"><Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold">Get Started</Button></Link>
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
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white mb-2 font-semibold">
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
              <h1 className="text-3xl font-black flex items-center gap-3 uppercase tracking-wide">
                <Tv2 className="w-8 h-8 text-orange-500" />
                Jumbotron Mode
              </h1>
              <p className="text-zinc-400 mt-2 font-medium">
                Create venue displays with multiple screen sizes for tournaments
              </p>
            </div>
            {isLoggedIn && (
              <Button onClick={openCreateDialog} className="bg-orange-500 hover:bg-orange-600 font-bold">
                <Plus className="w-4 h-4 mr-2" />New Event
              </Button>
            )}
          </div>

          {/* Not Logged In */}
          {!isLoggedIn && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="text-center">
                <CardTitle className="text-white font-bold">Sign In Required</CardTitle>
                <CardDescription className="text-zinc-400">Create an account to manage jumbotron displays</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-4">
                <Link to="/login"><Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 font-semibold">Sign In</Button></Link>
                <Link to="/pricing"><Button className="bg-orange-500 hover:bg-orange-600 font-bold">Get Started Free</Button></Link>
              </CardContent>
            </Card>
          )}

          {/* Config List */}
          {isLoggedIn && (
            <div className="space-y-4">
              {configs.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-12 text-center">
                    <Tv2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">No Events Yet</h3>
                    <p className="text-zinc-400 mb-6 font-medium">Create your first jumbotron event</p>
                    <Button onClick={openCreateDialog} className="bg-orange-500 hover:bg-orange-600 font-bold">
                      <Plus className="w-4 h-4 mr-2" />Create Event
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
                            <Tv2 className="w-5 h-5 text-orange-500" />
                            {config.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Layers className="w-4 h-4" />
                              {config.displays?.length || 1} display(s)
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {config.schedule?.length || 0} game(s)
                            </span>
                          </div>
                          {config.displays && config.displays.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {config.displays.map((disp, i) => (
                                <span key={i} className="text-xs bg-zinc-800 px-2 py-1 rounded font-medium">
                                  {disp.name}: {disp.width}×{disp.height}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => showOutput(config)} className="border-zinc-700 text-white hover:bg-zinc-800 font-semibold">
                            <LinkIcon className="w-4 h-4 mr-2" />Get Links
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(config)} className="border-zinc-700 text-white hover:bg-zinc-800 font-semibold">
                            <Settings className="w-4 h-4 mr-2" />Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
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
                <Layers className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">Multiple Displays</h3>
                <p className="text-sm text-zinc-400 font-medium">
                  Create different sized outputs for overhead screens and scorers tables
                </p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <Calendar className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">Tournament Ready</h3>
                <p className="text-sm text-zinc-400 font-medium">
                  Schedule multiple games with automatic switching
                </p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <LayoutGrid className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">Layout Options</h3>
                <p className="text-sm text-zinc-400 font-medium">
                  Full stats, scorers table, or minimal score display
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Tv2 className="w-5 h-5 text-orange-500" />
              {editingConfig ? "Edit Event" : "Create Event"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 font-medium">
              Configure displays and schedule games for your event
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-300 font-semibold">Event Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g., Winter Tournament, Championship Night"
                className="mt-1 bg-zinc-800 border-zinc-700 text-white font-medium"
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                <TabsTrigger value="displays" className="font-semibold">
                  <Monitor className="w-4 h-4 mr-2" />
                  Displays ({displays.length})
                </TabsTrigger>
                <TabsTrigger value="schedule" className="font-semibold">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule ({schedule.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="displays" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400 font-medium">Add displays for different screens (overhead, scorers table, etc.)</p>
                  <Button variant="outline" size="sm" onClick={addDisplay} className="border-zinc-700 text-white hover:bg-zinc-800 font-semibold">
                    <Plus className="w-4 h-4 mr-1" />Add Display
                  </Button>
                </div>
                {displays.map((display, index) => (
                  <DisplayOutput
                    key={display.id}
                    display={display}
                    index={index}
                    onUpdate={(updated) => updateDisplay(index, updated)}
                    onDelete={deleteDisplay}
                  />
                ))}
              </TabsContent>
              
              <TabsContent value="schedule" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400 font-medium">Schedule games with start times for automatic switching</p>
                  <Button variant="outline" size="sm" onClick={addScheduleSlot} className="border-zinc-700 text-white hover:bg-zinc-800 font-semibold">
                    <Plus className="w-4 h-4 mr-1" />Add Game
                  </Button>
                </div>
                {schedule.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-zinc-700 rounded-lg">
                    <p className="text-zinc-500 text-sm font-medium">No games scheduled. Click "Add Game" to start.</p>
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
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-zinc-700 text-white hover:bg-zinc-800 font-semibold">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 font-bold">
              {saving ? "Saving..." : (editingConfig ? "Save Changes" : "Create Event")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Output Dialog */}
      <Dialog open={showOutputDialog} onOpenChange={setShowOutputDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <LinkIcon className="w-5 h-5 text-orange-500" />
              Display Links & Embed Codes
            </DialogTitle>
            <DialogDescription className="text-zinc-400 font-medium">
              Use these links on your venue displays
            </DialogDescription>
          </DialogHeader>
          
          {outputConfig && (
            <div className="space-y-6 py-4">
              {/* For each display */}
              {(outputConfig.displays || [{ name: "Main Display", width: outputConfig.width, height: outputConfig.height, layout: "full" }]).map((display, idx) => (
                <div key={idx} className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/30">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-orange-500" />
                    {display.name || `Display ${idx + 1}`}
                    <span className="text-xs text-zinc-500 font-normal ml-2">
                      {display.width}×{display.height}px • {LAYOUT_TYPES.find(l => l.value === display.layout)?.label || 'Full'}
                    </span>
                  </h3>
                  
                  {/* Direct Link */}
                  <div className="mb-4">
                    <Label className="text-zinc-400 text-sm font-semibold">Direct Link</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input readOnly value={getJumbotronUrl(outputConfig, display)} className="bg-zinc-900 border-zinc-700 text-white font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(getJumbotronUrl(outputConfig, display))} className="border-zinc-700 hover:bg-zinc-800">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(getJumbotronUrl(outputConfig, display), '_blank')} className="border-zinc-700 hover:bg-zinc-800">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Iframe */}
                  <div>
                    <Label className="text-zinc-400 text-sm font-semibold">Embed Code</Label>
                    <div className="relative mt-1">
                      <textarea readOnly value={getIframeCode(outputConfig, display)} rows={2} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white font-mono text-xs resize-none" />
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(getIframeCode(outputConfig, display))} className="absolute top-1 right-1 border-zinc-600 hover:bg-zinc-700 text-xs font-semibold">
                        <Copy className="w-3 h-3 mr-1" />Copy
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Schedule Info */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-sm text-zinc-300 font-semibold mb-2">Scheduled Games: {outputConfig.schedule?.length || 0}</p>
                {outputConfig.schedule && outputConfig.schedule.map((slot, i) => (
                  <p key={i} className="text-xs text-zinc-500">
                    • {slot.label || `Game ${i + 1}`}: {new Date(slot.start_time).toLocaleString()}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowOutputDialog(false)} className="bg-orange-500 hover:bg-orange-600 font-bold">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

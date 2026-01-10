import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users, History, PlayCircle, Code, Check, Calendar, Clock, Link2, Image, Trash2, Upload, ExternalLink, Copy, Pencil, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useSport, SPORT_CONFIG } from "@/contexts/SportContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { selectedSport } = useSport();
  const sportConfig = SPORT_CONFIG[selectedSport] || SPORT_CONFIG.basketball;
  const [activeGames, setActiveGames] = useState([]);
  const [scheduledGames, setScheduledGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [startingGameId, setStartingGameId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  
  // Sponsor banner state
  const [sponsorBanners, setSponsorBanners] = useState([]);
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Embed dialog state
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedWidth, setEmbedWidth] = useState("1920");
  const [embedHeight, setEmbedHeight] = useState("300");

  // Start game mode selection dialog
  const [startModeDialogOpen, setStartModeDialogOpen] = useState(false);
  const [selectedGameToStart, setSelectedGameToStart] = useState(null);
  const [selectedStartMode, setSelectedStartMode] = useState("classic");

  // Check if user belongs to a school
  useEffect(() => {
    const checkSchool = async () => {
      try {
        const res = await axios.get(`${API}/schools/my-school`);
        setSchoolInfo(res.data);
      } catch (error) {
        // User doesn't belong to a school - that's fine
        setSchoolInfo(null);
      }
    };
    checkSchool();
  }, []);

  useEffect(() => {
    fetchData();
    fetchSponsorBanners();
    // Set document title based on sport
    const sportAbbrev = selectedSport === 'basketball' ? 'BKB' : selectedSport === 'football' ? 'FB' : 'BB';
    document.title = `StatMoose ${sportAbbrev}`;
  }, [selectedSport]);

  const fetchSponsorBanners = async () => {
    try {
      const res = await axios.get(`${API}/sponsor-banners`);
      setSponsorBanners(res.data);
    } catch (error) {
      console.error("Error fetching sponsor banners:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await axios.post(`${API}/sponsor-banners`, {
            image_data: reader.result,
            filename: file.name,
            link_url: null
          });
          fetchSponsorBanners();
          toast.success(`Uploaded ${file.name}`);
        } catch (error) {
          toast.error(`Failed to upload ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateBannerLink = async (bannerId, linkUrl) => {
    try {
      await axios.put(`${API}/sponsor-banners/${bannerId}`, {
        link_url: linkUrl || null
      });
      fetchSponsorBanners();
      toast.success("Link updated");
    } catch (error) {
      toast.error("Failed to update link");
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    try {
      await axios.delete(`${API}/sponsor-banners/${bannerId}`);
      fetchSponsorBanners();
      toast.success("Banner deleted");
    } catch (error) {
      toast.error("Failed to delete banner");
    }
  };

  const fetchData = async () => {
    // Don't fetch if no sport is selected
    if (!selectedSport) {
      setLoading(false);
      return;
    }
    
    try {
      const [gamesRes, teamsRes] = await Promise.all([
        axios.get(`${API}/games`, { params: { sport: selectedSport } }),
        axios.get(`${API}/teams`, { params: { sport: selectedSport } })
      ]);
      
      const games = gamesRes.data;
      setActiveGames(games.filter(g => g.status === "active"));
      setScheduledGames(games.filter(g => g.status === "scheduled").sort((a, b) => {
        // Sort by scheduled date
        if (a.scheduled_date && b.scheduled_date) {
          return a.scheduled_date.localeCompare(b.scheduled_date);
        }
        return 0;
      }));
      setRecentGames(games.filter(g => g.status === "completed").slice(0, 5));
      setTeams(teamsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (quarterScores, team) => {
    return quarterScores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const openEmbedDialog = () => {
    setEmbedDialogOpen(true);
  };

  const copyEmbedCode = () => {
    const embedUrl = `${window.location.origin}/embed/latest/${user.user_id}?w=${embedWidth}&h=${embedHeight}`;
    const embedCode = `<iframe src="${embedUrl}" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="max-width:100%;" allowfullscreen></iframe>`;
    
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    toast.success("Embed code copied! It will always show your latest live game.");
    setTimeout(() => setEmbedCopied(false), 2000);
    setEmbedDialogOpen(false);
  };

  const copyGameLink = (game) => {
    const shareUrl = `${window.location.origin}/live/${game.share_code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLinkId(game.id);
    toast.success("Live stat link copied!");
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleStartScheduledGame = async (gameId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find the game to get its info for the dialog
    const game = scheduledGames.find(g => g.id === gameId);
    setSelectedGameToStart(game);
    setSelectedStartMode("classic"); // Reset to default
    setStartModeDialogOpen(true);
  };

  const confirmStartGame = async () => {
    if (!selectedGameToStart) return;
    
    setStartingGameId(selectedGameToStart.id);
    setStartModeDialogOpen(false);
    
    try {
      // Start the game with the selected mode
      await axios.post(`${API}/games/${selectedGameToStart.id}/start`, {
        simple_mode: selectedStartMode === "simple",
        advanced_mode: selectedStartMode === "advanced",
        clock_enabled: selectedStartMode === "advanced" // Advanced requires clock
      });
      toast.success("Game started!");
      
      // Navigate to appropriate interface based on mode
      if (selectedStartMode === "advanced") {
        navigate(`/game/${selectedGameToStart.id}/advanced`);
      } else {
        navigate(`/game/${selectedGameToStart.id}`);
      }
    } catch (error) {
      toast.error("Failed to start game");
    } finally {
      setStartingGameId(null);
      setSelectedGameToStart(null);
    }
  };

  const formatScheduledDate = (dateStr, timeStr) => {
    if (!dateStr) return "No date set";
    
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateText;
    if (date.getTime() === today.getTime()) {
      dateText = "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      dateText = "Tomorrow";
    } else {
      dateText = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    if (timeStr) {
      // Convert 24-hour time to 12-hour format
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      const formattedTime = `${hour12}:${minutes} ${ampm}`;
      return `${dateText} at ${formattedTime}`;
    }
    return dateText;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-8" data-testid="dashboard">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#000000] to-[#333333] rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{sportConfig.icon}</span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">StatMoose {sportConfig.name}</h1>
          </div>
          <p className="text-white/80 text-lg mb-6 max-w-xl">
            Track {sportConfig.name.toLowerCase()} statistics in real-time. Share live stats with your audience.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/new-game">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" data-testid="start-game-btn">
                <PlayCircle className="w-5 h-5 mr-2" />
                New Game
              </Button>
            </Link>
            <Link to="/teams">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="manage-teams-btn">
                <Users className="w-5 h-5 mr-2" />
                Manage Teams
              </Button>
            </Link>
            {schoolInfo && (
              <Link to="/school-dashboard">
                <Button size="lg" variant="outline" className="border-orange-400/50 text-orange-400 hover:bg-orange-500/10" data-testid="school-dashboard-btn">
                  <Building2 className="w-5 h-5 mr-2" />
                  {schoolInfo.name}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#000000]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-3xl font-bold text-[#000000]">{teams.length}</p>
                </div>
                <Users className="w-10 h-10 text-[#000000]/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="text-3xl font-bold text-blue-500">{scheduledGames.length}</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Live</p>
                  <p className="text-3xl font-bold text-orange-500">{activeGames.length}</p>
                </div>
                <PlayCircle className="w-10 h-10 text-orange-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-emerald-500">{recentGames.length}</p>
                </div>
                <History className="w-10 h-10 text-emerald-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Games */}
        {scheduledGames.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-500" />
              Scheduled Games
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledGames.map(game => (
                <Card key={game.id} className="border-2 border-blue-200" data-testid={`scheduled-game-${game.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        <p className="font-semibold text-lg">{game.home_team_name}</p>
                        <p className="text-sm text-muted-foreground">Home</p>
                      </div>
                      <div className="px-4">
                        <span className="text-lg font-bold text-slate-400">VS</span>
                      </div>
                      <div className="text-center flex-1">
                        <p className="font-semibold text-lg">{game.away_team_name}</p>
                        <p className="text-sm text-muted-foreground">Away</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {formatScheduledDate(game.scheduled_date, game.scheduled_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyGameLink(game)}
                          data-testid={`copy-link-${game.id}`}
                        >
                          {copiedLinkId === game.id ? (
                            <>
                              <Check className="w-4 h-4 mr-1 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4 mr-1" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/edit-game/${game.id}`)}
                          data-testid={`edit-scheduled-${game.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={(e) => handleStartScheduledGame(game.id, e)}
                          disabled={startingGameId === game.id}
                          data-testid={`start-scheduled-${game.id}`}
                        >
                          <PlayCircle className="w-4 h-4 mr-1" />
                          {startingGameId === game.id ? "Starting..." : "Start Now"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Games */}
        {activeGames.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-orange-500" />
                Live Games
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={openEmbedDialog}
                className="gap-2"
                data-testid="copy-embed-btn"
              >
                {embedCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4" />
                    Embed Code
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The embed will always show your latest live game and auto-updates every 5 seconds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGames.map(game => (
                <Link key={game.id} to={game.sport === 'football' ? `/football/${game.id}` : `/game/${game.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-orange-200" data-testid={`active-game-${game.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <p className="font-semibold text-lg">{game.home_team_name}</p>
                          <p className="text-4xl font-bold score-display text-[#000000]">
                            {game.sport === 'football' 
                              ? (game.football_state?.home_score || game.home_score || 0)
                              : calculateScore(game.quarter_scores, "home")}
                          </p>
                        </div>
                        <div className="px-4">
                          <span className="text-sm bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
                            Q{game.sport === 'football' ? (game.football_state?.quarter || 1) : game.current_quarter}
                          </span>
                        </div>
                        <div className="text-center flex-1">
                          <p className="font-semibold text-lg">{game.away_team_name}</p>
                          <p className="text-4xl font-bold score-display text-[#000000]">
                            {game.sport === 'football' 
                              ? (game.football_state?.away_score || game.away_score || 0)
                              : calculateScore(game.quarter_scores, "away")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                Recent Games
              </h2>
              <Link to="/history">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentGames.map(game => (
                <Link key={game.id} to={`/game/${game.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`recent-game-${game.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{game.home_team_name}</span>
                          <span className="text-2xl font-bold score-display">
                            {calculateScore(game.quarter_scores, "home")} - {calculateScore(game.quarter_scores, "away")}
                          </span>
                          <span className="font-medium">{game.away_team_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(game.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sponsor Banners */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-500" />
              Sponsor Banners
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSponsorDialogOpen(true)}
              data-testid="manage-sponsors-btn"
            >
              Manage Banners
            </Button>
          </div>
          <Card className="dark:bg-neutral-900">
            <CardContent className="py-4">
              {sponsorBanners.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  <Image className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No sponsor banners uploaded yet</p>
                  <p className="text-sm">Banners will appear as a slideshow on your live stats page</p>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {sponsorBanners.map((banner) => (
                    <div key={banner.id} className="flex-shrink-0 w-24 h-16 rounded border overflow-hidden">
                      <img src={banner.image_data} alt={banner.filename} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {!loading && teams.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first team to start tracking games</p>
              <Link to="/teams">
                <Button data-testid="create-first-team-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sponsor Banner Dialog */}
      <Dialog open={sponsorDialogOpen} onOpenChange={setSponsorDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Sponsor Banners</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload PNG or JPEG images to display as a slideshow on your live stats output page.
            </p>
            
            {/* Upload Button */}
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Images"}
              </Button>
            </div>

            {/* Banner List */}
            {sponsorBanners.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sponsorBanners.map((banner) => (
                  <div key={banner.id} className="border rounded-lg overflow-hidden">
                    <div className="flex gap-4 p-3">
                      <div className="flex-shrink-0 w-32 h-20 rounded border overflow-hidden">
                        <img 
                          src={banner.image_data} 
                          alt={banner.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate mb-2">{banner.filename}</p>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <Input
                            placeholder="https://sponsor-website.com"
                            defaultValue={banner.link_url || ""}
                            className="h-8 text-sm"
                            onBlur={(e) => {
                              if (e.target.value !== (banner.link_url || "")) {
                                handleUpdateBannerLink(banner.id, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {banner.link_url ? "Click banner to visit link" : "Add a link (optional)"}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteBanner(banner.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No banners uploaded</p>
                <p className="text-sm">Click &quot;Upload Images&quot; to add sponsor banners</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Size Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Code Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Customize the embed size to fit your website. This embed always shows your latest live game.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="embed-width">Width (px)</Label>
                <Input
                  id="embed-width"
                  type="number"
                  value={embedWidth}
                  onChange={(e) => setEmbedWidth(e.target.value)}
                  placeholder="1920"
                  min="300"
                  max="3840"
                />
              </div>
              <div>
                <Label htmlFor="embed-height">Height (px)</Label>
                <Input
                  id="embed-height"
                  type="number"
                  value={embedHeight}
                  onChange={(e) => setEmbedHeight(e.target.value)}
                  placeholder="300"
                  min="100"
                  max="1080"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setEmbedWidth("1920"); setEmbedHeight("300"); }}
              >
                1920×300 (Wide)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setEmbedWidth("800"); setEmbedHeight("300"); }}
              >
                800×300 (Medium)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setEmbedWidth("400"); setEmbedHeight("250"); }}
              >
                400×250 (Small)
              </Button>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <Label className="text-xs text-muted-foreground">Preview Code</Label>
              <code className="block mt-1 text-xs break-all">
                {`<iframe src="${window.location.origin}/embed/latest/${user?.user_id}" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="max-width:100%;" allowfullscreen></iframe>`}
              </code>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmbedDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={copyEmbedCode}>
                <Copy className="w-4 h-4 mr-1" />
                Copy Embed Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Game Mode Selection Dialog */}
      <Dialog open={startModeDialogOpen} onOpenChange={setStartModeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Game</DialogTitle>
          </DialogHeader>
          {selectedGameToStart && (
            <div className="space-y-4 pt-2">
              {/* Game Info */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-4 text-white text-center">
                <div className="flex items-center justify-center gap-4">
                  <span className="font-semibold">{selectedGameToStart.home_team_name}</span>
                  <span className="text-white/60">vs</span>
                  <span className="font-semibold">{selectedGameToStart.away_team_name}</span>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Stat Tracking Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Simple Mode */}
                  <button
                    type="button"
                    onClick={() => setSelectedStartMode("simple")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedStartMode === "simple" 
                        ? "border-green-500 bg-green-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-green-700 mb-1">Simple</div>
                    <p className="text-xs text-slate-600">Basic tracking</p>
                  </button>
                  
                  {/* Classic Mode */}
                  <button
                    type="button"
                    onClick={() => setSelectedStartMode("classic")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedStartMode === "classic" 
                        ? "border-black bg-slate-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-slate-800 mb-1">Classic</div>
                    <p className="text-xs text-slate-600">Full stats</p>
                  </button>
                  
                  {/* Advanced Mode */}
                  <button
                    type="button"
                    onClick={() => setSelectedStartMode("advanced")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedStartMode === "advanced" 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-blue-700 mb-1">Advanced</div>
                    <p className="text-xs text-slate-600">Pro interface</p>
                  </button>
                </div>
              </div>

              {/* Mode Description */}
              {selectedStartMode === "simple" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    <strong>Simple Mode:</strong> FT/2PT/3PT makes, rebounds, assists, fouls
                  </p>
                </div>
              )}
              {selectedStartMode === "classic" && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-sm text-slate-700">
                    <strong>Classic Mode:</strong> Full stats with traditional interface
                  </p>
                </div>
              )}
              {selectedStartMode === "advanced" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Advanced Mode:</strong> Hotkeys, possession arrow, game clock, pro layout
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setStartModeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={confirmStartGame}
                  disabled={startingGameId === selectedGameToStart?.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PlayCircle className="w-4 h-4 mr-1" />
                  {startingGameId === selectedGameToStart?.id ? "Starting..." : "Start Game"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

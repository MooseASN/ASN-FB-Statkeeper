import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, MapPin, Image, Plus, X, PlayCircle, Clock, Video, ExternalLink } from "lucide-react";
import Layout from "@/components/Layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EventDetail({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableGames, setAvailableGames] = useState([]);
  const [addGameDialogOpen, setAddGameDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editLogoPreview, setEditLogoPreview] = useState(null);
  const [editLogoData, setEditLogoData] = useState(null);
  const [editColor, setEditColor] = useState("#000000");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`${API}/events/${id}`);
      setEvent(res.data);
      
      // Set edit form values
      setEditName(res.data.name);
      setEditLocation(res.data.location || "");
      setEditStartDate(res.data.start_date);
      setEditEndDate(res.data.end_date || "");
      setEditLogoPreview(res.data.logo_data);
      setEditLogoData(res.data.logo_data);
      setEditColor(res.data.color || "#000000");
    } catch (error) {
      toast.error("Failed to load event");
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableGames = async () => {
    try {
      const res = await axios.get(`${API}/games`);
      // Filter out games already in this event
      const eventGameIds = event?.games?.map(g => g.id) || [];
      const available = res.data.filter(g => !eventGameIds.includes(g.id));
      setAvailableGames(available);
    } catch (error) {
      toast.error("Failed to load games");
    }
  };

  const handleOpenAddGame = () => {
    fetchAvailableGames();
    setAddGameDialogOpen(true);
  };

  const handleAddGame = async (gameId) => {
    try {
      await axios.post(`${API}/events/${id}/games/${gameId}`);
      toast.success("Game added to event");
      setAddGameDialogOpen(false);
      fetchEvent();
    } catch (error) {
      toast.error("Failed to add game");
    }
  };

  const handleRemoveGame = async (gameId) => {
    if (!confirm("Remove this game from the event? The game will not be deleted.")) {
      return;
    }

    try {
      await axios.delete(`${API}/events/${id}/games/${gameId}`);
      toast.success("Game removed from event");
      fetchEvent();
    } catch (error) {
      toast.error("Failed to remove game");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditLogoPreview(reader.result);
        setEditLogoData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error("Please enter an event name");
      return;
    }
    if (!editStartDate) {
      toast.error("Please select a start date");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/events/${id}`, {
        name: editName.trim(),
        location: editLocation.trim() || null,
        start_date: editStartDate,
        end_date: editEndDate || editStartDate,
        logo_data: editLogoData,
        color: editColor
      });
      
      toast.success("Event updated!");
      setEditDialogOpen(false);
      fetchEvent();
    } catch (error) {
      toast.error("Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const formatDateRange = (start, end) => {
    if (!start) return "";
    const startDate = new Date(start + 'T00:00:00');
    const endDate = end ? new Date(end + 'T00:00:00') : startDate;
    
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    
    if (start === end || !end) {
      return startDate.toLocaleDateString('en-US', options);
    }
    
    return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const formatGameTime = (date, time) => {
    if (!date) return "TBD";
    const d = new Date(date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (time) {
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${dateStr} @ ${h12}:${minutes} ${ampm}`;
    }
    
    return dateStr;
  };

  const getGameStatusBadge = (game) => {
    if (game.status === "active") {
      return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">LIVE</span>;
    } else if (game.status === "completed") {
      return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">FINAL</span>;
    }
    return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">SCHEDULED</span>;
  };

  const calculateScore = (game, team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/events")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1">
            <div className="flex items-center gap-4">
              {/* Event Logo */}
              <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {event.logo_data ? (
                  <img src={event.logo_data} alt={event.name} className="w-full h-full object-cover" />
                ) : (
                  <Calendar className="w-10 h-10 text-slate-400" />
                )}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold">{event.name}</h1>
                <div className="flex items-center gap-4 text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateRange(event.start_date, event.end_date)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            Edit Event
          </Button>
        </div>

        {/* Games Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Event Schedule</h2>
            <Button onClick={handleOpenAddGame} className="gap-2" data-testid="add-game-btn">
              <Plus className="w-4 h-4" />
              Add Game
            </Button>
          </div>

          {event.games?.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <PlayCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Games Yet</h3>
                <p className="text-muted-foreground mb-4">Add scheduled games to this event</p>
                <Button onClick={handleOpenAddGame}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Game
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {event.games.map(game => (
                <Card key={game.id} data-testid={`event-game-${game.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Game Status */}
                        {getGameStatusBadge(game)}
                        
                        {/* Teams & Score */}
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{game.home_team_name}</span>
                          {game.status !== "scheduled" ? (
                            <span className="text-xl font-bold">
                              {calculateScore(game, "home")} - {calculateScore(game, "away")}
                            </span>
                          ) : (
                            <span className="text-xl text-slate-400">vs</span>
                          )}
                          <span className="font-semibold">{game.away_team_name}</span>
                        </div>
                        
                        {/* Primetime Indicator */}
                        {game.primetime_enabled && (
                          <div className="flex items-center gap-1 text-purple-600">
                            <Video className="w-4 h-4" />
                            <span className="text-xs font-medium">Primetime</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Time */}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{formatGameTime(game.scheduled_date, game.scheduled_time)}</span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link to={`/live/${game.share_code}`} target="_blank">
                            <Button variant="outline" size="sm" className="gap-1">
                              <ExternalLink className="w-3 h-3" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveGame(game.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Game Dialog */}
      <Dialog open={addGameDialogOpen} onOpenChange={setAddGameDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Game to Event</DialogTitle>
            <DialogDescription>
              Select a game to add to this event. Games in this event will show a live ticker on the live stats page.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
            {availableGames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No available games to add.</p>
                <p className="text-sm mt-1">Create a game first from the home page.</p>
              </div>
            ) : (
              availableGames.map(game => (
                <Card 
                  key={game.id} 
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleAddGame(game.id)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getGameStatusBadge(game)}
                        <span className="font-medium">{game.home_team_name} vs {game.away_team_name}</span>
                        {game.primetime_enabled && (
                          <div className="flex items-center gap-1 text-purple-600">
                            <Video className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatGameTime(game.scheduled_date, game.scheduled_time)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Event Logo */}
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {editLogoPreview ? (
                  <img src={editLogoPreview} alt="Event logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Image className="w-8 h-8 text-slate-400 mx-auto" />
                    <span className="text-xs text-slate-400">Add Logo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              {editLogoPreview && (
                <Button variant="ghost" size="sm" onClick={() => { setEditLogoPreview(null); setEditLogoData(null); }}>
                  Remove Logo
                </Button>
              )}
            </div>

            {/* Event Name */}
            <div>
              <Label htmlFor="edit-event-name">Event Name *</Label>
              <Input
                id="edit-event-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Event Location */}
            <div>
              <Label htmlFor="edit-event-location">Location</Label>
              <Input
                id="edit-event-location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Event Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date">Start Date *</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  min={editStartDate}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

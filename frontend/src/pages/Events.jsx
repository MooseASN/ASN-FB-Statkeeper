import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, MapPin, Image, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useSport, SPORT_CONFIG } from "@/contexts/SportContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Events({ user, onLogout }) {
  const navigate = useNavigate();
  const { selectedSport } = useSport();
  const sportConfig = SPORT_CONFIG[selectedSport] || SPORT_CONFIG.basketball;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoData, setLogoData] = useState(null);
  const [eventColor, setEventColor] = useState("#000000");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEvents();
  }, [selectedSport]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API}/events`, { params: { sport: selectedSport } });
      setEvents(res.data);
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
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
        setLogoPreview(reader.result);
        setLogoData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setEventName("");
    setEventLocation("");
    setStartDate("");
    setEndDate("");
    setLogoPreview(null);
    setLogoData(null);
    setEventColor("#000000");
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) {
      toast.error("Please enter an event name");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post(`${API}/events`, {
        name: eventName.trim(),
        location: eventLocation.trim() || null,
        start_date: startDate,
        end_date: endDate || startDate,
        logo_data: logoData,
        color: eventColor
      });
      
      toast.success("Event created!");
      setCreateDialogOpen(false);
      resetForm();
      fetchEvents();
      navigate(`/events/${res.data.id}`);
    } catch (error) {
      toast.error("Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this event? Games will not be deleted.")) {
      return;
    }

    try {
      await axios.delete(`${API}/events/${eventId}`);
      toast.success("Event deleted");
      fetchEvents();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const formatDateRange = (start, end) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (start === end) {
      return startDate.toLocaleDateString('en-US', options);
    }
    
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground">Manage your tournaments and events</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" data-testid="create-event-btn">
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first event or tournament to get started</p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="create-first-event-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(event => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full" data-testid={`event-card-${event.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Event Logo */}
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {event.logo_data ? (
                          <img src={event.logo_data} alt={event.name} className="w-full h-full object-cover" />
                        ) : (
                          <Calendar className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      
                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{event.name}</h3>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDateRange(event.start_date, event.end_date)}</span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground mt-2">
                          {event.game_ids?.length || 0} game{(event.game_ids?.length || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteEvent(event.id, e)}
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

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Event Logo */}
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Event logo" className="w-full h-full object-cover" />
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
              {logoPreview && (
                <Button variant="ghost" size="sm" onClick={() => { setLogoPreview(null); setLogoData(null); }}>
                  Remove Logo
                </Button>
              )}
            </div>

            {/* Event Name */}
            <div>
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                placeholder="Championship Tournament 2024"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="mt-1"
                data-testid="event-name-input"
              />
            </div>

            {/* Event Location */}
            <div>
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                placeholder="City Arena, State"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="mt-1"
                data-testid="event-location-input"
              />
            </div>

            {/* Event Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                  data-testid="start-date-input"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="mt-1"
                  data-testid="end-date-input"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave end date empty for single-day events</p>

            {/* Event Color */}
            <div>
              <Label htmlFor="event-color">Ticker Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  id="event-color"
                  type="color"
                  value={eventColor}
                  onChange={(e) => setEventColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border"
                />
                <div 
                  className="flex-1 h-10 rounded flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: eventColor }}
                >
                  Ticker Preview
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">This color will be used for the live stats ticker</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={creating}>
              {creating ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EventLive() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCurrentGame = async () => {
      try {
        const response = await axios.get(`${API}/events/${eventId}/current-game`);
        const { share_code } = response.data;
        
        if (share_code) {
          // Redirect to the live view of the current game
          navigate(`/live/${share_code}`, { replace: true });
        } else {
          setError("No games available for this event");
        }
      } catch (err) {
        console.error("Error fetching current game:", err);
        setError(err.response?.data?.detail || "Event not found");
      }
    };

    fetchCurrentGame();
  }, [eventId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo-black.png" alt="StatMoose" className="w-16 h-16 mx-auto opacity-50 mb-4" />
          <h2 className="text-2xl font-bold text-[#000000] mb-2">Event Not Found</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#000000]" />
        <p className="mt-4 text-muted-foreground">Loading event...</p>
      </div>
    </div>
  );
}

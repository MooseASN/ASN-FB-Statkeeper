import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LiveGame from "@/pages/LiveGame";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DemoLiveGameClassic() {
  const navigate = useNavigate();
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDemoData = async () => {
      try {
        const res = await axios.get(`${API}/demo/basketball/classic`);
        setDemoData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load demo data:", err);
        setError("Failed to load demo");
        setLoading(false);
      }
    };
    fetchDemoData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo-black.png" alt="StatMoose" className="w-12 h-12 animate-pulse mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading demo...</p>
        </div>
      </div>
    );
  }

  if (error || !demoData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || "Failed to load demo"}</p>
          <button 
            onClick={() => navigate("/demo/basketball")}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Back to Demo Selection
          </button>
        </div>
      </div>
    );
  }

  // Render the real LiveGame component with demo mode enabled
  return <LiveGame demoMode={true} initialDemoData={demoData} />;
}

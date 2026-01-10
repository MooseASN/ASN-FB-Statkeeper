import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Lock, LogOut, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BetaAccessRequired({ user, onLogout }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("StatMoose is currently in private beta. Contact the administrator for access.");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Fetch the beta message
    const fetchBetaStatus = async () => {
      try {
        const res = await axios.get(`${API}/site-beta-status`);
        if (res.data.site_beta_message) {
          setMessage(res.data.site_beta_message);
        }
      } catch (error) {
        // Use default message
      }
    };
    fetchBetaStatus();
  }, []);

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      const res = await axios.get(`${API}/check-beta-access`);
      if (res.data.has_access) {
        // User now has access, redirect to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      // Still no access
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-800 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <svg 
          width="100" 
          height="100" 
          viewBox="0 0 120 120" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-white opacity-50"
        >
          {/* Moose antler silhouette */}
          <path 
            d="M60 20C60 20 45 10 30 25C15 40 25 55 25 55L35 50C35 50 30 40 40 30C50 20 60 25 60 25V20Z" 
            fill="currentColor"
          />
          <path 
            d="M60 20C60 20 75 10 90 25C105 40 95 55 95 55L85 50C85 50 90 40 80 30C70 20 60 25 60 25V20Z" 
            fill="currentColor"
          />
          {/* Moose head */}
          <ellipse cx="60" cy="55" rx="18" ry="22" fill="currentColor"/>
          {/* Moose snout */}
          <ellipse cx="60" cy="72" rx="10" ry="8" fill="currentColor"/>
        </svg>
      </div>

      {/* Lock Icon */}
      <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-amber-500" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-2">Private Beta</h1>
      
      {/* Message */}
      <p className="text-zinc-400 text-center max-w-md mb-8 leading-relaxed">
        {message}
      </p>

      {/* User Info */}
      {user && (
        <div className="bg-zinc-800/50 rounded-lg px-4 py-2 mb-6 border border-zinc-700">
          <span className="text-zinc-400 text-sm">Logged in as: </span>
          <span className="text-white font-medium">{user.email}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleCheckAgain}
          disabled={checking}
          className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
          data-testid="check-access-btn"
        >
          {checking ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Check Again
        </Button>
        
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950"
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Footer */}
      <p className="text-zinc-600 text-sm mt-12">
        StatMoose © {new Date().getFullYear()}
      </p>
    </div>
  );
}

import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import axios from "axios";
import Dashboard from "@/pages/Dashboard";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import NewGame from "@/pages/NewGame";
import EditGame from "@/pages/EditGame";
import LiveGame from "@/pages/LiveGame";
import AdvancedLiveGame from "@/pages/AdvancedLiveGame";
import LiveView from "@/pages/LiveView";
import EmbedLiveGame from "@/pages/EmbedLiveGame";
import EmbedLatestGame from "@/pages/EmbedLatestGame";
import GameHistory from "@/pages/GameHistory";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper to get token from either storage
const getToken = () => {
  return localStorage.getItem("session_token") || sessionStorage.getItem("session_token");
};

// Helper to get user from either storage
const getStoredUser = () => {
  return localStorage.getItem("user") || sessionStorage.getItem("user");
};

// Helper to clear auth from both storages
const clearAuth = () => {
  localStorage.removeItem("session_token");
  localStorage.removeItem("user");
  localStorage.removeItem("remember_me");
  sessionStorage.removeItem("session_token");
  sessionStorage.removeItem("user");
};

// Configure axios to send credentials and auth header
axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Protected route wrapper
function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      const token = getToken();
      const savedUser = getStoredUser();
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const res = await axios.get(`${API}/auth/me`);
          setUser(res.data);
        } catch (error) {
          // Token invalid, clear storage
          clearAuth();
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.error("Logout error:", error);
    }
    clearAuth();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register onLogin={handleLogin} />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
          <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPassword />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute user={user}><Dashboard user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute user={user}><Events user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute user={user}><EventDetail user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute user={user}><Teams user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/teams/:id" element={<ProtectedRoute user={user}><TeamDetail user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/new-game" element={<ProtectedRoute user={user}><NewGame user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/edit-game/:id" element={<ProtectedRoute user={user}><EditGame user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/game/:id" element={<ProtectedRoute user={user}><LiveGame user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/game/:id/advanced" element={<ProtectedRoute user={user}><AdvancedLiveGame user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute user={user}><GameHistory user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          
          {/* Live view is now protected - only owner can see */}
          {/* Public shareable live stats view */}
          <Route path="/live/:shareCode" element={<LiveView />} />
          
          {/* Embed view is public - for external embedding */}
          <Route path="/embed/:shareCode" element={<EmbedLiveGame />} />
          <Route path="/embed/latest/:userId" element={<EmbedLatestGame />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" duration={2000} />
    </div>
  );
}

export default App;

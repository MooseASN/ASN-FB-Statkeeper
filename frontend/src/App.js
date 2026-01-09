import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import axios from "axios";
import { SportProvider, useSport } from "@/contexts/SportContext";
import HomePage from "@/pages/HomePage";
import ContactPage from "@/pages/ContactPage";
import SportSelection from "@/pages/SportSelection";
import Dashboard from "@/pages/Dashboard";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import NewGame from "@/pages/NewGame";
import EditGame from "@/pages/EditGame";
import LiveGame from "@/pages/LiveGame";
import AdvancedLiveGame from "@/pages/AdvancedLiveGame";
import FootballLiveGame from "@/pages/FootballLiveGame";
import LiveView from "@/pages/LiveView";
import EventLive from "@/pages/EventLive";
import EmbedLiveGame from "@/pages/EmbedLiveGame";
import EmbedLatestGame from "@/pages/EmbedLatestGame";
import GameHistory from "@/pages/GameHistory";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AccountSettings from "@/pages/AccountSettings";
import AdminDashboard from "@/pages/AdminDashboard";
import FootballStatsView from "@/pages/FootballStatsView";
import Jumbotron from "@/pages/Jumbotron";
import SchoolSignUp from "@/pages/SchoolSignUp";
import SchoolDashboard from "@/pages/SchoolDashboard";
import SchoolJoin from "@/pages/SchoolJoin";
import SeasonManagement from "@/pages/SeasonManagement";
import SeasonStats from "@/pages/SeasonStats";
// Demo pages
import BasketballDemoSelector from "@/pages/BasketballDemoSelector";
import DemoLiveGameClassic from "@/pages/DemoLiveGameClassic";
import DemoLiveGameAdvanced from "@/pages/DemoLiveGameAdvanced";
import DemoLiveGameQuick from "@/pages/DemoLiveGameQuick";
import DemoFootballLiveGame from "@/pages/DemoFootballLiveGame";

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
  sessionStorage.removeItem("selected_sport");
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

// Protected route wrapper - requires auth
function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Sport-protected route - requires auth AND sport selection
function SportProtectedRoute({ children, user }) {
  const { selectedSport } = useSport();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!selectedSport) {
    return <Navigate to="/select-sport" replace />;
  }
  
  return children;
}

function AppRoutes({ user, onLogin, onLogout }) {
  const { selectedSport, clearSport } = useSport();

  const handleLogout = async () => {
    clearSport(); // Clear sport selection on logout
    await onLogout();
  };

  return (
    <Routes>
      {/* Public homepage and contact */}
      <Route path="/" element={<HomePage />} />
      <Route path="/contact" element={<ContactPage />} />
      
      {/* Demo routes - public, no auth required */}
      <Route path="/demo/basketball" element={<BasketballDemoSelector />} />
      <Route path="/demo/basketball/classic" element={<DemoLiveGameClassic />} />
      <Route path="/demo/basketball/advanced" element={<DemoLiveGameAdvanced />} />
      <Route path="/demo/basketball/simple" element={<DemoLiveGameQuick />} />
      <Route path="/demo/football" element={<DemoFootballLiveGame />} />
      
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/select-sport" replace /> : <Login onLogin={onLogin} />} />
      <Route path="/register" element={user ? <Navigate to="/select-sport" replace /> : <Register onLogin={onLogin} />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/select-sport" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to="/select-sport" replace /> : <ResetPassword />} />
      
      {/* Sport selection - requires auth but not sport */}
      <Route path="/select-sport" element={
        <ProtectedRoute user={user}>
          <SportSelection user={user} onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      
      {/* Account settings - requires auth but not sport */}
      <Route path="/account" element={
        <ProtectedRoute user={user}>
          <AccountSettings user={user} onLogout={handleLogout} onUserUpdate={() => window.location.reload()} />
        </ProtectedRoute>
      } />
      
      {/* Admin dashboard - requires auth but not sport */}
      <Route path="/admin" element={
        <ProtectedRoute user={user}>
          <AdminDashboard user={user} onLogout={handleLogout} />
        </ProtectedRoute>
      } />
      
      {/* School routes */}
      <Route path="/school/signup" element={<SchoolSignUp />} />
      <Route path="/school/join/:inviteCode" element={<SchoolJoin />} />
      <Route path="/school-dashboard" element={
        <ProtectedRoute user={user}>
          <SchoolDashboard />
        </ProtectedRoute>
      } />
      <Route path="/school/season/:seasonId" element={
        <ProtectedRoute user={user}>
          <SeasonManagement />
        </ProtectedRoute>
      } />
      <Route path="/school/season/:seasonId/stats" element={
        <ProtectedRoute user={user}>
          <SeasonStats />
        </ProtectedRoute>
      } />
      
      {/* Protected routes - require both auth and sport selection */}
      <Route path="/dashboard" element={<SportProtectedRoute user={user}><Dashboard user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/events" element={<SportProtectedRoute user={user}><Events user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/events/:id" element={<SportProtectedRoute user={user}><EventDetail user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/teams" element={<SportProtectedRoute user={user}><Teams user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/teams/:id" element={<SportProtectedRoute user={user}><TeamDetail user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/new-game" element={<SportProtectedRoute user={user}><NewGame user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/edit-game/:id" element={<SportProtectedRoute user={user}><EditGame user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/game/:id" element={<SportProtectedRoute user={user}><LiveGame user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/game/:id/advanced" element={<SportProtectedRoute user={user}><AdvancedLiveGame user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/football/:id" element={<SportProtectedRoute user={user}><FootballLiveGame user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      <Route path="/football/:id/stats" element={<FootballStatsView />} />
      <Route path="/history" element={<SportProtectedRoute user={user}><GameHistory user={user} onLogout={handleLogout} /></SportProtectedRoute>} />
      
      {/* Public shareable live stats view */}
      <Route path="/live/:shareCode" element={<LiveView />} />
      <Route path="/event/:eventId/live" element={<EventLive />} />
      
      {/* Embed view is public - for external embedding */}
      <Route path="/embed/:shareCode" element={<EmbedLiveGame />} />
      <Route path="/embed/latest/:userId" element={<EmbedLatestGame />} />
      
      {/* Jumbotron display - public full-screen view */}
      <Route path="/jumbotron/:shareCode" element={<Jumbotron />} />
    </Routes>
  );
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
          // Only clear auth on 401 (unauthorized) - not on network errors
          if (error.response && error.response.status === 401) {
            clearAuth();
          } else {
            // Network error - trust the stored user data
            try {
              setUser(JSON.parse(savedUser));
            } catch (e) {
              clearAuth();
            }
          }
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
      <SportProvider>
        <BrowserRouter>
          <AppRoutes user={user} onLogin={handleLogin} onLogout={handleLogout} />
        </BrowserRouter>
      </SportProvider>
      <Toaster position="top-right" duration={1500} dismissible={true} />
    </div>
  );
}

export default App;

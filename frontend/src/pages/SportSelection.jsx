import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useSport, SPORTS, SPORT_CONFIG } from "@/contexts/SportContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogOut, Lock, User, Settings, Shield, Eye, EyeOff, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Admin users who bypass all restrictions
const ADMIN_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"];
const ADMIN_USERNAMES = ["admin"];

const isAdminUser = (user) => {
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email?.toLowerCase()) || 
         ADMIN_USERNAMES.includes(user.username?.toLowerCase());
};

export default function SportSelection({ user, onLogout }) {
  const navigate = useNavigate();
  const { selectSport } = useSport();
  
  // Beta mode state
  const [betaStatus, setBetaStatus] = useState({ basketball_beta: false, football_beta: false, baseball_beta: false });
  const [loadingBeta, setLoadingBeta] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);
  
  // Password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedBetaSport, setSelectedBetaSport] = useState(null);
  const [betaPassword, setBetaPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Unlocked sports (stored in session)
  const [unlockedSports, setUnlockedSports] = useState(() => {
    const stored = sessionStorage.getItem("unlocked_sports");
    return stored ? JSON.parse(stored) : [];
  });

  // Set document title to StatMoose
  useEffect(() => {
    document.title = "StatMoose";
  }, []);

  // Check if user belongs to a school
  useEffect(() => {
    const checkSchool = async () => {
      try {
        const res = await axios.get(`${API}/schools/my-school`);
        setSchoolInfo(res.data);
      } catch (error) {
        setSchoolInfo(null);
      }
    };
    if (user) {
      checkSchool();
    }
  }, [user]);
  
  // Fetch beta status on mount
  useEffect(() => {
    const fetchBetaStatus = async () => {
      try {
        const res = await axios.get(`${API}/beta-status`);
        setBetaStatus(res.data);
      } catch (error) {
        console.error("Failed to fetch beta status:", error);
      } finally {
        setLoadingBeta(false);
      }
    };
    fetchBetaStatus();
  }, []);

  // Check if sport is locked (in beta and not unlocked)
  const isSportLocked = (sport) => {
    if (isAdminUser(user)) return false; // Admins bypass all locks
    if (unlockedSports.includes(sport)) return false; // Already unlocked this session
    
    if (sport === "basketball") return betaStatus.basketball_beta;
    if (sport === "football") return betaStatus.football_beta;
    if (sport === "baseball") return betaStatus.baseball_beta;
    return false;
  };

  const handleSelectSport = (sport) => {
    if (isSportLocked(sport)) {
      // Show password dialog
      setSelectedBetaSport(sport);
      setBetaPassword("");
      setPasswordDialogOpen(true);
      return;
    }
    
    selectSport(sport);
    navigate("/dashboard");
  };
  
  const handleVerifyPassword = async () => {
    if (!betaPassword.trim()) {
      toast.error("Please enter the beta password");
      return;
    }
    
    setVerifying(true);
    try {
      const res = await axios.post(`${API}/beta-verify`, {
        sport: selectedBetaSport,
        password: betaPassword
      });
      
      if (res.data.valid) {
        // Unlock the sport for this session
        const newUnlocked = [...unlockedSports, selectedBetaSport];
        setUnlockedSports(newUnlocked);
        sessionStorage.setItem("unlocked_sports", JSON.stringify(newUnlocked));
        
        setPasswordDialogOpen(false);
        setBetaPassword("");
        
        // Now select the sport
        selectSport(selectedBetaSport);
        navigate("/dashboard");
      } else {
        toast.error("Incorrect beta password");
      }
    } catch (error) {
      toast.error("Failed to verify password");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <img src="/logo-white.png" alt="StatMoose" className="h-8 w-8" />
            <span className="text-xl font-black text-white tracking-tight italic">STATMOOSE</span>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-700">
                  <User className="w-4 h-4 mr-2" />
                  {user?.name || user?.username || user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="text-sm text-muted-foreground">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdminUser(user) && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer text-amber-600">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {schoolInfo && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/school-dashboard")} className="cursor-pointer text-orange-600">
                      <Building2 className="w-4 h-4 mr-2" />
                      {schoolInfo.name}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate("/account")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* School Dashboard Banner */}
        {schoolInfo && (
          <div 
            onClick={() => navigate("/school-dashboard")}
            className="mb-8 p-4 bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-lg cursor-pointer hover:border-orange-500/50 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {schoolInfo.logo_url ? (
                  <img src={schoolInfo.logo_url} alt={schoolInfo.name} className="w-12 h-12 object-contain rounded" />
                ) : (
                  <div className="w-12 h-12 bg-orange-500/20 rounded flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-orange-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-white font-semibold">{schoolInfo.name}</h3>
                  <p className="text-orange-400 text-sm">Go to School Dashboard →</p>
                </div>
              </div>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Building2 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            SELECT YOUR SPORT
          </h1>
          <p className="text-slate-400 text-lg">
            Choose which sport you want to track statistics for
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Basketball Card */}
          <Card
            className={`group overflow-hidden border-2 transition-all duration-300 bg-slate-800/50 ${
              isSportLocked("basketball")
                ? "cursor-pointer border-transparent hover:border-orange-500/50 hover:bg-slate-800"
                : "cursor-pointer border-transparent hover:border-orange-500 hover:bg-slate-800"
            }`}
            onClick={() => handleSelectSport(SPORTS.BASKETBALL)}
          >
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${SPORT_CONFIG.basketball.bgGradient} p-8 flex items-center justify-center relative`}>
                <span className={`text-8xl transition-transform duration-300 ${isSportLocked("basketball") ? "" : "group-hover:scale-110"}`}>
                  {SPORT_CONFIG.basketball.icon}
                </span>
                {isSportLocked("basketball") && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-10 h-10 text-white/80 mx-auto mb-2" />
                      <span className="text-white/80 text-sm font-medium">Beta Access</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {SPORT_CONFIG.basketball.name}
                </h2>
                {isSportLocked("basketball") ? (
                  <div className="py-2">
                    <p className="text-amber-400 font-semibold mb-2">
                      Beta Access Required
                    </p>
                    <p className="text-slate-500 text-sm">
                      Click to enter beta password
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 mb-4">
                      {SPORT_CONFIG.basketball.description}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center text-xs">
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">Points</span>
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">Rebounds</span>
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">Assists</span>
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">Steals</span>
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">Blocks</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Football Card */}
          <Card
            className={`group overflow-hidden border-2 transition-all duration-300 bg-slate-800/50 ${
              isSportLocked("football")
                ? "cursor-pointer border-transparent hover:border-green-500/50 hover:bg-slate-800"
                : "cursor-pointer border-transparent hover:border-green-500 hover:bg-slate-800"
            }`}
            onClick={() => handleSelectSport(SPORTS.FOOTBALL)}
          >
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${SPORT_CONFIG.football.bgGradient} p-8 flex items-center justify-center relative`}>
                <span className={`text-8xl transition-transform duration-300 ${isSportLocked("football") ? "" : "group-hover:scale-110"}`}>
                  {SPORT_CONFIG.football.icon}
                </span>
                {isSportLocked("football") && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-10 h-10 text-white/80 mx-auto mb-2" />
                      <span className="text-white/80 text-sm font-medium">Beta Access</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {SPORT_CONFIG.football.name}
                </h2>
                {isSportLocked("football") ? (
                  <div className="py-2">
                    <p className="text-amber-400 font-semibold mb-2">
                      Beta Access Required
                    </p>
                    <p className="text-slate-500 text-sm">
                      Click to enter beta password
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 mb-4">
                      {SPORT_CONFIG.football.description}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center text-xs">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Passing</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Rushing</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Receiving</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Defense</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Special Teams</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Baseball Card */}
          <Card
            className={`group overflow-hidden border-2 transition-all duration-300 bg-slate-800/50 ${
              isSportLocked("baseball")
                ? "cursor-pointer border-transparent hover:border-red-500/50 hover:bg-slate-800"
                : "cursor-pointer border-transparent hover:border-red-500 hover:bg-slate-800"
            }`}
            onClick={() => handleSelectSport(SPORTS.BASEBALL)}
          >
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${SPORT_CONFIG.baseball.bgGradient} p-8 flex items-center justify-center relative`}>
                <span className={`text-8xl transition-transform duration-300 ${isSportLocked("baseball") ? "" : "group-hover:scale-110"}`}>
                  {SPORT_CONFIG.baseball.icon}
                </span>
                {isSportLocked("baseball") && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-10 h-10 text-white/80 mx-auto mb-2" />
                      <span className="text-white/80 text-sm font-medium">Beta Access</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {SPORT_CONFIG.baseball.name}
                </h2>
                {isSportLocked("baseball") ? (
                  <div className="py-2">
                    <p className="text-amber-400 font-semibold mb-2">
                      Beta Access Required
                    </p>
                    <p className="text-slate-500 text-sm">
                      Click to enter beta password
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 mb-4">
                      {SPORT_CONFIG.baseball.description}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center text-xs">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">Batting</span>
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">Pitching</span>
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">Fielding</span>
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">Runs</span>
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">RBIs</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jumbotron Mode Button */}
        <div className="mt-12 max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/jumbotron-mode")}
            className="w-full group relative overflow-hidden rounded-xl border-2 border-orange-500/30 bg-gradient-to-r from-slate-800 via-slate-800/95 to-slate-800 hover:border-orange-500 hover:from-orange-500/10 hover:via-orange-500/5 hover:to-slate-800 transition-all duration-300 p-6"
            data-testid="jumbotron-mode-btn"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                    <polyline points="17 2 12 7 7 2"/>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    Jumbotron Mode
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Create venue displays for scoreboards, tickers & tournaments
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-orange-500">
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Launch</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <p className="text-center text-slate-500 text-sm mt-12">
          You can switch sports at any time from the dashboard
        </p>
      </main>
      
      {/* Beta Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Beta Access Required
            </DialogTitle>
            <DialogDescription>
              {selectedBetaSport === "basketball" ? "Basketball" : selectedBetaSport === "football" ? "Football" : "Baseball"} is currently in beta testing. 
              Enter the beta password to access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter beta password"
                value={betaPassword}
                onChange={(e) => setBetaPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleVerifyPassword();
                  }
                }}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyPassword}
                disabled={verifying || !betaPassword.trim()}
                className="flex-1"
              >
                {verifying ? "Verifying..." : "Unlock Access"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

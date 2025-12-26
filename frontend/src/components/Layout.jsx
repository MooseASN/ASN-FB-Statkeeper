import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, History, Plus, LogOut, User, Calendar, ArrowLeftRight, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSport, SPORT_CONFIG } from "@/contexts/SportContext";

const ADMIN_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"];
const ADMIN_USERNAMES = ["admin"];

const isAdminUser = (user) => {
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email?.toLowerCase()) || 
         ADMIN_USERNAMES.includes(user.username?.toLowerCase());
};

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedSport, clearSport } = useSport();
  const sportConfig = SPORT_CONFIG[selectedSport] || SPORT_CONFIG.basketball;
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleSwitchSport = () => {
    clearSport();
    navigate("/select-sport");
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="/logo-black.png" 
                  alt="StatMoose" 
                  className="w-8 h-8 object-contain"
                />
              </Link>
              
              {/* Sport Badge with Switch Button */}
              <button
                onClick={handleSwitchSport}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                style={{ 
                  backgroundColor: `${sportConfig.color}15`,
                  color: sportConfig.color
                }}
                title="Switch sport"
              >
                <span>{sportConfig.icon}</span>
                <span className="hidden sm:inline">{sportConfig.name}</span>
                <ArrowLeftRight className="w-3 h-3 ml-1 opacity-60" />
              </button>
            </div>
            
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link to="/">
                <Button 
                  variant={isActive("/") && !isActive("/events") && !isActive("/teams") && !isActive("/history") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                  data-testid="nav-home"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
              <Link to="/events">
                <Button 
                  variant={isActive("/events") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                  data-testid="nav-events"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Events</span>
                </Button>
              </Link>
              <Link to="/teams">
                <Button 
                  variant={isActive("/teams") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                  data-testid="nav-teams"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Teams</span>
                </Button>
              </Link>
              <Link to="/history">
                <Button 
                  variant={isActive("/history") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                  data-testid="nav-history"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </Link>
              <Link to="/new-game">
                <Button 
                  size="sm" 
                  className="gap-2 bg-[#000000] hover:bg-gray-800"
                  data-testid="nav-new-game"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Game</span>
                </Button>
              </Link>
              
              {/* User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 ml-2" data-testid="user-menu">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline max-w-[100px] truncate">{user.name || user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-sm text-muted-foreground">
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {ADMIN_EMAILS.includes(user.email?.toLowerCase()) && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer text-amber-600">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/account")} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSwitchSport} className="cursor-pointer">
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Switch Sport
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

import { Link, useLocation } from "react-router-dom";
import { Home, Users, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MooseIcon from "@/components/MooseIcon";

export default function Layout({ children }) {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <MooseIcon className="w-8 h-8 text-[#1e3a5f]" />
              <span className="text-xl font-bold text-[#1e3a5f] hidden sm:block">StatMoose</span>
            </Link>
            
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link to="/">
                <Button 
                  variant={isActive("/") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                  data-testid="nav-home"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
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
                  className="bg-[#1e3a5f] hover:bg-[#2d5a87] gap-2"
                  data-testid="nav-new-game"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Game</span>
                </Button>
              </Link>
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

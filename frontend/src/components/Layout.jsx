import { Link, useLocation } from "react-router-dom";
import { Home, Users, History, Plus, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MooseIcon from "@/components/MooseIcon";

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <MooseIcon className="w-8 h-8 text-[#000000]" />
              <span className="text-xl font-bold text-[#000000] hidden sm:block">StatMoose</span>
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
                  className="bg-[#000000] hover:bg-gray-800 gap-2"
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
                    <DropdownMenuItem className="text-muted-foreground text-sm">
                      {user.email}
                    </DropdownMenuItem>
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

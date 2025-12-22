import { Link, useLocation } from "react-router-dom";
import { Home, Users, History, Plus, LogOut, User, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/context/ThemeContext";

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 transition-colors duration-300 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={isDark ? "/logo-white.png" : "/logo-black.png"} 
                alt="StatMoose" 
                className="w-8 h-8 object-contain"
              />
              <span className={`text-xl font-bold hidden sm:block ${isDark ? 'text-white' : 'text-[#000000]'}`}>StatMoose</span>
            </Link>
            
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link to="/">
                <Button 
                  variant={isActive("/") ? "secondary" : "ghost"} 
                  size="sm"
                  className={`gap-2 ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : ''}`}
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
                  className={`gap-2 ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : ''}`}
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
                  className={`gap-2 ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : ''}`}
                  data-testid="nav-history"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </Link>
              <Link to="/new-game">
                <Button 
                  size="sm" 
                  className={`gap-2 ${isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-[#000000] hover:bg-gray-800'}`}
                  data-testid="nav-new-game"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Game</span>
                </Button>
              </Link>
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={`${isDark ? 'hover:bg-neutral-800 text-neutral-200' : ''}`}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              {/* User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={`gap-2 ml-2 ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : ''}`} data-testid="user-menu">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline max-w-[100px] truncate">{user.name || user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={isDark ? 'bg-neutral-900 border-neutral-800' : ''}>
                    <DropdownMenuItem className={`text-sm ${isDark ? 'text-neutral-400' : 'text-muted-foreground'}`}>
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className={isDark ? 'bg-neutral-800' : ''} />
                    <DropdownMenuItem onClick={toggleTheme} className={`cursor-pointer ${isDark ? 'text-neutral-200 hover:bg-neutral-800' : ''}`}>
                      {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                      {isDark ? "Light Mode" : "Dark Mode"}
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

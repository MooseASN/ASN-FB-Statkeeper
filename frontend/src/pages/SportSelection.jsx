import { useNavigate } from "react-router-dom";
import { useSport, SPORTS, SPORT_CONFIG } from "@/contexts/SportContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Lock } from "lucide-react";

// Users allowed to access Football
const FOOTBALL_ALLOWED_EMAILS = ["antlersportsnetwork@gmail.com"];

export default function SportSelection({ user, onLogout }) {
  const navigate = useNavigate();
  const { selectSport } = useSport();

  // Check if user can access football
  const canAccessFootball = FOOTBALL_ALLOWED_EMAILS.includes(user?.email?.toLowerCase());

  const handleSelectSport = (sport) => {
    if (sport === SPORTS.FOOTBALL && !canAccessFootball) {
      return; // Don't allow selection
    }
    selectSport(sport);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="StatMoose" className="h-8 w-8" />
            <span className="text-xl font-black text-white tracking-tight italic">STATMOOSE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">Welcome, {user?.name || user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            SELECT YOUR SPORT
          </h1>
          <p className="text-slate-400 text-lg">
            Choose which sport you want to track statistics for
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Basketball Card */}
          <Card
            className="group cursor-pointer overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all duration-300 bg-slate-800/50 hover:bg-slate-800"
            onClick={() => handleSelectSport(SPORTS.BASKETBALL)}
          >
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${SPORT_CONFIG.basketball.bgGradient} p-8 flex items-center justify-center`}>
                <span className="text-8xl group-hover:scale-110 transition-transform duration-300">
                  {SPORT_CONFIG.basketball.icon}
                </span>
              </div>
              <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {SPORT_CONFIG.basketball.name}
                </h2>
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
              </div>
            </CardContent>
          </Card>

          {/* Football Card */}
          <Card
            className="group cursor-pointer overflow-hidden border-2 border-transparent hover:border-green-500 transition-all duration-300 bg-slate-800/50 hover:bg-slate-800"
            onClick={() => handleSelectSport(SPORTS.FOOTBALL)}
          >
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${SPORT_CONFIG.football.bgGradient} p-8 flex items-center justify-center`}>
                <span className="text-8xl group-hover:scale-110 transition-transform duration-300">
                  {SPORT_CONFIG.football.icon}
                </span>
              </div>
              <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {SPORT_CONFIG.football.name}
                </h2>
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
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-slate-500 text-sm mt-12">
          You can switch sports at any time from the dashboard
        </p>
      </main>
    </div>
  );
}

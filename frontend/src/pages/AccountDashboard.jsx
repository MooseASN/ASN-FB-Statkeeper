import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  Crown, 
  Settings, 
  CreditCard,
  ExternalLink,
  ChevronRight,
  Star,
  Check,
  X,
  LayoutDashboard,
  Calendar,
  History,
  UserPlus,
  Shield
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { SPORT_CONFIG } from "@/contexts/SportContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Tier badge component
const TierBadge = ({ tier }) => {
  const config = {
    free: { bg: "bg-gray-100", text: "text-gray-700", label: "Free" },
    bronze: { bg: "bg-amber-100", text: "text-amber-700", label: "Bronze" },
    silver: { bg: "bg-slate-200", text: "text-slate-700", label: "Silver" },
    gold: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Gold" }
  }[tier] || { bg: "bg-gray-100", text: "text-gray-700", label: tier };
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default function AccountDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState({ basketball: [], football: [], baseball: [] });
  const [recentGames, setRecentGames] = useState([]);
  const [sharedAccess, setSharedAccess] = useState([]);
  
  const { 
    tier = 'free', 
    features = {}, 
    loading: subscriptionLoading,
    isAdmin = false,
    isTrial = false,
    trialEnd
  } = useSubscriptionFeatures() || {};

  // Default features if not loaded
  const safeFeatures = {
    maxTeams: features?.maxTeams ?? 2,
    liveStats: features?.liveStats ?? false,
    pdfExport: features?.pdfExport ?? false,
    embedWidgets: features?.embedWidgets ?? false,
    advancedStats: features?.advancedStats ?? false,
    seasonStats: features?.seasonStats ?? false,
    ...features
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teams for all sports
        const [basketballRes, footballRes, baseballRes] = await Promise.all([
          axios.get(`${API}/teams?sport=basketball`).catch(() => ({ data: [] })),
          axios.get(`${API}/teams?sport=football`).catch(() => ({ data: [] })),
          axios.get(`${API}/teams?sport=baseball`).catch(() => ({ data: [] }))
        ]);
        
        setTeams({
          basketball: basketballRes.data || [],
          football: footballRes.data || [],
          baseball: baseballRes.data || []
        });

        // Fetch recent games across all sports
        const gamesRes = await axios.get(`${API}/games?limit=5`).catch(() => ({ data: [] }));
        setRecentGames(gamesRes.data || []);

        // Fetch shared access info
        const sharedRes = await axios.get(`${API}/shared-access`).catch(() => ({ data: [] }));
        setSharedAccess(sharedRes.data || []);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("session_token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("session_token");
    sessionStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/");
  };

  if (loading || subscriptionLoading) {
    return <LoadingScreen message="Loading your account..." />;
  }

  const totalTeams = teams.basketball.length + teams.football.length + teams.baseball.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <img src="/logo-black.png" alt="StatMoose" className="h-8 w-auto" />
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-lg font-semibold text-gray-900">My Account</h1>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || user?.username || user?.email?.split('@')[0]}!
          </h2>
          <p className="text-gray-600">
            Manage your teams, view your subscription, and access all your sports from one place.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(SPORT_CONFIG).map(([sportKey, config]) => (
            <Card 
              key={sportKey}
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-gray-300"
              onClick={() => {
                localStorage.setItem('selectedSport', sportKey);
                navigate("/dashboard");
                window.location.reload(); // Ensure sport context updates
              }}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  {config.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{config.name}</h3>
                  <p className="text-sm text-gray-500">
                    {teams[sportKey]?.length || 0} team{teams[sportKey]?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Subscription
                </CardTitle>
                <TierBadge tier={tier} />
              </div>
              {isTrial && trialEnd && (
                <CardDescription className="text-amber-600">
                  Trial ends {new Date(trialEnd).toLocaleDateString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    {safeFeatures.maxTeams === -1 ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="w-4 h-4 text-center text-xs font-medium text-gray-500">{safeFeatures.maxTeams}</span>
                    )}
                    <span className="text-gray-700">
                      {safeFeatures.maxTeams === -1 ? 'Unlimited Teams' : `Teams (${totalTeams}/${safeFeatures.maxTeams})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {safeFeatures.liveStats ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={safeFeatures.liveStats ? "text-gray-700" : "text-gray-400"}>
                      Live Stats Sharing
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {safeFeatures.pdfExport ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={safeFeatures.pdfExport ? "text-gray-700" : "text-gray-400"}>
                      PDF Export
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {safeFeatures.embedWidgets ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={safeFeatures.embedWidgets ? "text-gray-700" : "text-gray-400"}>
                      Embed Widgets
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {safeFeatures.advancedStats ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={safeFeatures.advancedStats ? "text-gray-700" : "text-gray-400"}>
                      Advanced Statistics
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {safeFeatures.seasonStats ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={safeFeatures.seasonStats ? "text-gray-700" : "text-gray-400"}>
                      Season Statistics
                    </span>
                  </div>
                </div>

                {tier !== 'gold' && !isAdmin && (
                  <div className="pt-4 border-t">
                    <Button onClick={() => navigate("/pricing")} className="w-full">
                      <Star className="w-4 h-4 mr-2" />
                      Upgrade Your Plan
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-blue-500" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Total Teams</span>
                  </div>
                  <span className="font-semibold text-gray-900">{totalTeams}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Recent Games</span>
                  </div>
                  <span className="font-semibold text-gray-900">{recentGames.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Shared Access</span>
                  </div>
                  <span className="font-semibold text-gray-900">{sharedAccess.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {recentGames.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Recent Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {recentGames.slice(0, 5).map((game) => (
                  <div 
                    key={game._id || game.id} 
                    className="py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer rounded px-2 -mx-2"
                    onClick={() => {
                      localStorage.setItem('selectedSport', game.sport || 'basketball');
                      navigate(`/game/${game._id || game.id}`);
                    }}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {game.home_team_name} vs {game.away_team_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(game.created_at || game.date).toLocaleDateString()} • {game.sport || 'Basketball'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {game.home_score || 0} - {game.away_score || 0}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {game.status || 'Completed'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </Button>
          <Button variant="outline" onClick={() => navigate("/pricing")}>
            <CreditCard className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>
        </div>
      </main>
    </div>
  );
}

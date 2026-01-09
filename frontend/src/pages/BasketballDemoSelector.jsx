import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, BarChart3, Gauge } from "lucide-react";

// Demo mode bar component
export const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider">
    Demo Mode
  </div>
);

const modes = [
  {
    id: "classic",
    name: "Classic Mode",
    icon: BarChart3,
    description: "Full-featured stat tracking with player cards showing all statistics. Great for detailed game tracking.",
    features: [
      "Individual player stat cards",
      "Make/Miss shot tracking",
      "Rebounds, assists, steals, blocks",
      "Substitution management",
      "Live clock control"
    ],
    color: "emerald",
    route: "/demo/basketball/classic"
  },
  {
    id: "advanced",
    name: "Advanced Mode",
    icon: Gauge,
    description: "Professional-grade tracking with play-by-play logging, shot charts, and detailed analytics.",
    features: [
      "Play-by-play logging",
      "Shot location tracking",
      "Assist attribution",
      "Detailed box scores",
      "Advanced statistics"
    ],
    color: "blue",
    route: "/demo/basketball/advanced"
  },
  {
    id: "simple",
    name: "Simple Mode",
    icon: Zap,
    description: "Streamlined interface focused on scoring. Perfect for fast-paced tracking with minimal clicks.",
    features: [
      "Quick scoring buttons",
      "Simplified stats",
      "Faster input",
      "Essential tracking only",
      "Great for beginners"
    ],
    color: "purple",
    route: "/demo/basketball/simple"
  }
];

const ModeCard = ({ mode }) => {
  const navigate = useNavigate();
  const Icon = mode.icon;
  
  const colorClasses = {
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30 hover:border-emerald-500",
      icon: "bg-emerald-500/20 text-emerald-500",
      button: "bg-emerald-500 hover:bg-emerald-600",
      dot: "bg-emerald-500"
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30 hover:border-blue-500",
      icon: "bg-blue-500/20 text-blue-500",
      button: "bg-blue-500 hover:bg-blue-600",
      dot: "bg-blue-500"
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30 hover:border-purple-500",
      icon: "bg-purple-500/20 text-purple-500",
      button: "bg-purple-500 hover:bg-purple-600",
      dot: "bg-purple-500"
    }
  };
  
  const colors = colorClasses[mode.color];

  return (
    <div className={`bg-gray-800 border ${colors.border} rounded-xl overflow-hidden transition-all group`}>
      {/* Mode Preview */}
      <div className={`relative h-40 ${colors.bg} flex items-center justify-center`}>
        <div className={`w-20 h-20 rounded-2xl ${colors.icon} flex items-center justify-center`}>
          <Icon className="w-10 h-10" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-white mb-2">{mode.name}</h3>
        <p className="text-gray-400 mb-4 text-sm">{mode.description}</p>
        
        {/* Features */}
        <ul className="space-y-2 mb-6">
          {mode.features.map((feature, index) => (
            <li key={index} className="flex items-center text-gray-300 text-sm">
              <span className={`w-1.5 h-1.5 ${colors.dot} rounded-full mr-2`} />
              {feature}
            </li>
          ))}
        </ul>

        <Button 
          onClick={() => navigate(mode.route)}
          className={`w-full ${colors.button} text-white font-semibold`}
        >
          Try {mode.name}
        </Button>
      </div>
    </div>
  );
};

export default function BasketballDemoSelector() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Demo Mode Bar */}
      <DemoModeBar />

      {/* Navigation */}
      <nav className="fixed top-8 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/logo-white.png" 
              alt="StatMoose" 
              className="h-10 w-auto"
            />
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tight">
              Basketball Demo
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Choose a tracking mode to explore. Each mode offers different features 
              suited for various use cases.
            </p>
          </div>

          {/* Team Info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 text-center">Demo Teams</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">NT</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Northside Tigers</p>
                  <p className="text-gray-400 text-sm">Home Team • 10 Players</p>
                </div>
              </div>
              <span className="text-gray-500 font-bold text-2xl">VS</span>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">EE</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Eastwood Eagles</p>
                  <p className="text-gray-400 text-sm">Away Team • 10 Players</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {modes.map((mode) => (
              <ModeCard key={mode.id} mode={mode} />
            ))}
          </div>

          {/* Info */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              This is a demo with sample data. Stats will not be saved.
              <br />
              <Link to="/contact" className="text-orange-400 hover:text-orange-300">
                Contact us
              </Link>
              {" "}to get started with StatMoose for your school.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

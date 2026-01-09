import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
    description: "Traditional stat tracking with a clean, straightforward interface. Perfect for beginners or quick games.",
    features: ["Simple player selection", "Basic stat buttons", "Quick scoring", "Easy to learn"],
    image: "/demo-screenshots/classic-mode.png",
    route: "/demo/basketball/classic"
  },
  {
    id: "advanced",
    name: "Advanced Mode",
    description: "Full-featured stat tracking with detailed play-by-play logging and advanced analytics.",
    features: ["Play-by-play logging", "Shot location tracking", "Detailed box scores", "Export options"],
    image: "/demo-screenshots/advanced-mode.png",
    route: "/demo/basketball/advanced"
  },
  {
    id: "quick",
    name: "Quick Mode",
    description: "Streamlined interface for fast-paced tracking. Focus on the essentials with minimal clicks.",
    features: ["Minimal interface", "One-tap scoring", "Speed optimized", "Live display ready"],
    image: "/demo-screenshots/quick-mode.png",
    route: "/demo/basketball/quick"
  }
];

const ModeCard = ({ mode }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all group">
      {/* Screenshot placeholder */}
      <div className="relative h-48 bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <div className="text-6xl mb-2">
              {mode.id === "classic" && "📊"}
              {mode.id === "advanced" && "📈"}
              {mode.id === "quick" && "⚡"}
            </div>
            <p className="text-gray-500 text-sm">{mode.name} Interface</p>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-white mb-2">{mode.name}</h3>
        <p className="text-gray-400 mb-4">{mode.description}</p>
        
        {/* Features */}
        <ul className="space-y-2 mb-6">
          {mode.features.map((feature, index) => (
            <li key={index} className="flex items-center text-gray-300 text-sm">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2" />
              {feature}
            </li>
          ))}
        </ul>

        <Button 
          onClick={() => navigate(mode.route)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
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
            <h2 className="text-lg font-semibold text-white mb-4">Demo Teams</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">NT</span>
                </div>
                <div>
                  <p className="text-white font-semibold">Northside Tigers</p>
                  <p className="text-gray-400 text-sm">Home Team • 10 Players</p>
                </div>
              </div>
              <span className="text-gray-500 font-bold text-xl">VS</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">EE</span>
                </div>
                <div>
                  <p className="text-white font-semibold">Eastwood Eagles</p>
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

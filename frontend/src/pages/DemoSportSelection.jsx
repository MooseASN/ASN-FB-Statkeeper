import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Sports data
const sportsData = [
  {
    name: "Basketball",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/pqshwl1p_Basketball.avif",
    route: "/demo/basketball"
  },
  {
    name: "Football",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/krez4qmm_Football.webp",
    route: "/demo/football"
  },
  {
    name: "Baseball",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/uhv3smdr_Baseball.jpg",
    route: "/demo/baseball"
  }
];

// Hook for detecting when element is in viewport
const useInView = (options = {}) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.2, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isInView];
};

// Sport Card Component
const SportCard = ({ sport, index }) => {
  const [ref, isInView] = useInView();
  const navigate = useNavigate();
  const delay = index * 150;

  const handleViewDemo = (e) => {
    e.stopPropagation();
    navigate(sport.route);
  };

  return (
    <div 
      ref={ref}
      className="relative flex-1 min-h-[300px] md:min-h-[400px] overflow-hidden group cursor-pointer"
      onClick={handleViewDemo}
      data-testid={`demo-sport-card-${sport.name.toLowerCase()}`}
    >
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-70"
        style={{ backgroundImage: `url(${sport.image})` }}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
      
      {/* Content */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-out`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <h3 
          className={`text-5xl md:text-6xl font-black text-white uppercase transition-all duration-1000 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: `${delay}ms`, letterSpacing: '0.15em' }}
        >
          {sport.name}
        </h3>
        <button
          onClick={handleViewDemo}
          className={`mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-1000 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: `${delay + 200}ms` }}
          data-testid={`demo-btn-${sport.name.toLowerCase()}`}
        >
          View Demo
        </button>
      </div>
    </div>
  );
};

export default function DemoSportSelection() {
  const [ref, isInView] = useInView();

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/logo-white.png" 
              alt="StatMoose" 
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/pricing">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Pricing
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Contact
              </Button>
            </Link>
            <Link to="/support">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Support
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Sign In
              </Button>
            </Link>
            <Link to="/pricing">
              <Button className="bg-white text-black hover:bg-gray-200 font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={ref} className="pt-24 pb-8 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto text-center py-12">
          <h1 
            className={`text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tight transition-all duration-1000 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Try the Demo
          </h1>
          <p 
            className={`text-xl text-gray-400 max-w-2xl mx-auto transition-all duration-1000 delay-200 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Select a sport below to explore our stat-tracking interface
          </p>
        </div>
      </section>

      {/* Sports Selection Grid */}
      <section className="bg-black pb-8">
        <div className="flex flex-col md:flex-row">
          {sportsData.map((sport, index) => (
            <SportCard key={sport.name} sport={sport} index={index} />
          ))}
        </div>
      </section>

      {/* Jumbotron Mode Card */}
      <section className="bg-black pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/jumbotron-mode" data-testid="jumbotron-mode-link">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-1 group cursor-pointer hover:scale-[1.02] transition-transform duration-300">
              <div className="bg-black/90 rounded-lg p-6 md:p-8 flex items-center gap-6">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                    <polyline points="17 2 12 7 7 2"></polyline>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wide">
                    Jumbotron Mode
                  </h3>
                  <p className="text-gray-400 mt-2 text-sm md:text-base">
                    Create custom scoreboard displays for venue screens. Schedule multiple games, use StatMoose or PrestoSports data, and get embed links.
                  </p>
                </div>
                <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/20 group-hover:bg-orange-500/40 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Back to Home Link */}
      <section className="py-12 px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <Link to="/">
            <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800 px-8 py-3 text-lg font-bold uppercase tracking-wide">
              Back to Home
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/logo-white.png" 
              alt="StatMoose" 
              className="h-8 w-auto opacity-80"
            />
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/contact" className="text-gray-500 hover:text-white transition-colors uppercase text-sm tracking-wide">
              Contact
            </Link>
            <Link to="/login" className="text-gray-500 hover:text-white transition-colors uppercase text-sm tracking-wide">
              Sign In
            </Link>
          </div>
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} StatMoose. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

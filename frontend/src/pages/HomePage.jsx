import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Sports data
const sportsData = [
  {
    name: "Basketball",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/pqshwl1p_Basketball.avif",
    comingSoon: false
  },
  {
    name: "Football",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/krez4qmm_Football.webp",
    comingSoon: false
  },
  {
    name: "Baseball",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/uhv3smdr_Baseball.jpg",
    comingSoon: false
  }
];

// Feature data for each section
const sectionsData = {
  schools: {
    title: "For Schools",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/mu08jeix_Schools.jpg",
    features: [
      {
        title: "Season Tracking",
        description: "Track stats across entire seasons with automatic aggregation, trends analysis, and historical comparisons."
      },
      {
        title: "School Dashboard",
        description: "Centralized hub for all your teams, games, and rosters. Manage multiple sports from one intuitive interface."
      },
      {
        title: "Team & Season Reports",
        description: "Generate comprehensive stat reports for teams and seasons. Export to PDF or CSV for official records."
      }
    ]
  },
  broadcasters: {
    title: "For Broadcasters",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/t6sa2zj3_Broadcasters.jpg",
    features: [
      {
        title: "Multiple Tracking Modes",
        description: "Choose from Classic, Advanced, or Quick modes based on your broadcast needs and available personnel."
      },
      {
        title: "Live Stat Outputs",
        description: "Real-time stat feeds with embed codes for your website, social media, or broadcast graphics system."
      },
      {
        title: "Instant Box Scores",
        description: "Professional box scores generated automatically as you track. Share via link or download instantly."
      }
    ]
  },
  venues: {
    title: "For Venues",
    image: "https://customer-assets.emergentagent.com/job_statmoose-sports-1/artifacts/z58qmg3u_Venues.jpeg",
    features: [
      {
        title: "Event Management",
        description: "Host multi-game events and tournaments with unified tracking and centralized results display."
      },
      {
        title: "Ticker & Jumbotron",
        description: "Create custom tickers and full-screen jumbotron displays. Perfect for venue scoreboards and displays."
      },
      {
        title: "Game Scheduling",
        description: "Manage game schedules, venues, and broadcast assignments all in one place."
      }
    ]
  }
};

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

// Fade transition slideshow component for features
const FeatureSlideshow = ({ features }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % features.length);
        setIsTransitioning(false);
      }, 500);
    }, 7000);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <div className="relative min-h-[100px]">
      <div 
        className={`transition-all duration-1000 ease-in-out ${
          isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {features[currentIndex].title}
        </h3>
        <p className="text-gray-300 text-lg max-w-xl">
          {features[currentIndex].description}
        </p>
      </div>
    </div>
  );
};

// Sport Card Component
const SportCard = ({ sport, index }) => {
  const [ref, isInView] = useInView();
  const navigate = useNavigate();
  const delay = index * 150;

  const handleViewDemo = (e) => {
    e.stopPropagation();
    if (sport.name === "Basketball") {
      navigate("/demo/basketball");
    } else if (sport.name === "Football") {
      navigate("/demo/football");
    } else if (sport.name === "Baseball") {
      navigate("/demo/baseball");
    }
  };

  return (
    <div 
      ref={ref}
      className="relative flex-1 min-h-[300px] md:min-h-[400px] overflow-hidden group"
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
        {sport.comingSoon ? (
          <span 
            className={`mt-3 px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm uppercase tracking-wider transition-all duration-1000 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: `${delay + 200}ms` }}
          >
            Coming Soon
          </span>
        ) : (
          <button
            onClick={handleViewDemo}
            className={`mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-1000 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: `${delay + 200}ms` }}
          >
            View Demo
          </button>
        )}
      </div>
    </div>
  );
};

// Sports Offered Section
const SportsOfferedSection = () => {
  const [ref, isInView] = useInView();

  return (
    <section ref={ref} className="bg-black py-16">
      {/* Section Title */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <h2 
          className={`text-4xl md:text-5xl font-black text-white uppercase tracking-tight transition-all duration-1000 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Sports Offered
        </h2>
      </div>
      
      {/* Sports Grid */}
      <div className="flex flex-col md:flex-row">
        {sportsData.map((sport, index) => (
          <SportCard key={sport.name} sport={sport} index={index} />
        ))}
      </div>
    </section>
  );
};

// Section component with image background and gradient
const ImageSection = ({ section, reverse = false }) => {
  const [ref, isInView] = useInView();

  return (
    <section ref={ref} className="relative min-h-[500px] flex items-center overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${section.image})` }}
      />
      
      {/* Gradient overlay */}
      <div 
        className={`absolute inset-0 ${
          reverse 
            ? "bg-gradient-to-l from-black/95 via-black/85 to-black/50"
            : "bg-gradient-to-r from-black/95 via-black/85 to-black/50"
        }`}
      />
      
      {/* Content */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 py-16`}>
        <div 
          className={`max-w-2xl transition-all duration-1000 ease-out ${
            reverse ? "ml-auto" : "mr-auto"
          } ${
            isInView 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-12"
          }`}
        >
          <h2 
            className={`text-5xl md:text-6xl font-black text-white mb-8 uppercase tracking-tight transition-all duration-1000 delay-100 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {section.title}
          </h2>
          <div 
            className={`transition-all duration-1000 delay-300 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <FeatureSlideshow features={section.features} />
          </div>
        </div>
      </div>
    </section>
  );
};

// CTA Section Component
const CTASection = () => {
  const [ref, isInView] = useInView();

  return (
    <section ref={ref} className="py-24 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-4xl mx-auto text-center">
        <h2 
          className={`text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight transition-all duration-1000 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Want StatMoose for Your School?
        </h2>
        <p 
          className={`text-xl text-gray-400 mb-10 max-w-2xl mx-auto transition-all duration-1000 delay-200 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          We would love to hear from you. Get in touch with us to schedule a demo, 
          ask a question, or learn more about our solutions.
        </p>
        <div
          className={`transition-all duration-1000 delay-400 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Link to="/contact">
            <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-12 py-6 text-lg font-bold uppercase tracking-wide">
              Contact Us
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default function HomePage() {
  const [heroRef, heroInView] = useInView();
  const [showSweep, setShowSweep] = useState(false);

  useEffect(() => {
    // Trigger sweep animation after initial fade-in
    const timer = setTimeout(() => {
      setShowSweep(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Sweep animation styles */}
      <style>{`
        @keyframes lightSweep {
          0% {
            transform: translateX(-100%) skewX(-20deg);
          }
          100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }
        
        .logo-sweep-wrapper {
          position: relative;
          display: inline-block;
        }
        
        .logo-base {
          display: block;
        }
        
        .logo-sweep-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          pointer-events: none;
        }
        
        .logo-sweep-overlay img {
          opacity: 0;
        }
        
        .logo-sweep-overlay::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            transparent 30%,
            rgba(255, 255, 255, 0.8) 50%,
            transparent 70%,
            transparent 100%
          );
          transform: translateX(-100%) skewX(-20deg);
          -webkit-mask-image: url('/logo-white.png');
          -webkit-mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-image: url('/logo-white.png');
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
        }
        
        .logo-sweep-overlay.animate::before {
          animation: lightSweep 1.2s ease-in-out forwards;
        }
      `}</style>

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
            <Link to="/contact">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Contact
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Sign In
              </Button>
            </Link>
            <Link to="/contact">
              <Button className="bg-white text-black hover:bg-gray-200 font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="pt-24 pb-20 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto text-center py-16">
          {/* Large Logo with Sweep Animation */}
          <div 
            className={`mb-8 transition-all duration-1000 ${
              heroInView ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
            }`}
          >
            <div className="logo-sweep-wrapper">
              <img 
                src="/logo-white.png" 
                alt="StatMoose" 
                className="logo-base h-32 md:h-40 w-auto mx-auto"
              />
              <div className={`logo-sweep-overlay ${showSweep ? 'animate' : ''}`}>
                <img 
                  src="/logo-white.png" 
                  alt="" 
                  className="h-32 md:h-40 w-auto mx-auto"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
          
          <p 
            className={`text-gray-400 uppercase tracking-widest text-sm mb-6 font-medium transition-all duration-1000 delay-100 ${
              heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            This is StatMoose
          </p>
          <h1 
            className={`text-5xl md:text-7xl font-black text-white mb-6 leading-tight uppercase tracking-tight transition-all duration-1000 delay-200 ${
              heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Live Sports Statistics<br />
            <span className="text-gray-400">For the Modern Age</span>
          </h1>
          <p 
            className={`text-xl text-gray-400 max-w-3xl mx-auto mb-10 transition-all duration-1000 delay-300 ${
              heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            The comprehensive stat-tracking solution for schools, broadcasters, and venues. 
            Real-time statistics for football, basketball, and more sports to come.
          </p>
          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-500 ${
              heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Link to="/contact">
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-10 py-6 text-lg font-bold uppercase tracking-wide">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-800 px-10 py-6 text-lg font-bold uppercase tracking-wide">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sports Offered Section */}
      <SportsOfferedSection />

      {/* For Schools Section */}
      <ImageSection section={sectionsData.schools} />

      {/* For Broadcasters Section */}
      <ImageSection section={sectionsData.broadcasters} reverse />

      {/* For Venues Section */}
      <ImageSection section={sectionsData.venues} />

      {/* CTA Section */}
      <CTASection />

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

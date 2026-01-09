import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

// Slideshow component for features
const FeatureSlideshow = ({ features }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [features.length]);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % features.length);
  };

  return (
    <div className="relative">
      {/* Feature content */}
      <div className="min-h-[120px] flex items-center">
        <div className="text-center w-full px-12">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            {features[currentIndex].title}
          </h3>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            {features[currentIndex].description}
          </p>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
        aria-label="Previous feature"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
        aria-label="Next feature"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex ? "bg-white w-8" : "bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to feature ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

// Section component with image background and gradient
const ImageSection = ({ section, reverse = false }) => {
  return (
    <section className="relative min-h-[500px] flex items-center overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${section.image})` }}
      />
      
      {/* Gradient overlay */}
      <div 
        className={`absolute inset-0 ${
          reverse 
            ? "bg-gradient-to-l from-black/95 via-black/80 to-black/40"
            : "bg-gradient-to-r from-black/95 via-black/80 to-black/40"
        }`}
      />
      
      {/* Content */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 py-16 ${reverse ? "text-right" : "text-left"}`}>
        <div className={`${reverse ? "ml-auto" : "mr-auto"} max-w-2xl`}>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-8 uppercase tracking-tight">
            {section.title}
          </h2>
          <FeatureSlideshow features={section.features} />
        </div>
      </div>
    </section>
  );
};

export default function HomePage() {
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
      <section className="pt-24 pb-20 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto text-center py-20">
          <p className="text-gray-400 uppercase tracking-widest text-sm mb-6 font-medium">
            This is StatMoose
          </p>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight uppercase tracking-tight">
            Live Sports Statistics<br />
            <span className="text-gray-400">For the Modern Age</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            The comprehensive stat-tracking solution for schools, broadcasters, and venues. 
            Real-time statistics for football, basketball, and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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

      {/* For Schools Section */}
      <ImageSection section={sectionsData.schools} />

      {/* For Broadcasters Section */}
      <ImageSection section={sectionsData.broadcasters} reverse />

      {/* For Venues Section */}
      <ImageSection section={sectionsData.venues} />

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">
            Want StatMoose for Your School?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            We would love to hear from you. Get in touch with us to schedule a demo, 
            ask a question, or learn more about our solutions.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-12 py-6 text-lg font-bold uppercase tracking-wide">
              Contact Us
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

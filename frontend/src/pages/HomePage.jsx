import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  School, 
  Radio, 
  Building2, 
  ChartBar, 
  Users, 
  FileText, 
  Tv, 
  Zap, 
  ClipboardList,
  Calendar,
  LayoutGrid,
  Monitor,
  ArrowRight,
  Mail
} from "lucide-react";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-800/80 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
    <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-emerald-400" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-slate-400">{description}</p>
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle, iconColor = "text-emerald-400", bgColor = "bg-emerald-500/20" }) => (
  <div className="text-center mb-12">
    <div className={`w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
      <Icon className={`w-8 h-8 ${iconColor}`} />
    </div>
    <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{title}</h2>
    <p className="text-slate-400 text-lg max-w-2xl mx-auto">{subtitle}</p>
  </div>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-white">StatMoose</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/contact">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Contact
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
            <Link to="/school-signup">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Live Sports Statistics Platform</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Track Every Play.<br />
            <span className="text-emerald-400">Share Every Moment.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            The comprehensive stat-tracking solution for schools, broadcasters, and venues. 
            Real-time statistics for football, basketball, and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/school-signup">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* For Schools Section */}
      <section className="py-20 px-6 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            icon={School}
            title="For Schools"
            subtitle="Comprehensive tools to manage your athletic program's statistics and performance tracking"
            iconColor="text-blue-400"
            bgColor="bg-blue-500/20"
          />
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={ChartBar}
              title="Season Tracking"
              description="Track stats across entire seasons with automatic aggregation, trends analysis, and historical comparisons."
            />
            <FeatureCard 
              icon={LayoutGrid}
              title="School Dashboard"
              description="Centralized hub for all your teams, games, and rosters. Manage multiple sports from one intuitive interface."
            />
            <FeatureCard 
              icon={FileText}
              title="Team & Season Reports"
              description="Generate comprehensive stat reports for teams and seasons. Export to PDF or CSV for official records."
            />
          </div>
        </div>
      </section>

      {/* For Broadcasters Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            icon={Radio}
            title="For Broadcasters"
            subtitle="Professional-grade tools for live game coverage and instant statistics delivery"
            iconColor="text-purple-400"
            bgColor="bg-purple-500/20"
          />
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Tv}
              title="Multiple Tracking Modes"
              description="Choose from Classic, Advanced, or Quick modes based on your broadcast needs and available personnel."
            />
            <FeatureCard 
              icon={Zap}
              title="Live Stat Outputs"
              description="Real-time stat feeds with embed codes for your website, social media, or broadcast graphics system."
            />
            <FeatureCard 
              icon={ClipboardList}
              title="Instant Box Scores"
              description="Professional box scores generated automatically as you track. Share via link or download instantly."
            />
          </div>
        </div>
      </section>

      {/* For Venues Section */}
      <section className="py-20 px-6 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            icon={Building2}
            title="For Venues"
            subtitle="Engage your audience with dynamic displays and comprehensive event management"
            iconColor="text-amber-400"
            bgColor="bg-amber-500/20"
          />
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Users}
              title="Event Feature"
              description="Host multi-game events and tournaments with unified tracking and centralized results display."
            />
            <FeatureCard 
              icon={Monitor}
              title="Ticker & Jumbotron"
              description="Create custom tickers and full-screen jumbotron displays. Perfect for venue scoreboards and displays."
            />
            <FeatureCard 
              icon={Calendar}
              title="Scheduling"
              description="Manage game schedules, venues, and broadcast assignments all in one place."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Looking to have StatMoose for your school?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Join schools across the country using StatMoose for their athletic programs. 
              Contact us today to learn more about our solutions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/contact">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg">
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Us Today
                </Button>
              </Link>
              <Link to="/school-signup">
                <Button size="lg" variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 px-8 py-6 text-lg">
                  Sign Up Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-lg font-semibold text-white">StatMoose</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
              Contact
            </Link>
            <Link to="/login" className="text-slate-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/school-signup" className="text-slate-400 hover:text-white transition-colors">
              Get Started
            </Link>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} StatMoose. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

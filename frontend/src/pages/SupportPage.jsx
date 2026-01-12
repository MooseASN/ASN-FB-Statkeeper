import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft,
  BookOpen,
  Sparkles,
  Lightbulb,
  Play,
  Users,
  Clock,
  Undo2,
  Share2,
  FileText,
  Download,
  Settings,
  Zap,
  Keyboard,
  Smartphone,
  Monitor,
  BarChart3,
  Calendar,
  Shield,
  HelpCircle,
  CreditCard,
  Lock,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MARTY_IMAGE = "https://customer-assets.emergentagent.com/job_sportspro-dash/artifacts/xqkfq63l_Marty.png";

// Sport icons as styled emojis
const SPORT_ICONS = {
  basketball: "🏀",
  football: "🏈", 
  baseball: "⚾"
};

// Collapsible Section Component - supports Lucide icons, emojis, or image URLs
function CollapsibleSection({ title, icon: Icon, sportIcon, iconSrc, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-zinc-900 hover:bg-zinc-800 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          {sportIcon ? (
            <span className="text-2xl">{sportIcon}</span>
          ) : iconSrc ? (
            <img src={iconSrc} alt="" className="w-6 h-6 object-contain" />
          ) : Icon ? (
            <Icon className="w-5 h-5 text-orange-500" />
          ) : null}
          <span className="font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-zinc-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-zinc-950 border-t border-zinc-800">
          {children}
        </div>
      )}
    </div>
  );
}

// Sub-section Component
function SubSection({ title, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-orange-400 font-semibold mb-2 text-sm uppercase tracking-wide">{title}</h4>
      <div className="text-zinc-300 text-sm leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

// Step Component for guides
function Step({ number, title, description }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-black font-bold text-xs flex items-center justify-center">
        {number}
      </div>
      <div>
        <span className="font-medium text-white">{title}</span>
        {description && <p className="text-zinc-400 text-sm mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// Tip Component
function Tip({ icon: Icon, title, description }) {
  return (
    <div className="flex gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5 text-orange-500" />
      </div>
      <div>
        <span className="font-medium text-white block">{title}</span>
        <p className="text-zinc-400 text-sm mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <span className="text-xl font-black text-white tracking-tight italic">STATMOOSE</span>
        </div>
      </header>

      {/* Hero Section with Marty */}
      <section className="bg-gradient-to-b from-zinc-900 to-black py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <img 
            src={MARTY_IMAGE} 
            alt="Marty the StatMoose" 
            className="w-48 h-48 mx-auto mb-6 object-contain"
          />
          <h1 className="text-3xl md:text-4xl font-black mb-4">
            Welcome! I'm <span className="text-orange-500">Marty the StatMoose!</span>
          </h1>
          <p className="text-xl text-zinc-300 mb-8">Let's get started!</p>
          
          {/* Category Navigation Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => scrollToSection('general-help')}
              className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-6 py-3"
              data-testid="nav-general-help"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              General Help
            </Button>
            <Button
              onClick={() => scrollToSection('guides')}
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-6 py-3"
              data-testid="nav-guides"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Guides
            </Button>
            <Button
              onClick={() => scrollToSection('features')}
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-6 py-3"
              data-testid="nav-features"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Features
            </Button>
            <Button
              onClick={() => scrollToSection('tips')}
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-6 py-3"
              data-testid="nav-tips"
            >
              <Lightbulb className="w-5 h-5 mr-2" />
              Tips & Tricks
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        
        {/* ========== GENERAL HELP SECTION ========== */}
        <section id="general-help" className="mb-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl font-bold">General Help</h2>
          </div>
          <p className="text-zinc-400 mb-6">
            Common questions, troubleshooting tips, and solutions to help you get started.
          </p>

          {/* Account & Subscription */}
          <CollapsibleSection title="Account & Subscription" icon={CreditCard} defaultOpen={true}>
            <SubSection title="Creating an Account">
              <Step number="1" title="Click 'Get Started'" description="Find this button on the homepage or navigation bar" />
              <Step number="2" title="Enter your information" description="Provide your email, name, and create a password" />
              <Step number="3" title="Verify your email" description="Check your inbox for a verification link" />
              <Step number="4" title="Start your free trial" description="All paid tiers include a 14-day free trial!" />
            </SubSection>

            <SubSection title="Subscription Tiers">
              <p className="mb-3">StatMoose offers three subscription levels:</p>
              <div className="space-y-3">
                <div className="p-3 bg-zinc-900 rounded-lg border border-amber-700/50">
                  <h5 className="font-bold text-amber-600 mb-1">Bronze (Free)</h5>
                  <p className="text-sm text-zinc-400">Basic stat tracking, PDF box scores, and share links. Perfect for trying out StatMoose.</p>
                </div>
                <div className="p-3 bg-zinc-900 rounded-lg border border-gray-400/50">
                  <h5 className="font-bold text-gray-300 mb-1">Silver ($15/month)</h5>
                  <p className="text-sm text-zinc-400">Everything in Bronze plus embeddable widgets, sponsor banners (5 slots), and CSV export.</p>
                </div>
                <div className="p-3 bg-zinc-900 rounded-lg border border-yellow-500/50">
                  <h5 className="font-bold text-yellow-500 mb-1">Gold ($20/month)</h5>
                  <p className="text-sm text-zinc-400">Everything in Silver plus custom team logos, unlimited sponsors, shared access, and priority support.</p>
                </div>
              </div>
            </SubSection>

            <SubSection title="Managing Your Subscription">
              <p>To view or manage your subscription:</p>
              <Step number="1" title="Go to Account Settings" description="Click your profile icon → Account Settings" />
              <Step number="2" title="Find the Subscription section" description="View your current plan and renewal date" />
              <Step number="3" title="Change or cancel your plan" description="Use the Cancel or View Plans buttons as needed" />
            </SubSection>

            <SubSection title="Free Trial">
              <p>All paid tiers (Silver & Gold) include a <strong className="text-white">14-day free trial</strong>. You won't be charged until the trial ends, and you can cancel anytime during the trial period.</p>
            </SubSection>
          </CollapsibleSection>

          {/* Payment & Billing Issues */}
          <CollapsibleSection title="Payment & Billing Issues" icon={AlertTriangle}>
            <SubSection title="Payment Failed">
              <p className="mb-3">If your payment failed, here are common causes and solutions:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-white">Insufficient funds</strong> - Check your account balance</li>
                <li><strong className="text-white">Card expired</strong> - Update your payment method in Account Settings</li>
                <li><strong className="text-white">Bank blocked the charge</strong> - Contact your bank to authorize StatMoose payments</li>
                <li><strong className="text-white">Incorrect card details</strong> - Re-enter your card information carefully</li>
              </ul>
            </SubSection>

            <SubSection title="Managing Payment Methods">
              <p>To view or update your payment methods:</p>
              <Step number="1" title="Go to Account Settings" description="Click your profile icon → Account Settings" />
              <Step number="2" title="Find the Payment Methods section" description="View your saved cards" />
              <Step number="3" title="Use the Stripe Billing Portal" description="Click 'Manage in Stripe Billing Portal' to add cards, view invoices, or update billing info" />
            </SubSection>

            <SubSection title="Refund Policy">
              <p>If you're not satisfied with StatMoose, contact us within 7 days of your first payment for a full refund. Use the Contact Us page or email us directly.</p>
            </SubSection>
          </CollapsibleSection>

          {/* Technical Troubleshooting */}
          <CollapsibleSection title="Technical Troubleshooting" icon={RefreshCw}>
            <SubSection title="Page Not Loading">
              <p className="mb-3">If StatMoose isn't loading properly:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-white">Clear your browser cache</strong> - Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)</li>
                <li><strong className="text-white">Try a different browser</strong> - Chrome, Firefox, Safari, and Edge are all supported</li>
                <li><strong className="text-white">Disable browser extensions</strong> - Ad blockers can sometimes interfere</li>
                <li><strong className="text-white">Check your internet connection</strong> - Try refreshing the page</li>
              </ul>
            </SubSection>

            <SubSection title="Stats Not Saving">
              <p className="mb-3">If your stats aren't being saved:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-white">Check your connection</strong> - Look for the connection indicator in the top corner</li>
                <li><strong className="text-white">Don't close the browser</strong> - Stats sync when you have an active connection</li>
                <li><strong className="text-white">Wait a moment</strong> - There may be a brief delay in syncing</li>
              </ul>
              <p className="mt-3 text-orange-400">Pro tip: StatMoose auto-saves every action, so you rarely lose data even if you close the browser accidentally!</p>
            </SubSection>

            <SubSection title="Offline Mode">
              <p>StatMoose requires an internet connection for full functionality. If you're at a venue with poor connectivity:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400 mt-2">
                <li>Use your phone's mobile hotspot</li>
                <li>Position yourself closer to the venue's WiFi router</li>
                <li>Consider downloading game data beforehand while on good WiFi</li>
              </ul>
            </SubSection>

            <SubSection title="Browser Compatibility">
              <p>StatMoose works best on:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 mt-2">
                <li><strong className="text-white">Chrome</strong> (recommended) - Version 90+</li>
                <li><strong className="text-white">Safari</strong> - Version 14+ (great for iPad users)</li>
                <li><strong className="text-white">Firefox</strong> - Version 88+</li>
                <li><strong className="text-white">Edge</strong> - Version 90+</li>
              </ul>
              <p className="mt-3 text-zinc-500 italic">Internet Explorer is not supported.</p>
            </SubSection>
          </CollapsibleSection>

          {/* Getting Started Quick Tips */}
          <CollapsibleSection title="Getting Started Checklist" icon={Zap}>
            <SubSection title="Before Your First Game">
              <div className="space-y-3">
                <Step number="1" title="Create your account" description="Sign up and choose your subscription tier" />
                <Step number="2" title="Set up your team" description="Add team name, colors, and logo (optional)" />
                <Step number="3" title="Add your roster" description="Enter all player names, numbers, and positions" />
                <Step number="4" title="Try a practice game" description="Use Demo Mode to get comfortable with the interface" />
                <Step number="5" title="Prepare your device" description="Charge your tablet/phone and test your WiFi connection at the venue" />
              </div>
            </SubSection>

            <SubSection title="Game Day Essentials">
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-white">Fully charged device</strong> - Bring a portable charger just in case</li>
                <li><strong className="text-white">Stable internet</strong> - Mobile hotspot as backup</li>
                <li><strong className="text-white">Printed roster</strong> - Physical backup with jersey numbers</li>
                <li><strong className="text-white">Share link ready</strong> - Send to parents/fans before the game starts</li>
              </ul>
            </SubSection>
          </CollapsibleSection>
        </section>

        {/* ========== GUIDES SECTION ========== */}
        <section id="guides" className="mb-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl font-bold">Guides</h2>
          </div>
          <p className="text-zinc-400 mb-6">
            Step-by-step instructions for using StatMoose across all sports and modes.
          </p>

          {/* Basketball Guides */}
          <CollapsibleSection title="Basketball Stat-Keeping" sportIcon={SPORT_ICONS.basketball} defaultOpen={true}>
            <SubSection title="Getting Started">
              <Step number="1" title="Create a Team" description="Go to Dashboard → New Team → Select Basketball" />
              <Step number="2" title="Add Your Roster" description="Enter player names, numbers, and positions" />
              <Step number="3" title="Start a Game" description="Click 'New Game', select opponent, and you're ready!" />
            </SubSection>
            
            <SubSection title="Understanding the Interface">
              <p className="mb-3">The basketball stat-keeping screen has several key areas:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-white">Scoreboard (Top)</strong> - Shows team names, scores, and current quarter</li>
                <li><strong className="text-white">Player Grid (Center)</strong> - Each row is a player, each column is a stat</li>
                <li><strong className="text-white">Quick Actions (Bottom)</strong> - Undo, Redo, Share, and End Game buttons</li>
                <li><strong className="text-white">Play Log (Side)</strong> - Running list of all recorded plays</li>
              </ul>
            </SubSection>

            <SubSection title="Recording Stats During a Game">
              <p>Tap a player's row to record stats. Each column represents a different stat:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li><strong className="text-white">PTS</strong> - Points scored (auto-calculates from FG/3PT/FT)</li>
                <li><strong className="text-white">FG</strong> - Field Goals Made/Attempted</li>
                <li><strong className="text-white">3PT</strong> - Three-pointers Made/Attempted</li>
                <li><strong className="text-white">FT</strong> - Free Throws Made/Attempted</li>
                <li><strong className="text-white">REB</strong> - Rebounds (O-REB + D-REB)</li>
                <li><strong className="text-white">AST</strong> - Assists</li>
                <li><strong className="text-white">STL</strong> - Steals</li>
                <li><strong className="text-white">BLK</strong> - Blocks</li>
                <li><strong className="text-white">TO</strong> - Turnovers</li>
                <li><strong className="text-white">PF</strong> - Personal Fouls</li>
              </ul>
            </SubSection>

            <SubSection title="Step-by-Step: Recording a Made 3-Pointer">
              <Step number="1" title="Find the player" description="Locate their row in the player grid" />
              <Step number="2" title="Tap the 3PT column" description="A popup appears with Make/Miss options" />
              <Step number="3" title="Select 'Make'" description="The stat is recorded and score updates automatically" />
              <Step number="4" title="Verify in play log" description="Check the sidebar to confirm the play was recorded" />
            </SubSection>

            <SubSection title="Recording Rebounds">
              <p className="mb-3">When recording a rebound:</p>
              <Step number="1" title="Tap the REB column for the player" />
              <Step number="2" title="Select rebound type" description="Choose Offensive (O-REB) or Defensive (D-REB)" />
              <Step number="3" title="Confirm" description="Total rebounds auto-calculate" />
            </SubSection>

            <SubSection title="Quarter Management">
              <p>Use the quarter selector at the top to track which period you're in. Stats are saved per-quarter for detailed box scores.</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li><strong className="text-white">Advance Quarter</strong> - Tap the quarter indicator or use the Next Period button</li>
                <li><strong className="text-white">Go Back</strong> - You can return to previous quarters if needed</li>
                <li><strong className="text-white">Overtime</strong> - Additional periods are added automatically</li>
              </ul>
            </SubSection>

            <SubSection title="Substitutions">
              <p>Track which players are on the court:</p>
              <Step number="1" title="Tap a player's name" description="This toggles their active/bench status" />
              <Step number="2" title="Active players are highlighted" description="Makes it easy to see who's in the game" />
              <Step number="3" title="Stats are tracked for all players" description="Even benched players' previous stats are preserved" />
            </SubSection>

            <SubSection title="Ending the Game">
              <Step number="1" title="Tap 'End Game' when finished" />
              <Step number="2" title="Review the final stats" description="Make any last-minute corrections" />
              <Step number="3" title="Generate PDF box score" description="Download or share the official game summary" />
            </SubSection>
          </CollapsibleSection>

          {/* Football Guides */}
          <CollapsibleSection title="Football Stat-Keeping" sportIcon={SPORT_ICONS.football}>
            <SubSection title="Simple Mode vs Advanced Mode">
              <p className="mb-3">StatMoose offers two football stat-keeping modes:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-900 rounded-lg border border-orange-500/30">
                  <h5 className="font-bold text-orange-400 mb-2">Simple Mode</h5>
                  <ul className="text-sm space-y-1 text-zinc-400">
                    <li>• Quick score tracking</li>
                    <li>• Basic play logging</li>
                    <li>• Perfect for casual games</li>
                    <li>• One-tap touchdowns & field goals</li>
                  </ul>
                </div>
                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-700">
                  <h5 className="font-bold text-zinc-300 mb-2">Advanced Mode</h5>
                  <ul className="text-sm space-y-1 text-zinc-400">
                    <li>• Full play-by-play tracking</li>
                    <li>• Down & distance management</li>
                    <li>• Detailed player stats</li>
                    <li>• Penalty tracking</li>
                  </ul>
                </div>
              </div>
            </SubSection>

            <SubSection title="Simple Mode - Complete Guide">
              <p className="mb-3 text-orange-400 font-medium">Best for: Youth leagues, casual games, or when you just need score tracking</p>
              
              <h5 className="text-white font-semibold mt-4 mb-2">Interface Overview</h5>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 mb-4">
                <li><strong className="text-white">Scoreboard</strong> - Home and Away scores with team colors</li>
                <li><strong className="text-white">Game Clock</strong> - Optional, can be toggled on/off</li>
                <li><strong className="text-white">Quarter Indicator</strong> - Current period of play</li>
                <li><strong className="text-white">Scoring Buttons</strong> - Quick-tap scoring options</li>
                <li><strong className="text-white">Play Log</strong> - Record of all scoring plays</li>
              </ul>

              <h5 className="text-white font-semibold mt-4 mb-2">Recording a Touchdown</h5>
              <Step number="1" title="Select the scoring team" description="Tap 'Home' or 'Away' at the top" />
              <Step number="2" title="Tap 'Touchdown'" description="6 points are added automatically" />
              <Step number="3" title="Enter player number (optional)" description="Type the jersey number of who scored" />
              <Step number="4" title="Record the extra point" description="Choose PAT (1pt) or 2-point conversion" />
              <Step number="5" title="Verify in play log" description="The scoring play appears in the log" />

              <h5 className="text-white font-semibold mt-4 mb-2">Other Scoring Options</h5>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Field Goal (3 pts)</strong> - Tap FG, optionally enter kicker number</li>
                <li><strong className="text-white">Safety (2 pts)</strong> - Awarded to the defensive team</li>
                <li><strong className="text-white">PAT (1 pt)</strong> - Extra point after touchdown</li>
                <li><strong className="text-white">2-Point Conversion (2 pts)</strong> - Alternative to PAT</li>
              </ul>

              <h5 className="text-white font-semibold mt-4 mb-2">Using the Game Clock</h5>
              <Step number="1" title="Toggle clock on/off" description="Click the clock icon in the header" />
              <Step number="2" title="Start/Stop" description="Press SPACE or \\ (backslash) key" />
              <Step number="3" title="Adjust time manually" description="Click on the time display to edit" />
              <Step number="4" title="Change quarters" description="Use the quarter buttons to advance" />
            </SubSection>

            <SubSection title="Advanced Mode - Complete Guide">
              <p className="mb-3 text-orange-400 font-medium">Best for: High school, college, or any game needing detailed play-by-play stats</p>
              
              <h5 className="text-white font-semibold mt-4 mb-2">Interface Overview</h5>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 mb-4">
                <li><strong className="text-white">Field Visualization</strong> - Shows ball position and yard line</li>
                <li><strong className="text-white">Down & Distance</strong> - Current down and yards to go</li>
                <li><strong className="text-white">Possession Indicator</strong> - Which team has the ball</li>
                <li><strong className="text-white">Play Type Selector</strong> - Run, Pass, Punt, Kick, etc.</li>
                <li><strong className="text-white">Player Stats Panel</strong> - Individual player statistics</li>
              </ul>

              <h5 className="text-white font-semibold mt-4 mb-2">Starting a New Drive</h5>
              <Step number="1" title="Set possession" description="Select which team has the ball" />
              <Step number="2" title="Set starting position" description="Tap the field or enter yard line" />
              <Step number="3" title="Down resets to 1st & 10" description="Automatic when possession changes" />

              <h5 className="text-white font-semibold mt-4 mb-2">Recording a Run Play</h5>
              <Step number="1" title="Select 'Run'" description="From the play type menu" />
              <Step number="2" title="Choose the ball carrier" description="Select from your roster" />
              <Step number="3" title="Enter yards gained/lost" description="Positive for gain, negative for loss" />
              <Step number="4" title="Mark result" description="First down, tackle, fumble, or touchdown" />
              <Step number="5" title="Down & distance updates" description="Automatically calculated" />

              <h5 className="text-white font-semibold mt-4 mb-2">Recording a Pass Play</h5>
              <Step number="1" title="Select 'Pass'" description="From the play type menu" />
              <Step number="2" title="Choose the quarterback" description="Who threw the ball" />
              <Step number="3" title="Select result" description="Complete, Incomplete, or Interception" />
              <Step number="4" title="If complete: Choose receiver" description="Who caught the pass" />
              <Step number="5" title="Enter yards gained" description="From line of scrimmage" />
              <Step number="6" title="Mark additional outcome" description="Tackle, TD, fumble, etc." />

              <h5 className="text-white font-semibold mt-4 mb-2">Recording Penalties</h5>
              <Step number="1" title="Tap 'Penalty'" description="Opens the penalty workflow" />
              <Step number="2" title="Select team" description="Offense or Defense" />
              <Step number="3" title="Choose penalty type" description="Holding, False Start, PI, etc." />
              <Step number="4" title="Enter yards" description="5, 10, 15, or spot foul" />
              <Step number="5" title="Accept/Decline" description="Apply or decline the penalty" />

              <h5 className="text-white font-semibold mt-4 mb-2">Special Teams</h5>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Punt</strong> - Select punter, enter distance, mark return yards</li>
                <li><strong className="text-white">Kickoff</strong> - Track kicker, distance, and return</li>
                <li><strong className="text-white">Field Goal Attempt</strong> - Select kicker, mark good/no good</li>
              </ul>
            </SubSection>

            <SubSection title="Keyboard Shortcuts (Both Modes)">
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-zinc-900 p-2 rounded text-center">
                  <span className="text-orange-400 font-mono">SPACE</span>
                  <p className="text-xs text-zinc-400">Start/Stop Clock</p>
                </div>
                <div className="bg-zinc-900 p-2 rounded text-center">
                  <span className="text-orange-400 font-mono">\\</span>
                  <p className="text-xs text-zinc-400">Start/Stop Clock</p>
                </div>
                <div className="bg-zinc-900 p-2 rounded text-center">
                  <span className="text-orange-400 font-mono">Ctrl+Z</span>
                  <p className="text-xs text-zinc-400">Undo Last Action</p>
                </div>
                <div className="bg-zinc-900 p-2 rounded text-center">
                  <span className="text-orange-400 font-mono">Ctrl+Y</span>
                  <p className="text-xs text-zinc-400">Redo Action</p>
                </div>
              </div>
            </SubSection>
          </CollapsibleSection>

          {/* Baseball Guides */}
          <CollapsibleSection title="Baseball Stat-Keeping" sportIcon={SPORT_ICONS.baseball}>
            <SubSection title="Setting Up Your Game">
              <Step number="1" title="Create Teams" description="Add your team and the opponent with full rosters" />
              <Step number="2" title="Set Batting Order" description="Drag players into your preferred batting order" />
              <Step number="3" title="Assign Defensive Positions" description="Place players on the diamond" />
            </SubSection>

            <SubSection title="Understanding the Interface">
              <p className="mb-3">The baseball stat-keeping screen shows:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-white">Scoreboard</strong> - Inning-by-inning score, runs, hits, errors</li>
                <li><strong className="text-white">Diamond View</strong> - Visual display of base runners</li>
                <li><strong className="text-white">Current Batter</strong> - Active batter and their count</li>
                <li><strong className="text-white">Outs Counter</strong> - Current number of outs</li>
                <li><strong className="text-white">Lineup Card</strong> - Batting order with quick stats</li>
              </ul>
            </SubSection>

            <SubSection title="Recording At-Bats - Step by Step">
              <p className="mb-3">When a batter comes up:</p>
              <Step number="1" title="Batter appears automatically" description="Based on your batting order" />
              <Step number="2" title="Wait for the at-bat result" description="Watch the play unfold" />
              <Step number="3" title="Tap the appropriate outcome" description="Choose from hits, outs, or walks" />
              <Step number="4" title="Select specific type" description="e.g., Single, Double, Groundout, etc." />
              <Step number="5" title="Advance runners if needed" description="Tap runners on the diamond" />
            </SubSection>

            <SubSection title="Hit Types">
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Single (1B)</strong> - Batter reaches first base on a hit</li>
                <li><strong className="text-white">Double (2B)</strong> - Batter reaches second base on a hit</li>
                <li><strong className="text-white">Triple (3B)</strong> - Batter reaches third base on a hit</li>
                <li><strong className="text-white">Home Run (HR)</strong> - Batter scores on a hit</li>
              </ul>
            </SubSection>

            <SubSection title="Out Types">
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Strikeout (K)</strong> - Three strikes</li>
                <li><strong className="text-white">Groundout</strong> - Ball hit on ground, batter thrown out</li>
                <li><strong className="text-white">Flyout</strong> - Ball caught in the air (outfield)</li>
                <li><strong className="text-white">Lineout</strong> - Line drive caught</li>
                <li><strong className="text-white">Pop Out</strong> - Pop fly caught (infield)</li>
              </ul>
            </SubSection>

            <SubSection title="Walks & Other">
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Walk (BB)</strong> - Four balls, batter takes first</li>
                <li><strong className="text-white">Hit By Pitch (HBP)</strong> - Batter hit by pitch, takes first</li>
                <li><strong className="text-white">Sacrifice Fly</strong> - Out that scores a runner</li>
                <li><strong className="text-white">Sacrifice Bunt</strong> - Bunt that advances a runner</li>
                <li><strong className="text-white">Fielder's Choice</strong> - Out recorded elsewhere</li>
                <li><strong className="text-white">Error</strong> - Reached base due to defensive error</li>
              </ul>
            </SubSection>

            <SubSection title="Base Running">
              <p>Tap runners on the diamond to manage base movement:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li><strong className="text-white">Advance</strong> - Tap a runner, then tap the next base</li>
                <li><strong className="text-white">Stolen Base</strong> - Mark as steal attempt</li>
                <li><strong className="text-white">Caught Stealing</strong> - Runner tagged out</li>
                <li><strong className="text-white">Score</strong> - Tap home plate to score the runner</li>
                <li><strong className="text-white">Picked Off</strong> - Runner tagged out on pickoff</li>
              </ul>
            </SubSection>

            <SubSection title="RBI Tracking">
              <p>Runs Batted In are automatically calculated when:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li>A hit scores a runner</li>
                <li>A sacrifice fly scores a runner</li>
                <li>A walk with bases loaded</li>
              </ul>
              <p className="mt-2 text-zinc-500 italic">Note: Errors and wild pitches don't count as RBIs</p>
            </SubSection>

            <SubSection title="Pitching Stats">
              <p>Pitching stats are automatically tracked:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li><strong className="text-white">IP</strong> - Innings Pitched (tracks outs)</li>
                <li><strong className="text-white">K</strong> - Strikeouts</li>
                <li><strong className="text-white">BB</strong> - Walks allowed</li>
                <li><strong className="text-white">H</strong> - Hits allowed</li>
                <li><strong className="text-white">R</strong> - Runs allowed</li>
                <li><strong className="text-white">ER</strong> - Earned Runs (excludes errors)</li>
              </ul>
            </SubSection>

            <SubSection title="Changing Pitchers">
              <Step number="1" title="Tap 'Change Pitcher'" description="In the pitching controls area" />
              <Step number="2" title="Select the new pitcher" description="From your roster" />
              <Step number="3" title="Previous pitcher's stats are saved" description="IP, K, BB, etc. are preserved" />
            </SubSection>

            <SubSection title="Inning Management">
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Half-inning ends</strong> - After 3 outs, automatically advances</li>
                <li><strong className="text-white">Top/Bottom</strong> - Visitors bat top, home bats bottom</li>
                <li><strong className="text-white">Extra Innings</strong> - Game continues past 9 if tied</li>
              </ul>
            </SubSection>

            <SubSection title="Box Score & Stats">
              <p>At any time, you can view:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li>Full batting statistics for each player</li>
                <li>Pitching lines for all pitchers used</li>
                <li>Inning-by-inning score breakdown</li>
                <li>Team totals (R, H, E, LOB)</li>
              </ul>
            </SubSection>
          </CollapsibleSection>
        </section>

        {/* ========== FEATURES SECTION ========== */}
        <section id="features" className="mb-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl font-bold">Features</h2>
          </div>
          <p className="text-zinc-400 mb-6">
            Discover all the powerful tools StatMoose offers to manage your teams and games.
          </p>

          {/* Team Management */}
          <CollapsibleSection title="Team Creation & Management" icon={Users}>
            <SubSection title="Creating a New Team">
              <Step number="1" title="Navigate to Dashboard" description="Click 'New Team' button" />
              <Step number="2" title="Enter Team Details" description="Name, sport, colors, and logo (optional)" />
              <Step number="3" title="Add Players" description="Build your roster with player info" />
            </SubSection>

            <SubSection title="Team Colors">
              <p>Choose primary and secondary colors for your team. These colors appear on:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li>Live stat displays</li>
                <li>Scoreboards</li>
                <li>PDF box scores</li>
                <li>Embedded widgets</li>
              </ul>
            </SubSection>
          </CollapsibleSection>

          {/* Roster Management */}
          <CollapsibleSection title="Roster Management" icon={Users}>
            <SubSection title="Adding Players">
              <p>For each player, you can enter:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li><strong className="text-white">Number</strong> - Jersey number</li>
                <li><strong className="text-white">Name</strong> - Full name or nickname</li>
                <li><strong className="text-white">Position</strong> - Primary position</li>
                <li><strong className="text-white">Year/Grade</strong> - For school teams</li>
              </ul>
            </SubSection>

            <SubSection title="Quick Add During Games">
              <p>Forgot to add a player? No problem! In Simple Football mode, entering an unknown jersey number will prompt you to add them on the fly.</p>
            </SubSection>

            <SubSection title="Roster Import (Coming Soon)">
              <p className="text-zinc-500 italic">CSV import functionality will allow bulk roster uploads.</p>
            </SubSection>
          </CollapsibleSection>

          {/* Live Sharing */}
          <CollapsibleSection title="Live Stats Sharing" icon={Share2}>
            <SubSection title="Share Link">
              <p>Every game gets a unique shareable link. Send it to parents, fans, or post on social media for real-time score updates.</p>
            </SubSection>

            <SubSection title="Embed Widget">
              <p>Silver and Gold tier users can embed live stats directly on their website:</p>
              <Step number="1" title="Click 'Embed' during a game" />
              <Step number="2" title="Choose your widget size" />
              <Step number="3" title="Copy the HTML code" />
              <Step number="4" title="Paste into your website" />
            </SubSection>

          </CollapsibleSection>

          {/* PDF Box Scores */}
          <CollapsibleSection title="PDF Box Scores" icon={FileText}>
            <SubSection title="Generating Box Scores">
              <p>After a game, generate professional PDF box scores with:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li>Complete player statistics</li>
                <li>Team totals and shooting percentages</li>
                <li>Quarter-by-quarter scoring</li>
                <li>Play-by-play summary</li>
              </ul>
            </SubSection>

            <SubSection title="Customization">
              <p>Box scores include your team colors and can be customized with:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li>Team logos (Gold tier)</li>
                <li>Sponsor branding (Silver+ tiers)</li>
                <li>Custom headers</li>
              </ul>
            </SubSection>
          </CollapsibleSection>

          {/* Game Clock */}
          <CollapsibleSection title="Game Clock Controls" icon={Clock}>
            <SubSection title="Clock Features">
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Start/Stop</strong> - Tap the clock or use keyboard shortcuts</li>
                <li><strong className="text-white">Adjust Time</strong> - Click to manually edit the time</li>
                <li><strong className="text-white">Period Management</strong> - Auto-advances quarters/halves</li>
                <li><strong className="text-white">Overtime</strong> - Supports unlimited OT periods</li>
              </ul>
            </SubSection>

            <SubSection title="Optional Clock (Football Simple Mode)">
              <p>Don't need the clock? Toggle it off with the clock button in the header. Perfect for untimed scrimmages.</p>
            </SubSection>
          </CollapsibleSection>

          {/* Undo/Redo */}
          <CollapsibleSection title="Undo & Redo" icon={Undo2}>
            <SubSection title="How It Works">
              <p>Made a mistake? Every stat entry can be undone:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li><strong className="text-white">Undo</strong> - Reverts the last action (orange button)</li>
                <li><strong className="text-white">Redo</strong> - Restores an undone action (green button)</li>
              </ul>
            </SubSection>

            <SubSection title="History Depth">
              <p>StatMoose keeps up to 20 actions in memory, so you can undo multiple plays if needed.</p>
            </SubSection>
          </CollapsibleSection>

          {/* Sponsor Banners */}
          <CollapsibleSection title="Sponsor Banners" icon={BarChart3}>
            <SubSection title="Adding Sponsors">
              <p>Display sponsor logos on your live stats page (Silver: 5 slots, Gold: unlimited):</p>
              <Step number="1" title="Go to Team Settings" />
              <Step number="2" title="Click 'Manage Sponsors'" />
              <Step number="3" title="Upload logo and add click-through URL" />
            </SubSection>

            <SubSection title="Banner Rotation">
              <p>Multiple sponsors rotate automatically on the live stats display, giving each sponsor visibility.</p>
            </SubSection>
          </CollapsibleSection>
        </section>

        {/* ========== TIPS SECTION ========== */}
        <section id="tips" className="mb-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl font-bold">Tips & Tricks</h2>
          </div>
          <p className="text-zinc-400 mb-6">
            Pro tips to help you get the most out of StatMoose.
          </p>

          <div className="space-y-4">
            <Tip 
              icon={Keyboard}
              title="Keyboard Shortcuts"
              description="Press SPACE or BACKSLASH (\) to start/stop the game clock instantly. Works in both Simple and Advanced football modes!"
            />

            <Tip 
              icon={Smartphone}
              title="Best Device for Stat-Keeping"
              description="A tablet (iPad, Android tablet) is ideal for sideline use. The larger screen makes tapping stats easier and faster than a phone."
            />

            <Tip 
              icon={Monitor}
              title="Two-Screen Setup"
              description="Use one device to keep stats and another to display the live stats page on a TV or projector for the crowd!"
            />

            <Tip 
              icon={Zap}
              title="Quick Substitutions"
              description="In basketball, tap a player's name to quickly sub them in or out. Active players are highlighted."
            />

            <Tip 
              icon={Download}
              title="Export After Every Game"
              description="Download your PDF box score immediately after each game. It's your permanent record!"
            />

            <Tip 
              icon={Settings}
              title="Pre-Game Setup Saves Time"
              description="Enter your roster and batting order BEFORE game day. During the game, you'll only need to record the action."
            />

            <Tip 
              icon={Shield}
              title="Demo Mode for Practice"
              description="Try the demo mode (no account required) to practice stat-keeping before your first real game."
            />

            <Tip 
              icon={Calendar}
              title="Season Organization"
              description="Create separate seasons to keep your games organized. Clone seasons to quickly set up next year!"
            />

            <Tip 
              icon={Play}
              title="Play-by-Play is Your Friend"
              description="The play-by-play log helps you catch errors. Review it periodically during breaks to ensure accuracy."
            />

            <Tip 
              icon={Users}
              title="Multiple Stat Keepers"
              description="Gold tier allows shared access - have one person track offense and another track defense!"
            />
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center py-12 border-t border-zinc-800">
          <img 
            src={MARTY_IMAGE} 
            alt="Marty" 
            className="w-24 h-24 mx-auto mb-4 object-contain opacity-80"
          />
          <h3 className="text-xl font-bold mb-2">Still have questions?</h3>
          <p className="text-zinc-400 mb-6">
            We're here to help! Reach out anytime.
          </p>
          <Button
            onClick={() => navigate("/contact")}
            className="bg-orange-500 hover:bg-orange-400 text-black font-bold"
          >
            Contact Support
          </Button>
        </section>
      </main>
    </div>
  );
}

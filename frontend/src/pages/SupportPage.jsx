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
              onClick={() => scrollToSection('guides')}
              className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-6 py-3"
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

            <SubSection title="Quarter Management">
              <p>Use the quarter selector at the top to track which period you're in. Stats are saved per-quarter for detailed box scores.</p>
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

            <SubSection title="Simple Mode Guide">
              <Step number="1" title="Select the scoring team" description="Tap Home or Away at the top" />
              <Step number="2" title="Choose the score type" description="Touchdown (6), Field Goal (3), Safety (2), etc." />
              <Step number="3" title="Add player details (optional)" description="Enter who scored for detailed stats" />
              <Step number="4" title="Manage the clock" description="Press SPACE or \ to start/stop the game clock" />
            </SubSection>

            <SubSection title="Advanced Mode Guide">
              <Step number="1" title="Set initial possession" description="Choose which team starts with the ball" />
              <Step number="2" title="Track each play" description="Select play type: Run, Pass, Punt, Kick, etc." />
              <Step number="3" title="Enter yardage" description="Use the field view to mark ball position" />
              <Step number="4" title="Record player involvement" description="Who carried, threw, caught, or tackled" />
              <Step number="5" title="Handle penalties" description="Use the penalty workflow for detailed tracking" />
            </SubSection>
          </CollapsibleSection>

          {/* Baseball Guides */}
          <CollapsibleSection title="Baseball Stat-Keeping" sportIcon={SPORT_ICONS.baseball}>
            <SubSection title="Setting Up Your Game">
              <Step number="1" title="Create Teams" description="Add your team and the opponent with full rosters" />
              <Step number="2" title="Set Batting Order" description="Drag players into your preferred batting order" />
              <Step number="3" title="Assign Defensive Positions" description="Place players on the diamond" />
            </SubSection>

            <SubSection title="Recording At-Bats">
              <p className="mb-3">When a batter comes up, you can record:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong className="text-white">Hits</strong> - Single, Double, Triple, Home Run</li>
                <li><strong className="text-white">Outs</strong> - Strikeout, Groundout, Flyout, Lineout</li>
                <li><strong className="text-white">Walks</strong> - BB (Base on Balls), HBP (Hit by Pitch)</li>
                <li><strong className="text-white">Sacrifices</strong> - Sac Fly, Sac Bunt</li>
                <li><strong className="text-white">Errors</strong> - Reached on Error</li>
              </ul>
            </SubSection>

            <SubSection title="Base Running">
              <p>Tap runners on the diamond to advance them. The system tracks:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li>Stolen bases and caught stealing</li>
                <li>Runs scored and RBIs</li>
                <li>Runner advancement on hits</li>
              </ul>
            </SubSection>

            <SubSection title="Pitching Stats">
              <p>Pitching stats are auto-calculated:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li><strong className="text-white">IP</strong> - Innings Pitched</li>
                <li><strong className="text-white">K</strong> - Strikeouts</li>
                <li><strong className="text-white">BB</strong> - Walks allowed</li>
                <li><strong className="text-white">H</strong> - Hits allowed</li>
                <li><strong className="text-white">ER</strong> - Earned Runs</li>
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

            <SubSection title="QR Codes">
              <p>Generate a QR code for your live stats page - perfect for displaying at the game venue!</p>
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

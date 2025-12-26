import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Clock, 
  Play, 
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Share2,
  TrendingUp
} from "lucide-react";
import PenaltyWorkflowDialog from "@/components/PenaltyWorkflowDialog";
import { RULESETS } from "@/data/penaltyCatalog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Football Field Component with StatMoose logo
function FootballField({ ballPosition, possession, homeTeam, awayTeam, homeColor, awayColor, firstDownMarker }) {
  // ballPosition: 0-100 (0 = home endzone, 100 = away endzone)
  // Convert to yard line (0-50-0)
  const getYardLine = (pos) => {
    if (pos <= 50) return pos;
    return 100 - pos;
  };
  
  const yardLine = getYardLine(ballPosition);
  const isHomeSide = ballPosition <= 50;
  
  return (
    <div className="relative w-full h-48 bg-gradient-to-b from-green-900 to-green-800 rounded-lg overflow-hidden border-4 border-white/20">
      {/* End zones */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-[10%] flex items-center justify-center"
        style={{ backgroundColor: `${homeColor}90` }}
      >
        <span className="text-white/60 font-bold text-xs rotate-[-90deg] whitespace-nowrap">
          {homeTeam?.substring(0, 10)}
        </span>
      </div>
      <div 
        className="absolute right-0 top-0 bottom-0 w-[10%] flex items-center justify-center"
        style={{ backgroundColor: `${awayColor}90` }}
      >
        <span className="text-white/60 font-bold text-xs rotate-90 whitespace-nowrap">
          {awayTeam?.substring(0, 10)}
        </span>
      </div>
      
      {/* Field markings */}
      <div className="absolute left-[10%] right-[10%] top-0 bottom-0">
        {/* Yard lines every 10 yards */}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((yard) => (
          <div
            key={yard}
            className="absolute top-0 bottom-0 w-px bg-white/30"
            style={{ left: `${(yard / 100) * 100}%` }}
          >
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-bold">
              {yard <= 50 ? yard : 100 - yard}
            </span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-bold">
              {yard <= 50 ? yard : 100 - yard}
            </span>
          </div>
        ))}
        
        {/* Hash marks */}
        <div className="absolute left-0 right-0 top-[30%] h-px bg-white/20" />
        <div className="absolute left-0 right-0 top-[70%] h-px bg-white/20" />
        
        {/* StatMoose Logo at 50-yard line - faded */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
          <img 
            src="/logo-white.png" 
            alt="" 
            className="w-24 h-24 object-contain"
          />
        </div>
        
        {/* Ball marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
          style={{ left: `${ballPosition}%` }}
        >
          <div className="relative">
            {/* Ball */}
            <div className="w-6 h-4 bg-amber-700 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-px bg-white/60" />
              </div>
            </div>
            {/* Possession indicator */}
            <div 
              className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white"
              style={{ backgroundColor: possession === 'home' ? homeColor : awayColor }}
            >
              {possession === 'home' ? homeTeam?.substring(0, 3).toUpperCase() : awayTeam?.substring(0, 3).toUpperCase()}
            </div>
          </div>
        </div>
        
        {/* First down marker - using actual firstDownMarker state */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-yellow-400/70"
          style={{ left: `${Math.max(0, Math.min(100, firstDownMarker))}%` }}
        />
      </div>
      
      {/* Goal lines */}
      <div className="absolute left-[10%] top-0 bottom-0 w-1 bg-white/60" />
      <div className="absolute right-[10%] top-0 bottom-0 w-1 bg-white/60" />
    </div>
  );
}

// Kickoff Selection Dialog
function KickoffDialog({ open, homeTeam, awayTeam, homeColor, awayColor, onSelect }) {
  return (
    <Dialog open={open}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">KICKOFF</DialogTitle>
          <DialogDescription className="text-zinc-400 text-center">
            Which team kicks off first?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Button
            onClick={() => onSelect('home')}
            className="h-24 text-lg font-bold"
            style={{ backgroundColor: homeColor }}
          >
            {homeTeam}
          </Button>
          <Button
            onClick={() => onSelect('away')}
            className="h-24 text-lg font-bold"
            style={{ backgroundColor: awayColor }}
          >
            {awayTeam}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Player Selection Component
function PlayerSelector({ label, roster, selectedNumber, onSelect, teamColor }) {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue) {
      const num = parseInt(inputValue);
      if (!isNaN(num)) {
        onSelect(num);
        setInputValue('');
      }
    }
  };
  
  return (
    <div className="space-y-3">
      <label className="text-sm text-zinc-400 uppercase tracking-wide">{label}</label>
      
      {/* Number Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
          onKeyPress={handleKeyPress}
          placeholder="Enter #"
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-blue-500"
        />
        <Button
          onClick={() => {
            const num = parseInt(inputValue);
            if (!isNaN(num)) {
              onSelect(num);
              setInputValue('');
            }
          }}
          disabled={!inputValue}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Select
        </Button>
      </div>
      
      {/* Roster Grid */}
      {roster && roster.length > 0 && (
        <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
          {roster.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelect(player.number)}
              className={`py-1 px-2 rounded text-sm font-bold transition-all ${
                selectedNumber === player.number
                  ? 'text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
              style={selectedNumber === player.number ? { backgroundColor: teamColor } : {}}
              title={player.name}
            >
              #{player.number}
            </button>
          ))}
        </div>
      )}
      
      {/* Selected Player Display */}
      {selectedNumber && (
        <div 
          className="text-center py-2 rounded font-bold"
          style={{ backgroundColor: `${teamColor}40`, color: teamColor }}
        >
          #{selectedNumber} Selected
        </div>
      )}
    </div>
  );
}

// Yard Line Selector Component
function YardLineSelector({ label, value, onChange, direction = 'left', maxYards = 50, showSide = false }) {
  const presets = maxYards === 100 
    ? [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99] 
    : [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  
  // For 100-yard selector, show which side of field
  const getYardLineDisplay = (val) => {
    if (maxYards !== 100 || !showSide) return val;
    if (val === 50) return "50";
    if (val < 50) return `Own ${val}`;
    return `Opp ${100 - val}`;
  };
  
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-400 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.max(0, value - 5))}
        >
          -5
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          -1
        </Button>
        <div className="flex-1 text-center">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(maxYards, parseInt(e.target.value) || 0)))}
            className="w-20 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-blue-500"
          />
          <div className="text-xs text-zinc-500 mt-1">
            {showSide ? getYardLineDisplay(value) : "Yard Line"}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.min(maxYards, value + 1))}
        >
          +1
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.min(maxYards, value + 5))}
        >
          +5
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((yard) => (
          <button
            key={yard}
            onClick={() => onChange(yard)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              value === yard
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            {yard}
          </button>
        ))}
      </div>
    </div>
  );
}

// Kickoff Workflow Dialog
function KickoffWorkflowDialog({ 
  open, 
  step, 
  kickingTeam,
  receivingTeam,
  kickingTeamName,
  receivingTeamName,
  kickingTeamColor,
  receivingTeamColor,
  kickingRoster,
  receivingRoster,
  kickoffData,
  setKickoffData,
  onBack,
  onNext,
  onComplete
}) {
  const [customYardLine, setCustomYardLine] = useState(35);
  
  // Step 1: Select kickoff yard line and direction
  if (step === 1) {
    return (
      <Dialog open={open}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">KICKOFF SETUP</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              {kickingTeamName} kicking to {receivingTeamName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Kickoff Yard Line */}
            <div>
              <label className="text-sm text-zinc-400 uppercase tracking-wide mb-3 block">
                Kickoff From
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, kickoffYardLine: 35 }))}
                  className={`flex-1 h-16 text-lg font-bold ${
                    kickoffData.kickoffYardLine === 35 ? '' : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                  style={kickoffData.kickoffYardLine === 35 ? { backgroundColor: kickingTeamColor } : {}}
                >
                  35 Yard Line
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, kickoffYardLine: 40 }))}
                  className={`flex-1 h-16 text-lg font-bold ${
                    kickoffData.kickoffYardLine === 40 ? '' : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                  style={kickoffData.kickoffYardLine === 40 ? { backgroundColor: kickingTeamColor } : {}}
                >
                  40 Yard Line
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, kickoffYardLine: customYardLine, isCustom: true }))}
                  className={`flex-1 h-16 text-lg font-bold ${
                    kickoffData.isCustom ? '' : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                  style={kickoffData.isCustom ? { backgroundColor: kickingTeamColor } : {}}
                >
                  Custom
                </Button>
              </div>
              
              {kickoffData.isCustom && (
                <div className="mt-3 flex items-center justify-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    onClick={() => {
                      const newVal = Math.max(1, customYardLine - 5);
                      setCustomYardLine(newVal);
                      setKickoffData(prev => ({ ...prev, kickoffYardLine: newVal }));
                    }}
                  >
                    -5
                  </Button>
                  <input
                    type="number"
                    value={customYardLine}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 35));
                      setCustomYardLine(val);
                      setKickoffData(prev => ({ ...prev, kickoffYardLine: val }));
                    }}
                    className="w-20 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    onClick={() => {
                      const newVal = Math.min(50, customYardLine + 5);
                      setCustomYardLine(newVal);
                      setKickoffData(prev => ({ ...prev, kickoffYardLine: newVal }));
                    }}
                  >
                    +5
                  </Button>
                </div>
              )}
            </div>
            
            {/* Direction */}
            <div>
              <label className="text-sm text-zinc-400 uppercase tracking-wide mb-3 block">
                Kicking Direction
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, direction: 'left' }))}
                  className={`flex-1 h-12 font-bold ${
                    kickoffData.direction === 'left' ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                >
                  ← Left (to {receivingTeamName})
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, direction: 'right' }))}
                  className={`flex-1 h-12 font-bold ${
                    kickoffData.direction === 'right' ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                >
                  Right (to {receivingTeamName}) →
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button
              onClick={onNext}
              disabled={!kickoffData.kickoffYardLine || !kickoffData.direction}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              Next →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Step 2: Select Kicker
  if (step === 2) {
    return (
      <Dialog open={open}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">SELECT KICKER</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              {kickingTeamName} - Kickoff from {kickoffData.kickoffYardLine} yard line
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <PlayerSelector
              label="Kicker"
              roster={kickingRoster}
              selectedNumber={kickoffData.kickerNumber}
              onSelect={(num) => setKickoffData(prev => ({ ...prev, kickerNumber: num }))}
              teamColor={kickingTeamColor}
            />
          </div>
          
          <div className="flex justify-between gap-2 mt-6">
            <Button variant="outline" onClick={onBack} className="border-zinc-600">
              ← Back
            </Button>
            <Button
              onClick={onNext}
              disabled={!kickoffData.kickerNumber}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              Next →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Step 3: Select Returner
  if (step === 3) {
    return (
      <Dialog open={open}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">SELECT RETURNER</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              {receivingTeamName} - Who will return the kick?
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <PlayerSelector
              label="Kick Returner"
              roster={receivingRoster}
              selectedNumber={kickoffData.returnerNumber}
              onSelect={(num) => setKickoffData(prev => ({ ...prev, returnerNumber: num }))}
              teamColor={receivingTeamColor}
            />
          </div>
          
          <div className="flex justify-between gap-2 mt-6">
            <Button variant="outline" onClick={onBack} className="border-zinc-600">
              ← Back
            </Button>
            <Button
              onClick={onNext}
              disabled={!kickoffData.returnerNumber}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              Next →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Step 4: Return Details - fielded at FIRST, then result
  if (step === 4) {
    return (
      <Dialog open={open}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">RETURN DETAILS</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              #{kickoffData.returnerNumber} fielding the kick
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Fielded At - FIRST */}
            <YardLineSelector
              label="Fielded At (Yard Line)"
              value={kickoffData.fieldedAt || 5}
              onChange={(val) => setKickoffData(prev => ({ ...prev, fieldedAt: val }))}
            />
            
            {/* Return Result */}
            <div>
              <label className="text-sm text-zinc-400 uppercase tracking-wide mb-2 block">
                Return Result
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: null }))}
                  className={`${!kickoffData.specialResult ? 'bg-orange-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Return
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'touchback', returnedTo: 25 }))}
                  className={`${kickoffData.specialResult === 'touchback' ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Touchback
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'fair_catch', returnedTo: prev.fieldedAt }))}
                  className={`${kickoffData.specialResult === 'fair_catch' ? 'bg-yellow-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Fair Catch
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'out_of_bounds', returnedTo: 40 }))}
                  className={`${kickoffData.specialResult === 'out_of_bounds' ? 'bg-purple-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Out of Bounds
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'touchdown', returnedTo: 100 }))}
                  className={`${kickoffData.specialResult === 'touchdown' ? 'bg-green-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Touchdown
                </Button>
              </div>
            </div>
            
            {/* Returned To - Only show for regular return - use full 100 yard scale */}
            {!kickoffData.specialResult && (
              <>
                <YardLineSelector
                  label="Returned To (Full Field - 0 to 100)"
                  value={kickoffData.returnedTo || 25}
                  onChange={(val) => setKickoffData(prev => ({ ...prev, returnedTo: val }))}
                  maxYards={100}
                  showSide={true}
                />
                {/* Show calculated return yards */}
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-zinc-400 uppercase">Return Yards</div>
                  <div className="text-2xl font-bold text-green-400">
                    {Math.abs((kickoffData.returnedTo || 25) - (kickoffData.fieldedAt || 5))} yards
                  </div>
                  <div className="text-xs text-zinc-500">
                    (From {kickoffData.fieldedAt || 5} to {kickoffData.returnedTo || 25})
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex justify-between gap-2 mt-6">
            <Button variant="outline" onClick={onBack} className="border-zinc-600">
              ← Back
            </Button>
            <Button
              onClick={onNext}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              Next →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Step 5: Select Tackler
  if (step === 5) {
    return (
      <Dialog open={open}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">SELECT TACKLER</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              {kickingTeamName} - Who made the tackle?
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <Button
              onClick={() => setKickoffData(prev => ({ ...prev, tacklerNumber: null, noTackle: true }))}
              className={`w-full h-12 ${kickoffData.noTackle ? 'bg-zinc-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
            >
              No Tackle / Not Recorded
            </Button>
            
            <div className="text-center text-zinc-500 text-sm">— or select tackler —</div>
            
            <PlayerSelector
              label="Tackler"
              roster={kickingRoster}
              selectedNumber={kickoffData.tacklerNumber}
              onSelect={(num) => setKickoffData(prev => ({ ...prev, tacklerNumber: num, noTackle: false }))}
              teamColor={kickingTeamColor}
            />
          </div>
          
          <div className="flex justify-between gap-2 mt-6">
            <Button variant="outline" onClick={onBack} className="border-zinc-600">
              ← Back
            </Button>
            <Button
              onClick={onComplete}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              Complete Kickoff ✓
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return null;
}

// Play type buttons
const PLAY_TYPES = [
  { id: 'run', label: 'Run', color: 'bg-green-600' },
  { id: 'pass', label: 'Pass', color: 'bg-blue-600' },
  { id: 'punt', label: 'Punt', color: 'bg-purple-600' },
  { id: 'kickoff', label: 'Kickoff', color: 'bg-orange-600' },
  { id: 'field_goal', label: 'Field Goal', color: 'bg-yellow-600' },
  { id: 'extra_point', label: 'Extra Pt', color: 'bg-yellow-700' },
  { id: 'penalty', label: 'Penalty', color: 'bg-red-600' },
  { id: 'other', label: 'Other', color: 'bg-zinc-600' },
];

// Play result buttons
const PLAY_RESULTS = {
  run: [
    { id: 'gain', label: 'Gain' },
    { id: 'no_gain', label: 'No Gain' },
    { id: 'loss', label: 'Loss' },
    { id: 'first_down', label: '1st Down' },
    { id: 'touchdown', label: 'Touchdown' },
    { id: 'fumble_rec', label: 'Fumble/Rec' },
    { id: 'fumble_lost', label: 'Fumble/Lost' },
    { id: 'safety', label: 'Safety' },
  ],
  pass: [
    { id: 'complete', label: 'Complete' },
    { id: 'incomplete', label: 'Incomplete' },
    { id: 'first_down', label: '1st Down' },
    { id: 'touchdown', label: 'Touchdown' },
    { id: 'sacked', label: 'Sacked' },
    { id: 'intercepted', label: 'Intercepted' },
    { id: 'dropped', label: 'Dropped' },
    { id: 'broken_up', label: 'Broken Up' },
  ],
  punt: [
    { id: 'punted', label: 'Punted' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'touchback', label: 'Touchback' },
    { id: 'fair_catch', label: 'Fair Catch' },
    { id: 'returned', label: 'Returned' },
    { id: 'muffed', label: 'Muffed' },
  ],
  kickoff: [
    { id: 'touchback', label: 'Touchback' },
    { id: 'returned', label: 'Returned' },
    { id: 'onside_rec', label: 'Onside Rec' },
    { id: 'onside_lost', label: 'Onside Lost' },
    { id: 'out_of_bounds', label: 'Out of Bounds' },
  ],
  field_goal: [
    { id: 'good', label: 'Good' },
    { id: 'no_good', label: 'No Good' },
    { id: 'blocked', label: 'Blocked' },
  ],
  extra_point: [
    { id: 'good', label: 'Good' },
    { id: 'no_good', label: 'No Good' },
    { id: 'two_point_good', label: '2PT Good' },
    { id: 'two_point_no_good', label: '2PT No Good' },
  ],
  penalty: [
    { id: 'offense', label: 'On Offense' },
    { id: 'defense', label: 'On Defense' },
    { id: 'declined', label: 'Declined' },
    { id: 'offsetting', label: 'Offsetting' },
  ],
  other: [
    { id: 'timeout', label: 'Timeout' },
    { id: 'challenge', label: 'Challenge' },
    { id: 'injury', label: 'Injury' },
    { id: 'delay', label: 'Delay' },
  ],
};

export default function FootballLiveGame({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Game state
  const [game, setGame] = useState(null);
  const [homeRoster, setHomeRoster] = useState([]);
  const [awayRoster, setAwayRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Kickoff workflow state
  const [showKickoffTeamDialog, setShowKickoffTeamDialog] = useState(false);
  const [showKickoffWorkflow, setShowKickoffWorkflow] = useState(false);
  const [kickoffStep, setKickoffStep] = useState(1);
  const [kickingTeam, setKickingTeam] = useState(null);
  const [kickoffData, setKickoffData] = useState({
    kickoffYardLine: 35,
    direction: null,
    isCustom: false,
    kickerNumber: null,
    returnerNumber: null,
    fieldedAt: 5,
    returnedTo: 25,
    specialResult: null,
    tacklerNumber: null,
    noTackle: false,
  });
  
  // Play state
  const [possession, setPossession] = useState('home'); // 'home' or 'away'
  const [ballPosition, setBallPosition] = useState(25); // 0-100 (yard position on field)
  const [down, setDown] = useState(1);
  const [distance, setDistance] = useState(10);
  const [quarter, setQuarter] = useState(1);
  const [firstDownMarker, setFirstDownMarker] = useState(35); // Ball position needed for first down
  
  // Current Drive tracking - includes time of possession
  const [currentDrive, setCurrentDrive] = useState({
    startTime: null,
    startQuarter: 1,
    startPosition: 25,
    plays: 0,
    yards: 0,
    team: 'home',
    elapsedTime: 0 // Track elapsed time for accurate TOP
  });
  
  // Time of possession tracking (total for the game)
  const [homeTimeOfPossession, setHomeTimeOfPossession] = useState(0); // in seconds
  const [awayTimeOfPossession, setAwayTimeOfPossession] = useState(0); // in seconds
  
  // Game control dialogs
  const [showSpotBallDialog, setShowSpotBallDialog] = useState(false);
  const [showSetDownDialog, setShowSetDownDialog] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [showAdvanceQuarterDialog, setShowAdvanceQuarterDialog] = useState(false);
  const [spotBallYardLine, setSpotBallYardLine] = useState(25);
  const [manualDown, setManualDown] = useState(1);
  const [manualDistance, setManualDistance] = useState(10);
  
  // Editable play log
  const [editingPlayId, setEditingPlayId] = useState(null);
  const [editPlayData, setEditPlayData] = useState(null);
  
  // Current play
  const [selectedPlayType, setSelectedPlayType] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [yards, setYards] = useState(0);
  
  // Run play state
  const [runCarrierNumber, setRunCarrierNumber] = useState(null);
  const [runTacklerNumber, setRunTacklerNumber] = useState(null);
  
  // Pass play state
  const [passQBNumber, setPassQBNumber] = useState(null);
  const [passReceiverNumber, setPassReceiverNumber] = useState(null);
  const [passDefenderNumber, setPassDefenderNumber] = useState(null);
  const [interceptionReturnYards, setInterceptionReturnYards] = useState(0);
  
  // Punt play state
  const [puntPunterNumber, setPuntPunterNumber] = useState(null);
  const [puntReturnerNumber, setPuntReturnerNumber] = useState(null);
  const [puntDistance, setPuntDistance] = useState(40);
  const [puntReturnYards, setPuntReturnYards] = useState(0);
  const [puntReturnStartYardLine, setPuntReturnStartYardLine] = useState(20); // Where return begins
  const [puntTacklerNumber, setPuntTacklerNumber] = useState(null);
  
  // Field goal state - enhanced with blocked info
  const [kickerNumber, setKickerNumber] = useState(null);
  const [fgDistance, setFgDistance] = useState(30);
  const [fgBlockerNumber, setFgBlockerNumber] = useState(null);
  const [fgReturnYards, setFgReturnYards] = useState(0);
  const [fgNoReturn, setFgNoReturn] = useState(false);
  
  // Penalty state - Enhanced with ruleset support
  const [penaltyTeam, setPenaltyTeam] = useState(null); // 'offense' or 'defense'
  const [penaltyYards, setPenaltyYards] = useState(5);
  const [penaltyDescription, setPenaltyDescription] = useState('');
  const [showPenaltyDialog, setShowPenaltyDialog] = useState(false);
  const [gameRuleset, setGameRuleset] = useState('NFHS'); // Default ruleset for game
  
  // Play workflow step
  const [playStep, setPlayStep] = useState(0); // 0=select type, 1=select player, 2=result, 3=yards, 4=tackler
  
  // Scores
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  
  // Timeouts
  const [homeTimeouts, setHomeTimeouts] = useState(3);
  const [awayTimeouts, setAwayTimeouts] = useState(3);
  
  // Play-by-play log
  const [playLog, setPlayLog] = useState([]);
  
  // Clock
  const [clockTime, setClockTime] = useState(900); // 15 minutes default
  const [clockRunning, setClockRunning] = useState(false);
  const [showSetClockDialog, setShowSetClockDialog] = useState(false);
  const [tempClockMinutes, setTempClockMinutes] = useState(15);
  const [tempClockSeconds, setTempClockSeconds] = useState(0);

  // Clock countdown effect - also updates drive time of possession
  useEffect(() => {
    let interval = null;
    if (clockRunning && clockTime > 0) {
      interval = setInterval(() => {
        setClockTime(prev => {
          if (prev <= 1) {
            setClockRunning(false);
            toast.info("Quarter ended!");
            return 0;
          }
          return prev - 1;
        });
        
        // Update drive elapsed time when clock is running
        if (currentDrive.startTime !== null) {
          setCurrentDrive(prev => ({
            ...prev,
            elapsedTime: prev.elapsedTime + 1
          }));
          
          // Update total time of possession for the team with the ball
          if (possession === 'home') {
            setHomeTimeOfPossession(prev => prev + 1);
          } else {
            setAwayTimeOfPossession(prev => prev + 1);
          }
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clockRunning, clockTime, currentDrive.startTime, possession]);

  useEffect(() => {
    fetchGame();
    document.title = "StatMoose FB";
  }, [id]);

  const fetchGame = async () => {
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
      
      // Fetch rosters for both teams
      try {
        const [homeTeamRes, awayTeamRes] = await Promise.all([
          axios.get(`${API}/teams/${res.data.home_team_id}`),
          axios.get(`${API}/teams/${res.data.away_team_id}`)
        ]);
        setHomeRoster(homeTeamRes.data.roster || []);
        setAwayRoster(awayTeamRes.data.roster || []);
      } catch (e) {
        console.log("Could not fetch rosters", e);
      }
      
      // Initialize from game state if exists
      if (res.data.football_state) {
        const state = res.data.football_state;
        setPossession(state.possession || 'home');
        setBallPosition(state.ball_position || 25);
        setDown(state.down || 1);
        setDistance(state.distance || 10);
        setQuarter(state.quarter || 1);
        setHomeScore(state.home_score || 0);
        setAwayScore(state.away_score || 0);
        setHomeTimeouts(state.home_timeouts ?? 3);
        setAwayTimeouts(state.away_timeouts ?? 3);
        setPlayLog(state.play_log || []);
        setClockTime(state.clock_time ?? 900);
      } else {
        // New game - show kickoff dialog
        setShowKickoffTeamDialog(true);
      }
      
      if (res.data.clock_time !== undefined) {
        setClockTime(res.data.clock_time);
      }
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Save football game state to backend
  const saveFootballState = useCallback(async (newPlayLog = playLog, newHomeScore = homeScore, newAwayScore = awayScore) => {
    if (!id) return;
    
    try {
      const footballState = {
        possession,
        ball_position: ballPosition,
        down,
        distance,
        quarter,
        home_score: newHomeScore,
        away_score: newAwayScore,
        home_timeouts: homeTimeouts,
        away_timeouts: awayTimeouts,
        play_log: newPlayLog,
        clock_time: clockTime
      };
      
      await axios.put(`${API}/games/${id}`, {
        football_state: footballState,
        home_score: newHomeScore,
        away_score: newAwayScore,
        possession,
        home_time_of_possession: homeTimeOfPossession,
        away_time_of_possession: awayTimeOfPossession
      });
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }, [id, possession, ballPosition, down, distance, quarter, homeScore, awayScore, homeTimeouts, awayTimeouts, playLog, clockTime, homeTimeOfPossession, awayTimeOfPossession]);

  // Handle kickoff team selection (step 0)
  const handleKickoffTeamSelect = (team) => {
    setKickingTeam(team);
    setShowKickoffTeamDialog(false);
    setShowKickoffWorkflow(true);
    setKickoffStep(1);
    // Reset kickoff data
    setKickoffData({
      kickoffYardLine: 35,
      direction: null,
      isCustom: false,
      kickerNumber: null,
      returnerNumber: null,
      fieldedAt: 5,
      returnedTo: 25,
      specialResult: null,
      tacklerNumber: null,
      noTackle: false,
    });
  };

  // Handle kickoff workflow navigation
  const handleKickoffBack = () => {
    if (kickoffStep > 1) {
      setKickoffStep(prev => prev - 1);
    }
  };

  const handleKickoffNext = () => {
    if (kickoffStep < 5) {
      setKickoffStep(prev => prev + 1);
    }
  };

  // Complete kickoff and record the play
  const handleKickoffComplete = () => {
    const receivingTeam = kickingTeam === 'home' ? 'away' : 'home';
    const kickingTeamName = kickingTeam === 'home' ? game.home_team_name : game.away_team_name;
    const receivingTeamName = receivingTeam === 'home' ? game.home_team_name : game.away_team_name;
    
    // Build description
    let description = `#${kickoffData.kickerNumber} kickoff from ${kickoffData.kickoffYardLine} yard line`;
    
    if (kickoffData.specialResult === 'touchback') {
      description += ` - Touchback. Ball at 25 yard line.`;
    } else if (kickoffData.specialResult === 'fair_catch') {
      description += ` - Fair catch by #${kickoffData.returnerNumber} at ${kickoffData.fieldedAt} yard line.`;
    } else if (kickoffData.specialResult === 'out_of_bounds') {
      description += ` - Out of bounds. Ball at 40 yard line.`;
    } else if (kickoffData.specialResult === 'touchdown') {
      description += ` - TOUCHDOWN! Return by #${kickoffData.returnerNumber}!`;
    } else {
      description += ` - Fielded by #${kickoffData.returnerNumber} at ${kickoffData.fieldedAt}`;
      description += `, returned to ${kickoffData.returnedTo} yard line`;
      if (kickoffData.tacklerNumber) {
        description += `. Tackle by #${kickoffData.tacklerNumber}.`;
      } else {
        description += `.`;
      }
    }
    
    // Add kickoff to play log
    const kickoffPlay = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: kickingTeam,
      type: 'kickoff',
      kicker: kickoffData.kickerNumber,
      returner: kickoffData.returnerNumber,
      kickoffFrom: kickoffData.kickoffYardLine,
      fieldedAt: kickoffData.fieldedAt,
      returnedTo: kickoffData.returnedTo,
      tackler: kickoffData.tacklerNumber,
      specialResult: kickoffData.specialResult,
      description,
    };
    setPlayLog(prev => [kickoffPlay, ...prev]);
    
    // Set game state based on result
    setPossession(receivingTeam);
    
    let newBallPos;
    if (kickoffData.specialResult === 'touchback') {
      newBallPos = receivingTeam === 'home' ? 25 : 75;
    } else if (kickoffData.specialResult === 'out_of_bounds') {
      newBallPos = receivingTeam === 'home' ? 40 : 60;
    } else if (kickoffData.specialResult === 'touchdown') {
      // Handle return TD
      if (receivingTeam === 'home') {
        setHomeScore(prev => prev + 6);
      } else {
        setAwayScore(prev => prev + 6);
      }
      newBallPos = receivingTeam === 'home' ? 98 : 2;
    } else {
      // Regular return - set ball position
      // Convert yard line to field position (0-100)
      const yardLine = kickoffData.returnedTo;
      newBallPos = receivingTeam === 'home' ? yardLine : 100 - yardLine;
    }
    
    setBallPosition(newBallPos);
    setDown(1);
    setDistance(10);
    
    // Set first down marker (10 yards from ball in direction of goal)
    const newFDMarker = receivingTeam === 'home' 
      ? Math.min(100, newBallPos + 10) 
      : Math.max(0, newBallPos - 10);
    setFirstDownMarker(newFDMarker);
    
    // Close workflow
    setShowKickoffWorkflow(false);
    toast.success(`${receivingTeamName} ball at the ${kickoffData.specialResult === 'touchback' ? 25 : kickoffData.specialResult === 'out_of_bounds' ? 40 : kickoffData.returnedTo} yard line`);
  };

  // Format clock time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play submission
  const handleSubmitPlay = () => {
    if (!selectedPlayType || !selectedResult) {
      toast.error("Select play type and result");
      return;
    }

    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: possession,
      type: selectedPlayType,
      result: selectedResult,
      yards,
      down,
      ball_on: getYardLineText(),
      description: generatePlayDescription(),
    };

    // Add to play log
    setPlayLog(prev => [play, ...prev]);

    // Update game state based on play result
    updateGameState(play);

    // Reset current play
    setSelectedPlayType(null);
    setSelectedResult(null);
    setYards(0);
  };

  const getYardLineText = () => {
    const yardLine = ballPosition <= 50 ? ballPosition : 100 - ballPosition;
    const side = ballPosition <= 50 ? game?.home_team_name?.substring(0, 3).toUpperCase() : game?.away_team_name?.substring(0, 3).toUpperCase();
    return `${side} ${yardLine}`;
  };

  const generatePlayDescription = () => {
    const team = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    const playType = PLAY_TYPES.find(p => p.id === selectedPlayType)?.label || selectedPlayType;
    const result = PLAY_RESULTS[selectedPlayType]?.find(r => r.id === selectedResult)?.label || selectedResult;
    
    if (yards !== 0) {
      return `${team} ${playType.toLowerCase()} - ${result} for ${Math.abs(yards)} yards`;
    }
    return `${team} ${playType.toLowerCase()} - ${result}`;
  };

  const updateGameState = (play) => {
    // Handle scoring plays
    if (play.result === 'touchdown') {
      if (possession === 'home') {
        setHomeScore(prev => prev + 6);
      } else {
        setAwayScore(prev => prev + 6);
      }
      // Reset for extra point
      setBallPosition(possession === 'home' ? 98 : 2);
      setDown(1);
      setDistance(0);
      return;
    }

    if (play.result === 'good' && play.type === 'extra_point') {
      if (possession === 'home') {
        setHomeScore(prev => prev + 1);
      } else {
        setAwayScore(prev => prev + 1);
      }
      // Kickoff next
      return;
    }

    if (play.result === 'two_point_good') {
      if (possession === 'home') {
        setHomeScore(prev => prev + 2);
      } else {
        setAwayScore(prev => prev + 2);
      }
      return;
    }

    if (play.result === 'good' && play.type === 'field_goal') {
      if (possession === 'home') {
        setHomeScore(prev => prev + 3);
      } else {
        setAwayScore(prev => prev + 3);
      }
      // Kickoff next
      return;
    }

    if (play.result === 'safety') {
      // Safety scores for defensive team
      if (possession === 'home') {
        setAwayScore(prev => prev + 2);
      } else {
        setHomeScore(prev => prev + 2);
      }
      return;
    }

    // Handle turnovers
    if (['fumble_lost', 'intercepted'].includes(play.result)) {
      setPossession(possession === 'home' ? 'away' : 'home');
      setDown(1);
      setDistance(10);
      return;
    }

    // Handle regular plays with yardage
    if (yards !== 0) {
      const direction = possession === 'home' ? 1 : -1;
      const newPosition = Math.max(0, Math.min(100, ballPosition + (yards * direction)));
      setBallPosition(newPosition);
      
      // Check for first down
      if (play.result === 'first_down' || yards >= distance) {
        setDown(1);
        setDistance(10);
      } else {
        setDown(prev => Math.min(4, prev + 1));
        setDistance(prev => prev - yards);
        
        // Turnover on downs
        if (down >= 4) {
          setPossession(possession === 'home' ? 'away' : 'home');
          setDown(1);
          setDistance(10);
        }
      }
    } else {
      // No gain plays
      setDown(prev => Math.min(4, prev + 1));
      if (down >= 4) {
        setPossession(possession === 'home' ? 'away' : 'home');
        setDown(1);
        setDistance(10);
      }
    }
  };

  // Handle Run Play submission
  const handleSubmitRunPlay = () => {
    const teamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    const direction = possession === 'home' ? 1 : -1;
    const newBallPosition = Math.max(0, Math.min(100, ballPosition + (yards * direction)));
    
    // Check for first down
    const isFirstDown = (possession === 'home' && newBallPosition >= firstDownMarker) ||
                        (possession === 'away' && newBallPosition <= firstDownMarker);
    
    // Build play description
    let description = `#${runCarrierNumber} `;
    if (selectedResult === 'touchdown') {
      description += `rushes for ${yards} yards - TOUCHDOWN!`;
    } else if (selectedResult === 'fumble_lost') {
      description += `fumble lost after ${yards} yards`;
    } else if (selectedResult === 'fumble_rec') {
      description += `fumble recovered after ${yards} yards`;
    } else if (yards > 0) {
      description += `rushes for ${yards} yards`;
    } else if (yards < 0) {
      description += `tackled for loss of ${Math.abs(yards)} yards`;
    } else {
      description += `no gain`;
    }
    
    if (runTacklerNumber) {
      description += `. Tackle by #${runTacklerNumber}`;
    }
    
    if (isFirstDown && selectedResult !== 'touchdown' && selectedResult !== 'fumble_lost') {
      description += ' - FIRST DOWN';
    }
    
    // Create play entry
    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: possession,
      type: 'run',
      carrier: runCarrierNumber,
      tackler: runTacklerNumber,
      result: selectedResult,
      yards,
      down,
      distance,
      ball_on: getYardLineText(),
      description,
    };
    
    setPlayLog(prev => [play, ...prev]);
    
    // Update game state
    if (selectedResult === 'touchdown') {
      if (possession === 'home') {
        setHomeScore(prev => prev + 6);
      } else {
        setAwayScore(prev => prev + 6);
      }
      setBallPosition(possession === 'home' ? 98 : 2);
      setDown(1);
      setDistance(0);
      toast.success(`${teamName} TOUCHDOWN!`);
    } else if (selectedResult === 'fumble_lost') {
      setBallPosition(newBallPosition);
      setPossession(possession === 'home' ? 'away' : 'home');
      setDown(1);
      setDistance(10);
      // Update first down marker for new possession
      const newFDMarker = possession === 'home' 
        ? Math.max(0, newBallPosition - 10) 
        : Math.min(100, newBallPosition + 10);
      setFirstDownMarker(newFDMarker);
      toast.info('Fumble - turnover!');
    } else {
      setBallPosition(newBallPosition);
      
      if (isFirstDown) {
        setDown(1);
        setDistance(10);
        // Set new first down marker
        const newFDMarker = possession === 'home' 
          ? Math.min(100, newBallPosition + 10) 
          : Math.max(0, newBallPosition - 10);
        setFirstDownMarker(newFDMarker);
        toast.success('First Down!');
      } else {
        const newDown = down + 1;
        const newDistance = distance - yards;
        
        if (newDown > 4) {
          // Turnover on downs
          setPossession(possession === 'home' ? 'away' : 'home');
          setDown(1);
          setDistance(10);
          const newFDMarker = possession === 'home' 
            ? Math.max(0, newBallPosition - 10) 
            : Math.min(100, newBallPosition + 10);
          setFirstDownMarker(newFDMarker);
          toast.info('Turnover on downs');
        } else {
          setDown(newDown);
          setDistance(Math.max(0, newDistance));
        }
      }
    }
    
    // Reset play state
    resetPlayState();
    
    // Update drive stats
    updateDriveStats(yards);
  };
  const handleSubmitPassPlay = () => {
    const teamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    const defTeamName = possession === 'home' ? game?.away_team_name : game?.home_team_name;
    const direction = possession === 'home' ? 1 : -1;
    
    let description = '';
    let newBallPosition = ballPosition;
    let turnover = false;
    let isTouchdown = false;
    let isFirstDown = false;
    
    switch (selectedResult) {
      case 'complete':
        newBallPosition = Math.max(0, Math.min(100, ballPosition + (yards * direction)));
        isFirstDown = (possession === 'home' && newBallPosition >= firstDownMarker) ||
                      (possession === 'away' && newBallPosition <= firstDownMarker);
        description = `#${passQBNumber} pass to #${passReceiverNumber} for ${yards} yards`;
        if (passDefenderNumber) description += `. Tackle by #${passDefenderNumber}`;
        if (isFirstDown) description += ' - FIRST DOWN';
        break;
        
      case 'touchdown':
        newBallPosition = possession === 'home' ? 100 : 0;
        isTouchdown = true;
        description = `#${passQBNumber} pass to #${passReceiverNumber} for ${yards} yards - TOUCHDOWN!`;
        break;
        
      case 'incomplete':
        description = `#${passQBNumber} pass incomplete`;
        break;
        
      case 'sacked':
        newBallPosition = Math.max(0, Math.min(100, ballPosition + (yards * direction))); // yards is negative
        description = `#${passQBNumber} sacked for loss of ${Math.abs(yards)} yards`;
        if (passDefenderNumber) description += ` by #${passDefenderNumber}`;
        break;
        
      case 'intercepted':
        turnover = true;
        const intReturnDir = possession === 'home' ? -1 : 1;
        newBallPosition = Math.max(0, Math.min(100, ballPosition + (interceptionReturnYards * intReturnDir)));
        description = `#${passQBNumber} pass INTERCEPTED by #${passDefenderNumber}`;
        if (interceptionReturnYards > 0) {
          description += `, returned ${interceptionReturnYards} yards`;
        }
        break;
        
      case 'dropped':
        description = `#${passQBNumber} pass to #${passReceiverNumber} DROPPED`;
        break;
        
      case 'broken_up':
        description = `#${passQBNumber} pass broken up by #${passDefenderNumber}`;
        break;
        
      default:
        description = `Pass play - ${selectedResult}`;
    }
    
    // Create play entry
    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: possession,
      type: 'pass',
      qb: passQBNumber,
      receiver: passReceiverNumber,
      defender: passDefenderNumber,
      result: selectedResult,
      yards,
      interceptionReturn: interceptionReturnYards,
      down,
      distance,
      ball_on: getYardLineText(),
      description,
    };
    
    setPlayLog(prev => [play, ...prev]);
    
    // Update game state
    if (isTouchdown) {
      if (possession === 'home') {
        setHomeScore(prev => prev + 6);
      } else {
        setAwayScore(prev => prev + 6);
      }
      setBallPosition(possession === 'home' ? 98 : 2);
      setDown(1);
      setDistance(0);
      toast.success(`${teamName} TOUCHDOWN!`);
    } else if (turnover) {
      setBallPosition(newBallPosition);
      setPossession(possession === 'home' ? 'away' : 'home');
      setDown(1);
      setDistance(10);
      const newFDMarker = possession === 'home' 
        ? Math.max(0, newBallPosition - 10) 
        : Math.min(100, newBallPosition + 10);
      setFirstDownMarker(newFDMarker);
      toast.info(`${defTeamName} interception!`);
    } else if (['incomplete', 'dropped', 'broken_up'].includes(selectedResult)) {
      // No yardage change, just advance down
      const newDown = down + 1;
      if (newDown > 4) {
        setPossession(possession === 'home' ? 'away' : 'home');
        setDown(1);
        setDistance(10);
        const newFDMarker = possession === 'home' 
          ? Math.max(0, ballPosition - 10) 
          : Math.min(100, ballPosition + 10);
        setFirstDownMarker(newFDMarker);
        toast.info('Turnover on downs');
      } else {
        setDown(newDown);
      }
    } else {
      // Complete or sacked - update position
      setBallPosition(newBallPosition);
      
      if (isFirstDown) {
        setDown(1);
        setDistance(10);
        const newFDMarker = possession === 'home' 
          ? Math.min(100, newBallPosition + 10) 
          : Math.max(0, newBallPosition - 10);
        setFirstDownMarker(newFDMarker);
        toast.success('First Down!');
      } else {
        const newDown = down + 1;
        const newDistance = selectedResult === 'sacked' ? distance - yards : distance - yards;
        
        if (newDown > 4) {
          setPossession(possession === 'home' ? 'away' : 'home');
          setDown(1);
          setDistance(10);
          const newFDMarker = possession === 'home' 
            ? Math.max(0, newBallPosition - 10) 
            : Math.min(100, newBallPosition + 10);
          setFirstDownMarker(newFDMarker);
          toast.info('Turnover on downs');
        } else {
          setDown(newDown);
          setDistance(Math.max(0, newDistance));
        }
      }
    }
    
    // Reset play state
    resetPlayState();
    
    // Update drive stats
    updateDriveStats(yards);
  };

  // Reset play state helper
  const resetPlayState = () => {
    setSelectedPlayType(null);
    setSelectedResult(null);
    setYards(0);
    setPlayStep(0);
    setRunCarrierNumber(null);
    setRunTacklerNumber(null);
    setPassQBNumber(null);
    setPassReceiverNumber(null);
    setPassDefenderNumber(null);
    setInterceptionReturnYards(0);
    setPuntPunterNumber(null);
    setPuntReturnerNumber(null);
    setPuntDistance(40);
    setPuntReturnYards(0);
    setPuntReturnStartYardLine(20);
    setPuntTacklerNumber(null);
    setKickerNumber(null);
    setFgDistance(30);
    setFgBlockerNumber(null);
    setFgReturnYards(0);
    setFgNoReturn(false);
    setPenaltyTeam(null);
    setPenaltyYards(5);
    setPenaltyDescription('');
  };

  // Handle Punt Play submission
  const handleSubmitPuntPlay = () => {
    const teamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    const defTeamName = possession === 'home' ? game?.away_team_name : game?.home_team_name;
    
    let description = `#${puntPunterNumber} punt for ${puntDistance} yards`;
    let newBallPosition = ballPosition;
    let turnover = selectedResult !== 'blocked';
    
    switch (selectedResult) {
      case 'punted':
        const puntDirection = possession === 'home' ? 1 : -1;
        const landedAt = Math.max(0, Math.min(100, ballPosition + (puntDistance * puntDirection)));
        newBallPosition = Math.max(0, Math.min(100, landedAt - (puntReturnYards * puntDirection)));
        if (puntReturnerNumber) {
          description += `. Returned by #${puntReturnerNumber} for ${puntReturnYards} yards`;
        }
        break;
      case 'touchback':
        newBallPosition = possession === 'home' ? 80 : 20; // Opponent's 20
        description += ' - Touchback';
        break;
      case 'fair_catch':
        const fcDirection = possession === 'home' ? 1 : -1;
        newBallPosition = Math.max(0, Math.min(100, ballPosition + (puntDistance * fcDirection)));
        description += ` - Fair catch by #${puntReturnerNumber}`;
        break;
      case 'blocked':
        turnover = false;
        description = `#${puntPunterNumber} punt BLOCKED`;
        break;
      case 'muffed':
        // Muffed punt recovered by kicking team
        turnover = false;
        description += ` - MUFFED, recovered by ${teamName}`;
        break;
      case 'returned':
        const retDirection = possession === 'home' ? 1 : -1;
        const puntLanded = Math.max(0, Math.min(100, ballPosition + (puntDistance * retDirection)));
        newBallPosition = Math.max(0, Math.min(100, puntLanded - (puntReturnYards * retDirection)));
        description += `. Returned by #${puntReturnerNumber} for ${puntReturnYards} yards`;
        // Check for return TD
        if ((possession === 'home' && newBallPosition <= 0) || (possession === 'away' && newBallPosition >= 100)) {
          description += ' - TOUCHDOWN!';
          if (possession === 'home') {
            setAwayScore(prev => prev + 6);
          } else {
            setHomeScore(prev => prev + 6);
          }
        }
        break;
    }
    
    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: possession,
      type: 'punt',
      punter: puntPunterNumber,
      returner: puntReturnerNumber,
      distance: puntDistance,
      returnYards: puntReturnYards,
      result: selectedResult,
      down,
      ball_on: getYardLineText(),
      description,
    };
    
    setPlayLog(prev => [play, ...prev]);
    
    if (turnover) {
      setBallPosition(newBallPosition);
      setPossession(possession === 'home' ? 'away' : 'home');
      setDown(1);
      setDistance(10);
      const newFDMarker = possession === 'home' 
        ? Math.max(0, newBallPosition - 10) 
        : Math.min(100, newBallPosition + 10);
      setFirstDownMarker(newFDMarker);
      toast.info(`${defTeamName} ball`);
    } else {
      // Blocked punt - offense keeps ball but loses down
      setDown(prev => prev + 1);
      if (down >= 4) {
        setPossession(possession === 'home' ? 'away' : 'home');
        setDown(1);
        setDistance(10);
      }
    }
    
    resetPlayState();
  };

  // Handle Field Goal submission
  const handleSubmitFieldGoal = () => {
    const teamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    
    let description = `#${kickerNumber} ${fgDistance}-yard field goal attempt`;
    
    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: possession,
      type: 'field_goal',
      kicker: kickerNumber,
      distance: fgDistance,
      result: selectedResult,
      down,
      ball_on: getYardLineText(),
      description: description + (selectedResult === 'good' ? ' - GOOD!' : selectedResult === 'blocked' ? ' - BLOCKED' : ' - NO GOOD'),
    };
    
    setPlayLog(prev => [play, ...prev]);
    
    if (selectedResult === 'good') {
      if (possession === 'home') {
        setHomeScore(prev => prev + 3);
      } else {
        setAwayScore(prev => prev + 3);
      }
      toast.success(`${teamName} Field Goal!`);
      // After FG, other team gets ball at their 25 (kickoff simulation)
      setPossession(possession === 'home' ? 'away' : 'home');
      const newBallPos = possession === 'home' ? 75 : 25;
      setBallPosition(newBallPos);
      setDown(1);
      setDistance(10);
      const newFDMarker = possession === 'home' ? 65 : 35;
      setFirstDownMarker(newFDMarker);
    } else {
      // Missed FG - other team gets ball at spot of kick
      setPossession(possession === 'home' ? 'away' : 'home');
      setDown(1);
      setDistance(10);
      const newFDMarker = possession === 'home' 
        ? Math.max(0, ballPosition - 10) 
        : Math.min(100, ballPosition + 10);
      setFirstDownMarker(newFDMarker);
      toast.info('Field Goal missed');
    }
    
    resetPlayState();
  };

  // Handle Extra Point submission
  const handleSubmitExtraPoint = () => {
    const teamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    
    let description = '';
    
    if (selectedResult === 'good') {
      description = `#${kickerNumber} extra point - GOOD!`;
      if (possession === 'home') {
        setHomeScore(prev => prev + 1);
      } else {
        setAwayScore(prev => prev + 1);
      }
    } else if (selectedResult === 'no_good') {
      description = `#${kickerNumber} extra point - NO GOOD`;
    } else if (selectedResult === 'two_point_good') {
      description = `Two-point conversion - GOOD!`;
      if (possession === 'home') {
        setHomeScore(prev => prev + 2);
      } else {
        setAwayScore(prev => prev + 2);
      }
    } else {
      description = `Two-point conversion - NO GOOD`;
    }
    
    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: possession,
      type: 'extra_point',
      kicker: kickerNumber,
      result: selectedResult,
      description,
    };
    
    setPlayLog(prev => [play, ...prev]);
    
    // After PAT, other team gets ball (kickoff)
    setPossession(possession === 'home' ? 'away' : 'home');
    const newBallPos = possession === 'home' ? 75 : 25;
    setBallPosition(newBallPos);
    setDown(1);
    setDistance(10);
    const newFDMarker = possession === 'home' ? 65 : 35;
    setFirstDownMarker(newFDMarker);
    
    resetPlayState();
  };

  // Handle Penalty submission - Enhanced with penalty catalog
  const handleSubmitPenalty = () => {
    const offenseTeam = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    const defenseTeam = possession === 'home' ? game?.away_team_name : game?.home_team_name;
    
    let description = '';
    let repeatDown = false;
    let autoFirstDown = false;
    
    switch (selectedResult) {
      case 'offense':
        description = `Penalty on ${offenseTeam}: ${penaltyDescription || 'Offensive penalty'} - ${penaltyYards} yards`;
        // Move ball back
        const offDir = possession === 'home' ? -1 : 1;
        const newOffPos = Math.max(0, Math.min(100, ballPosition + (penaltyYards * offDir)));
        setBallPosition(newOffPos);
        setDistance(prev => prev + penaltyYards);
        break;
      case 'defense':
        description = `Penalty on ${defenseTeam}: ${penaltyDescription || 'Defensive penalty'} - ${penaltyYards} yards`;
        // Move ball forward
        const defDir = possession === 'home' ? 1 : -1;
        const newDefPos = Math.max(0, Math.min(100, ballPosition + (penaltyYards * defDir)));
        setBallPosition(newDefPos);
        // Check for auto first down on certain yardage
        if (penaltyYards >= distance) {
          autoFirstDown = true;
        }
        break;
      case 'declined':
        description = `Penalty declined`;
        break;
      case 'offsetting':
        description = `Offsetting penalties - replay down`;
        repeatDown = true;
        break;
    }
    
    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: possession,
      type: 'penalty',
      result: selectedResult,
      yards: penaltyYards,
      description,
    };
    
    setPlayLog(prev => [play, ...prev]);
    
    if (autoFirstDown) {
      setDown(1);
      setDistance(10);
      const newFDMarker = possession === 'home' 
        ? Math.min(100, ballPosition + 10) 
        : Math.max(0, ballPosition - 10);
      setFirstDownMarker(newFDMarker);
      toast.success('Automatic First Down!');
    } else if (!repeatDown && selectedResult !== 'declined') {
      // Keep same down for penalties
    }
    
    resetPlayState();
  };

  // Handle Enhanced Penalty submission from PenaltyWorkflowDialog
  const handleEnhancedPenaltySubmit = (penaltyLog) => {
    const offenseTeamName = possession === 'home' ? game?.home_team_name : game?.away_team_name;
    const defenseTeamName = possession === 'home' ? game?.away_team_name : game?.home_team_name;
    
    // Update ruleset for the game
    if (penaltyLog.ruleset) {
      setGameRuleset(penaltyLog.ruleset);
    }
    
    let description = '';
    let newBallPosition = ballPosition;
    
    if (penaltyLog.declined) {
      description = 'Penalty declined - play stands';
    } else if (penaltyLog.offsetting) {
      description = 'Offsetting penalties - replay the down';
    } else {
      const teamName = penaltyLog.against_team === 'offense' ? offenseTeamName : defenseTeamName;
      description = `${penaltyLog.display_name} on ${teamName}`;
      
      if (penaltyLog.player_number) {
        description += ` (#${penaltyLog.player_number})`;
      }
      
      description += ` - ${penaltyLog.yards} yards`;
      
      if (penaltyLog.auto_first_down) {
        description += ' - AUTOMATIC FIRST DOWN';
      }
      if (penaltyLog.loss_of_down) {
        description += ' - Loss of Down';
      }
      if (penaltyLog.disqualification === 'ejection') {
        description += ' - PLAYER EJECTED';
      }
      
      // Calculate new ball position
      const direction = penaltyLog.against_team === 'offense' 
        ? (possession === 'home' ? -1 : 1) // Offense penalties move ball backward
        : (possession === 'home' ? 1 : -1); // Defense penalties move ball forward
      
      newBallPosition = Math.max(0, Math.min(100, ballPosition + (penaltyLog.yards * direction)));
    }
    
    // Create play log entry with enhanced penalty data
    const play = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: penaltyLog.team,
      type: 'penalty',
      result: penaltyLog.declined ? 'declined' : penaltyLog.offsetting ? 'offsetting' : penaltyLog.against_team,
      penalty_id: penaltyLog.penalty_id,
      penalty_name: penaltyLog.display_name,
      ruleset: penaltyLog.ruleset,
      against_team: penaltyLog.against_team,
      player_number: penaltyLog.player_number,
      yards: penaltyLog.yards,
      auto_first_down: penaltyLog.auto_first_down,
      loss_of_down: penaltyLog.loss_of_down,
      disqualification: penaltyLog.disqualification,
      spot_of_foul: penaltyLog.spot_of_foul,
      raw_user_text: penaltyLog.raw_user_text,
      down,
      distance,
      ball_on: getYardLineText(),
      description,
    };
    
    setPlayLog(prev => [play, ...prev]);
    
    // Update game state
    if (!penaltyLog.declined && !penaltyLog.offsetting) {
      setBallPosition(newBallPosition);
      
      if (penaltyLog.against_team === 'offense') {
        // Offensive penalty - add yards to distance
        if (penaltyLog.loss_of_down) {
          const newDown = down + 1;
          if (newDown > 4) {
            setPossession(possession === 'home' ? 'away' : 'home');
            setDown(1);
            setDistance(10);
            const newFDMarker = possession === 'home' 
              ? Math.max(0, newBallPosition - 10) 
              : Math.min(100, newBallPosition + 10);
            setFirstDownMarker(newFDMarker);
            toast.info('Turnover on downs');
          } else {
            setDown(newDown);
            setDistance(prev => prev + penaltyLog.yards);
          }
        } else {
          // Replay the down with added distance
          setDistance(prev => prev + penaltyLog.yards);
        }
      } else {
        // Defensive penalty
        if (penaltyLog.auto_first_down) {
          setDown(1);
          setDistance(10);
          const newFDMarker = possession === 'home' 
            ? Math.min(100, newBallPosition + 10) 
            : Math.max(0, newBallPosition - 10);
          setFirstDownMarker(newFDMarker);
          toast.success('Automatic First Down!');
        } else {
          // Check if penalty yardage exceeds distance needed
          if (penaltyLog.yards >= distance) {
            setDown(1);
            setDistance(10);
            const newFDMarker = possession === 'home' 
              ? Math.min(100, newBallPosition + 10) 
              : Math.max(0, newBallPosition - 10);
            setFirstDownMarker(newFDMarker);
            toast.success('First Down!');
          } else {
            setDistance(prev => prev - penaltyLog.yards);
          }
        }
      }
      
      // Handle ejection notification
      if (penaltyLog.disqualification === 'ejection') {
        toast.error(`Player ${penaltyLog.player_number ? '#' + penaltyLog.player_number : ''} has been EJECTED`, {
          duration: 5000,
        });
      }
    }
    
    // Close dialog
    setShowPenaltyDialog(false);
    toast.success(`Penalty: ${penaltyLog.display_name || (penaltyLog.declined ? 'Declined' : penaltyLog.offsetting ? 'Offsetting' : 'Applied')}`);
  };

  // Change possession
  const togglePossession = () => {
    setPossession(prev => prev === 'home' ? 'away' : 'home');
    setDown(1);
    setDistance(10);
    // Update first down marker for new possession
    const newFDMarker = possession === 'home' 
      ? Math.max(0, ballPosition - 10) 
      : Math.min(100, ballPosition + 10);
    setFirstDownMarker(newFDMarker);
  };

  // Handle using a timeout
  const handleUseTimeout = (team, type = 'regular') => {
    if (type === 'media') {
      setClockRunning(false);
      toast.info('Media Timeout');
      const play = {
        id: Date.now(),
        quarter,
        clock: formatTime(clockTime),
        team: 'none',
        type: 'timeout',
        description: 'Media Timeout',
      };
      setPlayLog(prev => [play, ...prev]);
      setShowTimeoutDialog(false);
      return;
    }
    
    if (team === 'home' && homeTimeouts > 0) {
      setHomeTimeouts(prev => prev - 1);
      setClockRunning(false);
      toast.success(`${game?.home_team_name} timeout`);
      const play = {
        id: Date.now(),
        quarter,
        clock: formatTime(clockTime),
        team: 'home',
        type: 'timeout',
        description: `${game?.home_team_name} Timeout`,
      };
      setPlayLog(prev => [play, ...prev]);
    } else if (team === 'away' && awayTimeouts > 0) {
      setAwayTimeouts(prev => prev - 1);
      setClockRunning(false);
      toast.success(`${game?.away_team_name} timeout`);
      const play = {
        id: Date.now(),
        quarter,
        clock: formatTime(clockTime),
        team: 'away',
        type: 'timeout',
        description: `${game?.away_team_name} Timeout`,
      };
      setPlayLog(prev => [play, ...prev]);
    } else {
      toast.error('No timeouts remaining');
    }
    setShowTimeoutDialog(false);
  };

  // Spot ball function
  const handleSpotBall = () => {
    setBallPosition(spotBallYardLine);
    setShowSpotBallDialog(false);
    toast.success(`Ball spotted at ${spotBallYardLine > 50 ? `OPP ${100 - spotBallYardLine}` : spotBallYardLine} yard line`);
  };

  // Set down and distance manually
  const handleSetDownDistance = () => {
    setDown(manualDown);
    setDistance(manualDistance);
    // Update first down marker based on new down/distance
    const newFDMarker = possession === 'home' 
      ? Math.min(100, ballPosition + manualDistance) 
      : Math.max(0, ballPosition - manualDistance);
    setFirstDownMarker(newFDMarker);
    setShowSetDownDialog(false);
    toast.success(`Set to ${manualDown}${manualDown === 1 ? 'st' : manualDown === 2 ? 'nd' : manualDown === 3 ? 'rd' : 'th'} & ${manualDistance}`);
  };

  // Advance quarter
  const handleAdvanceQuarter = () => {
    const nextQuarter = quarter + 1;
    
    if (quarter === 2) {
      // Going to halftime
      setQuarter(nextQuarter);
      setClockRunning(false);
      toast.info('Halftime');
    } else if (quarter === 3) {
      // Coming out of halftime - ask about resetting timeouts
      if (window.confirm('Reset timeouts for the second half?')) {
        setHomeTimeouts(3);
        setAwayTimeouts(3);
        toast.success('Timeouts reset for second half');
      }
      setQuarter(nextQuarter);
      // Reset clock to quarter length
      const quarterLength = game?.clock_settings?.period_duration || 900;
      setClockTime(quarterLength);
    } else if (nextQuarter <= 4) {
      setQuarter(nextQuarter);
      // Reset clock to quarter length
      const quarterLength = game?.clock_settings?.period_duration || 900;
      setClockTime(quarterLength);
    } else {
      // Game over
      toast.info('Game Complete');
    }
    
    setShowAdvanceQuarterDialog(false);
  };

  // Start new drive (NFL rules: drive starts when team gains possession)
  const startNewDrive = (team) => {
    setCurrentDrive({
      startTime: clockTime,
      startQuarter: quarter,
      startPosition: ballPosition,
      plays: 0,
      yards: 0,
      team: team,
      elapsedTime: 0
    });
  };

  // Update drive stats when a play is made
  const updateDriveStats = (yardsGained) => {
    setCurrentDrive(prev => ({
      ...prev,
      plays: prev.plays + 1,
      yards: prev.yards + yardsGained
    }));
  };

  // Calculate drive time - uses elapsed time directly for accuracy
  const getDriveTime = () => {
    const totalSeconds = currentDrive.elapsedTime || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format time of possession
  const formatTOP = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Edit play in log
  const handleEditPlay = (play) => {
    setEditingPlayId(play.id);
    setEditPlayData({ ...play });
  };

  // Save edited play
  const handleSaveEditPlay = () => {
    if (!editPlayData) return;
    
    setPlayLog(prev => prev.map(p => 
      p.id === editingPlayId ? { ...editPlayData } : p
    ));
    setEditingPlayId(null);
    setEditPlayData(null);
    toast.success('Play updated');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingPlayId(null);
    setEditPlayData(null);
  };

  // Undo last play
  const undoLastPlay = () => {
    if (playLog.length === 0) return;
    setPlayLog(prev => prev.slice(1));
    toast.success("Last play undone");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading game...</div>
      </div>
    );
  }

  const homeTeamName = game?.home_team_name || "Home";
  const awayTeamName = game?.away_team_name || "Away";
  const homeColor = game?.home_team_color || "#dc2626";
  const awayColor = game?.away_team_color || "#2563eb";

  // Determine kicking/receiving teams for workflow
  const kickingTeamName = kickingTeam === 'home' ? homeTeamName : awayTeamName;
  const receivingTeamName = kickingTeam === 'home' ? awayTeamName : homeTeamName;
  const kickingTeamColor = kickingTeam === 'home' ? homeColor : awayColor;
  const receivingTeamColor = kickingTeam === 'home' ? awayColor : homeColor;
  const kickingRoster = kickingTeam === 'home' ? homeRoster : awayRoster;
  const receivingRoster = kickingTeam === 'home' ? awayRoster : homeRoster;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Set Clock Dialog */}
      <Dialog open={showSetClockDialog} onOpenChange={setShowSetClockDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">SET CLOCK</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              Enter the time for the game clock
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-center gap-4 mt-4">
            {/* Minutes */}
            <div className="text-center">
              <label className="text-xs text-zinc-400 uppercase">Minutes</label>
              <div className="flex flex-col items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-600"
                  onClick={() => setTempClockMinutes(prev => Math.min(99, prev + 1))}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <input
                  type="number"
                  value={tempClockMinutes}
                  onChange={(e) => setTempClockMinutes(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
                  className="w-16 bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-white text-center text-2xl font-mono font-bold"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-600"
                  onClick={() => setTempClockMinutes(prev => Math.max(0, prev - 1))}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-3xl font-bold text-zinc-400">:</div>
            
            {/* Seconds */}
            <div className="text-center">
              <label className="text-xs text-zinc-400 uppercase">Seconds</label>
              <div className="flex flex-col items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-600"
                  onClick={() => setTempClockSeconds(prev => prev >= 59 ? 0 : prev + 1)}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <input
                  type="number"
                  value={tempClockSeconds.toString().padStart(2, '0')}
                  onChange={(e) => setTempClockSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-16 bg-zinc-800 border border-zinc-600 rounded px-2 py-2 text-white text-center text-2xl font-mono font-bold"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-600"
                  onClick={() => setTempClockSeconds(prev => prev <= 0 ? 59 : prev - 1)}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Quick Presets */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setTempClockMinutes(15); setTempClockSeconds(0); }}>15:00</Button>
            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setTempClockMinutes(12); setTempClockSeconds(0); }}>12:00</Button>
            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setTempClockMinutes(10); setTempClockSeconds(0); }}>10:00</Button>
            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setTempClockMinutes(5); setTempClockSeconds(0); }}>5:00</Button>
            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setTempClockMinutes(2); setTempClockSeconds(0); }}>2:00</Button>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" className="border-zinc-600" onClick={() => setShowSetClockDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const newTime = (tempClockMinutes * 60) + tempClockSeconds;
                setClockTime(newTime);
                setShowSetClockDialog(false);
                toast.success(`Clock set to ${formatTime(newTime)}`);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Set Clock
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timeout Selection Dialog */}
      <Dialog open={showTimeoutDialog} onOpenChange={setShowTimeoutDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">CALL TIMEOUT</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-3 mt-4">
            <Button
              onClick={() => handleUseTimeout('home')}
              disabled={homeTimeouts === 0}
              className="h-16 text-lg"
              style={{ backgroundColor: homeColor }}
            >
              {homeTeamName} ({homeTimeouts} remaining)
            </Button>
            <Button
              onClick={() => handleUseTimeout('away')}
              disabled={awayTimeouts === 0}
              className="h-16 text-lg"
              style={{ backgroundColor: awayColor }}
            >
              {awayTeamName} ({awayTimeouts} remaining)
            </Button>
            <Button
              onClick={() => handleUseTimeout(null, 'media')}
              variant="outline"
              className="h-16 text-lg border-zinc-600"
            >
              📺 Media Timeout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spot Ball Dialog */}
      <Dialog open={showSpotBallDialog} onOpenChange={setShowSpotBallDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">SPOT BALL</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              Place the ball on any yard line
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <YardLineSelector
              label="Yard Line"
              value={spotBallYardLine}
              onChange={setSpotBallYardLine}
              maxYards={100}
              showSide={true}
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" className="border-zinc-600" onClick={() => setShowSpotBallDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSpotBall} className="bg-green-600 hover:bg-green-700">
              Spot Ball
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Down & Distance Dialog */}
      <Dialog open={showSetDownDialog} onOpenChange={setShowSetDownDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">SET DOWN & DISTANCE</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-zinc-400 uppercase">Down</label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4].map(d => (
                  <Button
                    key={d}
                    onClick={() => setManualDown(d)}
                    className={`flex-1 ${manualDown === d ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                  >
                    {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 uppercase">Distance (Yards to Go)</label>
              <div className="flex items-center gap-3 mt-2">
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setManualDistance(prev => Math.max(1, prev - 5))}>-5</Button>
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setManualDistance(prev => Math.max(1, prev - 1))}>-1</Button>
                <input
                  type="number"
                  value={manualDistance}
                  onChange={(e) => setManualDistance(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                />
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setManualDistance(prev => prev + 1)}>+1</Button>
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setManualDistance(prev => prev + 5)}>+5</Button>
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="border-zinc-600 text-xs" onClick={() => setManualDistance(1)}>1</Button>
                <Button size="sm" variant="outline" className="border-zinc-600 text-xs" onClick={() => setManualDistance(5)}>5</Button>
                <Button size="sm" variant="outline" className="border-zinc-600 text-xs" onClick={() => setManualDistance(10)}>10</Button>
                <Button size="sm" variant="outline" className="border-zinc-600 text-xs" onClick={() => setManualDistance(15)}>15</Button>
                <Button size="sm" variant="outline" className="border-zinc-600 text-xs" onClick={() => setManualDistance(20)}>20</Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" className="border-zinc-600" onClick={() => setShowSetDownDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetDownDistance} className="bg-green-600 hover:bg-green-700">
              Set Down & Distance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advance Quarter Dialog */}
      <Dialog open={showAdvanceQuarterDialog} onOpenChange={setShowAdvanceQuarterDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">ADVANCE QUARTER</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              {quarter === 2 ? 'Advance to Halftime?' : quarter === 4 ? 'End Game?' : `Advance to Q${quarter + 1}?`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 text-center">
            <div className="text-4xl font-bold mb-4">
              Q{quarter} → {quarter === 2 ? 'HALF' : quarter === 4 ? 'END' : `Q${quarter + 1}`}
            </div>
            {quarter === 2 && (
              <p className="text-zinc-400 text-sm">Teams will switch sides. Timeouts will reset at start of Q3.</p>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" className="border-zinc-600" onClick={() => setShowAdvanceQuarterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdvanceQuarter} className="bg-green-600 hover:bg-green-700">
              {quarter === 2 ? 'Go to Halftime' : quarter === 4 ? 'End Game' : 'Advance Quarter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kickoff Team Selection Dialog */}
      <KickoffDialog
        open={showKickoffTeamDialog}
        homeTeam={homeTeamName}
        awayTeam={awayTeamName}
        homeColor={homeColor}
        awayColor={awayColor}
        onSelect={handleKickoffTeamSelect}
      />

      {/* Kickoff Workflow Dialog */}
      <KickoffWorkflowDialog
        open={showKickoffWorkflow}
        step={kickoffStep}
        kickingTeam={kickingTeam}
        receivingTeam={kickingTeam === 'home' ? 'away' : 'home'}
        kickingTeamName={kickingTeamName}
        receivingTeamName={receivingTeamName}
        kickingTeamColor={kickingTeamColor}
        receivingTeamColor={receivingTeamColor}
        kickingRoster={kickingRoster}
        receivingRoster={receivingRoster}
        kickoffData={kickoffData}
        setKickoffData={setKickoffData}
        onBack={handleKickoffBack}
        onNext={handleKickoffNext}
        onComplete={handleKickoffComplete}
      />

      {/* Enhanced Penalty Workflow Dialog */}
      <PenaltyWorkflowDialog
        open={showPenaltyDialog}
        onClose={() => setShowPenaltyDialog(false)}
        onSubmit={handleEnhancedPenaltySubmit}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeColor={homeColor}
        awayColor={awayColor}
        possession={possession}
        ballPosition={ballPosition}
        down={down}
        distance={distance}
        homeRoster={homeRoster}
        awayRoster={awayRoster}
        defaultRuleset={gameRuleset}
      />

      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏈</span>
            <span className="font-bold">FOOTBALL</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-300 hover:text-white"
              onClick={() => window.open(`/football/${id}/stats`, '_blank')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Live Stats
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Play Type Selection & Game Control */}
          <div className="col-span-2 space-y-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Play Type</div>
            {PLAY_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  if (type.id === 'other') {
                    setShowTimeoutDialog(true);
                  } else if (type.id === 'penalty') {
                    setShowPenaltyDialog(true);
                  } else {
                    setSelectedPlayType(type.id);
                    setSelectedResult(null);
                  }
                }}
                className={`w-full py-2 px-3 rounded text-sm font-medium transition-all ${
                  selectedPlayType === type.id 
                    ? `${type.color} text-white` 
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {type.id === 'other' ? 'Timeout' : type.label}
              </button>
            ))}
            
            <div className="border-t border-zinc-700 pt-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-zinc-600 text-zinc-300 mb-2"
                onClick={togglePossession}
              >
                Change Possession
              </Button>
            </div>
            
            {/* Game Control Section */}
            <div className="border-t border-zinc-700 pt-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Game Control</div>
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-zinc-600 text-zinc-300 text-xs"
                  onClick={() => { setSpotBallYardLine(ballPosition); setShowSpotBallDialog(true); }}
                >
                  📍 Spot Ball
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-zinc-600 text-zinc-300 text-xs"
                  onClick={() => { setManualDown(down); setManualDistance(distance); setShowSetDownDialog(true); }}
                >
                  🔢 Set Down & Distance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-zinc-600 text-zinc-300 text-xs"
                  onClick={() => setShowAdvanceQuarterDialog(true)}
                >
                  ⏭️ Advance Quarter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-zinc-600 text-zinc-300 text-xs"
                  onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/games/${id}/football-boxscore/pdf`, '_blank')}
                >
                  📄 Box Score PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Center - Field, Drive Info, and Play Input */}
          <div className="col-span-7 space-y-4">
            {/* Top Row: Scoreboard + Current Drive */}
            <div className="flex gap-4">
              {/* Scoreboard - Compact */}
              <div className="flex-1 bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="flex items-center justify-between">
                  {/* Home Team */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-8 rounded"
                      style={{ backgroundColor: homeColor }}
                    />
                    <div>
                      <div className="text-sm font-bold">{homeTeamName}</div>
                      <div className="text-2xl font-black">{homeScore}</div>
                    </div>
                  </div>
                  
                  {/* Clock & Quarter */}
                  <div className="text-center">
                    <div className="text-3xl font-mono font-bold text-yellow-400">
                      {formatTime(clockTime)}
                    </div>
                    <div className="text-sm text-zinc-400">Q{quarter}</div>
                    <div className="flex gap-1 mt-1">
                      <Button
                        size="sm"
                        variant={clockRunning ? "destructive" : "default"}
                        onClick={() => setClockRunning(!clockRunning)}
                        className={`h-6 px-2 ${clockRunning ? "" : "bg-green-600 hover:bg-green-700"}`}
                      >
                        {clockRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setTempClockMinutes(Math.floor(clockTime / 60)); setTempClockSeconds(clockTime % 60); setShowSetClockDialog(true); }}
                        className="h-6 px-2 border-zinc-600"
                      >
                        <Clock className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Away Team */}
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-bold text-right">{awayTeamName}</div>
                      <div className="text-2xl font-black text-right">{awayScore}</div>
                    </div>
                    <div 
                      className="w-3 h-8 rounded"
                      style={{ backgroundColor: awayColor }}
                    />
                  </div>
                </div>
                
                {/* Down & Distance */}
                <div className="mt-2 pt-2 border-t border-zinc-700 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-yellow-400">
                      {down}{down === 1 ? 'st' : down === 2 ? 'nd' : down === 3 ? 'rd' : 'th'} & {distance}
                    </span>
                    <span className="text-zinc-400">on {getYardLineText()}</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={`h-${i}`}
                        className={`w-2 h-2 rounded-full ${i < homeTimeouts ? 'bg-yellow-400' : 'bg-zinc-700'}`}
                        title={`${homeTeamName} TO`}
                      />
                    ))}
                    <span className="text-zinc-600 mx-1">|</span>
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={`a-${i}`}
                        className={`w-2 h-2 rounded-full ${i < awayTimeouts ? 'bg-yellow-400' : 'bg-zinc-700'}`}
                        title={`${awayTeamName} TO`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Time of Possession */}
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1">
                    <span>TOP:</span>
                    <span style={{ color: homeColor }}>{formatTOP(homeTimeOfPossession)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ color: awayColor }}>{formatTOP(awayTimeOfPossession)}</span>
                  </div>
                </div>
              </div>
              
              {/* Current Drive */}
              <div className="w-48 bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Current Drive</div>
                <div 
                  className="text-sm font-bold mb-2 flex items-center gap-2"
                  style={{ color: possession === 'home' ? homeColor : awayColor }}
                >
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {possession === 'home' ? homeTeamName : awayTeamName}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold">{currentDrive.plays}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Plays</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{currentDrive.yards}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Yards</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{getDriveTime()}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Time</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 h-6 text-xs border-zinc-600"
                  onClick={() => startNewDrive(possession)}
                >
                  New Drive
                </Button>
              </div>
            </div>
            
            {/* Football Field */}
            <FootballField
              ballPosition={ballPosition}
              possession={possession}
              homeTeam={homeTeamName}
              awayTeam={awayTeamName}
              homeColor={homeColor}
              awayColor={awayColor}
              firstDownMarker={firstDownMarker}
            />

            {/* Ball Position Controls */}
            <div className="flex items-center justify-center gap-4 bg-zinc-900 rounded-lg p-3">
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-600"
                onClick={() => setBallPosition(prev => Math.max(0, prev - 10))}
              >
                <ChevronLeft className="w-4 h-4" />
                -10
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-600"
                onClick={() => setBallPosition(prev => Math.max(0, prev - 1))}
              >
                -1
              </Button>
              <div className="px-4 py-2 bg-zinc-800 rounded text-center min-w-[100px]">
                <div className="text-xs text-zinc-500">Ball On</div>
                <div className="font-bold">{getYardLineText()}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-600"
                onClick={() => setBallPosition(prev => Math.min(100, prev + 1))}
              >
                +1
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-600"
                onClick={() => setBallPosition(prev => Math.min(100, prev + 10))}
              >
                +10
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Play Result Selection */}
            {selectedPlayType && (
              <div className="bg-zinc-900 rounded-lg p-4">
                {/* RUN PLAY WORKFLOW */}
                {selectedPlayType === 'run' && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-green-400 mb-2">RUN PLAY</div>
                    
                    {/* Step 1: Select Ball Carrier */}
                    {playStep === 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">Select Ball Carrier</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={runCarrierNumber || ''}
                            onChange={(e) => setRunCarrierNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            onKeyPress={(e) => e.key === 'Enter' && runCarrierNumber && setPlayStep(1)}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => { setRunCarrierNumber(player.number); setPlayStep(1); }}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  runCarrierNumber == player.number 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button 
                          onClick={() => setPlayStep(1)} 
                          disabled={!runCarrierNumber}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Continue →
                        </Button>
                      </div>
                    )}
                    
                    {/* Step 2: Select Result & Yards */}
                    {playStep === 1 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          Ball Carrier: <span className="text-green-400 font-bold">#{runCarrierNumber}</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Result</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'gain', label: 'Gain', color: 'bg-green-600' },
                            { id: 'no_gain', label: 'No Gain', color: 'bg-zinc-600' },
                            { id: 'loss', label: 'Loss', color: 'bg-red-600' },
                            { id: 'touchdown', label: 'Touchdown', color: 'bg-yellow-500' },
                            { id: 'fumble_rec', label: 'Fumble/Rec', color: 'bg-orange-600' },
                            { id: 'fumble_lost', label: 'Fumble/Lost', color: 'bg-red-700' },
                          ].map((result) => (
                            <button
                              key={result.id}
                              onClick={() => setSelectedResult(result.id)}
                              className={`py-2 px-4 rounded font-medium ${
                                selectedResult === result.id ? result.color + ' text-white' : 'bg-zinc-700 hover:bg-zinc-600'
                              }`}
                            >
                              {result.label}
                            </button>
                          ))}
                        </div>
                        
                        {/* Yards */}
                        {selectedResult && selectedResult !== 'no_gain' && (
                          <div className="flex items-center justify-center gap-3 mt-4">
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 5)}>-5</Button>
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 1)}>-1</Button>
                            <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                              <div className="text-xs text-zinc-500">Yards</div>
                              <div className="text-2xl font-bold text-yellow-400">{yards}</div>
                            </div>
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev + 1)}>+1</Button>
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev + 5)}>+5</Button>
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(0)}>← Back</Button>
                          <Button 
                            onClick={() => setPlayStep(2)} 
                            disabled={!selectedResult}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Continue →
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Select Tackler */}
                    {playStep === 2 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          #{runCarrierNumber} - {selectedResult} for {yards} yards
                          {yards >= distance && <span className="text-green-400 ml-2 font-bold">FIRST DOWN!</span>}
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Tackler</div>
                        <Button 
                          onClick={() => { setRunTacklerNumber(null); handleSubmitRunPlay(); }}
                          className="w-full bg-zinc-700 hover:bg-zinc-600 mb-2"
                        >
                          No Tackle / Not Recorded
                        </Button>
                        
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={runTacklerNumber || ''}
                            onChange={(e) => setRunTacklerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? awayRoster : homeRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setRunTacklerNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  runTacklerNumber == player.number 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(1)}>← Back</Button>
                          <Button 
                            onClick={handleSubmitRunPlay}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* PASS PLAY WORKFLOW */}
                {selectedPlayType === 'pass' && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-blue-400 mb-2">PASS PLAY</div>
                    
                    {/* Step 1: Select QB */}
                    {playStep === 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">Select Quarterback</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={passQBNumber || ''}
                            onChange={(e) => setPassQBNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            onKeyPress={(e) => e.key === 'Enter' && passQBNumber && setPlayStep(1)}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => { setPassQBNumber(player.number); setPlayStep(1); }}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  passQBNumber == player.number 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button 
                          onClick={() => setPlayStep(1)} 
                          disabled={!passQBNumber}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Continue →
                        </Button>
                      </div>
                    )}
                    
                    {/* Step 2: Select Result */}
                    {playStep === 1 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          QB: <span className="text-blue-400 font-bold">#{passQBNumber}</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Result</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'complete', label: 'Complete', color: 'bg-green-600' },
                            { id: 'incomplete', label: 'Incomplete', color: 'bg-zinc-600' },
                            { id: 'touchdown', label: 'Touchdown', color: 'bg-yellow-500' },
                            { id: 'sacked', label: 'Sacked', color: 'bg-red-600' },
                            { id: 'intercepted', label: 'Intercepted', color: 'bg-red-700' },
                            { id: 'dropped', label: 'Dropped', color: 'bg-orange-600' },
                            { id: 'broken_up', label: 'Broken Up', color: 'bg-purple-600' },
                          ].map((result) => (
                            <button
                              key={result.id}
                              onClick={() => { setSelectedResult(result.id); setPlayStep(2); }}
                              className={`py-2 px-4 rounded font-medium ${
                                selectedResult === result.id ? result.color + ' text-white' : 'bg-zinc-700 hover:bg-zinc-600'
                              }`}
                            >
                              {result.label}
                            </button>
                          ))}
                        </div>
                        
                        <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(0)}>← Back</Button>
                      </div>
                    )}
                    
                    {/* Step 3: Complete/Touchdown - Select Receiver & Yards */}
                    {playStep === 2 && ['complete', 'touchdown'].includes(selectedResult) && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          QB: #{passQBNumber} - <span className={selectedResult === 'touchdown' ? 'text-yellow-400' : 'text-green-400'}>{selectedResult.toUpperCase()}</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Receiver</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={passReceiverNumber || ''}
                            onChange={(e) => setPassReceiverNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPassReceiverNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  passReceiverNumber == player.number 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Yards */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 5)}>-5</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 1)}>-1</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Yards</div>
                            <div className="text-2xl font-bold text-yellow-400">{yards}</div>
                            {yards >= distance && <div className="text-xs text-green-400 font-bold">FIRST DOWN!</div>}
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev + 1)}>+1</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev + 5)}>+5</Button>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(1); }}>← Back</Button>
                          <Button 
                            onClick={() => setPlayStep(3)}
                            disabled={!passReceiverNumber}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Continue →
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Sacked - Select Defender & Yards Lost */}
                    {playStep === 2 && selectedResult === 'sacked' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          QB: #{passQBNumber} - <span className="text-red-400">SACKED</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Defender (Sack by)</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={passDefenderNumber || ''}
                            onChange={(e) => setPassDefenderNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? awayRoster : homeRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPassDefenderNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  passDefenderNumber == player.number 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Yards Lost */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => Math.min(0, prev + 1))}>+1</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Yards Lost</div>
                            <div className="text-2xl font-bold text-red-400">{Math.abs(yards)}</div>
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 1)}>-1</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 5)}>-5</Button>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(1); }}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPassPlay}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Intercepted - Select Defender & Return */}
                    {playStep === 2 && selectedResult === 'intercepted' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          QB: #{passQBNumber} - <span className="text-red-400">INTERCEPTED</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Interceptor</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={passDefenderNumber || ''}
                            onChange={(e) => setPassDefenderNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? awayRoster : homeRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPassDefenderNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  passDefenderNumber == player.number 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Return Yards */}
                        <div className="text-sm text-zinc-400 uppercase mt-4">Return Yards</div>
                        <div className="flex items-center justify-center gap-3">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setInterceptionReturnYards(prev => Math.max(0, prev - 5))}>-5</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setInterceptionReturnYards(prev => Math.max(0, prev - 1))}>-1</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Return</div>
                            <div className="text-2xl font-bold text-yellow-400">{interceptionReturnYards}</div>
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setInterceptionReturnYards(prev => prev + 1)}>+1</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setInterceptionReturnYards(prev => prev + 5)}>+5</Button>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(1); }}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPassPlay}
                            disabled={!passDefenderNumber}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Dropped - Select Target */}
                    {playStep === 2 && selectedResult === 'dropped' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          QB: #{passQBNumber} - <span className="text-orange-400">DROPPED PASS</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Targeted Receiver</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={passReceiverNumber || ''}
                            onChange={(e) => setPassReceiverNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPassReceiverNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  passReceiverNumber == player.number 
                                    ? 'bg-orange-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(1); }}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPassPlay}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Broken Up - Select Defender */}
                    {playStep === 2 && selectedResult === 'broken_up' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          QB: #{passQBNumber} - <span className="text-purple-400">PASS BROKEN UP</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Defender (Broken Up By)</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={passDefenderNumber || ''}
                            onChange={(e) => setPassDefenderNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? awayRoster : homeRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPassDefenderNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  passDefenderNumber == player.number 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(1); }}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPassPlay}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Incomplete */}
                    {playStep === 2 && selectedResult === 'incomplete' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          QB: #{passQBNumber} - <span className="text-zinc-400">INCOMPLETE</span>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(1); }}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPassPlay}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 4: Tackler for Complete/TD */}
                    {playStep === 3 && ['complete', 'touchdown'].includes(selectedResult) && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          #{passQBNumber} → #{passReceiverNumber} for {yards} yards
                          {yards >= distance && <span className="text-green-400 ml-2 font-bold">FIRST DOWN!</span>}
                          {selectedResult === 'touchdown' && <span className="text-yellow-400 ml-2 font-bold">TOUCHDOWN!</span>}
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Tackler</div>
                        <Button 
                          onClick={() => { setPassDefenderNumber(null); handleSubmitPassPlay(); }}
                          className="w-full bg-zinc-700 hover:bg-zinc-600 mb-2"
                        >
                          No Tackle / Not Recorded
                        </Button>
                        
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={passDefenderNumber || ''}
                            onChange={(e) => setPassDefenderNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? awayRoster : homeRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPassDefenderNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  passDefenderNumber == player.number 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(2)}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPassPlay}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* PUNT PLAY WORKFLOW */}
                {selectedPlayType === 'punt' && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-purple-400 mb-2">PUNT PLAY</div>
                    
                    {/* Step 1: Select Punter */}
                    {playStep === 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">Select Punter</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={puntPunterNumber || ''}
                            onChange={(e) => setPuntPunterNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            onKeyPress={(e) => e.key === 'Enter' && puntPunterNumber && setPlayStep(1)}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => { setPuntPunterNumber(player.number); setPlayStep(1); }}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  puntPunterNumber == player.number 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button 
                          onClick={() => setPlayStep(1)} 
                          disabled={!puntPunterNumber}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Continue →
                        </Button>
                      </div>
                    )}
                    
                    {/* Step 2: Result Selection */}
                    {playStep === 1 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          Punter: <span className="text-purple-400 font-bold">#{puntPunterNumber}</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Result</div>
                        <div className="flex flex-wrap gap-2">
                          {PLAY_RESULTS.punt.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => setSelectedResult(result.id)}
                              className={`py-2 px-4 rounded font-medium ${
                                selectedResult === result.id ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'
                              }`}
                            >
                              {result.label}
                            </button>
                          ))}
                        </div>
                        
                        {/* Punt Distance */}
                        {selectedResult && selectedResult !== 'blocked' && (
                          <div className="flex items-center justify-center gap-3 mt-4">
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntDistance(prev => Math.max(0, prev - 5))}>-5</Button>
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntDistance(prev => Math.max(0, prev - 1))}>-1</Button>
                            <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                              <div className="text-xs text-zinc-500">Punt Distance</div>
                              <div className="text-2xl font-bold text-purple-400">{puntDistance}</div>
                            </div>
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntDistance(prev => prev + 1)}>+1</Button>
                            <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntDistance(prev => prev + 5)}>+5</Button>
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(0)}>← Back</Button>
                          <Button 
                            onClick={() => ['touchback', 'blocked'].includes(selectedResult) ? handleSubmitPuntPlay() : setPlayStep(2)}
                            disabled={!selectedResult}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {['touchback', 'blocked'].includes(selectedResult) ? 'Complete Play ✓' : 'Continue →'}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Select Returner */}
                    {playStep === 2 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          #{puntPunterNumber} punt for {puntDistance} yards - {selectedResult}
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Returner</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={puntReturnerNumber || ''}
                            onChange={(e) => setPuntReturnerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? awayRoster : homeRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPuntReturnerNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  puntReturnerNumber == player.number 
                                    ? 'bg-yellow-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(1)}>← Back</Button>
                          <Button 
                            onClick={() => selectedResult === 'fair_catch' ? handleSubmitPuntPlay() : setPlayStep(3)}
                            disabled={!puntReturnerNumber}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {selectedResult === 'fair_catch' ? 'Complete Play ✓' : 'Continue →'}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 4: Return Start Yard Line */}
                    {playStep === 3 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          #{puntPunterNumber} punt for {puntDistance} yards • Returner: #{puntReturnerNumber}
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Return Starts At (Yard Line)</div>
                        <div className="flex items-center justify-center gap-3 mt-2">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnStartYardLine(prev => Math.max(0, prev - 10))}>-10</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnStartYardLine(prev => Math.max(0, prev - 5))}>-5</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Yard Line</div>
                            <div className="text-2xl font-bold text-blue-400">{puntReturnStartYardLine}</div>
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnStartYardLine(prev => Math.min(100, prev + 5))}>+5</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnStartYardLine(prev => Math.min(100, prev + 10))}>+10</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {[5, 10, 15, 20, 25, 30, 35, 40].map(yl => (
                            <Button 
                              key={yl}
                              size="sm" 
                              variant="outline" 
                              className={`border-zinc-600 ${puntReturnStartYardLine === yl ? 'bg-blue-600 border-blue-500' : ''}`}
                              onClick={() => setPuntReturnStartYardLine(yl)}
                            >
                              {yl}
                            </Button>
                          ))}
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(2)}>← Back</Button>
                          <Button 
                            onClick={() => setPlayStep(4)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Continue →
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 5: Return Yards */}
                    {playStep === 4 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          #{puntPunterNumber} punt • #{puntReturnerNumber} fielded at {puntReturnStartYardLine} yard line
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Return Yards</div>
                        <div className="flex items-center justify-center gap-3 mt-2">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnYards(prev => Math.max(0, prev - 5))}>-5</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnYards(prev => Math.max(0, prev - 1))}>-1</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Return Yards</div>
                            <div className="text-2xl font-bold text-yellow-400">{puntReturnYards}</div>
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnYards(prev => prev + 1)}>+1</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPuntReturnYards(prev => prev + 5)}>+5</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {[0, 5, 10, 15, 20, 25, 30].map(y => (
                            <Button 
                              key={y}
                              size="sm" 
                              variant="outline" 
                              className={`border-zinc-600 ${puntReturnYards === y ? 'bg-yellow-600 border-yellow-500' : ''}`}
                              onClick={() => setPuntReturnYards(y)}
                            >
                              {y}
                            </Button>
                          ))}
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(3)}>← Back</Button>
                          <Button 
                            onClick={() => setPlayStep(5)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Continue →
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 6: Select Tackler */}
                    {playStep === 5 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          #{puntReturnerNumber} returned {puntReturnYards} yards
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Tackler</div>
                        <Button 
                          onClick={() => { setPuntTacklerNumber(null); handleSubmitPuntPlay(); }}
                          className="w-full bg-zinc-700 hover:bg-zinc-600 mb-2"
                        >
                          No Tackle / Not Recorded
                        </Button>
                        
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={puntTacklerNumber || ''}
                            onChange={(e) => setPuntTacklerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setPuntTacklerNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  puntTacklerNumber == player.number 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(4)}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPuntPlay}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* FIELD GOAL WORKFLOW */}
                {selectedPlayType === 'field_goal' && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-yellow-400 mb-2">FIELD GOAL</div>
                    
                    {/* Step 1: Select Kicker */}
                    {playStep === 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">Select Kicker</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={kickerNumber || ''}
                            onChange={(e) => setKickerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            onKeyPress={(e) => e.key === 'Enter' && kickerNumber && setPlayStep(1)}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => { setKickerNumber(player.number); setPlayStep(1); }}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  kickerNumber == player.number 
                                    ? 'bg-yellow-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button 
                          onClick={() => setPlayStep(1)} 
                          disabled={!kickerNumber}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Continue →
                        </Button>
                      </div>
                    )}
                    
                    {/* Step 2: Distance & Result */}
                    {playStep === 1 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          Kicker: <span className="text-yellow-400 font-bold">#{kickerNumber}</span>
                        </div>
                        
                        {/* FG Distance */}
                        <div className="text-sm text-zinc-400 uppercase">Distance</div>
                        <div className="flex items-center justify-center gap-3">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setFgDistance(prev => Math.max(17, prev - 5))}>-5</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setFgDistance(prev => Math.max(17, prev - 1))}>-1</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Distance (yards)</div>
                            <div className="text-2xl font-bold text-yellow-400">{fgDistance}</div>
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setFgDistance(prev => prev + 1)}>+1</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setFgDistance(prev => prev + 5)}>+5</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {[20, 25, 30, 35, 40, 45, 50, 55].map(d => (
                            <Button 
                              key={d}
                              size="sm" 
                              variant="outline" 
                              className={`border-zinc-600 ${fgDistance === d ? 'bg-yellow-600 border-yellow-500' : ''}`}
                              onClick={() => setFgDistance(d)}
                            >
                              {d}
                            </Button>
                          ))}
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase mt-4">Result</div>
                        <div className="flex flex-wrap gap-2">
                          {PLAY_RESULTS.field_goal.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => setSelectedResult(result.id)}
                              className={`py-2 px-4 rounded font-medium ${
                                selectedResult === result.id 
                                  ? result.id === 'good' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                  : 'bg-zinc-700 hover:bg-zinc-600'
                              }`}
                            >
                              {result.label}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(0)}>← Back</Button>
                          <Button 
                            onClick={() => selectedResult === 'blocked' ? setPlayStep(2) : handleSubmitFieldGoal()}
                            disabled={!selectedResult}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            {selectedResult === 'blocked' ? 'Continue →' : 'Complete Play ✓'}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Blocked - Select Blocker */}
                    {playStep === 2 && selectedResult === 'blocked' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          #{kickerNumber} {fgDistance}-yard FG attempt - <span className="text-red-400 font-bold">BLOCKED</span>
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Select Blocker</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={fgBlockerNumber || ''}
                            onChange={(e) => setFgBlockerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? awayRoster : homeRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setFgBlockerNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  fgBlockerNumber == player.number 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(1)}>← Back</Button>
                          <Button 
                            onClick={() => setPlayStep(3)}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            Continue →
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 4: Blocked - Return Distance */}
                    {playStep === 3 && selectedResult === 'blocked' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          Blocked by {fgBlockerNumber ? `#${fgBlockerNumber}` : 'defense'}
                        </div>
                        
                        <div className="text-sm text-zinc-400 uppercase">Return</div>
                        
                        <Button 
                          onClick={() => { setFgNoReturn(true); handleSubmitFieldGoal(); }}
                          className={`w-full mb-2 ${fgNoReturn ? 'bg-zinc-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                        >
                          No Return / Dead Ball
                        </Button>
                        
                        <div className="text-sm text-zinc-500 text-center">- or select return yards -</div>
                        
                        <div className="flex items-center justify-center gap-3 mt-2">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setFgNoReturn(false); setFgReturnYards(prev => Math.max(0, prev - 5)); }}>-5</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setFgNoReturn(false); setFgReturnYards(prev => Math.max(0, prev - 1)); }}>-1</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Return Yards</div>
                            <div className="text-2xl font-bold text-yellow-400">{fgReturnYards}</div>
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setFgNoReturn(false); setFgReturnYards(prev => prev + 1); }}>+1</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => { setFgNoReturn(false); setFgReturnYards(prev => prev + 5); }}>+5</Button>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(2)}>← Back</Button>
                          <Button 
                            onClick={() => { setFgNoReturn(false); handleSubmitFieldGoal(); }}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete Play ✓
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* EXTRA POINT WORKFLOW */}
                {selectedPlayType === 'extra_point' && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-yellow-500 mb-2">EXTRA POINT / 2-PT CONVERSION</div>
                    
                    {/* Step 1: Select Type */}
                    {playStep === 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">Select Attempt Type</div>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => { setSelectedResult('pat'); setPlayStep(1); }}
                            className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border-2 border-zinc-600 hover:border-yellow-500"
                          >
                            <div className="text-2xl mb-2">🏈</div>
                            <div className="font-bold text-yellow-400">PAT Kick</div>
                            <div className="text-xs text-zinc-500">1 Point</div>
                          </button>
                          <button
                            onClick={() => { setSelectedResult('two_point'); setPlayStep(3); }}
                            className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border-2 border-zinc-600 hover:border-blue-500"
                          >
                            <div className="text-2xl mb-2">🎯</div>
                            <div className="font-bold text-blue-400">2-Point Conversion</div>
                            <div className="text-xs text-zinc-500">2 Points</div>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2: PAT - Select Kicker */}
                    {playStep === 1 && selectedResult === 'pat' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">Select Kicker</div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Enter #"
                            value={kickerNumber || ''}
                            onChange={(e) => setKickerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
                          />
                          <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                            {(possession === 'home' ? homeRoster : awayRoster).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setKickerNumber(player.number)}
                                className={`px-2 py-1 rounded text-sm font-bold ${
                                  kickerNumber == player.number 
                                    ? 'bg-yellow-600 text-white' 
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                              >
                                #{player.number}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => setPlayStep(0)}>← Back</Button>
                          <Button 
                            onClick={() => setPlayStep(2)}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            Continue →
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: PAT - Result */}
                    {playStep === 2 && selectedResult === 'pat' && (
                      <div className="space-y-4">
                        {kickerNumber && (
                          <div className="text-sm text-zinc-400">
                            Kicker: <span className="text-yellow-400 font-bold">#{kickerNumber}</span>
                          </div>
                        )}
                        
                        <div className="text-sm text-zinc-400 uppercase">PAT Result</div>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => { setSelectedResult('good'); handleSubmitExtraPoint(); }}
                            className="p-4 bg-green-600/20 hover:bg-green-600/40 rounded-lg border-2 border-green-600"
                          >
                            <div className="text-2xl mb-2">✓</div>
                            <div className="font-bold text-green-400">GOOD</div>
                            <div className="text-xs text-zinc-400">+1 Point</div>
                          </button>
                          <button
                            onClick={() => { setSelectedResult('no_good'); handleSubmitExtraPoint(); }}
                            className="p-4 bg-red-600/20 hover:bg-red-600/40 rounded-lg border-2 border-red-600"
                          >
                            <div className="text-2xl mb-2">✗</div>
                            <div className="font-bold text-red-400">NO GOOD</div>
                            <div className="text-xs text-zinc-400">0 Points</div>
                          </button>
                        </div>
                        
                        <Button variant="outline" className="border-zinc-600 w-full mt-4" onClick={() => setPlayStep(1)}>← Back</Button>
                      </div>
                    )}
                    
                    {/* Step 4: 2-Point Conversion - Result */}
                    {playStep === 3 && selectedResult === 'two_point' && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">2-Point Conversion Result</div>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => { setSelectedResult('two_point_good'); handleSubmitExtraPoint(); }}
                            className="p-4 bg-green-600/20 hover:bg-green-600/40 rounded-lg border-2 border-green-600"
                          >
                            <div className="text-2xl mb-2">✓</div>
                            <div className="font-bold text-green-400">GOOD</div>
                            <div className="text-xs text-zinc-400">+2 Points</div>
                          </button>
                          <button
                            onClick={() => { setSelectedResult('two_point_no_good'); handleSubmitExtraPoint(); }}
                            className="p-4 bg-red-600/20 hover:bg-red-600/40 rounded-lg border-2 border-red-600"
                          >
                            <div className="text-2xl mb-2">✗</div>
                            <div className="font-bold text-red-400">NO GOOD</div>
                            <div className="text-xs text-zinc-400">0 Points</div>
                          </button>
                        </div>
                        
                        <Button variant="outline" className="border-zinc-600 w-full mt-4" onClick={() => setPlayStep(0)}>← Back</Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* PENALTY WORKFLOW */}
                {selectedPlayType === 'penalty' && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-red-400 mb-2">PENALTY</div>
                    
                    {/* Step 1: Penalty on which team */}
                    {playStep === 0 && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400 uppercase">Penalty Result</div>
                        <div className="flex flex-wrap gap-2">
                          {PLAY_RESULTS.penalty.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => { setSelectedResult(result.id); setPlayStep(1); }}
                              className={`py-2 px-4 rounded font-medium ${
                                selectedResult === result.id ? 'bg-red-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'
                              }`}
                            >
                              {result.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2: Penalty Details */}
                    {playStep === 1 && ['offense', 'defense'].includes(selectedResult) && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          Penalty on: <span className="text-red-400 font-bold">{selectedResult === 'offense' ? 'Offense' : 'Defense'}</span>
                        </div>
                        
                        {/* Penalty Yards */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPenaltyYards(prev => Math.max(1, prev - 5))}>-5</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPenaltyYards(prev => Math.max(1, prev - 1))}>-1</Button>
                          <div className="px-4 py-2 bg-zinc-800 rounded text-center">
                            <div className="text-xs text-zinc-500">Yards</div>
                            <div className="text-2xl font-bold text-red-400">{penaltyYards}</div>
                          </div>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPenaltyYards(prev => prev + 1)}>+1</Button>
                          <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setPenaltyYards(prev => prev + 5)}>+5</Button>
                        </div>
                        
                        {/* Quick Select Common Penalties */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button onClick={() => setPenaltyYards(5)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">5 yds</button>
                          <button onClick={() => setPenaltyYards(10)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">10 yds</button>
                          <button onClick={() => setPenaltyYards(15)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">15 yds</button>
                        </div>
                        
                        {/* Penalty Description (optional) */}
                        <input
                          type="text"
                          placeholder="Penalty description (optional)"
                          value={penaltyDescription}
                          onChange={(e) => setPenaltyDescription(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                        />
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(0); }}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPenalty}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Apply Penalty ✓
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Declined/Offsetting */}
                    {playStep === 1 && ['declined', 'offsetting'].includes(selectedResult) && (
                      <div className="space-y-4">
                        <div className="text-sm text-zinc-400">
                          Result: <span className="text-red-400 font-bold">{selectedResult === 'declined' ? 'Penalty Declined' : 'Offsetting Penalties'}</span>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="border-zinc-600" onClick={() => { setSelectedResult(null); setPlayStep(0); }}>← Back</Button>
                          <Button 
                            onClick={handleSubmitPenalty}
                            className="bg-green-600 hover:bg-green-700 px-8"
                          >
                            Complete ✓
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* OTHER PLAY TYPES (kickoff, other) - Keep original simple flow */}
                {!['run', 'pass', 'punt', 'field_goal', 'extra_point', 'penalty'].includes(selectedPlayType) && (
                  <>
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
                      {PLAY_TYPES.find(p => p.id === selectedPlayType)?.label} Result
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {PLAY_RESULTS[selectedPlayType]?.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => setSelectedResult(result.id)}
                          className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                            selectedResult === result.id 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {result.label}
                        </button>
                      ))}
                    </div>

                    {/* Yardage Input */}
                    {selectedResult && !['incomplete', 'dropped', 'broken_up', 'no_good', 'good'].includes(selectedResult) && (
                      <div className="mt-4 flex items-center justify-center gap-4">
                        <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 5)}>-5</Button>
                        <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev - 1)}>-1</Button>
                        <div className="px-6 py-2 bg-zinc-800 rounded text-center min-w-[100px]">
                          <div className="text-xs text-zinc-500">Yards</div>
                          <div className="text-2xl font-bold text-yellow-400">{yards}</div>
                        </div>
                        <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev + 1)}>+1</Button>
                        <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => setYards(prev => prev + 5)}>+5</Button>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="mt-4 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        className="border-zinc-600 text-zinc-300"
                        onClick={() => {
                          setSelectedPlayType(null);
                          setSelectedResult(null);
                          setYards(0);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700 px-8"
                        onClick={handleSubmitPlay}
                        disabled={!selectedResult}
                      >
                        Submit Play
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Play Log */}
          <div className="col-span-3">
            <div className="bg-zinc-900 rounded-lg p-4 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Play-by-Play</div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white h-6 px-2"
                  onClick={undoLastPlay}
                  disabled={playLog.length === 0}
                >
                  <Undo2 className="w-3 h-3 mr-1" />
                  Undo
                </Button>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {playLog.length === 0 ? (
                  <div className="text-zinc-600 text-sm text-center py-8">
                    No plays recorded yet
                  </div>
                ) : (
                  playLog.map((play) => (
                    <div
                      key={play.id}
                      className={`bg-zinc-800 rounded p-2 text-sm ${editingPlayId === play.id ? 'ring-2 ring-blue-500' : 'hover:bg-zinc-750 cursor-pointer'}`}
                      onClick={() => editingPlayId !== play.id && handleEditPlay(play)}
                    >
                      {editingPlayId === play.id ? (
                        // Edit Mode
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={editPlayData?.quarter || 1}
                              onChange={(e) => setEditPlayData(prev => ({ ...prev, quarter: parseInt(e.target.value) }))}
                              className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs"
                            >
                              {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                            </select>
                            <input
                              type="text"
                              value={editPlayData?.clock || ''}
                              onChange={(e) => setEditPlayData(prev => ({ ...prev, clock: e.target.value }))}
                              className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs w-16"
                              placeholder="12:00"
                            />
                            <select
                              value={editPlayData?.team || 'home'}
                              onChange={(e) => setEditPlayData(prev => ({ ...prev, team: e.target.value }))}
                              className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs"
                            >
                              <option value="home">{homeTeamName}</option>
                              <option value="away">{awayTeamName}</option>
                              <option value="none">None</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={editPlayData?.type || 'run'}
                              onChange={(e) => setEditPlayData(prev => ({ ...prev, type: e.target.value }))}
                              className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs"
                            >
                              <option value="run">Run</option>
                              <option value="pass">Pass</option>
                              <option value="punt">Punt</option>
                              <option value="kickoff">Kickoff</option>
                              <option value="field_goal">Field Goal</option>
                              <option value="extra_point">Extra Point</option>
                              <option value="penalty">Penalty</option>
                              <option value="timeout">Timeout</option>
                            </select>
                            <input
                              type="number"
                              value={editPlayData?.yards || 0}
                              onChange={(e) => setEditPlayData(prev => ({ ...prev, yards: parseInt(e.target.value) || 0 }))}
                              className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs w-16"
                              placeholder="Yards"
                            />
                          </div>
                          <textarea
                            value={editPlayData?.description || ''}
                            onChange={(e) => setEditPlayData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs"
                            rows={2}
                            placeholder="Play description"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={handleSaveEditPlay}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-zinc-600" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="h-6 px-2 text-xs ml-auto"
                              onClick={() => {
                                setPlayLog(prev => prev.filter(p => p.id !== editingPlayId));
                                handleCancelEdit();
                                toast.success('Play deleted');
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
                            <span>Q{play.quarter} • {play.clock}</span>
                            <span 
                              className="font-bold"
                              style={{ color: play.team === 'home' ? homeColor : play.team === 'away' ? awayColor : '#888' }}
                            >
                              {play.team === 'home' ? homeTeamName?.substring(0, 3).toUpperCase() : play.team === 'away' ? awayTeamName?.substring(0, 3).toUpperCase() : '---'}
                            </span>
                          </div>
                          <div className="text-zinc-300">{play.description}</div>
                          {play.ball_on && (
                            <div className="text-zinc-500 text-xs mt-1">
                              {play.down && `${play.down === 1 ? '1st' : play.down === 2 ? '2nd' : play.down === 3 ? '3rd' : '4th'} & ${play.distance || 10} • `}
                              {play.ball_on}
                            </div>
                          )}
                          <div className="text-zinc-600 text-[10px] mt-1 opacity-0 hover:opacity-100 transition-opacity">
                            Click to edit
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

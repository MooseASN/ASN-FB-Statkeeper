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
  Share2
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Football Field Component with StatMoose logo
function FootballField({ ballPosition, possession, homeTeam, awayTeam, homeColor, awayColor }) {
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
        
        {/* First down marker */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-yellow-400/70"
          style={{ left: `${Math.min(100, ballPosition + 10)}%` }}
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
function YardLineSelector({ label, value, onChange, direction = 'left' }) {
  const presets = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  
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
            onChange={(e) => onChange(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
            className="w-20 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-blue-500"
          />
          <div className="text-xs text-zinc-500 mt-1">Yard Line</div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.min(50, value + 1))}
        >
          +1
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.min(50, value + 5))}
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
  
  // Step 4: Return Details (fielded at, returned to, tackler)
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
            {/* Special Results */}
            <div>
              <label className="text-sm text-zinc-400 uppercase tracking-wide mb-2 block">
                Special Result (or skip)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'touchback', fieldedAt: 25, returnedTo: 25 }))}
                  className={`${kickoffData.specialResult === 'touchback' ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Touchback
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'fair_catch' }))}
                  className={`${kickoffData.specialResult === 'fair_catch' ? 'bg-yellow-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Fair Catch
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'out_of_bounds', fieldedAt: 40, returnedTo: 40 }))}
                  className={`${kickoffData.specialResult === 'out_of_bounds' ? 'bg-purple-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Out of Bounds
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: 'touchdown' }))}
                  className={`${kickoffData.specialResult === 'touchdown' ? 'bg-green-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Touchdown
                </Button>
                <Button
                  onClick={() => setKickoffData(prev => ({ ...prev, specialResult: null }))}
                  className={`${!kickoffData.specialResult ? 'bg-orange-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                  Regular Return
                </Button>
              </div>
            </div>
            
            {/* Yard Line Inputs - Only show if regular return */}
            {!kickoffData.specialResult && (
              <>
                <YardLineSelector
                  label="Fielded At (Yard Line)"
                  value={kickoffData.fieldedAt || 5}
                  onChange={(val) => setKickoffData(prev => ({ ...prev, fieldedAt: val }))}
                />
                
                <YardLineSelector
                  label="Returned To (Yard Line)"
                  value={kickoffData.returnedTo || 25}
                  onChange={(val) => setKickoffData(prev => ({ ...prev, returnedTo: val }))}
                />
              </>
            )}
            
            {kickoffData.specialResult === 'fair_catch' && (
              <YardLineSelector
                label="Fair Catch At (Yard Line)"
                value={kickoffData.fieldedAt || 25}
                onChange={(val) => setKickoffData(prev => ({ ...prev, fieldedAt: val, returnedTo: val }))}
              />
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
  const [loading, setLoading] = useState(true);
  const [showKickoffDialog, setShowKickoffDialog] = useState(false);
  
  // Play state
  const [possession, setPossession] = useState('home'); // 'home' or 'away'
  const [ballPosition, setBallPosition] = useState(25); // 0-100 (yard position on field)
  const [down, setDown] = useState(1);
  const [distance, setDistance] = useState(10);
  const [quarter, setQuarter] = useState(1);
  
  // Current play
  const [selectedPlayType, setSelectedPlayType] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [yards, setYards] = useState(0);
  
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

  useEffect(() => {
    fetchGame();
  }, [id]);

  const fetchGame = async () => {
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
      
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
        setShowKickoffDialog(true);
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

  // Handle kickoff selection
  const handleKickoffSelect = (team) => {
    // Team that kicks receives next half, so opposite team has possession
    const receivingTeam = team === 'home' ? 'away' : 'home';
    setPossession(receivingTeam);
    setBallPosition(receivingTeam === 'home' ? 25 : 75);
    setShowKickoffDialog(false);
    
    // Add kickoff to play log
    const kickoffPlay = {
      id: Date.now(),
      quarter,
      clock: formatTime(clockTime),
      team: team,
      type: 'kickoff',
      description: `${team === 'home' ? game.home_team_name : game.away_team_name} kicks off`,
    };
    setPlayLog(prev => [kickoffPlay, ...prev]);
    
    toast.success(`${receivingTeam === 'home' ? game.home_team_name : game.away_team_name} receives`);
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

  // Change possession
  const togglePossession = () => {
    setPossession(prev => prev === 'home' ? 'away' : 'home');
    setDown(1);
    setDistance(10);
  };

  // Handle using a timeout
  const handleUseTimeout = (team) => {
    if (team === 'home' && homeTimeouts > 0) {
      setHomeTimeouts(prev => prev - 1);
      toast.success(`${game?.home_team_name} timeout`);
    } else if (team === 'away' && awayTimeouts > 0) {
      setAwayTimeouts(prev => prev - 1);
      toast.success(`${game?.away_team_name} timeout`);
    }
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Kickoff Dialog */}
      <KickoffDialog
        open={showKickoffDialog}
        homeTeam={homeTeamName}
        awayTeam={awayTeamName}
        homeColor={homeColor}
        awayColor={awayColor}
        onSelect={handleKickoffSelect}
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
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </header>

      {/* Scoreboard */}
      <div className="bg-zinc-900/50 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Home Team */}
            <div 
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: `${homeColor}20` }}
            >
              <div className="text-sm text-zinc-400 uppercase tracking-wide">Home</div>
              <div className="text-xl font-bold" style={{ color: homeColor }}>{homeTeamName}</div>
              <div className="text-5xl font-black mt-2">{homeScore}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs text-zinc-500">Timeouts:</span>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${i < homeTimeouts ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                      onClick={() => i < homeTimeouts && handleUseTimeout('home')}
                    />
                  ))}
                </div>
              </div>
              {possession === 'home' && (
                <div className="mt-2 text-xs font-bold text-green-400 flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  POSSESSION
                </div>
              )}
            </div>

            {/* Game Info Center */}
            <div className="text-center space-y-2">
              {/* Clock */}
              <div className="bg-zinc-800 rounded-lg px-6 py-3 inline-block">
                <div className="text-3xl font-mono font-bold text-red-500">
                  {formatTime(clockTime)}
                </div>
                <div className="text-sm text-zinc-400">Q{quarter}</div>
              </div>
              
              {/* Down & Distance */}
              <div className="bg-zinc-800 rounded-lg px-4 py-2">
                <div className="text-lg font-bold text-yellow-400">
                  {down === 1 ? '1st' : down === 2 ? '2nd' : down === 3 ? '3rd' : '4th'} & {distance}
                </div>
                <div className="text-sm text-zinc-400">
                  Ball on {getYardLineText()}
                </div>
              </div>

              {/* Clock Controls */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant={clockRunning ? "destructive" : "default"}
                  onClick={() => setClockRunning(!clockRunning)}
                  className={clockRunning ? "" : "bg-green-600 hover:bg-green-700"}
                >
                  {clockRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClockTime(900)}
                  className="border-zinc-600 text-zinc-300"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Away Team */}
            <div 
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: `${awayColor}20` }}
            >
              <div className="text-sm text-zinc-400 uppercase tracking-wide">Away</div>
              <div className="text-xl font-bold" style={{ color: awayColor }}>{awayTeamName}</div>
              <div className="text-5xl font-black mt-2">{awayScore}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs text-zinc-500">Timeouts:</span>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${i < awayTimeouts ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                      onClick={() => i < awayTimeouts && handleUseTimeout('away')}
                    />
                  ))}
                </div>
              </div>
              {possession === 'away' && (
                <div className="mt-2 text-xs font-bold text-green-400 flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  POSSESSION
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Play Type Selection */}
          <div className="col-span-2 space-y-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Play Type</div>
            {PLAY_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedPlayType(type.id);
                  setSelectedResult(null);
                }}
                className={`w-full py-2 px-3 rounded text-sm font-medium transition-all ${
                  selectedPlayType === type.id 
                    ? `${type.color} text-white` 
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {type.label}
              </button>
            ))}
            
            <div className="border-t border-zinc-700 pt-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-zinc-600 text-zinc-300"
                onClick={togglePossession}
              >
                Change Possession
              </Button>
            </div>
          </div>

          {/* Center - Field and Play Input */}
          <div className="col-span-7 space-y-4">
            {/* Football Field */}
            <FootballField
              ballPosition={ballPosition}
              possession={possession}
              homeTeam={homeTeamName}
              awayTeam={awayTeamName}
              homeColor={homeColor}
              awayColor={awayColor}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-600"
                      onClick={() => setYards(prev => prev - 5)}
                    >
                      -5
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-600"
                      onClick={() => setYards(prev => prev - 1)}
                    >
                      -1
                    </Button>
                    <div className="px-6 py-2 bg-zinc-800 rounded text-center min-w-[100px]">
                      <div className="text-xs text-zinc-500">Yards</div>
                      <div className="text-2xl font-bold text-yellow-400">{yards}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-600"
                      onClick={() => setYards(prev => prev + 1)}
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-600"
                      onClick={() => setYards(prev => prev + 5)}
                    >
                      +5
                    </Button>
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
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {playLog.length === 0 ? (
                  <div className="text-zinc-600 text-sm text-center py-8">
                    No plays recorded yet
                  </div>
                ) : (
                  playLog.map((play) => (
                    <div
                      key={play.id}
                      className="bg-zinc-800 rounded p-2 text-sm"
                    >
                      <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
                        <span>Q{play.quarter} • {play.clock}</span>
                        <span 
                          className="font-bold"
                          style={{ color: play.team === 'home' ? homeColor : awayColor }}
                        >
                          {play.team === 'home' ? homeTeamName?.substring(0, 3).toUpperCase() : awayTeamName?.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-zinc-300">{play.description}</div>
                      {play.ball_on && (
                        <div className="text-zinc-500 text-xs mt-1">
                          {play.down && `${play.down === 1 ? '1st' : play.down === 2 ? '2nd' : play.down === 3 ? '3rd' : '4th'} & ${play.distance || 10} • `}
                          {play.ball_on}
                        </div>
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

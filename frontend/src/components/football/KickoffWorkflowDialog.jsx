import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PlayerSelector from "./PlayerSelector";
import YardLineSelector from "./YardLineSelector";

/**
 * KickoffFieldView - Mini football field visualization for kickoff
 * 
 * AMERICAN FOOTBALL FIELD:
 * - Total: 120 yards (100-yard playing field + two 10-yard end zones)
 * - Kickoffs typically from the 35-yard line
 * 
 * COORDINATE SYSTEM:
 * - 0 = Goal line at left (kicking team's if kicking right)
 * - 50 = Midfield
 * - 100 = Goal line at right
 */
function KickoffFieldView({ 
  kickoffYardLine, 
  fieldedAt, 
  returnedTo, 
  direction,
  kickingTeamColor,
  receivingTeamColor,
  specialResult
}) {
  // Field dimensions
  const END_ZONE_PERCENT = (10 / 120) * 100; // 8.33%
  
  // Convert yard line to visual position within the playing field area
  const yardToVisual = (yard, isFromReceivingSide = false) => {
    // For kicks going left: kicking team is on RIGHT, receiving on LEFT
    // For kicks going right: kicking team is on LEFT, receiving on RIGHT
    const clampedYard = Math.max(0, Math.min(100, yard));
    return clampedYard;
  };
  
  let kickoffPos, fieldedPos, returnedPos;
  
  if (direction === 'left') {
    // Kicking towards left (receiving team's end zone is on left)
    // Kicker starts at their 35 = 100 - 35 = 65% from left
    kickoffPos = 100 - kickoffYardLine;
    // Returner catches near their goal line (left side)
    fieldedPos = fieldedAt || 5;
    // Return position
    if (specialResult === 'touchback') {
      returnedPos = 25; // Ball at 25 yard line
    } else if (specialResult === 'touchdown') {
      returnedPos = 0; // Returned to kicking team's end zone (which is on right, so 0 means TD at left end zone for receiving team running back)
    } else {
      returnedPos = returnedTo || 25;
    }
  } else {
    // Kicking towards right (receiving team's end zone is on right)
    // Kicker starts at their 35 = 35% from left
    kickoffPos = kickoffYardLine;
    // Returner catches near their goal line (right side)
    fieldedPos = 100 - (fieldedAt || 5);
    // Return position
    if (specialResult === 'touchback') {
      returnedPos = 75; // Ball at their 25 (100 - 25 = 75)
    } else if (specialResult === 'touchdown') {
      returnedPos = 100;
    } else {
      returnedPos = 100 - (returnedTo || 25);
    }
  }

  return (
    <div className="bg-green-900 rounded-lg relative overflow-hidden border-2 border-white/30" style={{ height: '120px' }}>
      {/* End zones - 8.33% each (10 yards of 120) */}
      <div 
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center"
        style={{ width: `${END_ZONE_PERCENT}%`, backgroundColor: direction === 'left' ? receivingTeamColor || '#3b82f6' : kickingTeamColor || '#f59e0b' }}
      >
        <span className="text-[7px] text-white/80 rotate-[-90deg] whitespace-nowrap font-semibold">
          {direction === 'left' ? 'RCV' : 'KICK'}
        </span>
      </div>
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
        style={{ width: `${END_ZONE_PERCENT}%`, backgroundColor: direction === 'left' ? kickingTeamColor || '#f59e0b' : receivingTeamColor || '#3b82f6' }}
      >
        <span className="text-[7px] text-white/80 rotate-90 whitespace-nowrap font-semibold">
          {direction === 'left' ? 'KICK' : 'RCV'}
        </span>
      </div>
      
      {/* Goal lines */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${END_ZONE_PERCENT}%` }} />
      <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ right: `${END_ZONE_PERCENT}%` }} />
      
      {/* Playing field area */}
      <div className="absolute top-0 bottom-0" style={{ left: `${END_ZONE_PERCENT}%`, right: `${END_ZONE_PERCENT}%` }}>
        {/* Yard lines */}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((line) => {
          const displayYard = line <= 50 ? line : 100 - line;
          return (
            <div key={line}>
              <div 
                className={`absolute top-0 bottom-0 ${line === 50 ? 'w-0.5 bg-white/70' : 'w-px bg-white/30'}`}
                style={{ left: `${line}%` }}
              />
              {(line === 10 || line === 30 || line === 50 || line === 70 || line === 90) && (
                <span 
                  className="absolute bottom-1 text-[7px] text-white/60 font-mono"
                  style={{ left: `${line}%`, transform: 'translateX(-50%)' }}
                >
                  {displayYard}
                </span>
              )}
            </div>
          );
        })}
        
        {/* Kickoff position marker */}
        <div 
          className="absolute top-4 w-4 h-4 rounded-full border-2 border-white shadow-lg z-10"
          style={{ 
            left: `${kickoffPos}%`,
            transform: 'translateX(-50%)',
            backgroundColor: kickingTeamColor || '#f59e0b'
          }}
          title={`Kickoff from ${kickoffYardLine}`}
        />
        
        {/* Kick trajectory line */}
        {fieldedAt && (
          <div 
            className="absolute top-6 h-0.5 bg-yellow-400/60"
            style={{ 
              left: `${Math.min(kickoffPos, fieldedPos)}%`,
              width: `${Math.abs(fieldedPos - kickoffPos)}%`
            }}
          />
        )}
        
        {/* Fielded at marker */}
        {fieldedAt && (
          <div 
            className="absolute top-4 w-3 h-3 rounded-full border-2 border-white shadow-lg z-10"
            style={{ 
              left: `${fieldedPos}%`,
              transform: 'translateX(-50%)',
              backgroundColor: receivingTeamColor || '#3b82f6'
            }}
            title={`Fielded at ${fieldedAt}`}
          />
        )}
        
        {/* Return trajectory line */}
        {returnedTo && !specialResult && (
          <div 
            className="absolute top-6 h-1 bg-green-400"
            style={{ 
              left: `${Math.min(fieldedPos, returnedPos)}%`,
              width: `${Math.abs(returnedPos - fieldedPos)}%`
            }}
          />
        )}
        
        {/* Ball position (returned to) */}
        {returnedTo && (
          <div 
            className="absolute top-3 w-5 h-5 rounded-full border-2 border-yellow-400 shadow-lg z-20 flex items-center justify-center"
            style={{ 
              left: `${returnedPos}%`,
              transform: 'translateX(-50%)',
              backgroundColor: specialResult === 'touchdown' ? '#22c55e' : 
                              specialResult === 'touchback' ? '#6b7280' : 
                              receivingTeamColor || '#3b82f6'
            }}
            title={specialResult || `Returned to ${returnedTo}`}
          >
          <span className="text-[8px] font-bold text-white">🏈</span>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-3 text-[8px] text-white/80">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: kickingTeamColor || '#f59e0b' }}></div>
          Kick
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: receivingTeamColor || '#3b82f6' }}></div>
          Return
        </span>
      </div>
      </div>
    </div>
  );
}

/**
 * KickoffWorkflowDialog - Multi-step dialog for recording kickoff plays
 * Extracted from FootballLiveGame.jsx for better maintainability
 */
export default function KickoffWorkflowDialog({ 
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
            {/* Field Preview */}
            <KickoffFieldView
              kickoffYardLine={kickoffData.kickoffYardLine || 35}
              direction={kickoffData.direction}
              kickingTeamColor={kickingTeamColor}
              receivingTeamColor={receivingTeamColor}
            />
            
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
            {/* Field Preview - shows the return progress */}
            <KickoffFieldView
              kickoffYardLine={kickoffData.kickoffYardLine || 35}
              fieldedAt={kickoffData.fieldedAt}
              returnedTo={kickoffData.returnedTo}
              direction={kickoffData.direction}
              kickingTeamColor={kickingTeamColor}
              receivingTeamColor={receivingTeamColor}
              specialResult={kickoffData.specialResult}
            />
            
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

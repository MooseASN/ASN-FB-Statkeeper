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
  // Field representation: 0% = left end zone, 100% = right end zone
  // The 50 yard line is at 50%
  // 
  // For kickoffs:
  // - Kickoff from 35 means kicker is on their OWN 35 (35% or 65% from their end zone)
  // - Fielded at 5 means returner catches at THEIR OWN 5 (near their end zone)
  // - The kick travels from kicker's side to returner's side
  //
  // If kicking LEFT: Kicker is on RIGHT side (100 - 35 = 65%), ball goes to LEFT end zone area
  // If kicking RIGHT: Kicker is on LEFT side (35%), ball goes to RIGHT end zone area
  
  let kickoffPos, fieldedPos, returnedPos;
  
  if (direction === 'left') {
    // Kicking towards left end zone (0%)
    // Kicker starts on the right side of the field
    kickoffPos = 100 - kickoffYardLine; // e.g., 35 yard line = 65% from left
    // Returner catches near left end zone (their territory)
    fieldedPos = fieldedAt || 5; // e.g., 5 yard line = 5% from left
    // Return moves back towards the middle
    if (specialResult === 'touchback') {
      returnedPos = 25; // Touchback at 25 yard line
    } else if (specialResult === 'touchdown') {
      returnedPos = 0; // Left end zone
    } else {
      returnedPos = returnedTo || 25;
    }
  } else {
    // Kicking towards right end zone (100%)
    // Kicker starts on the left side of the field
    kickoffPos = kickoffYardLine; // e.g., 35 yard line = 35% from left
    // Returner catches near right end zone (their territory)
    fieldedPos = 100 - (fieldedAt || 5); // e.g., 5 yard line = 95% from left
    // Return moves back towards the middle
    if (specialResult === 'touchback') {
      returnedPos = 75; // Touchback at 25 yard line (from right side)
    } else if (specialResult === 'touchdown') {
      returnedPos = 100; // Right end zone
    } else {
      returnedPos = 100 - (returnedTo || 25);
    }
  }

  return (
    <div className="bg-green-800 rounded-lg p-3 relative overflow-hidden" style={{ height: '120px' }}>
      {/* Field lines */}
      <div className="absolute inset-0 flex">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((line) => (
          <div 
            key={line} 
            className="flex-1 border-r border-white/30 relative"
            style={{ borderRightWidth: line === 50 ? '2px' : '1px' }}
          >
            {line > 0 && line < 100 && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/60 font-mono">
                {line <= 50 ? line : 100 - line}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* End zones */}
      <div className="absolute left-0 top-0 bottom-0 w-[5%] bg-blue-900/50 flex items-center justify-center">
        <span className="text-[8px] text-white/80 rotate-90 whitespace-nowrap">END ZONE</span>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-[5%] bg-red-900/50 flex items-center justify-center">
        <span className="text-[8px] text-white/80 -rotate-90 whitespace-nowrap">END ZONE</span>
      </div>
      
      {/* Kickoff position marker */}
      <div 
        className="absolute top-4 w-4 h-4 rounded-full border-2 border-white shadow-lg z-10"
        style={{ 
          left: `calc(${kickoffPos}% - 8px)`,
          backgroundColor: kickingTeamColor || '#f59e0b'
        }}
        title={`Kickoff from ${kickoffYardLine}`}
      />
      
      {/* Kick trajectory line */}
      {fieldedAt && (
        <div 
          className="absolute top-6 h-0.5 bg-yellow-400/50"
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
            left: `calc(${fieldedPos}% - 6px)`,
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
            left: `calc(${returnedPos}% - 10px)`,
            backgroundColor: specialResult === 'touchdown' ? '#22c55e' : 
                            specialResult === 'touchback' ? '#3b82f6' : 
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

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

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Target, Check, X } from "lucide-react";

/**
 * FieldGoalFieldView - Visual field view for field goal attempts
 * Shows kick trajectory, goal posts, and distance visualization
 */
export function FieldGoalFieldView({
  isOpen,
  onClose,
  ballPosition,
  possession,
  homeTeamName = "HOME",
  awayTeamName = "AWAY",
  homeTeamColor = "#dc2626",
  awayTeamColor = "#2563eb",
  fgDistance,
  onFgDistanceChange,
  result, // "good", "missed", "blocked", "no_good"
  onResultChange,
  onConfirm,
}) {
  const kickingTeamColor = possession === 'home' ? homeTeamColor : awayTeamColor;
  const kickingTeamName = possession === 'home' ? homeTeamName : awayTeamName;
  const targetTeamName = possession === 'home' ? awayTeamName : homeTeamName;

  // Calculate target end zone position
  const targetEndZonePos = possession === 'home' ? 100 : 0;

  // Calculate kick trajectory end point (for visualization)
  const kickEndPos = useMemo(() => {
    if (result === 'good') {
      return targetEndZonePos;
    } else if (result === 'blocked') {
      // Blocked kicks don't travel far
      const direction = possession === 'home' ? 1 : -1;
      return Math.max(0, Math.min(100, ballPosition + (5 * direction)));
    } else {
      // Missed - still goes to end zone area
      return targetEndZonePos;
    }
  }, [result, possession, ballPosition, targetEndZonePos]);

  // Field position display
  const getYardLineDisplay = (pos) => {
    if (pos <= 0) return "End Zone";
    if (pos >= 100) return "End Zone";
    if (pos <= 50) return `Own ${Math.round(pos)}`;
    return `Opp ${Math.round(100 - pos)}`;
  };

  // Calculate approximate yard line from FG distance
  const scrimmageYardLine = useMemo(() => {
    // FG distance = actual distance from goal posts
    // Ball is snapped ~7 yards behind LOS, so scrimmage line is roughly distance - 17
    if (possession === 'home') {
      return 100 - (fgDistance - 17);
    } else {
      return fgDistance - 17;
    }
  }, [fgDistance, possession]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-400" />
            Field Goal - Field View
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Visualize the field goal attempt and select the result
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field Goal Visualization */}
          <div className="relative">
            <div className="relative h-48 bg-green-800 rounded-lg overflow-hidden border-4 border-white">
              {/* End zones */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-[10%] flex items-center justify-center"
                style={{ backgroundColor: homeTeamColor }}
              >
                <span className="text-white text-xs font-bold rotate-[-90deg] whitespace-nowrap">
                  {homeTeamName?.substring(0, 4).toUpperCase()}
                </span>
              </div>
              <div 
                className="absolute right-0 top-0 bottom-0 w-[10%] flex items-center justify-center"
                style={{ backgroundColor: awayTeamColor }}
              >
                <span className="text-white text-xs font-bold rotate-90 whitespace-nowrap">
                  {awayTeamName?.substring(0, 4).toUpperCase()}
                </span>
              </div>

              {/* Field lines */}
              <div className="absolute left-[10%] right-[10%] top-0 bottom-0">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((yard) => (
                  <div
                    key={yard}
                    className="absolute top-0 bottom-0 w-px bg-white/50"
                    style={{ left: `${(yard - 10) * 1.25}%` }}
                  />
                ))}
                
                {/* 50 yard line */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white"
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                />

                {/* Yard numbers */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-between text-[10px] text-white/70 px-2">
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                  <span className="font-bold text-white">50</span>
                  <span>40</span>
                  <span>30</span>
                  <span>20</span>
                  <span>10</span>
                </div>
              </div>

              {/* Goal Posts */}
              <div 
                className={`absolute top-[20%] bottom-[20%] w-2 ${possession === 'home' ? 'right-[8%]' : 'left-[8%]'}`}
              >
                {/* Crossbar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-yellow-400 rounded" />
                {/* Left upright */}
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded" />
                {/* Right upright */}
                <div className="absolute top-0 right-0 w-1 h-full bg-yellow-400 rounded" />
              </div>

              {/* Ball Position (Line of Scrimmage) */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-yellow-400 z-10"
                style={{ left: `${10 + (scrimmageYardLine * 0.8)}%` }}
              />
              <div
                className="absolute top-8 w-3 h-3 rounded-full bg-yellow-400 border-2 border-yellow-600 z-20"
                style={{ 
                  left: `${10 + (scrimmageYardLine * 0.8)}%`,
                  transform: 'translateX(-50%)'
                }}
                title="Ball Position"
              />

              {/* Kick Trajectory */}
              {result && (
                <svg 
                  className="absolute left-[10%] right-[10%] top-0 bottom-0 w-[80%] h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {result === 'blocked' ? (
                    // Short blocked trajectory
                    <path
                      d={`M ${scrimmageYardLine * 0.8} 45 L ${(scrimmageYardLine + (possession === 'home' ? 5 : -5)) * 0.8} 60`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray="5 3"
                    />
                  ) : (
                    // Full kick arc
                    <path
                      d={`M ${scrimmageYardLine * 0.8} 45 Q ${((scrimmageYardLine + kickEndPos) / 2) * 0.8} ${result === 'good' ? 5 : 15} ${kickEndPos * 0.8} ${result === 'good' ? 50 : 45}`}
                      fill="none"
                      stroke={result === 'good' ? '#22c55e' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray="5 3"
                    />
                  )}
                </svg>
              )}

              {/* Result indicator at goal posts */}
              {result && result !== 'blocked' && (
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-30 ${
                    result === 'good' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    [possession === 'home' ? 'right' : 'left']: '6%'
                  }}
                >
                  {result === 'good' ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <X className="w-5 h-5 text-white" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500 uppercase">Kicking Team</div>
              <div className="text-lg font-bold" style={{ color: kickingTeamColor }}>
                {kickingTeamName}
              </div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500 uppercase">Field Goal Distance</div>
              <div className="text-2xl font-bold text-yellow-400">{fgDistance} yds</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500 uppercase">Kick From</div>
              <div className="text-lg font-bold text-white">
                {getYardLineDisplay(scrimmageYardLine)}
              </div>
            </div>
          </div>

          {/* Distance Slider */}
          <div className="space-y-3">
            <div className="text-zinc-400 text-sm text-center">Field Goal Distance</div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => onFgDistanceChange(Math.max(17, fgDistance - 5))}>-5</Button>
              <Slider
                value={[fgDistance]}
                onValueChange={(val) => onFgDistanceChange(val[0])}
                min={17}
                max={65}
                step={1}
                className="flex-1"
              />
              <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => onFgDistanceChange(Math.min(65, fgDistance + 5))}>+5</Button>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {[20, 25, 30, 35, 40, 45, 50, 55, 60].map(d => (
                <Button
                  key={d}
                  size="sm"
                  variant="outline"
                  className={`border-zinc-600 ${fgDistance === d ? 'bg-yellow-600 border-yellow-500' : ''}`}
                  onClick={() => onFgDistanceChange(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          {/* Result Selection */}
          <div className="space-y-3">
            <div className="text-zinc-400 text-sm text-center uppercase">Result</div>
            <div className="flex justify-center gap-3">
              <Button
                className={`px-6 py-3 text-lg font-bold ${
                  result === 'good' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
                onClick={() => onResultChange('good')}
              >
                <Check className="w-5 h-5 mr-2" />
                GOOD
              </Button>
              <Button
                className={`px-6 py-3 text-lg font-bold ${
                  result === 'no_good' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
                onClick={() => onResultChange('no_good')}
              >
                <X className="w-5 h-5 mr-2" />
                NO GOOD
              </Button>
              <Button
                className={`px-6 py-3 text-lg font-bold ${
                  result === 'blocked' 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
                onClick={() => onResultChange('blocked')}
              >
                BLOCKED
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-zinc-600"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 ${
                result === 'good' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : result === 'blocked' 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-red-600 hover:bg-red-700'
              }`}
              onClick={onConfirm}
              disabled={!result}
            >
              {result === 'good' ? `✓ ${fgDistance} Yard FG Good!` : 
               result === 'blocked' ? 'FG Blocked' : 
               result ? `✗ ${fgDistance} Yard FG No Good` : 'Select Result'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FieldGoalFieldView;

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { MapPin, ArrowRight, ArrowLeft } from "lucide-react";

/**
 * PuntFieldView - Visual field view for punt plays
 * Shows punt trajectory and return path with visual feedback
 */
export function PuntFieldView({
  isOpen,
  onClose,
  ballPosition,
  possession,
  homeTeamName = "HOME",
  awayTeamName = "AWAY", 
  homeTeamColor = "#dc2626",
  awayTeamColor = "#2563eb",
  puntDistance,
  onPuntDistanceChange,
  returnStartYardLine,
  onReturnStartChange,
  returnYards,
  onReturnYardsChange,
  onConfirm,
  mode = "punt", // "punt" or "return"
}) {
  // Calculate positions on the field (0-100 scale)
  const kickingTeamColor = possession === 'home' ? homeTeamColor : awayTeamColor;
  const receivingTeamColor = possession === 'home' ? awayTeamColor : homeTeamColor;
  const kickingTeamName = possession === 'home' ? homeTeamName : awayTeamName;
  const receivingTeamName = possession === 'home' ? awayTeamName : homeTeamName;

  // Calculate where punt lands
  const puntLandingPosition = useMemo(() => {
    const direction = possession === 'home' ? 1 : -1;
    return Math.max(0, Math.min(100, ballPosition + (puntDistance * direction)));
  }, [ballPosition, puntDistance, possession]);

  // Calculate return end position
  const returnEndPosition = useMemo(() => {
    if (!returnStartYardLine) return puntLandingPosition;
    const direction = possession === 'home' ? -1 : 1; // Return goes opposite to punt
    return Math.max(0, Math.min(100, returnStartYardLine + (returnYards * direction)));
  }, [returnStartYardLine, returnYards, possession, puntLandingPosition]);

  // Convert position to yard line display
  const getYardLineDisplay = useCallback((pos) => {
    if (pos <= 0) return "End Zone";
    if (pos >= 100) return "End Zone";
    if (pos <= 50) return `${Math.round(pos)}`;
    return `${Math.round(100 - pos)}`;
  }, []);

  // Determine if punt results in touchback
  const isTouchback = useMemo(() => {
    return (possession === 'home' && puntLandingPosition >= 100) || 
           (possession === 'away' && puntLandingPosition <= 0);
  }, [puntLandingPosition, possession]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            {mode === "punt" ? "Punt - Field View" : "Punt Return - Field View"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === "punt" 
              ? "Adjust punt distance to see where the ball lands"
              : "Adjust return yards to see the final field position"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Football Field Visualization */}
          <div className="relative">
            <div className="relative h-40 bg-green-800 rounded-lg overflow-hidden border-4 border-white">
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

              {/* Ball Position (Line of Scrimmage) */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-yellow-400 z-10"
                style={{ left: `${10 + (ballPosition * 0.8)}%` }}
              />
              <div
                className="absolute top-1 w-3 h-3 rounded-full bg-yellow-400 border-2 border-yellow-600 z-20"
                style={{ 
                  left: `${10 + (ballPosition * 0.8)}%`,
                  transform: 'translateX(-50%)'
                }}
                title="Line of Scrimmage"
              />

              {/* Punt Trajectory Arc */}
              <svg 
                className="absolute left-[10%] right-[10%] top-0 bottom-0 w-[80%] h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d={`M ${ballPosition * 0.8} 50 Q ${(ballPosition + puntLandingPosition) * 0.4} 5 ${puntLandingPosition * 0.8} 50`}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  opacity="0.8"
                />
              </svg>

              {/* Punt Landing Spot */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-4 z-20 shadow-lg ${
                  isTouchback ? 'bg-blue-400 border-blue-600' : 'bg-purple-400 border-purple-600'
                }`}
                style={{ 
                  left: `${10 + (puntLandingPosition * 0.8)}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                title="Punt lands"
              />

              {/* Return Path (if showing return) */}
              {mode === "return" && returnStartYardLine !== undefined && (
                <>
                  {/* Return trajectory line */}
                  {Math.abs(returnEndPosition - returnStartYardLine) > 0 && (
                    <div
                      className="absolute top-1/2 h-2 -translate-y-1/2 rounded z-15"
                      style={{
                        left: `${10 + Math.min(returnStartYardLine, returnEndPosition) * 0.8}%`,
                        width: `${Math.abs(returnEndPosition - returnStartYardLine) * 0.8}%`,
                        backgroundColor: returnYards > 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
                      }}
                    />
                  )}
                  
                  {/* Return End Position */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 z-25 shadow-lg ${
                      returnYards > 0 ? 'bg-green-400 border-green-600' : 'bg-orange-400 border-orange-600'
                    }`}
                    style={{ 
                      left: `${10 + (returnEndPosition * 0.8)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    title="Return ends"
                  />
                </>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500 uppercase">Line of Scrimmage</div>
              <div className="text-lg font-bold text-yellow-400">
                {getYardLineDisplay(ballPosition)}
              </div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500 uppercase">Punt Distance</div>
              <div className="text-lg font-bold text-purple-400">{puntDistance} yds</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500 uppercase">
                {isTouchback ? "TOUCHBACK" : mode === "return" ? "Final Position" : "Landing Spot"}
              </div>
              <div className={`text-lg font-bold ${isTouchback ? 'text-blue-400' : 'text-green-400'}`}>
                {isTouchback ? "25 yd line" : getYardLineDisplay(mode === "return" ? returnEndPosition : puntLandingPosition)}
              </div>
            </div>
          </div>

          {/* Punt Distance Slider (mode = punt) */}
          {mode === "punt" && (
            <div className="space-y-3">
              <div className="text-zinc-400 text-sm text-center">Punt Distance</div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => onPuntDistanceChange(Math.max(0, puntDistance - 5))}>-5</Button>
                <Slider
                  value={[puntDistance]}
                  onValueChange={(val) => onPuntDistanceChange(val[0])}
                  min={10}
                  max={70}
                  step={1}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => onPuntDistanceChange(Math.min(70, puntDistance + 5))}>+5</Button>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>10 yards</span>
                <span>70 yards</span>
              </div>
            </div>
          )}

          {/* Return Yards Slider (mode = return) */}
          {mode === "return" && (
            <div className="space-y-3">
              <div className="text-zinc-400 text-sm text-center">Return Yards</div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => onReturnYardsChange(Math.max(-10, returnYards - 5))}>-5</Button>
                <Slider
                  value={[returnYards]}
                  onValueChange={(val) => onReturnYardsChange(val[0])}
                  min={-10}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" className="border-zinc-600" onClick={() => onReturnYardsChange(Math.min(100, returnYards + 5))}>+5</Button>
              </div>
              <div className="text-center">
                <span className={`text-2xl font-bold ${returnYards >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {returnYards > 0 ? '+' : ''}{returnYards} yards
                </span>
              </div>
            </div>
          )}

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
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={onConfirm}
            >
              Confirm {mode === "punt" ? `${puntDistance} Yard Punt` : `${returnYards} Yard Return`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PuntFieldView;

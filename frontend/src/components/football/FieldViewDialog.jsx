import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { MapPin, Shield, Trophy } from "lucide-react";

/**
 * FieldViewDialog - A miniature football field view for visualizing yardage
 * Shows current ball position and allows sliding to set end position
 * 
 * Props:
 * - isOpen: boolean - Whether dialog is open
 * - onClose: () => void - Close handler
 * - currentPosition: number - Current ball position (0-100 normalized)
 * - possession: 'home' | 'away' - Which team has possession
 * - onYardsChange: (yards: number) => void - Callback with calculated yards
 * - onTouchdown: () => void - Optional callback when touchdown is selected
 * - onSafety: () => void - Optional callback when safety is selected
 * - homeTeamName: string - Home team name
 * - awayTeamName: string - Away team name
 * - homeTeamColor: string - Home team color
 * - awayTeamColor: string - Away team color
 */
export function FieldViewDialog({
  isOpen,
  onClose,
  currentPosition,
  possession,
  onYardsChange,
  onTouchdown,
  onSafety,
  homeTeamName = "HOME",
  awayTeamName = "AWAY",
  homeTeamColor = "#dc2626",
  awayTeamColor = "#2563eb",
}) {
  // Initialize to currentPosition, reset on open via key prop pattern
  const [endPosition, setEndPosition] = useState(currentPosition);
  
  // Reset position when currentPosition changes (dialog reopens with new position)
  const initialPosition = useMemo(() => currentPosition, [currentPosition]);
  
  // Handle resetting when dialog opens - use callback in onOpenChange
  const handleOpenChange = useCallback((open) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);
  
  // Reset end position when dialog opens
  const handleDialogOpen = useCallback(() => {
    setEndPosition(currentPosition);
  }, [currentPosition]);

  /**
   * Check if position is in the end zone
   * For home team: 100 = opponent's end zone (touchdown), 0 = own end zone (safety)
   * For away team: 0 = opponent's end zone (touchdown), 100 = own end zone (safety)
   */
  const isTouchdown = useMemo(() => {
    if (possession === 'home') {
      return endPosition >= 100;
    } else {
      return endPosition <= 0;
    }
  }, [endPosition, possession]);

  const isSafety = useMemo(() => {
    if (possession === 'home') {
      return endPosition <= 0;
    } else {
      return endPosition >= 100;
    }
  }, [endPosition, possession]);

  /**
   * Convert normalized position (0-100) to actual yard line
   * 0 = home team's goal line (home end zone)
   * 50 = midfield
   * 100 = away team's goal line (away end zone)
   * 
   * For display, we show yard lines from the perspective of which side of the 50:
   * - 0-50: "OWN X" where X goes from 0 to 50
   * - 50-100: "OPP X" where X goes from 50 down to 0
   */
  const getYardLineDisplay = useCallback((normalizedPos, team) => {
    // Clamp position to valid range
    const pos = Math.max(0, Math.min(100, normalizedPos));
    
    // Calculate actual yard line (0-50 scale from perspective of team with ball)
    let yardLine;
    let side;
    
    if (team === 'home') {
      // Home team going left to right (0 -> 100)
      if (pos <= 50) {
        yardLine = pos;
        side = homeTeamName?.substring(0, 3).toUpperCase() || "OWN";
      } else {
        yardLine = 100 - pos;
        side = awayTeamName?.substring(0, 3).toUpperCase() || "OPP";
      }
    } else {
      // Away team going right to left (100 -> 0)
      if (pos >= 50) {
        yardLine = 100 - pos;
        side = awayTeamName?.substring(0, 3).toUpperCase() || "OWN";
      } else {
        yardLine = pos;
        side = homeTeamName?.substring(0, 3).toUpperCase() || "OPP";
      }
    }
    
    // Handle goal line and end zone
    if (yardLine === 0) {
      return "GOAL LINE";
    } else if (yardLine === 50 || (pos === 50)) {
      return "50";
    }
    
    return `${side} ${Math.round(yardLine)}`;
  }, [homeTeamName, awayTeamName]);

  /**
   * Calculate yards gained/lost based on position change
   * Positive = gain, Negative = loss
   */
  const calculateYards = useCallback((startPos, endPos, team) => {
    // Calculate the actual movement on the field
    // For home team: moving right (increasing position) = positive yards
    // For away team: moving left (decreasing position) = positive yards
    
    const movement = endPos - startPos;
    
    if (team === 'home') {
      return movement;
    } else {
      return -movement;
    }
  }, []);

  // Calculate yards based on positions
  const yardsGained = calculateYards(currentPosition, endPosition, possession);

  // Handle slider change
  const handleSliderChange = (value) => {
    setEndPosition(value[0]);
  };

  // Handle confirm
  const handleConfirm = () => {
    onYardsChange(yardsGained);
    onClose();
  };

  // Generate yard line markers
  const yardMarkers = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <DialogContent 
        className="sm:max-w-2xl bg-zinc-900 border-zinc-700"
        onOpenAutoFocus={() => setEndPosition(currentPosition)}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Field View - Set End Position
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Drag the slider or use buttons to set where the play ends on the field
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Mini Football Field - Accurate American Football Field */}
          <div className="relative">
            {/* Field background - 120 yard field (100 playing + 2x10 end zones) */}
            <div className="relative h-32 bg-green-900 rounded-lg overflow-hidden border-4 border-white/50">
              {/* End zones - 10 yards each out of 120 = 8.33% */}
              <div 
                className="absolute left-0 top-0 bottom-0 flex items-center justify-center"
                style={{ width: '8.33%', backgroundColor: homeTeamColor }}
              >
                <span className="text-white/90 text-[9px] font-bold rotate-[-90deg] whitespace-nowrap">
                  {homeTeamName?.substring(0, 4).toUpperCase() || "HOME"}
                </span>
              </div>
              <div 
                className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
                style={{ width: '8.33%', backgroundColor: awayTeamColor }}
              >
                <span className="text-white/90 text-[9px] font-bold rotate-90 whitespace-nowrap">
                  {awayTeamName?.substring(0, 4).toUpperCase() || "AWAY"}
                </span>
              </div>
              
              {/* Goal lines (white lines at edge of end zones) */}
              <div className="absolute top-0 bottom-0 w-1 bg-white" style={{ left: '8.33%' }} />
              <div className="absolute top-0 bottom-0 w-1 bg-white" style={{ right: '8.33%' }} />
              
              {/* Playing field area (83.33% = 100 yards) */}
              <div className="absolute top-0 bottom-0" style={{ left: '8.33%', right: '8.33%' }}>
                {/* Yard lines - positioned relative to the 100-yard playing field */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((yard) => {
                  const displayYard = yard <= 50 ? yard : 100 - yard;
                  const isMidfield = yard === 50;
                  return (
                    <div key={yard}>
                      <div
                        className={`absolute top-0 bottom-0 ${isMidfield ? 'w-1 bg-white/80' : 'w-px bg-white/40'}`}
                        style={{ left: `${yard}%` }}
                      />
                    </div>
                  );
                })}
                
                {/* Yard numbers - at bottom */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-between text-[10px] text-white/70 px-1">
                  <span style={{ marginLeft: '8%' }}>10</span>
                  <span style={{ marginLeft: '2%' }}>20</span>
                  <span style={{ marginLeft: '2%' }}>30</span>
                  <span style={{ marginLeft: '2%' }}>40</span>
                  <span className="font-bold text-white">50</span>
                  <span style={{ marginRight: '2%' }}>40</span>
                  <span style={{ marginRight: '2%' }}>30</span>
                  <span style={{ marginRight: '2%' }}>20</span>
                  <span style={{ marginRight: '8%' }}>10</span>
                </div>
                
                {/* Current ball position marker (yellow) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600 z-10 shadow-lg"
                  style={{ 
                    left: `${currentPosition}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={`Start: ${getYardLineDisplay(currentPosition, possession)}`}
                />
                
                {/* End position marker (green for gain, red for loss) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-4 z-20 shadow-lg transition-all"
                  style={{ 
                    left: `${Math.max(0, Math.min(100, endPosition))}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: yardsGained >= 0 ? '#22c55e' : '#ef4444',
                    borderColor: yardsGained >= 0 ? '#15803d' : '#b91c1c'
                  }}
                  title={`End: ${getYardLineDisplay(endPosition, possession)}`}
                />
                
                {/* Direction trail line */}
                {Math.abs(endPosition - currentPosition) > 1 && (
                  <div
                    className="absolute top-1/2 h-1 -translate-y-1/2 rounded z-5"
                    style={{
                      left: `${Math.min(currentPosition, Math.max(0, Math.min(100, endPosition)))}%`,
                      width: `${Math.abs(Math.max(0, Math.min(100, endPosition)) - currentPosition)}%`,
                      backgroundColor: yardsGained >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* Position Labels */}
          <div className="flex justify-between text-sm px-4">
            <div className="text-center">
              <div className="text-zinc-500 text-xs">Start</div>
              <div className="text-yellow-400 font-bold">
                {getYardLineDisplay(currentPosition, possession)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-zinc-500 text-xs">End</div>
              <div className={`font-bold ${yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {getYardLineDisplay(endPosition, possession)}
              </div>
            </div>
          </div>
          
          {/* Yards Display */}
          <div className="text-center py-4 bg-zinc-800 rounded-lg">
            {isTouchdown ? (
              <>
                <div className="text-yellow-400 text-sm mb-1 flex items-center justify-center gap-2">
                  <Trophy className="w-4 h-4" />
                  TOUCHDOWN!
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="text-4xl font-black text-yellow-400">
                  🏈 TD 🏈
                </div>
                <div className="text-yellow-300 text-xs mt-1">
                  {Math.abs(yardsGained)} yard {yardsGained >= 0 ? 'gain' : 'run'} into end zone
                </div>
              </>
            ) : isSafety ? (
              <>
                <div className="text-red-400 text-sm mb-1 flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  SAFETY!
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-4xl font-black text-red-400">
                  ⚠️ 2 PTS ⚠️
                </div>
                <div className="text-red-300 text-xs mt-1">
                  Tackled in own end zone - {Math.abs(yardsGained)} yard loss
                </div>
              </>
            ) : (
              <>
                <div className="text-zinc-500 text-sm mb-1">Yards</div>
                <div className={`text-4xl font-black ${yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {yardsGained > 0 ? '+' : ''}{yardsGained}
                </div>
                <div className="text-zinc-500 text-xs mt-1">
                  {yardsGained > 0 ? 'GAIN' : yardsGained < 0 ? 'LOSS' : 'NO GAIN'}
                </div>
              </>
            )}
          </div>
          
          {/* Slider */}
          <div className="px-4">
            <div className="text-zinc-400 text-sm mb-2 text-center">
              Drag to set end position
            </div>
            <Slider
              value={[endPosition]}
              onValueChange={handleSliderChange}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>{homeTeamName?.substring(0, 3) || "HM"} GL</span>
              <span>50</span>
              <span>{awayTeamName?.substring(0, 3) || "AW"} GL</span>
            </div>
          </div>
          
          {/* Quick Adjust Buttons */}
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600"
              onClick={() => setEndPosition(prev => Math.max(0, prev - 10))}
            >
              -10
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600"
              onClick={() => setEndPosition(prev => Math.max(0, prev - 5))}
            >
              -5
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600"
              onClick={() => setEndPosition(prev => Math.max(0, prev - 1))}
            >
              -1
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600"
              onClick={() => setEndPosition(prev => Math.min(100, prev + 1))}
            >
              +1
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600"
              onClick={() => setEndPosition(prev => Math.min(100, prev + 5))}
            >
              +5
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600"
              onClick={() => setEndPosition(prev => Math.min(100, prev + 10))}
            >
              +10
            </Button>
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
            {isTouchdown && onTouchdown ? (
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                onClick={() => {
                  onTouchdown();
                  onClose();
                }}
              >
                <Trophy className="w-4 h-4 mr-2" />
                TOUCHDOWN!
              </Button>
            ) : isSafety && onSafety ? (
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 font-bold"
                onClick={() => {
                  onSafety();
                  onClose();
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                SAFETY (2 pts)
              </Button>
            ) : (
              <Button
                className={`flex-1 ${yardsGained >= 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={handleConfirm}
              >
                Set {Math.abs(yardsGained)} Yards {yardsGained >= 0 ? 'Gain' : 'Loss'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FieldViewDialog;

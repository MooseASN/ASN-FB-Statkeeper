import React from "react";

/**
 * FootballField - Accurate visual representation of an American football field
 * 
 * FIELD DIMENSIONS:
 * - Total length: 120 yards (100-yard playing field + two 10-yard end zones)
 * - Width: 53.3 yards (not shown in this 2D view)
 * 
 * COORDINATE SYSTEM (ballPosition prop):
 * - 0 = Home team's goal line (back of home end zone would be -10)
 * - 50 = Midfield (50-yard line)
 * - 100 = Away team's goal line (back of away end zone would be 110)
 * 
 * VISUAL LAYOUT:
 * - Left end zone (8.33%): Home team's end zone
 * - Playing field (83.33%): 0 to 100 yard lines
 * - Right end zone (8.33%): Away team's end zone
 * 
 * @param {number} ballPosition - 0-100 (0 = home goal line, 100 = away goal line)
 * @param {string} possession - 'home' or 'away'
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {string} homeColor - Home team color
 * @param {string} awayColor - Away team color
 * @param {number} firstDownMarker - Position of the first down marker (0-100)
 */
export default function FootballField({ 
  ballPosition = 25, 
  possession = 'home', 
  homeTeam = 'HOME', 
  awayTeam = 'AWAY', 
  homeColor = '#dc2626', 
  awayColor = '#2563eb', 
  firstDownMarker = null
}) {
  // Constants for field layout
  // End zones are 10 yards each out of 120 total = 8.33%
  const END_ZONE_PERCENT = (10 / 120) * 100; // 8.33%
  const FIELD_PERCENT = 100 - (2 * END_ZONE_PERCENT); // 83.33%
  
  /**
   * Convert yard line (0-100) to visual position percentage
   * 0 yard line = left edge of playing field (after home end zone)
   * 100 yard line = right edge of playing field (before away end zone)
   */
  const yardToVisualPercent = (yardLine) => {
    // Clamp to valid range
    const clampedYard = Math.max(0, Math.min(100, yardLine));
    // Map 0-100 yards to the playing field area (between end zones)
    return END_ZONE_PERCENT + (clampedYard / 100) * FIELD_PERCENT;
  };

  /**
   * Get display yard line (0-50-0 format like on real fields)
   * Shows which team's side of the field
   */
  const getYardLineDisplay = (pos) => {
    if (pos === 50) return '50';
    if (pos < 50) {
      return pos; // Home team's side
    }
    return 100 - pos; // Away team's side
  };

  /**
   * Determine which team's side the ball is on for display
   */
  const getBallSide = () => {
    if (ballPosition === 50) return '50';
    if (ballPosition < 50) {
      return `${homeTeam?.substring(0, 3).toUpperCase() || 'HM'} ${ballPosition}`;
    }
    return `${awayTeam?.substring(0, 3).toUpperCase() || 'AW'} ${100 - ballPosition}`;
  };

  // Generate yard line markers (every 10 yards from 10 to 90)
  const yardLineMarkers = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  
  // Generate minor yard lines (every 5 yards)
  const minorYardLines = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];

  return (
    <div className="relative w-full h-48 bg-gradient-to-b from-green-900 to-green-800 rounded-lg overflow-hidden border-4 border-white/30">
      {/* HOME END ZONE (left) */}
      <div 
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center"
        style={{ 
          width: `${END_ZONE_PERCENT}%`,
          backgroundColor: `${homeColor}90`
        }}
      >
        <span className="text-white/80 font-bold text-xs rotate-[-90deg] whitespace-nowrap tracking-wider">
          {homeTeam?.substring(0, 10) || 'HOME'}
        </span>
      </div>

      {/* AWAY END ZONE (right) */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
        style={{ 
          width: `${END_ZONE_PERCENT}%`,
          backgroundColor: `${awayColor}90`
        }}
      >
        <span className="text-white/80 font-bold text-xs rotate-90 whitespace-nowrap tracking-wider">
          {awayTeam?.substring(0, 10) || 'AWAY'}
        </span>
      </div>

      {/* GOAL LINES (white lines at edge of end zones) */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white"
        style={{ left: `${END_ZONE_PERCENT}%` }}
      />
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white"
        style={{ right: `${END_ZONE_PERCENT}%` }}
      />

      {/* PLAYING FIELD AREA */}
      <div 
        className="absolute top-0 bottom-0"
        style={{ 
          left: `${END_ZONE_PERCENT}%`, 
          right: `${END_ZONE_PERCENT}%` 
        }}
      >
        {/* Major yard lines (every 10 yards) with numbers */}
        {yardLineMarkers.map((yard) => {
          const displayYard = getYardLineDisplay(yard);
          const isMidfield = yard === 50;
          return (
            <div key={yard}>
              {/* Yard line */}
              <div
                className={`absolute top-0 bottom-0 ${isMidfield ? 'w-1 bg-white/80' : 'w-px bg-white/40'}`}
                style={{ left: `${(yard / 100) * 100}%` }}
              />
              {/* Top number */}
              <span 
                className={`absolute top-2 text-[10px] font-bold ${isMidfield ? 'text-white' : 'text-white/50'}`}
                style={{ 
                  left: `${(yard / 100) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {displayYard}
              </span>
              {/* Bottom number */}
              <span 
                className={`absolute bottom-2 text-[10px] font-bold ${isMidfield ? 'text-white' : 'text-white/50'}`}
                style={{ 
                  left: `${(yard / 100) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {displayYard}
              </span>
            </div>
          );
        })}

        {/* Minor yard lines (every 5 yards, no numbers) */}
        {minorYardLines.map((yard) => (
          <div
            key={`minor-${yard}`}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: `${(yard / 100) * 100}%` }}
          />
        ))}

        {/* Hash marks (top - at roughly 1/3 from top) */}
        <div className="absolute left-0 right-0 top-[25%] h-px">
          {[...Array(100)].map((_, i) => (
            <div
              key={`hash-top-${i}`}
              className="absolute w-px bg-white/20"
              style={{ 
                left: `${i}%`, 
                height: i % 5 === 0 ? '6px' : '3px'
              }}
            />
          ))}
        </div>

        {/* Hash marks (bottom - at roughly 1/3 from bottom) */}
        <div className="absolute left-0 right-0 bottom-[25%] h-px">
          {[...Array(100)].map((_, i) => (
            <div
              key={`hash-bottom-${i}`}
              className="absolute w-px bg-white/20"
              style={{ 
                left: `${i}%`, 
                height: i % 5 === 0 ? '6px' : '3px',
                transform: 'translateY(-100%)'
              }}
            />
          ))}
        </div>

        {/* Center logo (faded) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15 pointer-events-none">
          <img 
            src="/logo-white.png" 
            alt="" 
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* LINE OF SCRIMMAGE - Blue line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-blue-500 shadow-lg shadow-blue-500/50 z-10"
          style={{ 
            left: `${(ballPosition / 100) * 100}%`, 
            transform: 'translateX(-50%)' 
          }}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[7px] font-bold px-1 rounded">
            LOS
          </div>
        </div>

        {/* FIRST DOWN MARKER - Yellow line */}
        {firstDownMarker !== null && firstDownMarker !== undefined && (
          <div 
            className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-lg shadow-yellow-400/50 z-10"
            style={{ 
              left: `${Math.max(0, Math.min(100, (firstDownMarker / 100) * 100))}%`, 
              transform: 'translateX(-50%)' 
            }}
          >
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[7px] font-bold px-1 rounded">
              1ST
            </div>
          </div>
        )}

        {/* BALL MARKER */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 z-20"
          style={{ left: `${(ballPosition / 100) * 100}%` }}
        >
          <div className="relative">
            {/* Football shape */}
            <div className="w-6 h-4 bg-amber-700 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-px bg-white/70" />
              </div>
            </div>
            {/* Possession indicator */}
            <div 
              className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-lg whitespace-nowrap"
              style={{ backgroundColor: possession === 'home' ? homeColor : awayColor }}
            >
              {possession === 'home' ? homeTeam?.substring(0, 3).toUpperCase() : awayTeam?.substring(0, 3).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Field position indicator text (bottom center) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-0.5 rounded-t text-white text-xs font-bold">
        {getBallSide()}
      </div>
    </div>
  );
}

/**
 * Utility function to convert a yard line to the normalized 0-100 position
 * Used when setting ball position from user input
 * 
 * @param {number} yardLine - The yard line (1-99, or "own X" / "opp X")
 * @param {string} side - 'home' or 'away' indicating whose yard line
 * @param {string} possession - Which team has the ball
 * @returns {number} - Normalized position 0-100
 */
export function yardLineToPosition(yardLine, side, possession) {
  // If it's the possessing team's side
  if ((possession === 'home' && side === 'home') || (possession === 'away' && side === 'away')) {
    // Own territory - yard line directly maps to position (for home) or 100-yardLine (for away)
    return possession === 'home' ? yardLine : 100 - yardLine;
  } else {
    // Opponent's territory
    return possession === 'home' ? 100 - yardLine : yardLine;
  }
}

/**
 * Utility function to convert normalized position to readable yard line string
 * 
 * @param {number} position - Normalized position 0-100
 * @param {string} homeTeamName - Home team name for display
 * @param {string} awayTeamName - Away team name for display
 * @returns {string} - Human readable yard line (e.g., "HOME 25" or "AWAY 30" or "50")
 */
export function positionToYardLine(position, homeTeamName = 'HOME', awayTeamName = 'AWAY') {
  if (position === 50) return '50';
  if (position < 50) {
    return `${homeTeamName.substring(0, 3).toUpperCase()} ${Math.round(position)}`;
  }
  return `${awayTeamName.substring(0, 3).toUpperCase()} ${Math.round(100 - position)}`;
}

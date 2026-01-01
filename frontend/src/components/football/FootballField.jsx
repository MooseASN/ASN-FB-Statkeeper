import React from "react";

/**
 * FootballField - Visual representation of the football field with ball position
 * @param {number} ballPosition - 0-100 (0 = home endzone, 100 = away endzone)
 * @param {string} possession - 'home' or 'away'
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {string} homeColor - Home team color
 * @param {string} awayColor - Away team color
 * @param {number} firstDownMarker - Position of the first down marker
 */
export default function FootballField({ 
  ballPosition, 
  possession, 
  homeTeam, 
  awayTeam, 
  homeColor, 
  awayColor, 
  firstDownMarker 
}) {
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

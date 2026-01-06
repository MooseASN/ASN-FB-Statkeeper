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
  
  // Generate hash marks for the sidelines
  const generateHashMarks = () => {
    const marks = [];
    // Hash marks every 1 yard (100 positions total for 100 yards)
    for (let i = 1; i <= 99; i++) {
      // Skip positions where major yard lines are (every 10 yards)
      if (i % 10 === 0) continue;
      marks.push(
        <div
          key={`hash-${i}`}
          className="absolute w-px bg-white/20"
          style={{ 
            left: `${(i / 100) * 100}%`,
            height: i % 5 === 0 ? '8px' : '4px'
          }}
        />
      );
    }
    return marks;
  };
  
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
            className={`absolute top-0 bottom-0 ${yard === 50 ? 'w-1 bg-white/60' : 'w-px bg-white/30'}`}
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
        
        {/* Top sideline hash marks */}
        <div className="absolute left-0 right-0 top-[15%] flex">
          {generateHashMarks()}
        </div>
        
        {/* Bottom sideline hash marks */}
        <div className="absolute left-0 right-0 bottom-[15%] flex">
          {generateHashMarks()}
        </div>
        
        {/* Center field hash marks (NFL style - closer together) */}
        <div className="absolute left-0 right-0 top-[35%] h-px bg-white/10" />
        <div className="absolute left-0 right-0 top-[65%] h-px bg-white/10" />
        
        {/* StatMoose Logo at 50-yard line - faded */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
          <img 
            src="/logo-white.png" 
            alt="" 
            className="w-24 h-24 object-contain"
          />
        </div>
        
        {/* LINE OF SCRIMMAGE - Blue line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-blue-500 shadow-lg shadow-blue-500/50 z-10"
          style={{ left: `${ballPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* LOS label */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-bold px-1 rounded">
            LOS
          </div>
        </div>
        
        {/* First down marker - Yellow line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-lg shadow-yellow-400/50 z-10"
          style={{ left: `${Math.max(0, Math.min(100, firstDownMarker))}%`, transform: 'translateX(-50%)' }}
        >
          {/* First down label */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">
            1st
          </div>
        </div>
        
        {/* Ball marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 z-20"
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
              className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-lg"
              style={{ backgroundColor: possession === 'home' ? homeColor : awayColor }}
            >
              {possession === 'home' ? homeTeam?.substring(0, 3).toUpperCase() : awayTeam?.substring(0, 3).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Goal lines */}
      <div className="absolute left-[10%] top-0 bottom-0 w-1 bg-white/60" />
      <div className="absolute right-[10%] top-0 bottom-0 w-1 bg-white/60" />
      
      {/* Field position indicator text */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-0.5 rounded-t text-white text-xs font-bold">
        {isHomeSide ? `${homeTeam?.substring(0, 3).toUpperCase() || 'HM'} ${yardLine}` : 
         yardLine === 50 ? '50' : 
         `${awayTeam?.substring(0, 3).toUpperCase() || 'AW'} ${yardLine}`}
      </div>
    </div>
  );
}

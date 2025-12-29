import { useState, useEffect } from 'react';
import { ExternalLink, Video, BarChart3, Trophy, Clock, MapPin } from 'lucide-react';

/**
 * BracketView - ESPN-style tournament bracket display
 * Clean, responsive bracket visualization for public viewing
 */
export default function BracketView({ bracket, showLinks = true }) {
  if (!bracket || !bracket.games || bracket.games.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No bracket data available
      </div>
    );
  }

  const getGamesByRound = (roundNumber) => {
    return bracket.games
      .filter(g => g.round_number === roundNumber)
      .sort((a, b) => a.position - b.position);
  };

  const getRoundName = (roundNumber) => {
    const names = {
      1: 'First Round',
      2: 'Quarterfinals', 
      3: 'Semifinals',
      4: 'Championship'
    };
    return names[roundNumber] || `Round ${roundNumber}`;
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse">LIVE</span>;
      case 'final':
        return <span className="px-2 py-0.5 bg-gray-600 text-white text-xs font-bold rounded">FINAL</span>;
      default:
        return null;
    }
  };

  // Calculate rounds available
  const rounds = [...new Set(bracket.games.map(g => g.round_number))].sort((a, b) => a - b);

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white min-h-screen">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{bracket.name}</h1>
              <p className="text-slate-400 capitalize">{bracket.gender}&apos;s {bracket.bracket_type?.replace('_', ' ')}</p>
            </div>
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div className="max-w-7xl mx-auto p-4 overflow-x-auto">
        <div className="flex gap-2 md:gap-4" style={{ minWidth: `${rounds.length * 280}px` }}>
          {rounds.map((round, roundIndex) => {
            const games = getGamesByRound(round);
            const isChampionship = round === Math.max(...rounds);
            
            // Calculate spacing based on round
            const verticalGap = roundIndex === 0 ? 8 : roundIndex === 1 ? 80 : roundIndex === 2 ? 200 : 0;
            
            return (
              <div key={round} className="flex-1 min-w-[260px]">
                {/* Round Header */}
                <div className={`text-center mb-4 py-2 rounded-t ${isChampionship ? 'bg-yellow-600' : 'bg-slate-700'}`}>
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {getRoundName(round)}
                  </span>
                </div>
                
                {/* Games */}
                <div 
                  className={`flex flex-col ${isChampionship ? 'justify-center h-[500px]' : ''}`}
                  style={{ gap: `${verticalGap}px` }}
                >
                  {games.map((game) => (
                    <GameCard 
                      key={game.game_id} 
                      game={game} 
                      showLinks={showLinks}
                      formatTime={formatTime}
                      formatDate={formatDate}
                      getStatusBadge={getStatusBadge}
                      isChampionship={isChampionship}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, showLinks, formatTime, formatDate, getStatusBadge, isChampionship }) {
  const team1Won = game.winner_id && game.winner_id === game.team1_id;
  const team2Won = game.winner_id && game.winner_id === game.team2_id;
  const isFinal = game.game_status === 'final';
  const isLive = game.game_status === 'in_progress';

  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden border ${isChampionship ? 'border-yellow-500 border-2' : 'border-slate-700'} ${isLive ? 'ring-2 ring-red-500' : ''}`}>
      {/* Status Bar */}
      {(isLive || isFinal) && (
        <div className={`px-3 py-1 text-center ${isLive ? 'bg-red-600' : 'bg-slate-700'}`}>
          {getStatusBadge(game.game_status)}
        </div>
      )}
      
      {/* Team 1 */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-slate-700 ${team1Won ? 'bg-green-900/30' : ''} ${team2Won && isFinal ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {game.team1_seed && (
            <span className="text-xs font-bold text-slate-400 w-5 text-center flex-shrink-0">
              {game.team1_seed}
            </span>
          )}
          <span className={`font-medium truncate ${team1Won ? 'text-green-400 font-bold' : 'text-white'}`}>
            {game.team1_name || 'TBD'}
          </span>
        </div>
        <span className={`text-lg font-bold ml-2 min-w-[32px] text-right ${team1Won ? 'text-green-400' : 'text-white'}`}>
          {game.team1_score ?? '-'}
        </span>
      </div>
      
      {/* Team 2 */}
      <div className={`flex items-center justify-between px-3 py-2.5 ${team2Won ? 'bg-green-900/30' : ''} ${team1Won && isFinal ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {game.team2_seed && (
            <span className="text-xs font-bold text-slate-400 w-5 text-center flex-shrink-0">
              {game.team2_seed}
            </span>
          )}
          <span className={`font-medium truncate ${team2Won ? 'text-green-400 font-bold' : 'text-white'}`}>
            {game.team2_name || 'TBD'}
          </span>
        </div>
        <span className={`text-lg font-bold ml-2 min-w-[32px] text-right ${team2Won ? 'text-green-400' : 'text-white'}`}>
          {game.team2_score ?? '-'}
        </span>
      </div>
      
      {/* Game Info Footer */}
      <div className="px-3 py-2 bg-slate-900/50 text-xs text-slate-400 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {game.game_date && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(game.game_date)}
              {game.game_time && ` ${formatTime(game.game_time)}`}
            </span>
          )}
          {game.venue && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{game.venue}</span>
            </span>
          )}
        </div>
        
        {showLinks && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {game.broadcast_link && (
              <a 
                href={game.broadcast_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Watch Broadcast"
              >
                <Video className="w-4 h-4" />
              </a>
            )}
            {game.live_stats_link && (
              <a 
                href={game.live_stats_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 transition-colors"
                title="View Live Stats"
              >
                <BarChart3 className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

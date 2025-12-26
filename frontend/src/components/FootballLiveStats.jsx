import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  ChevronRight,
  Clock,
  MapPin
} from 'lucide-react';

/**
 * FootballLiveStats - Sidearm Sports-style live stats interface
 * 
 * Features:
 * - Scoreboard with quarter breakdown
 * - Scoring plays feed
 * - Team/Individual leaders with tabs
 * - Play-by-play feed
 * - Team stats comparison
 */
export default function FootballLiveStats({
  game,
  homeScore,
  awayScore,
  quarter,
  clockTime,
  playLog = [],
  homeColor = '#dc2626',
  awayColor = '#2563eb',
  possession,
  homeTimeOfPossession = 0,
  awayTimeOfPossession = 0,
  homeTimeouts = 3,
  awayTimeouts = 3,
}) {
  const [activeLeaderTab, setActiveLeaderTab] = useState('rushYards');
  const [activeSection, setActiveSection] = useState('summary'); // summary, play-by-play, team-stats, leaders

  // Format clock time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format time of possession (accepts seconds as number)
  const formatTOP = (seconds) => {
    const totalSecs = typeof seconds === 'number' ? seconds : 0;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get quarter label
  const getQuarterLabel = (q) => {
    if (q <= 4) return `${q}${q === 1 ? 'st' : q === 2 ? 'nd' : q === 3 ? 'rd' : 'th'}`;
    return `OT${q - 4}`;
  };

  // Calculate quarter scores from play log
  const quarterScores = useMemo(() => {
    const scores = {
      home: [0, 0, 0, 0],
      away: [0, 0, 0, 0],
    };
    
    playLog.forEach(play => {
      if (play.points && play.quarter >= 1 && play.quarter <= 4) {
        const q = play.quarter - 1;
        if (play.team === 'home') {
          scores.home[q] += play.points;
        } else {
          scores.away[q] += play.points;
        }
      }
    });
    
    return scores;
  }, [playLog]);

  // Get scoring plays only
  const scoringPlays = useMemo(() => {
    return playLog.filter(play => play.points && play.points > 0).slice(0, 5);
  }, [playLog]);

  // Calculate team stats from play log
  const teamStats = useMemo(() => {
    const stats = {
      home: {
        firstDowns: 0,
        rushingAttempts: 0,
        rushingYards: 0,
        passingYards: 0,
        passCompletions: 0,
        passAttempts: 0,
        interceptions: 0,
        totalPlays: 0,
        totalYards: 0,
        penalties: 0,
        penaltyYards: 0,
        puntCount: 0,
        puntYards: 0,
        thirdDownConv: 0,
        thirdDownAtt: 0,
        fourthDownConv: 0,
        fourthDownAtt: 0,
        fumbles: 0,
        fumblesLost: 0,
        possession: 0,
      },
      away: {
        firstDowns: 0,
        rushingAttempts: 0,
        rushingYards: 0,
        passingYards: 0,
        passCompletions: 0,
        passAttempts: 0,
        interceptions: 0,
        totalPlays: 0,
        totalYards: 0,
        penalties: 0,
        penaltyYards: 0,
        puntCount: 0,
        puntYards: 0,
        thirdDownConv: 0,
        thirdDownAtt: 0,
        fourthDownConv: 0,
        fourthDownAtt: 0,
        fumbles: 0,
        fumblesLost: 0,
        possession: 0,
      },
    };

    playLog.forEach(play => {
      const team = play.team;
      if (!team || !stats[team]) return;

      if (play.type === 'run') {
        stats[team].rushingAttempts++;
        stats[team].rushingYards += play.yards || 0;
        stats[team].totalPlays++;
        stats[team].totalYards += play.yards || 0;
        if (play.firstDown) stats[team].firstDowns++;
      } else if (play.type === 'pass') {
        stats[team].passAttempts++;
        stats[team].totalPlays++;
        if (play.result === 'complete' || play.result === 'touchdown') {
          stats[team].passCompletions++;
          stats[team].passingYards += play.yards || 0;
          stats[team].totalYards += play.yards || 0;
          if (play.firstDown) stats[team].firstDowns++;
        } else if (play.result === 'intercepted') {
          stats[team].interceptions++;
        }
      } else if (play.type === 'punt') {
        stats[team].puntCount++;
        stats[team].puntYards += play.distance || 0;
      } else if (play.type === 'penalty') {
        if (play.against_team === 'offense' && play.team === team) {
          stats[team].penalties++;
          stats[team].penaltyYards += play.yards || 0;
        } else if (play.against_team === 'defense' && play.team !== team) {
          const otherTeam = team === 'home' ? 'away' : 'home';
          stats[otherTeam].penalties++;
          stats[otherTeam].penaltyYards += play.yards || 0;
        }
      }

      // Track 3rd and 4th down conversions
      if (play.down === 3) {
        stats[team].thirdDownAtt++;
        if (play.firstDown || play.result === 'touchdown') {
          stats[team].thirdDownConv++;
        }
      } else if (play.down === 4 && play.type !== 'punt' && play.type !== 'field_goal') {
        stats[team].fourthDownAtt++;
        if (play.firstDown || play.result === 'touchdown') {
          stats[team].fourthDownConv++;
        }
      }
    });

    return stats;
  }, [playLog]);

  // Calculate individual leaders from play log
  const leaders = useMemo(() => {
    const playerStats = {
      home: {},
      away: {},
    };

    playLog.forEach(play => {
      const team = play.team;
      if (!team) return;

      // Rushing stats
      if (play.type === 'run' && play.carrier) {
        const key = `${play.carrier}`;
        if (!playerStats[team][key]) {
          playerStats[team][key] = { number: play.carrier, rushYards: 0, rushAttempts: 0, recYards: 0, receptions: 0, passYards: 0, passAttempts: 0, passCompletions: 0, tackles: 0, sacks: 0, touchdowns: 0 };
        }
        playerStats[team][key].rushYards += play.yards || 0;
        playerStats[team][key].rushAttempts++;
        if (play.result === 'touchdown') playerStats[team][key].touchdowns++;
      }

      // Passing stats
      if (play.type === 'pass' && play.qb) {
        const key = `${play.qb}`;
        if (!playerStats[team][key]) {
          playerStats[team][key] = { number: play.qb, rushYards: 0, rushAttempts: 0, recYards: 0, receptions: 0, passYards: 0, passAttempts: 0, passCompletions: 0, tackles: 0, sacks: 0, touchdowns: 0 };
        }
        playerStats[team][key].passAttempts++;
        if (play.result === 'complete' || play.result === 'touchdown') {
          playerStats[team][key].passCompletions++;
          playerStats[team][key].passYards += play.yards || 0;
          if (play.result === 'touchdown') playerStats[team][key].touchdowns++;
        }
      }

      // Receiving stats
      if (play.type === 'pass' && play.receiver && (play.result === 'complete' || play.result === 'touchdown')) {
        const key = `${play.receiver}`;
        if (!playerStats[team][key]) {
          playerStats[team][key] = { number: play.receiver, rushYards: 0, rushAttempts: 0, recYards: 0, receptions: 0, passYards: 0, passAttempts: 0, passCompletions: 0, tackles: 0, sacks: 0, touchdowns: 0 };
        }
        playerStats[team][key].recYards += play.yards || 0;
        playerStats[team][key].receptions++;
        if (play.result === 'touchdown') playerStats[team][key].touchdowns++;
      }

      // Tackle stats (from defensive plays)
      const defTeam = team === 'home' ? 'away' : 'home';
      if (play.tackler) {
        const key = `${play.tackler}`;
        if (!playerStats[defTeam][key]) {
          playerStats[defTeam][key] = { number: play.tackler, rushYards: 0, rushAttempts: 0, recYards: 0, receptions: 0, passYards: 0, passAttempts: 0, passCompletions: 0, tackles: 0, sacks: 0, touchdowns: 0 };
        }
        playerStats[defTeam][key].tackles++;
        if (play.result === 'sack') {
          playerStats[defTeam][key].sacks++;
        }
      }
    });

    // Convert to sorted arrays
    const getTopPlayers = (team, stat, limit = 3) => {
      return Object.values(playerStats[team])
        .filter(p => p[stat] > 0)
        .sort((a, b) => b[stat] - a[stat])
        .slice(0, limit);
    };

    return {
      home: {
        tackles: getTopPlayers('home', 'tackles'),
        sacks: getTopPlayers('home', 'sacks'),
        passYards: getTopPlayers('home', 'passYards'),
        recYards: getTopPlayers('home', 'recYards'),
        receptions: getTopPlayers('home', 'receptions'),
        rushYards: getTopPlayers('home', 'rushYards'),
        touchdowns: getTopPlayers('home', 'touchdowns'),
      },
      away: {
        tackles: getTopPlayers('away', 'tackles'),
        sacks: getTopPlayers('away', 'sacks'),
        passYards: getTopPlayers('away', 'passYards'),
        recYards: getTopPlayers('away', 'recYards'),
        receptions: getTopPlayers('away', 'receptions'),
        rushYards: getTopPlayers('away', 'rushYards'),
        touchdowns: getTopPlayers('away', 'touchdowns'),
      },
    };
  }, [playLog]);

  // Calculate drives from play log
  const drives = useMemo(() => {
    const allDrives = [];
    let currentDrive = null;
    
    // Process plays in reverse order (oldest first)
    const reversedPlays = [...playLog].reverse();
    
    reversedPlays.forEach((play, idx) => {
      // Start a new drive if this is first play or possession changed
      const prevPlay = idx > 0 ? reversedPlays[idx - 1] : null;
      const possessionChanged = prevPlay && prevPlay.team !== play.team;
      const isKickoff = play.type === 'kickoff';
      const isPunt = prevPlay?.type === 'punt';
      const isTurnover = prevPlay?.result === 'intercepted' || prevPlay?.result === 'fumble_lost';
      const isScoring = prevPlay?.result === 'touchdown' || prevPlay?.type === 'field_goal' || prevPlay?.type === 'extra_point';
      
      if (!currentDrive || possessionChanged || isKickoff || isPunt || isTurnover || isScoring) {
        if (currentDrive && currentDrive.plays.length > 0) {
          allDrives.push(currentDrive);
        }
        currentDrive = {
          id: `drive-${idx}`,
          team: play.team,
          quarter: play.quarter,
          startYardLine: play.yard_line || play.ball_on || 25,
          plays: [],
          totalYards: 0,
          result: 'In Progress',
          timeOfPossession: 0
        };
      }
      
      currentDrive.plays.push(play);
      currentDrive.totalYards += (play.yards || 0);
      currentDrive.endYardLine = play.new_ball_position || (currentDrive.startYardLine + currentDrive.totalYards);
      
      // Determine drive result
      if (play.result === 'touchdown') {
        currentDrive.result = 'TOUCHDOWN';
      } else if (play.type === 'field_goal' && play.result === 'good') {
        currentDrive.result = 'FIELD GOAL';
      } else if (play.result === 'intercepted') {
        currentDrive.result = 'INTERCEPTION';
      } else if (play.result === 'fumble_lost') {
        currentDrive.result = 'FUMBLE';
      } else if (play.type === 'punt') {
        currentDrive.result = 'PUNT';
      } else if (play.type === 'field_goal' && play.result !== 'good') {
        currentDrive.result = 'MISSED FG';
      } else if (play.turnover_on_downs) {
        currentDrive.result = 'TURNOVER ON DOWNS';
      }
    });
    
    if (currentDrive && currentDrive.plays.length > 0) {
      allDrives.push(currentDrive);
    }
    
    return allDrives.reverse(); // Most recent first
  }, [playLog]);

  // Calculate box score stats by player
  const boxScore = useMemo(() => {
    const stats = {
      home: {
        passing: [],
        rushing: [],
        receiving: [],
        defense: [],
        specialTeams: []
      },
      away: {
        passing: [],
        rushing: [],
        receiving: [],
        defense: [],
        specialTeams: []
      }
    };
    
    // Aggregate stats by player
    const playerMap = { home: {}, away: {} };
    
    playLog.forEach(play => {
      const team = play.team || 'home';
      const defTeam = team === 'home' ? 'away' : 'home';
      
      // Passing stats
      if (play.type === 'pass' && play.qb) {
        if (!playerMap[team][`qb-${play.qb}`]) {
          playerMap[team][`qb-${play.qb}`] = {
            number: play.qb,
            type: 'passing',
            comp: 0, att: 0, yards: 0, td: 0, int: 0
          };
        }
        const qb = playerMap[team][`qb-${play.qb}`];
        qb.att++;
        if (play.result === 'complete' || play.result === 'touchdown') {
          qb.comp++;
          qb.yards += play.yards || 0;
        }
        if (play.result === 'touchdown') qb.td++;
        if (play.result === 'intercepted') qb.int++;
      }
      
      // Rushing stats
      if (play.type === 'run' && play.carrier) {
        if (!playerMap[team][`rb-${play.carrier}`]) {
          playerMap[team][`rb-${play.carrier}`] = {
            number: play.carrier,
            type: 'rushing',
            att: 0, yards: 0, td: 0, long: 0
          };
        }
        const rb = playerMap[team][`rb-${play.carrier}`];
        rb.att++;
        rb.yards += play.yards || 0;
        if (play.result === 'touchdown') rb.td++;
        rb.long = Math.max(rb.long, play.yards || 0);
      }
      
      // Receiving stats
      if (play.type === 'pass' && play.receiver && (play.result === 'complete' || play.result === 'touchdown')) {
        if (!playerMap[team][`wr-${play.receiver}`]) {
          playerMap[team][`wr-${play.receiver}`] = {
            number: play.receiver,
            type: 'receiving',
            rec: 0, yards: 0, td: 0, long: 0
          };
        }
        const wr = playerMap[team][`wr-${play.receiver}`];
        wr.rec++;
        wr.yards += play.yards || 0;
        if (play.result === 'touchdown') wr.td++;
        wr.long = Math.max(wr.long, play.yards || 0);
      }
      
      // Defensive stats
      if (play.tackler) {
        if (!playerMap[defTeam][`def-${play.tackler}`]) {
          playerMap[defTeam][`def-${play.tackler}`] = {
            number: play.tackler,
            type: 'defense',
            tackles: 0, sacks: 0, tfl: 0, int: 0
          };
        }
        const def = playerMap[defTeam][`def-${play.tackler}`];
        def.tackles++;
        if (play.result === 'sack') def.sacks++;
        if (play.yards < 0) def.tfl++;
      }
      
      if (play.result === 'intercepted' && play.interceptedBy) {
        if (!playerMap[defTeam][`def-${play.interceptedBy}`]) {
          playerMap[defTeam][`def-${play.interceptedBy}`] = {
            number: play.interceptedBy,
            type: 'defense',
            tackles: 0, sacks: 0, tfl: 0, int: 0
          };
        }
        playerMap[defTeam][`def-${play.interceptedBy}`].int++;
      }
    });
    
    // Convert to arrays
    ['home', 'away'].forEach(team => {
      Object.values(playerMap[team]).forEach(player => {
        if (player.type === 'passing') stats[team].passing.push(player);
        else if (player.type === 'rushing') stats[team].rushing.push(player);
        else if (player.type === 'receiving') stats[team].receiving.push(player);
        else if (player.type === 'defense') stats[team].defense.push(player);
      });
      
      // Sort by primary stat
      stats[team].passing.sort((a, b) => b.yards - a.yards);
      stats[team].rushing.sort((a, b) => b.yards - a.yards);
      stats[team].receiving.sort((a, b) => b.yards - a.yards);
      stats[team].defense.sort((a, b) => b.tackles - a.tackles);
    });
    
    return stats;
  }, [playLog]);

  // State for hovered drive (for tooltip)
  const [hoveredDrive, setHoveredDrive] = useState(null);

  const homeTeamName = game?.home_team_name || 'Home';
  const awayTeamName = game?.away_team_name || 'Away';
  const homeAbbrev = homeTeamName.substring(0, 3).toUpperCase();
  const awayAbbrev = awayTeamName.substring(0, 3).toUpperCase();
  const homeLogo = game?.home_team_logo || null;
  const awayLogo = game?.away_team_logo || null;

  // Render team logo or abbreviation
  const renderTeamLogo = (logo, abbrev, color, size = 'md') => {
    const sizeClasses = size === 'lg' ? 'w-16 h-16 text-2xl' : size === 'sm' ? 'w-6 h-6 text-xs' : 'w-10 h-10 text-sm';
    
    if (logo) {
      return (
        <img 
          src={logo} 
          alt={abbrev}
          className={`${sizeClasses} rounded-lg object-cover`}
        />
      );
    }
    
    return (
      <div 
        className={`${sizeClasses} rounded-lg flex items-center justify-center font-bold`}
        style={{ backgroundColor: color }}
      >
        {abbrev}
      </div>
    );
  };

  // Format TOP display
  const formatDriveTOP = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get result color
  const getResultColor = (result) => {
    if (result === 'TOUCHDOWN' || result === 'FIELD GOAL') return 'text-green-400';
    if (result === 'INTERCEPTION' || result === 'FUMBLE') return 'text-red-400';
    if (result === 'PUNT' || result === 'MISSED FG' || result === 'TURNOVER ON DOWNS') return 'text-yellow-400';
    return 'text-zinc-400';
  };

  const leaderTabs = [
    { id: 'tackles', label: 'Tackles' },
    { id: 'sacks', label: 'Sacks' },
    { id: 'passYards', label: 'Pass Yards' },
    { id: 'receptions', label: 'Receptions' },
    { id: 'recYards', label: 'Rec Yards' },
    { id: 'rushYards', label: 'Rush Yards' },
    { id: 'touchdowns', label: 'Touchdowns' },
  ];

  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      {/* Navigation Tabs */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'drives', label: 'Drives' },
              { id: 'box-score', label: 'Box Score' },
              { id: 'play-by-play', label: 'Play-by-Play' },
              { id: 'team-stats', label: 'Team Stats' },
              { id: 'leaders', label: 'Leaders' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeSection === tab.id
                    ? 'border-red-500 text-white bg-zinc-800'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Scoreboard */}
        <div className="bg-zinc-900 rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              {/* Away Team */}
              <div className="flex items-center gap-4 flex-1">
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: awayColor }}
                >
                  {awayLogo ? (
                    <img src={awayLogo} alt={awayAbbrev} className="w-full h-full object-cover rounded-lg" />
                  ) : awayAbbrev}
                </div>
                <div>
                  <div className="text-lg font-bold">{awayTeamName}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-zinc-500 mr-1">TO:</span>
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i}
                        className={`w-3 h-3 rounded-full ${i < awayTimeouts ? '' : 'opacity-30'}`}
                        style={{ backgroundColor: i < awayTimeouts ? awayColor : '#666' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-6 px-8">
                <div className="text-5xl font-bold" style={{ color: awayColor }}>{awayScore}</div>
                <div className="text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">
                    {clockTime > 0 ? getQuarterLabel(quarter) : 'Final'}
                  </div>
                  {clockTime > 0 && (
                    <div className="text-lg font-mono">{formatTime(clockTime)}</div>
                  )}
                  {clockTime === 0 && <div className="text-sm text-zinc-400">Final</div>}
                </div>
                <div className="text-5xl font-bold" style={{ color: homeColor }}>{homeScore}</div>
              </div>

              {/* Home Team */}
              <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="text-right">
                  <div className="text-lg font-bold">{homeTeamName}</div>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-xs text-zinc-500 mr-1">TO:</span>
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i}
                        className={`w-3 h-3 rounded-full ${i < homeTimeouts ? '' : 'opacity-30'}`}
                        style={{ backgroundColor: i < homeTimeouts ? homeColor : '#666' }}
                      />
                    ))}
                  </div>
                </div>
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: homeColor }}
                >
                  {homeLogo ? (
                    <img src={homeLogo} alt={homeAbbrev} className="w-full h-full object-cover rounded-lg" />
                  ) : homeAbbrev}
                </div>
              </div>
            </div>

            {/* Quarter Breakdown */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500">
                    <th className="text-left py-2 px-3 font-medium">Team</th>
                    <th className="text-center py-2 px-3 font-medium w-12">1</th>
                    <th className="text-center py-2 px-3 font-medium w-12">2</th>
                    <th className="text-center py-2 px-3 font-medium w-12">3</th>
                    <th className="text-center py-2 px-3 font-medium w-12">4</th>
                    <th className="text-center py-2 px-3 font-medium w-12">T</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-zinc-800">
                    <td className="py-2 px-3 font-medium">{awayTeamName}</td>
                    {quarterScores.away.map((score, i) => (
                      <td key={i} className="text-center py-2 px-3">{score}</td>
                    ))}
                    <td className="text-center py-2 px-3 font-bold">{awayScore}</td>
                  </tr>
                  <tr className="border-t border-zinc-800">
                    <td className="py-2 px-3 font-medium">{homeTeamName}</td>
                    {quarterScores.home.map((score, i) => (
                      <td key={i} className="text-center py-2 px-3">{score}</td>
                    ))}
                    <td className="text-center py-2 px-3 font-bold">{homeScore}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary View */}
        {activeSection === 'summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scoring Plays */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Scoring Plays
                </h3>
                <button 
                  onClick={() => setActiveSection('play-by-play')}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  All Scoring Plays <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-zinc-800">
                {scoringPlays.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500">No scoring plays yet</div>
                ) : (
                  scoringPlays.map((play, i) => (
                    <div key={play.id || i} className="p-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: play.team === 'home' ? homeColor : awayColor }}
                        >
                          {play.team === 'home' ? homeAbbrev : awayAbbrev}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                            <span>{play.clock}</span>
                            <span>{getQuarterLabel(play.quarter)}</span>
                            {play.down && play.distance && (
                              <span>{play.down}{play.down === 1 ? 'st' : play.down === 2 ? 'nd' : play.down === 3 ? 'rd' : 'th'} & {play.distance}</span>
                            )}
                          </div>
                          <p className="text-sm">{play.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-zinc-500">{awayAbbrev}</div>
                          <div className="font-bold">{play.awayScoreAfter || awayScore}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-zinc-500">{homeAbbrev}</div>
                          <div className="font-bold">{play.homeScoreAfter || homeScore}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Leaders */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h3 className="font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Leaders
                </h3>
              </div>
              
              {/* Leader Tabs */}
              <div className="flex overflow-x-auto border-b border-zinc-800 px-2">
                {leaderTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLeaderTab(tab.id)}
                    className={`px-3 py-2 text-xs whitespace-nowrap transition-all ${
                      activeLeaderTab === tab.id
                        ? 'text-white border-b-2 border-red-500'
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 grid grid-cols-2 gap-4">
                {/* Away Team Leaders */}
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-2">{awayTeamName}</div>
                  {leaders.away[activeLeaderTab]?.length > 0 ? (
                    <div className="space-y-2">
                      {leaders.away[activeLeaderTab].map((player, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800 rounded">
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: awayColor }}
                          >
                            #{player.number}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">#{player.number}</div>
                          </div>
                          <div className="text-lg font-bold">{player[activeLeaderTab]}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">No stats recorded</div>
                  )}
                </div>

                {/* Home Team Leaders */}
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-2">{homeTeamName}</div>
                  {leaders.home[activeLeaderTab]?.length > 0 ? (
                    <div className="space-y-2">
                      {leaders.home[activeLeaderTab].map((player, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800 rounded">
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: homeColor }}
                          >
                            #{player.number}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">#{player.number}</div>
                          </div>
                          <div className="text-lg font-bold">{player[activeLeaderTab]}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">No stats recorded</div>
                  )}
                </div>
              </div>
            </div>

            {/* Latest Plays */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  Latest Plays
                </h3>
                <button 
                  onClick={() => setActiveSection('play-by-play')}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  Full Play-by-Play <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
                {playLog.slice(0, 5).map((play, i) => (
                  <div key={play.id || i} className="p-3">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: play.team === 'home' ? homeColor : awayColor }}
                      >
                        {play.team === 'home' ? homeAbbrev.charAt(0) : awayAbbrev.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                          <span>{play.clock}</span>
                          <span>{getQuarterLabel(play.quarter)}</span>
                          {play.ball_on && <span>@ {play.ball_on}</span>}
                        </div>
                        <p className="text-sm">{play.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {playLog.length === 0 && (
                  <div className="p-4 text-center text-zinc-500">No plays yet</div>
                )}
              </div>
            </div>

            {/* Team Stats Summary */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Team Stats
                </h3>
                <button 
                  onClick={() => setActiveSection('team-stats')}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  Full Team Stats <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="p-4">
                <TeamStatRow label="First Downs" away={teamStats.away.firstDowns} home={teamStats.home.firstDowns} awayColor={awayColor} homeColor={homeColor} />
                <TeamStatRow label="Rushing Yards" away={teamStats.away.rushingYards} home={teamStats.home.rushingYards} awayColor={awayColor} homeColor={homeColor} />
                <TeamStatRow label="Passing Yards" away={teamStats.away.passingYards} home={teamStats.home.passingYards} awayColor={awayColor} homeColor={homeColor} />
                <TeamStatRow label="Total Yards" away={teamStats.away.totalYards} home={teamStats.home.totalYards} awayColor={awayColor} homeColor={homeColor} />
                <TeamStatRow label="Penalties" away={`${teamStats.away.penalties}-${teamStats.away.penaltyYards}`} home={`${teamStats.home.penalties}-${teamStats.home.penaltyYards}`} awayColor={awayColor} homeColor={homeColor} />
                <TeamStatRow label="Time of Poss." away={formatTOP(awayTimeOfPossession)} home={formatTOP(homeTimeOfPossession)} awayColor={awayColor} homeColor={homeColor} />
              </div>
            </div>
          </div>
        )}

        {/* Play-by-Play View */}
        {activeSection === 'play-by-play' && (
          <div className="bg-zinc-900 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="font-bold">Full Play-by-Play</h3>
            </div>
            <div className="divide-y divide-zinc-800">
              {playLog.map((play, i) => (
                <div 
                  key={play.id || i} 
                  className={`p-4 ${play.points ? 'bg-yellow-500/10' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: play.team === 'home' ? homeColor : awayColor }}
                    >
                      {play.team === 'home' ? homeAbbrev : awayAbbrev}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-sm text-zinc-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {play.clock}
                        </span>
                        <span>{getQuarterLabel(play.quarter)}</span>
                        {play.down && play.distance && (
                          <span className="flex items-center gap-1">
                            {play.down}{play.down === 1 ? 'st' : play.down === 2 ? 'nd' : play.down === 3 ? 'rd' : 'th'} & {play.distance}
                          </span>
                        )}
                        {play.ball_on && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {play.ball_on}
                          </span>
                        )}
                      </div>
                      <p className="text-white">{play.description}</p>
                      {play.points && (
                        <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-sm">
                          <Trophy className="w-3 h-3" />
                          +{play.points} points
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {playLog.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No plays recorded yet</div>
              )}
            </div>
          </div>
        )}

        {/* Team Stats View */}
        {activeSection === 'team-stats' && (
          <div className="bg-zinc-900 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="font-bold">Team Statistics</h3>
            </div>
            <div className="p-4">
              {/* Header */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div className="text-lg font-bold" style={{ color: awayColor }}>{awayAbbrev}</div>
                <div className="text-zinc-500 text-sm"></div>
                <div className="text-lg font-bold" style={{ color: homeColor }}>{homeAbbrev}</div>
              </div>
              
              <div className="space-y-1">
                <TeamStatRow label="First Downs" away={teamStats.away.firstDowns} home={teamStats.home.firstDowns} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Rushing Attempts" away={teamStats.away.rushingAttempts} home={teamStats.home.rushingAttempts} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Rushing Yards" away={teamStats.away.rushingYards} home={teamStats.home.rushingYards} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Rushing Avg" away={teamStats.away.rushingAttempts ? (teamStats.away.rushingYards / teamStats.away.rushingAttempts).toFixed(1) : '0.0'} home={teamStats.home.rushingAttempts ? (teamStats.home.rushingYards / teamStats.home.rushingAttempts).toFixed(1) : '0.0'} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Passing Yards" away={teamStats.away.passingYards} home={teamStats.home.passingYards} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Pass C-A-I" away={`${teamStats.away.passCompletions}-${teamStats.away.passAttempts}-${teamStats.away.interceptions}`} home={`${teamStats.home.passCompletions}-${teamStats.home.passAttempts}-${teamStats.home.interceptions}`} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Total Plays" away={teamStats.away.totalPlays} home={teamStats.home.totalPlays} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Total Yards" away={teamStats.away.totalYards} home={teamStats.home.totalYards} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Yards/Play" away={teamStats.away.totalPlays ? (teamStats.away.totalYards / teamStats.away.totalPlays).toFixed(2) : '0.00'} home={teamStats.home.totalPlays ? (teamStats.home.totalYards / teamStats.home.totalPlays).toFixed(2) : '0.00'} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Penalties" away={`${teamStats.away.penalties}-${teamStats.away.penaltyYards}`} home={`${teamStats.home.penalties}-${teamStats.home.penaltyYards}`} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Punts" away={teamStats.away.puntCount > 0 ? `${teamStats.away.puntCount}-${(teamStats.away.puntYards / teamStats.away.puntCount).toFixed(1)}` : '0-0.0'} home={teamStats.home.puntCount > 0 ? `${teamStats.home.puntCount}-${(teamStats.home.puntYards / teamStats.home.puntCount).toFixed(1)}` : '0-0.0'} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="3rd Down Eff" away={`${teamStats.away.thirdDownConv}-${teamStats.away.thirdDownAtt}`} home={`${teamStats.home.thirdDownConv}-${teamStats.home.thirdDownAtt}`} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="4th Down Eff" away={`${teamStats.away.fourthDownConv}-${teamStats.away.fourthDownAtt}`} home={`${teamStats.home.fourthDownConv}-${teamStats.home.fourthDownAtt}`} awayColor={awayColor} homeColor={homeColor} expanded />
                <TeamStatRow label="Time of Poss." away={formatTOP(awayTimeOfPossession)} home={formatTOP(homeTimeOfPossession)} awayColor={awayColor} homeColor={homeColor} expanded />
              </div>
            </div>
          </div>
        )}

        {/* Leaders View */}
        {activeSection === 'leaders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Away Team Leaders */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <div 
                className="px-4 py-3 border-b border-zinc-800"
                style={{ backgroundColor: awayColor + '30' }}
              >
                <h3 className="font-bold" style={{ color: awayColor }}>{awayTeamName} Leaders</h3>
              </div>
              <div className="p-4 space-y-4">
                {leaderTabs.map(tab => (
                  <div key={tab.id}>
                    <div className="text-xs text-zinc-500 uppercase mb-2">{tab.label}</div>
                    {leaders.away[tab.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {leaders.away[tab.id].map((player, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                                style={{ backgroundColor: awayColor }}
                              >
                                #{player.number}
                              </div>
                              <span className="font-medium">#{player.number}</span>
                            </div>
                            <span className="text-xl font-bold">{player[tab.id]}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-600">—</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Home Team Leaders */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <div 
                className="px-4 py-3 border-b border-zinc-800"
                style={{ backgroundColor: homeColor + '30' }}
              >
                <h3 className="font-bold" style={{ color: homeColor }}>{homeTeamName} Leaders</h3>
              </div>
              <div className="p-4 space-y-4">
                {leaderTabs.map(tab => (
                  <div key={tab.id}>
                    <div className="text-xs text-zinc-500 uppercase mb-2">{tab.label}</div>
                    {leaders.home[tab.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {leaders.home[tab.id].map((player, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                                style={{ backgroundColor: homeColor }}
                              >
                                #{player.number}
                              </div>
                              <span className="font-medium">#{player.number}</span>
                            </div>
                            <span className="text-xl font-bold">{player[tab.id]}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-600">—</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Team Stat Row Component
function TeamStatRow({ label, away, home, awayColor, homeColor, expanded = false }) {
  const awayNum = typeof away === 'number' ? away : parseFloat(away) || 0;
  const homeNum = typeof home === 'number' ? home : parseFloat(home) || 0;
  const total = awayNum + homeNum;
  const awayPct = total > 0 ? (awayNum / total) * 100 : 50;
  const homePct = total > 0 ? (homeNum / total) * 100 : 50;

  return (
    <div className={`grid grid-cols-3 gap-4 items-center ${expanded ? 'py-3 border-b border-zinc-800' : 'py-2'}`}>
      <div className="text-right font-medium">{away}</div>
      <div className="text-center">
        <div className="text-xs text-zinc-500 mb-1">{label}</div>
        {expanded && (
          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden flex">
            <div 
              className="h-full transition-all" 
              style={{ width: `${awayPct}%`, backgroundColor: awayColor }}
            />
            <div 
              className="h-full transition-all" 
              style={{ width: `${homePct}%`, backgroundColor: homeColor }}
            />
          </div>
        )}
      </div>
      <div className="text-left font-medium">{home}</div>
    </div>
  );
}

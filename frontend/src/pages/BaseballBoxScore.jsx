import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Format player name as "F. LastName"
const formatPlayerName = (name) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name;
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return `${firstName.charAt(0)}. ${lastName}`;
};

// Generate innings array based on game data
const generateInningsArray = (game) => {
  const maxInning = Math.max(9, game?.current_inning || 9);
  return Array.from({ length: maxInning }, (_, i) => i + 1);
};

// Score by Innings Table Component
const ScoreByInningsTable = ({ game, awayTeamName, homeTeamName }) => {
  const innings = generateInningsArray(game);
  const inningScores = game?.inning_scores || {};
  
  // Calculate totals
  const awayRuns = game?.away_score || 0;
  const homeRuns = game?.home_score || 0;
  const awayHits = game?.away_hits || 0;
  const homeHits = game?.home_hits || 0;
  const awayErrors = game?.away_errors || 0;
  const homeErrors = game?.home_errors || 0;
  
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm border-collapse" data-testid="score-by-innings-table">
        <thead>
          <tr className="bg-zinc-800 text-white">
            <th className="text-left px-3 py-2 font-semibold border border-zinc-700 min-w-[150px]">Team</th>
            {innings.map(inning => (
              <th key={inning} className="text-center px-2 py-2 font-semibold border border-zinc-700 w-8">{inning}</th>
            ))}
            <th className="text-center px-3 py-2 font-bold border border-zinc-700 bg-zinc-700 w-10">R</th>
            <th className="text-center px-3 py-2 font-bold border border-zinc-700 bg-zinc-700 w-10">H</th>
            <th className="text-center px-3 py-2 font-bold border border-zinc-700 bg-zinc-700 w-10">E</th>
          </tr>
        </thead>
        <tbody>
          {/* Away Team Row */}
          <tr className="bg-zinc-900">
            <td className="text-left px-3 py-2 font-medium text-white border border-zinc-700">
              {awayTeamName}
            </td>
            {innings.map(inning => (
              <td key={inning} className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">
                {inningScores[`away_${inning}`] ?? (inning <= (game?.current_inning || 1) ? '0' : '-')}
              </td>
            ))}
            <td className="text-center px-3 py-2 font-bold text-white border border-zinc-700 bg-zinc-800">{awayRuns}</td>
            <td className="text-center px-3 py-2 font-bold text-white border border-zinc-700 bg-zinc-800">{awayHits}</td>
            <td className="text-center px-3 py-2 font-bold text-white border border-zinc-700 bg-zinc-800">{awayErrors}</td>
          </tr>
          {/* Home Team Row */}
          <tr className="bg-zinc-900">
            <td className="text-left px-3 py-2 font-medium text-white border border-zinc-700">
              {homeTeamName}
            </td>
            {innings.map(inning => (
              <td key={inning} className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">
                {inningScores[`home_${inning}`] ?? (inning <= (game?.current_inning || 1) ? '0' : '-')}
              </td>
            ))}
            <td className="text-center px-3 py-2 font-bold text-white border border-zinc-700 bg-zinc-800">{homeRuns}</td>
            <td className="text-center px-3 py-2 font-bold text-white border border-zinc-700 bg-zinc-800">{homeHits}</td>
            <td className="text-center px-3 py-2 font-bold text-white border border-zinc-700 bg-zinc-800">{homeErrors}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Batting Stats Table Component
const BattingStatsTable = ({ teamName, teamColor, teamLogo, players, stats }) => {
  // Merge player roster with stats
  const playerStats = players?.map(player => {
    const stat = stats?.find(s => s.player_number === player.player_number) || {};
    return {
      ...player,
      ab: stat.at_bats || 0,
      r: stat.runs || 0,
      h: stat.hits || 0,
      rbi: stat.rbis || 0,
      bb: stat.walks || 0,
      so: stat.strikeouts_batting || 0,
      lob: stat.left_on_base || 0,
    };
  }) || [];
  
  // Calculate totals
  const totals = playerStats.reduce((acc, p) => ({
    ab: acc.ab + p.ab,
    r: acc.r + p.r,
    h: acc.h + p.h,
    rbi: acc.rbi + p.rbi,
    bb: acc.bb + p.bb,
    so: acc.so + p.so,
    lob: acc.lob + p.lob,
  }), { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, lob: 0 });
  
  return (
    <div className="mb-6">
      <div 
        className="flex items-center gap-3 px-4 py-2 rounded-t-lg"
        style={{ backgroundColor: teamColor || '#374151' }}
      >
        {teamLogo && (
          <img 
            src={teamLogo} 
            alt={`${teamName} logo`}
            className="w-8 h-8 object-contain"
          />
        )}
        <h3 className="text-white font-bold text-lg">{teamName}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" data-testid={`batting-table-${teamName?.toLowerCase().replace(/\s+/g, '-')}`}>
          <thead>
            <tr className="bg-zinc-800 text-white">
              <th className="text-left px-3 py-2 font-semibold border border-zinc-700 min-w-[180px]">Player</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-12">Pos</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">AB</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">R</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">H</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">RBI</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">BB</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">SO</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">LOB</th>
            </tr>
          </thead>
          <tbody>
            {playerStats.map((player, idx) => (
              <tr key={player.player_number || idx} className={idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/50'}>
                <td className="text-left px-3 py-2 text-white border border-zinc-700">
                  #{player.player_number} {player.player_name}
                </td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.position || '-'}</td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.ab}</td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.r}</td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.h}</td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.rbi}</td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.bb}</td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.so}</td>
                <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{player.lob}</td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-zinc-700 font-bold">
              <td className="text-left px-3 py-2 text-white border border-zinc-600">Totals</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600"></td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.ab}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.r}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.h}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.rbi}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.bb}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.so}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.lob}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Pitching Stats Table Component
const PitchingStatsTable = ({ teamName, teamColor, players, stats }) => {
  // Filter to only pitchers (those with pitches_thrown or innings_pitched)
  const pitcherStats = stats?.filter(s => s.pitches_thrown > 0 || s.innings_pitched > 0) || [];
  
  // If no pitcher stats, show placeholder
  if (pitcherStats.length === 0) {
    return (
      <div className="mb-6">
        <div 
          className="flex items-center gap-3 px-4 py-2 rounded-t-lg"
          style={{ backgroundColor: teamColor || '#374151' }}
        >
          <h3 className="text-white font-bold text-lg">{teamName} - Pitching</h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 p-4 text-zinc-400 text-center">
          No pitching stats recorded
        </div>
      </div>
    );
  }
  
  // Calculate totals
  const totals = pitcherStats.reduce((acc, p) => ({
    ip: acc.ip + (p.innings_pitched || 0),
    h: acc.h + (p.hits_allowed || 0),
    r: acc.r + (p.runs_allowed || 0),
    er: acc.er + (p.earned_runs || 0),
    bb: acc.bb + (p.walks_allowed || 0),
    so: acc.so + (p.strikeouts_pitching || 0),
    np: acc.np + (p.pitches_thrown || 0),
  }), { ip: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, np: 0 });
  
  return (
    <div className="mb-6">
      <div 
        className="flex items-center gap-3 px-4 py-2 rounded-t-lg"
        style={{ backgroundColor: teamColor || '#374151' }}
      >
        <h3 className="text-white font-bold text-lg">{teamName} - Pitching</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" data-testid={`pitching-table-${teamName?.toLowerCase().replace(/\s+/g, '-')}`}>
          <thead>
            <tr className="bg-zinc-800 text-white">
              <th className="text-left px-3 py-2 font-semibold border border-zinc-700 min-w-[180px]">Player</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-12">IP</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">H</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">R</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">ER</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">BB</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">SO</th>
              <th className="text-center px-2 py-2 font-semibold border border-zinc-700 w-10">NP</th>
            </tr>
          </thead>
          <tbody>
            {pitcherStats.map((pitcher, idx) => {
              const player = players?.find(p => p.player_number === pitcher.player_number);
              return (
                <tr key={pitcher.player_number || idx} className={idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/50'}>
                  <td className="text-left px-3 py-2 text-white border border-zinc-700">
                    #{pitcher.player_number} {player?.player_name || 'Unknown'}
                  </td>
                  <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{pitcher.innings_pitched || '-'}</td>
                  <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{pitcher.hits_allowed || 0}</td>
                  <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{pitcher.runs_allowed || 0}</td>
                  <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{pitcher.earned_runs || 0}</td>
                  <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{pitcher.walks_allowed || 0}</td>
                  <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{pitcher.strikeouts_pitching || 0}</td>
                  <td className="text-center px-2 py-2 text-zinc-300 border border-zinc-700">{pitcher.pitches_thrown || 0}</td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-zinc-700 font-bold">
              <td className="text-left px-3 py-2 text-white border border-zinc-600">Totals</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.ip}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.h}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.r}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.er}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.bb}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.so}</td>
              <td className="text-center px-2 py-2 text-white border border-zinc-600">{totals.np}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Scoring Summary Component
const ScoringSummary = ({ playByPlay, awayTeamName, homeTeamName }) => {
  // Filter to only scoring plays
  const scoringPlays = playByPlay?.filter(play => 
    play.description?.toLowerCase().includes('scored') ||
    play.description?.toLowerCase().includes('home run') ||
    play.description?.toLowerCase().includes('rbi') ||
    play.description?.toLowerCase().includes('run')
  ) || [];
  
  if (scoringPlays.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <h3 className="text-white font-bold text-lg mb-3 px-2">Scoring Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-800 text-white">
              <th className="text-left px-3 py-2 font-semibold border border-zinc-700 w-16">Inning</th>
              <th className="text-left px-3 py-2 font-semibold border border-zinc-700">Description</th>
            </tr>
          </thead>
          <tbody>
            {scoringPlays.map((play, idx) => (
              <tr key={play.id || idx} className={idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/50'}>
                <td className="text-left px-3 py-2 text-zinc-300 border border-zinc-700">{play.inning}</td>
                <td className="text-left px-3 py-2 text-zinc-300 border border-zinc-700">{play.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Game Notes Component
const GameNotes = ({ game, homeStats, awayStats, homeRoster, awayRoster }) => {
  const notes = [];
  
  // Check for home runs
  const allStats = [...(homeStats || []), ...(awayStats || [])];
  const allRoster = [...(homeRoster || []), ...(awayRoster || [])];
  
  allStats.forEach(stat => {
    if (stat.home_runs > 0) {
      const player = allRoster.find(p => p.player_number === stat.player_number);
      notes.push(`HR: ${player?.player_name || stat.player_number} (${stat.home_runs})`);
    }
    if (stat.stolen_bases > 0) {
      const player = allRoster.find(p => p.player_number === stat.player_number);
      notes.push(`SB: ${player?.player_name || stat.player_number} (${stat.stolen_bases})`);
    }
  });
  
  if (notes.length === 0) return null;
  
  return (
    <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-white font-bold text-lg mb-2">Game Notes</h3>
      <div className="text-zinc-300 text-sm space-y-1">
        {notes.map((note, idx) => (
          <div key={idx}>{note}</div>
        ))}
      </div>
    </div>
  );
};

// Main Box Score Page Component
export default function BaseballBoxScore() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Check if this is demo mode
  const isDemo = location.pathname.includes('/demo/');
  
  useEffect(() => {
    if (isDemo) {
      // Use demo data
      setGame({
        _id: 'demo',
        home_team_name: 'Riverside Sluggers',
        away_team_name: 'Valley Hawks',
        home_team_color: '#dc2626',
        away_team_color: '#2563eb',
        home_team_logo: 'https://static.prod-images.emergentagent.com/jobs/c5c231ef-ef17-47e4-a798-a17d1c9d22b3/images/225b74b9df9dcfb1e851b24124f270f93e0599ce047d87dc6bffc2dff7c0d6d0.png',
        away_team_logo: 'https://static.prod-images.emergentagent.com/jobs/c5c231ef-ef17-47e4-a798-a17d1c9d22b3/images/de33ad55d2986285a9198503d6337489dab64d12d0176a77464f466c14da52df.png',
        home_score: 4,
        away_score: 2,
        home_hits: 8,
        away_hits: 5,
        home_errors: 1,
        away_errors: 0,
        current_inning: 9,
        inning_half: 'bottom',
        status: 'final',
        date: new Date().toISOString(),
        location: 'Demo Stadium',
        winning_pitcher: '1',
        losing_pitcher: '1',
        home_roster: [
          { player_number: '1', player_name: 'Mike Johnson', position: 'P' },
          { player_number: '5', player_name: 'Tom Davis', position: 'C' },
          { player_number: '7', player_name: 'Chris Wilson', position: '1B' },
          { player_number: '12', player_name: 'Jake Anderson', position: '2B' },
          { player_number: '23', player_name: 'Sam Miller', position: 'SS' },
          { player_number: '8', player_name: 'Alex Brown', position: '3B' },
          { player_number: '15', player_name: 'Ryan Garcia', position: 'LF' },
          { player_number: '21', player_name: 'David Lee', position: 'CF' },
          { player_number: '33', player_name: 'Mark Taylor', position: 'RF' },
        ],
        away_roster: [
          { player_number: '2', player_name: 'Ryan Smith', position: 'P' },
          { player_number: '4', player_name: 'Kevin Brown', position: 'C' },
          { player_number: '8', player_name: 'Matt Taylor', position: '1B' },
          { player_number: '11', player_name: 'Josh Lee', position: '2B' },
          { player_number: '14', player_name: 'Andrew Harris', position: 'SS' },
          { player_number: '18', player_name: 'Brandon White', position: '3B' },
          { player_number: '22', player_name: 'Tyler Clark', position: 'LF' },
          { player_number: '25', player_name: 'Jason Lewis', position: 'CF' },
          { player_number: '31', player_name: 'Eric Walker', position: 'RF' },
        ],
        home_player_stats: [
          { player_number: '1', at_bats: 4, runs: 1, hits: 2, rbis: 1, walks: 0, strikeouts_batting: 1, pitches_thrown: 95, strikeouts_pitching: 7 },
          { player_number: '5', at_bats: 4, runs: 0, hits: 1, rbis: 0, walks: 1, strikeouts_batting: 0 },
          { player_number: '7', at_bats: 4, runs: 1, hits: 2, rbis: 2, walks: 0, strikeouts_batting: 1, home_runs: 1 },
          { player_number: '12', at_bats: 3, runs: 1, hits: 1, rbis: 0, walks: 1, strikeouts_batting: 0 },
          { player_number: '23', at_bats: 4, runs: 0, hits: 1, rbis: 1, walks: 0, strikeouts_batting: 2 },
          { player_number: '8', at_bats: 4, runs: 1, hits: 1, rbis: 0, walks: 0, strikeouts_batting: 1 },
          { player_number: '15', at_bats: 3, runs: 0, hits: 0, rbis: 0, walks: 1, strikeouts_batting: 2 },
          { player_number: '21', at_bats: 4, runs: 0, hits: 0, rbis: 0, walks: 0, strikeouts_batting: 1 },
          { player_number: '33', at_bats: 3, runs: 0, hits: 0, rbis: 0, walks: 0, strikeouts_batting: 0 },
        ],
        away_player_stats: [
          { player_number: '2', at_bats: 4, runs: 0, hits: 1, rbis: 0, walks: 0, strikeouts_batting: 2, pitches_thrown: 85, strikeouts_pitching: 5 },
          { player_number: '4', at_bats: 4, runs: 1, hits: 1, rbis: 0, walks: 0, strikeouts_batting: 1 },
          { player_number: '8', at_bats: 4, runs: 0, hits: 1, rbis: 1, walks: 0, strikeouts_batting: 0 },
          { player_number: '11', at_bats: 3, runs: 1, hits: 1, rbis: 0, walks: 1, strikeouts_batting: 1 },
          { player_number: '14', at_bats: 4, runs: 0, hits: 0, rbis: 0, walks: 0, strikeouts_batting: 2 },
          { player_number: '18', at_bats: 3, runs: 0, hits: 1, rbis: 1, walks: 1, strikeouts_batting: 0 },
          { player_number: '22', at_bats: 4, runs: 0, hits: 0, rbis: 0, walks: 0, strikeouts_batting: 1 },
          { player_number: '25', at_bats: 3, runs: 0, hits: 0, rbis: 0, walks: 1, strikeouts_batting: 2 },
          { player_number: '31', at_bats: 3, runs: 0, hits: 0, rbis: 0, walks: 0, strikeouts_batting: 0 },
        ],
        play_by_play: [
          { id: '1', inning: '3▼', description: 'HOME RUN by #7 Chris Wilson! 1 RBI' },
          { id: '2', inning: '5▼', description: 'Single by #23 Sam Miller, #12 Jake Anderson scored' },
          { id: '3', inning: '7▼', description: 'Double by #1 Mike Johnson, #8 Alex Brown scored' },
          { id: '4', inning: '8▲', description: 'Single by #8 Matt Taylor, #11 Josh Lee scored' },
          { id: '5', inning: '9▲', description: 'Sacrifice fly by #18 Brandon White, #4 Kevin Brown scored' },
        ],
        inning_scores: {
          away_1: 0, away_2: 0, away_3: 0, away_4: 0, away_5: 0, away_6: 0, away_7: 0, away_8: 1, away_9: 1,
          home_1: 0, home_2: 0, home_3: 1, home_4: 0, home_5: 1, home_6: 0, home_7: 2, home_8: 0, home_9: 0,
        }
      });
      setLoading(false);
    } else {
      // Fetch real game data
      fetchGame();
    }
  }, [id, isDemo]);
  
  const fetchGame = async () => {
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
    } catch (error) {
      toast.error('Failed to load game data');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadPDF = async () => {
    if (isDemo) {
      toast.info('PDF download is not available in demo mode');
      return;
    }
    
    setGenerating(true);
    try {
      const response = await axios.get(`${API}/games/${id}/boxscore/pdf`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `boxscore_${game?.away_team_name}_vs_${game?.home_team_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading box score...</div>
      </div>
    );
  }
  
  if (!game) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Game not found</div>
      </div>
    );
  }
  
  const gameDate = game.date ? new Date(game.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Date TBD';
  
  return (
    <div className="min-h-screen bg-black text-white" data-testid="baseball-boxscore-page">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-zinc-400 hover:text-white"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="text-zinc-300"
                data-testid="share-button"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={generating || isDemo}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="download-pdf-button"
              >
                <FileDown className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
          
          {/* Game Header */}
          <div className="text-center">
            <div className="text-sm text-zinc-400 mb-2">{gameDate}</div>
            <div className="text-sm text-zinc-400 mb-4">{game.location || 'Location TBD'}</div>
            
            {/* Score Display */}
            <div className="flex items-center justify-center gap-8 mb-4">
              {/* Away Team */}
              <div className="text-center">
                {game.away_team_logo ? (
                  <img 
                    src={game.away_team_logo} 
                    alt={`${game.away_team_name} logo`}
                    className="w-20 h-20 mx-auto mb-2 object-contain"
                    data-testid="away-team-logo"
                  />
                ) : (
                  <div 
                    className="w-16 h-16 mx-auto mb-2 rounded-full"
                    style={{ backgroundColor: game.away_team_color || '#3b82f6' }}
                  />
                )}
                <div className="text-xl font-bold">{game.away_team_name}</div>
                <div className="text-4xl font-bold mt-2">{game.away_score || 0}</div>
              </div>
              
              {/* VS / Final */}
              <div className="text-center">
                <div className={`text-lg font-bold px-4 py-2 rounded ${
                  game.status === 'final' ? 'bg-green-600' : 'bg-amber-600'
                }`}>
                  {game.status === 'final' ? 'FINAL' : `${game.inning_half === 'top' ? '▲' : '▼'} ${game.current_inning}`}
                </div>
              </div>
              
              {/* Home Team */}
              <div className="text-center">
                {game.home_team_logo ? (
                  <img 
                    src={game.home_team_logo} 
                    alt={`${game.home_team_name} logo`}
                    className="w-20 h-20 mx-auto mb-2 object-contain"
                    data-testid="home-team-logo"
                  />
                ) : (
                  <div 
                    className="w-16 h-16 mx-auto mb-2 rounded-full"
                    style={{ backgroundColor: game.home_team_color || '#dc2626' }}
                  />
                )}
                <div className="text-xl font-bold">{game.home_team_name}</div>
                <div className="text-4xl font-bold mt-2">{game.home_score || 0}</div>
              </div>
            </div>
            
            {/* Win/Loss Info */}
            {game.status === 'final' && (game.winning_pitcher || game.losing_pitcher) && (
              <div className="text-sm text-zinc-400">
                {game.winning_pitcher && <span className="text-green-400">W: #{game.winning_pitcher}</span>}
                {game.winning_pitcher && game.losing_pitcher && <span className="mx-2">|</span>}
                {game.losing_pitcher && <span className="text-red-400">L: #{game.losing_pitcher}</span>}
                {game.saving_pitcher && <span className="mx-2">|</span>}
                {game.saving_pitcher && <span className="text-blue-400">S: #{game.saving_pitcher}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Score by Innings */}
        <ScoreByInningsTable 
          game={game}
          awayTeamName={game.away_team_name}
          homeTeamName={game.home_team_name}
        />
        
        {/* Scoring Summary */}
        <ScoringSummary 
          playByPlay={game.play_by_play}
          awayTeamName={game.away_team_name}
          homeTeamName={game.home_team_name}
        />
        
        {/* Batting Stats - Two columns on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Away Team Batting */}
          <BattingStatsTable
            teamName={game.away_team_name}
            teamColor={game.away_team_color}
            players={game.away_roster}
            stats={game.away_player_stats}
          />
          
          {/* Home Team Batting */}
          <BattingStatsTable
            teamName={game.home_team_name}
            teamColor={game.home_team_color}
            players={game.home_roster}
            stats={game.home_player_stats}
          />
        </div>
        
        {/* Pitching Stats - Two columns on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Away Team Pitching */}
          <PitchingStatsTable
            teamName={game.away_team_name}
            teamColor={game.away_team_color}
            players={game.away_roster}
            stats={game.away_player_stats}
          />
          
          {/* Home Team Pitching */}
          <PitchingStatsTable
            teamName={game.home_team_name}
            teamColor={game.home_team_color}
            players={game.home_roster}
            stats={game.home_player_stats}
          />
        </div>
        
        {/* Game Notes */}
        <GameNotes
          game={game}
          homeStats={game.home_player_stats}
          awayStats={game.away_player_stats}
          homeRoster={game.home_roster}
          awayRoster={game.away_roster}
        />
      </div>
    </div>
  );
}

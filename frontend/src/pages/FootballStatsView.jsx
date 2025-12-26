import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FootballLiveStats from '@/components/FootballLiveStats';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * FootballStatsView - Public/shareable view of football live stats
 * Similar to Sidearm Sports live stats interface
 */
export default function FootballStatsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [playLog, setPlayLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set document title
  useEffect(() => {
    document.title = "StatMoose FB";
  }, []);

  // Polling interval for live updates
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        // Try to fetch game data (public endpoint)
        const gameRes = await axios.get(`${API}/games/public/${id}`);
        setGame(gameRes.data);
        
        // For football games, play log is stored in football_state.play_log
        const footballState = gameRes.data.football_state;
        if (footballState && footballState.play_log) {
          setPlayLog(footballState.play_log);
        } else {
          // Fallback to events for non-football or legacy games
          const events = gameRes.data.events || [];
          const plays = events.map(event => ({
            id: event.id,
            quarter: event.quarter || 1,
            clock: event.timestamp || '0:00',
            team: event.team,
            type: event.event_type,
            result: event.result,
            yards: event.yards,
            description: event.description,
            points: event.points || 0,
            down: event.down,
            distance: event.distance,
            ball_on: event.ball_position ? `${event.ball_position}` : null,
            carrier: event.carrier,
            qb: event.qb,
            receiver: event.receiver,
            tackler: event.tackler,
            firstDown: event.first_down,
          }));
          setPlayLog(plays.reverse());
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError('Game not found or not accessible');
        setLoading(false);
      }
    };

    fetchGameData();
    
    // Poll for updates every 5 seconds for live games (was 10 seconds)
    const interval = setInterval(fetchGameData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">Loading game stats...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Game not found'}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Get scores and game state from football_state
  const footballState = game.football_state || {};
  const homeScore = game.home_score || footballState.home_score || 0;
  const awayScore = game.away_score || footballState.away_score || 0;
  const currentQuarter = footballState.quarter || 1;
  const clockSeconds = footballState.clock_time || 720;
  const homeTimeouts = footballState.home_timeouts || 3;
  const awayTimeouts = footballState.away_timeouts || 3;
  
  // Get time of possession from game data
  const homeTimeOfPossession = game.home_time_of_possession || footballState.home_time_of_possession || 0;
  const awayTimeOfPossession = game.away_time_of_possession || footballState.away_time_of_possession || 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header with back button */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-sm text-zinc-500">
            Live Stats powered by <span className="text-white font-semibold">StatMoose</span>
          </div>
        </div>
      </div>

      <FootballLiveStats
        game={game}
        homeScore={homeScore}
        awayScore={awayScore}
        quarter={currentQuarter}
        clockTime={clockSeconds}
        playLog={playLog}
        homeColor={game.home_team_color || '#dc2626'}
        awayColor={game.away_team_color || '#2563eb'}
        possession={game.possession || footballState.possession || 'home'}
        homeTimeOfPossession={homeTimeOfPossession}
        awayTimeOfPossession={awayTimeOfPossession}
        homeTimeouts={homeTimeouts}
        awayTimeouts={awayTimeouts}
      />
    </div>
  );
}

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

  // Polling interval for live updates
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const [gameRes, eventsRes] = await Promise.all([
          axios.get(`${API}/games/${id}`),
          axios.get(`${API}/games/${id}/events`),
        ]);
        
        setGame(gameRes.data);
        
        // Transform events to play log format
        const events = eventsRes.data || [];
        const plays = events.map(event => ({
          id: event.id,
          quarter: event.quarter || 1,
          clock: event.timestamp || '0:00',
          team: event.team,
          type: event.event_type,
          result: event.result,
          yards: event.yards,
          description: event.description || formatPlayDescription(event),
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
        
        setPlayLog(plays.reverse()); // Most recent first
        setLoading(false);
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError('Failed to load game data');
        setLoading(false);
      }
    };

    fetchGameData();
    
    // Poll for updates every 10 seconds for live games
    const interval = setInterval(fetchGameData, 10000);
    return () => clearInterval(interval);
  }, [id]);

  // Helper to format play description from event data
  const formatPlayDescription = (event) => {
    if (event.description) return event.description;
    
    let desc = '';
    switch (event.event_type) {
      case 'run':
        desc = `#${event.carrier || '?'} rush for ${event.yards || 0} yards`;
        break;
      case 'pass':
        if (event.result === 'complete') {
          desc = `#${event.qb || '?'} pass complete to #${event.receiver || '?'} for ${event.yards || 0} yards`;
        } else if (event.result === 'incomplete') {
          desc = `#${event.qb || '?'} pass incomplete`;
        } else if (event.result === 'intercepted') {
          desc = `#${event.qb || '?'} pass INTERCEPTED`;
        }
        break;
      case 'punt':
        desc = `#${event.punter || '?'} punt for ${event.distance || 0} yards`;
        break;
      case 'field_goal':
        desc = `#${event.kicker || '?'} ${event.distance || 0}-yard field goal ${event.result === 'good' ? 'GOOD' : 'NO GOOD'}`;
        break;
      case 'extra_point':
        desc = `Extra point ${event.result === 'good' ? 'GOOD' : 'NO GOOD'}`;
        break;
      case 'penalty':
        desc = `PENALTY: ${event.penalty_name || 'Unknown'} - ${event.yards || 0} yards`;
        break;
      default:
        desc = event.event_type || 'Play';
    }
    return desc;
  };

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

  // Calculate current scores from play log
  const homeScore = playLog
    .filter(p => p.team === 'home' && p.points)
    .reduce((sum, p) => sum + (p.points || 0), 0);
  const awayScore = playLog
    .filter(p => p.team === 'away' && p.points)
    .reduce((sum, p) => sum + (p.points || 0), 0);

  // Get current quarter and clock from most recent play
  const latestPlay = playLog[0];
  const currentQuarter = latestPlay?.quarter || 1;
  const currentClock = latestPlay?.clock || '15:00';
  
  // Convert clock string to seconds
  const clockParts = currentClock.split(':');
  const clockSeconds = parseInt(clockParts[0]) * 60 + parseInt(clockParts[1] || 0);

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
        homeScore={game.home_score || homeScore}
        awayScore={game.away_score || awayScore}
        quarter={currentQuarter}
        clockTime={clockSeconds}
        playLog={playLog}
        homeColor={game.home_team_color || '#dc2626'}
        awayColor={game.away_team_color || '#2563eb'}
        possession={game.possession || 'home'}
      />
    </div>
  );
}

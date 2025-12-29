import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import BracketView from '@/components/BracketView';
import { Trophy } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BracketPublicView() {
  const { bracketId } = useParams();
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBracket();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBracket, 30000);
    return () => clearInterval(interval);
  }, [bracketId]);

  const fetchBracket = async () => {
    try {
      const res = await axios.get(`${API}/brackets/${bracketId}/public`);
      setBracket(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching bracket:', err);
      setError('Bracket not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p>Loading bracket...</p>
        </div>
      </div>
    );
  }

  if (error || !bracket) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h1 className="text-2xl font-bold mb-2">Bracket Not Found</h1>
          <p className="text-slate-400">The bracket you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return <BracketView bracket={bracket} showLinks={true} />;
}

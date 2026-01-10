import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import BaseballLiveGame from "./BaseballLiveGame";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DemoBaseballLiveGame() {
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDemoData = async () => {
      try {
        const res = await axios.get(`${API}/demo/baseball`);
        setDemoData(res.data);
      } catch (error) {
        console.error("Failed to fetch demo data:", error);
        // Use fallback demo data
        setDemoData(generateFallbackDemoData());
      } finally {
        setLoading(false);
      }
    };

    fetchDemoData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl animate-bounce">⚾</span>
          <p className="mt-4 text-zinc-400">Loading baseball demo...</p>
        </div>
      </div>
    );
  }

  return <BaseballLiveGame demoMode={true} initialDemoData={demoData} />;
}

// Fallback demo data if API fails
function generateFallbackDemoData() {
  const homeRoster = [
    { player_number: "1", player_name: "Mike Johnson" },
    { player_number: "5", player_name: "Chris Davis" },
    { player_number: "7", player_name: "James Wilson" },
    { player_number: "12", player_name: "Tom Brady" },
    { player_number: "15", player_name: "Alex Rodriguez" },
    { player_number: "21", player_name: "Derek Jeter" },
    { player_number: "24", player_name: "Ken Griffey" },
    { player_number: "27", player_name: "Mike Trout" },
    { player_number: "34", player_name: "David Ortiz" },
  ];

  const awayRoster = [
    { player_number: "2", player_name: "Ryan Smith" },
    { player_number: "4", player_name: "Kevin Brown" },
    { player_number: "8", player_name: "Matt Taylor" },
    { player_number: "11", player_name: "Josh Martinez" },
    { player_number: "14", player_name: "Andrew Lee" },
    { player_number: "18", player_name: "Brandon Harris" },
    { player_number: "22", player_name: "Tyler White" },
    { player_number: "25", player_name: "Jason Clark" },
    { player_number: "31", player_name: "Eric Lewis" },
  ];

  return {
    game_id: "demo_baseball",
    sport: "baseball",
    home_team_name: "Riverside Sluggers",
    away_team_name: "Valley Hawks",
    home_team_color: "#dc2626",
    away_team_color: "#2563eb",
    home_score: 0,
    away_score: 0,
    current_inning: 1,
    inning_half: "top",
    total_innings: 9,
    balls: 0,
    strikes: 0,
    outs: 0,
    bases: { first: false, second: false, third: false },
    home_roster: homeRoster,
    away_roster: awayRoster,
    home_player_stats: homeRoster.map(p => ({
      ...p,
      at_bats: 0,
      hits: 0,
      runs: 0,
      rbi: 0,
      strikeouts_batting: 0,
      walks: 0,
    })),
    away_player_stats: awayRoster.map(p => ({
      ...p,
      at_bats: 0,
      hits: 0,
      runs: 0,
      rbi: 0,
      strikeouts_batting: 0,
      walks: 0,
    })),
    play_by_play: [],
  };
}

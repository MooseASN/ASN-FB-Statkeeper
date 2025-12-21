import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import NewGame from "@/pages/NewGame";
import LiveGame from "@/pages/LiveGame";
import LiveView from "@/pages/LiveView";
import GameHistory from "@/pages/GameHistory";

function App() {
  return (
    <div className="app-container">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/new-game" element={<NewGame />} />
          <Route path="/game/:id" element={<LiveGame />} />
          <Route path="/live/:shareCode" element={<LiveView />} />
          <Route path="/history" element={<GameHistory />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;

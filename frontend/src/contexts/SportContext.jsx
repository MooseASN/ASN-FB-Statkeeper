import { createContext, useContext, useState, useEffect } from "react";

const SportContext = createContext(null);

export const SPORTS = {
  BASKETBALL: "basketball",
  FOOTBALL: "football"
};

export const SPORT_CONFIG = {
  basketball: {
    name: "Basketball",
    icon: "🏀",
    color: "#FF6B35",
    bgGradient: "from-orange-500 to-orange-700",
    description: "Track basketball stats in real-time"
  },
  football: {
    name: "Football",
    icon: "🏈",
    color: "#2D5A27",
    bgGradient: "from-green-700 to-green-900",
    description: "Track football stats in real-time"
  }
};

export function SportProvider({ children }) {
  // Initialize from sessionStorage if available
  const [selectedSport, setSelectedSport] = useState(() => {
    return sessionStorage.getItem("selected_sport") || null;
  });

  const selectSport = (sport) => {
    setSelectedSport(sport);
    // Store in session for the current session only
    sessionStorage.setItem("selected_sport", sport);
  };

  const clearSport = () => {
    setSelectedSport(null);
    sessionStorage.removeItem("selected_sport");
  };

  return (
    <SportContext.Provider value={{ selectedSport, selectSport, clearSport }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error("useSport must be used within a SportProvider");
  }
  return context;
}

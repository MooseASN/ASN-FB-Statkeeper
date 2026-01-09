import React, { createContext, useContext } from "react";

// Demo Mode Context
const DemoModeContext = createContext({ isDemo: false, demoType: null });

export const useDemoMode = () => useContext(DemoModeContext);

// Demo Mode Bar Component
export const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider shadow-lg">
    Demo Mode - Stats will not be saved
  </div>
);

// Demo Mode Provider
export const DemoModeProvider = ({ children, demoType }) => {
  return (
    <DemoModeContext.Provider value={{ isDemo: true, demoType }}>
      <DemoModeBar />
      <div className="pt-8">
        {children}
      </div>
    </DemoModeContext.Provider>
  );
};

export default DemoModeContext;

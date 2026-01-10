import { cn } from "@/lib/utils";

// StatMoose Loading Screen Component
// Dark gradient background with white StatMoose logo and thin spinning circle
export function LoadingScreen({ message = "" }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-800 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="relative mb-8">
        {/* StatMoose Logo - White */}
        <svg 
          width="120" 
          height="120" 
          viewBox="0 0 120 120" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          {/* Moose antler silhouette */}
          <path 
            d="M60 20C60 20 45 10 30 25C15 40 25 55 25 55L35 50C35 50 30 40 40 30C50 20 60 25 60 25V20Z" 
            fill="currentColor"
          />
          <path 
            d="M60 20C60 20 75 10 90 25C105 40 95 55 95 55L85 50C85 50 90 40 80 30C70 20 60 25 60 25V20Z" 
            fill="currentColor"
          />
          {/* Moose head */}
          <ellipse cx="60" cy="55" rx="18" ry="22" fill="currentColor"/>
          {/* Moose snout */}
          <ellipse cx="60" cy="72" rx="10" ry="8" fill="currentColor"/>
          {/* Text: SM */}
          <text x="60" y="95" textAnchor="middle" fill="currentColor" fontSize="20" fontWeight="bold" fontFamily="system-ui">
            StatMoose
          </text>
        </svg>
        
        {/* Spinning circle around logo */}
        <div className="absolute inset-0 -m-4">
          <svg 
            className="w-full h-full animate-spin" 
            style={{ animationDuration: '2s' }}
            viewBox="0 0 128 128"
          >
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="90 270"
            />
          </svg>
        </div>
      </div>
      
      {/* Optional loading message */}
      {message && (
        <p className="text-zinc-400 text-sm animate-pulse">{message}</p>
      )}
    </div>
  );
}

// Compact loading spinner for inline use
export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };
  
  return (
    <svg 
      className={cn("animate-spin text-white", sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="32 64"
      />
    </svg>
  );
}

export default LoadingScreen;

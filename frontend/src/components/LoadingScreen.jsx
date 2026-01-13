import { cn } from "@/lib/utils";

// StatMoose Loading Screen Component
// Dark gradient background with white StatMoose logo and thin spinning circle
export function LoadingScreen({ message = "" }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-800 flex flex-col items-center justify-center">
      {/* Logo with spinning circle */}
      <div className="relative mb-8">
        {/* StatMoose Logo - White */}
        <img 
          src="/logo-white.png" 
          alt="StatMoose" 
          className="w-24 h-24 object-contain"
        />
        
        {/* Spinning circle around logo */}
        <div className="absolute inset-0 -m-6">
          <svg 
            className="w-full h-full animate-spin" 
            style={{ animationDuration: '2s' }}
            viewBox="0 0 144 144"
          >
            <circle
              cx="72"
              cy="72"
              r="68"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="72"
              cy="72"
              r="68"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="100 314"
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

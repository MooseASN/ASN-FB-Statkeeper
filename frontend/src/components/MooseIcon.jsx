// Custom Moose Icon for StatMoose Basketball branding
const MooseIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Moose head outline */}
    <path d="M12 4C10 4 8.5 5.5 8.5 7.5C8.5 8.5 9 9.5 9.5 10L8 12L9 13L8.5 15C8.5 16.5 10 18 12 18C14 18 15.5 16.5 15.5 15L15 13L16 12L14.5 10C15 9.5 15.5 8.5 15.5 7.5C15.5 5.5 14 4 12 4Z" />
    {/* Left antler */}
    <path d="M8.5 7.5L6 5L4 6" />
    <path d="M6 5L5 3" />
    <path d="M6 5L7 3.5" />
    {/* Right antler */}
    <path d="M15.5 7.5L18 5L20 6" />
    <path d="M18 5L19 3" />
    <path d="M18 5L17 3.5" />
    {/* Ears */}
    <path d="M9 6.5L7.5 5.5" />
    <path d="M15 6.5L16.5 5.5" />
    {/* Nose */}
    <ellipse cx="12" cy="14" rx="1.5" ry="1" />
    {/* Eyes */}
    <circle cx="10" cy="9" r="0.5" fill="currentColor" />
    <circle cx="14" cy="9" r="0.5" fill="currentColor" />
  </svg>
);

export default MooseIcon;

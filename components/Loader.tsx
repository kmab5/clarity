import React from 'react';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-10">
      <div className="relative flex items-center justify-center w-32 h-32">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border border-t-white/40 border-r-white/10 border-b-white/5 border-l-transparent w-full h-full animate-spin-slow" />
        
        {/* Middle reverse rotating ring */}
        <div className="absolute rounded-full border border-b-white/50 border-l-white/20 border-t-transparent border-r-transparent w-20 h-20 animate-reverse-spin" />
        
        {/* Core pulse */}
        <div className="relative w-2 h-2">
            <div className="absolute inset-0 -m-4 rounded-full bg-white/10 blur-xl animate-pulse" />
            <div className="w-full h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />
        </div>
      </div>
      
      {text && (
        <div className="text-center space-y-2 animate-pulse">
          <p className="text-white/70 font-light tracking-[0.2em] uppercase text-xs">
            {text}
          </p>
        </div>
      )}
    </div>
  );
};

export default Loader;
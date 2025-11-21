import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  gap?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', gap = '' }) => {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl ${className}`}>
      {/* Glossy reflection effect */}
      <div className="pointer-events-none absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 blur-2xl" />
      <div className={`relative z-10 ${gap}`}>
        {children}
      </div>
    </div>
  );
};

export default GlassCard;

'use client';

import React, { useRef, useState } from 'react';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function MagneticButton({
  children,
  className = '',
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);

    // Pull intensity factor (0.35)
    setPosition({ x: middleX * 0.35, y: middleY * 0.35 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
        transition: 'transform 0.15s ease-out',
      }}
      className={`relative inline-flex items-center justify-center px-8 py-4 overflow-hidden text-xs font-semibold tracking-widest text-amber-200 uppercase border border-amber-500/30 rounded-none group hover:border-amber-400 bg-neutral-900/80 backdrop-blur-md ${className}`}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-500/20 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
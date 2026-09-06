import React from 'react';

/**
 * Clean vector representation of the National Flag of India (Tiranga)
 * Conforms to standard 3:2 ratio with 24-spoke Ashoka Chakra.
 */
export default function IndiaFlag({ className = 'h-6 w-auto', ...props }) {
  // Generate 24 spokes for Ashoka Chakra (15 degrees each)
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15 * Math.PI) / 180;
    const rOuter = 4.2;
    const rInner = 0.9;
    const cx = 22.5;
    const cy = 15;
    const x1 = cx + rInner * Math.cos(angle);
    const y1 = cy + rInner * Math.sin(angle);
    const x2 = cx + rOuter * Math.cos(angle);
    const y2 = cy + rOuter * Math.sin(angle);
    return { x1, y1, x2, y2, key: i };
  });

  return (
    <svg
      viewBox="0 0 45 30"
      className={`inline-block overflow-hidden shrink-0 ${className}`}
      aria-label="National Flag of India"
      role="img"
      {...props}
    >
      {/* Top Saffron Band */}
      <rect x="0" y="0" width="45" height="10" fill="#FF9933" />
      {/* Middle White Band */}
      <rect x="0" y="10" width="45" height="10" fill="#FFFFFF" />
      {/* Bottom India Green Band */}
      <rect x="0" y="20" width="45" height="10" fill="#138808" />

      {/* Ashoka Chakra in Navy Blue */}
      <g>
        {/* Outer Ring */}
        <circle
          cx="22.5"
          cy="15"
          r="4.2"
          fill="none"
          stroke="#000080"
          strokeWidth="0.6"
        />
        {/* Inner Hub */}
        <circle
          cx="22.5"
          cy="15"
          r="0.9"
          fill="#000080"
        />
        {/* 24 Spokes */}
        {spokes.map(({ x1, y1, x2, y2, key }) => (
          <line
            key={key}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#000080"
            strokeWidth="0.32"
          />
        ))}
      </g>
    </svg>
  );
}

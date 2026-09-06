import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Reusable Chart Tooltip Component
 * 
 * Renders a floating, crisp card for interactive data inspection on hover.
 * Automatically handles edge flipping so it never gets clipped at screen boundaries.
 * 
 * @param {Object} props
 * @param {string} props.timestamp - Time label or UTC timestamp represented by the data point
 * @param {Array<{ label: string, value: string|number, unit?: string, color?: string, isForecast?: boolean }>} props.items - List of metrics at this point
 * @param {number} props.xPercent - X position of the hovered point as a percentage of the container width (0 - 100)
 * @param {number} [props.yPercent=50] - Y position of the hovered point as a percentage of the container height (0 - 100)
 * @param {boolean} [props.flipLeft=false] - When true, positions the tooltip to the left of the cursor
 * @param {string} [props.subtitle] - Optional subtitle or source indicator
 */
export default function ChartTooltip({
  timestamp,
  items = [],
  xPercent = 50,
  yPercent = 50,
  flipLeft = false,
  subtitle
}) {
  if (!items || items.length === 0) return null;

  // Clamp vertical percentage to prevent overflow
  const clampedY = Math.max(15, Math.min(85, yPercent));

  return (
    <div
      className="absolute z-30 pointer-events-none transition-all duration-75 ease-out shadow-lg rounded-xl border border-gray-200/90 bg-white/95 backdrop-blur-md p-2.5 min-w-[140px] max-w-[240px] text-left ring-1 ring-black/5"
      style={{
        left: flipLeft ? undefined : `${xPercent}%`,
        right: flipLeft ? `${100 - xPercent}%` : undefined,
        top: `${clampedY}%`,
        transform: `translate(${flipLeft ? '-12px' : '12px'}, -50%)`,
      }}
    >
      {/* Tooltip Header: Actual Timestamp / Timestep */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-gray-700">
          <Clock className="w-3 h-3 text-blue-600 shrink-0" />
          <span className="truncate">{timestamp}</span>
        </div>
        {subtitle && (
          <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">
            {subtitle}
          </span>
        )}
      </div>

      {/* Metric Rows */}
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color || '#2563eb' }}
              />
              <span className="text-gray-600 font-medium text-[11px] truncate">
                {item.label}:
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono font-bold text-gray-900 text-xs shrink-0 whitespace-nowrap">
              <span>{item.value}</span>
              {item.unit && <span className="text-gray-500 font-normal text-[10px]">{item.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

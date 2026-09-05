import React, { useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move
} from 'lucide-react';
import { FLOOR_PLANS } from '../data/bharatiFloorData';

export default function ArchitecturalFloorPlan({
  activeLevel,
  selectedComponentId,
  onSelectComponent,
  systemStates,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState(null);
  const svgRef = useRef(null);

  const floorData = FLOOR_PLANS[activeLevel] || FLOOR_PLANS['Level 3'];
  const isExternalSite = activeLevel === 'External Systems';

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan / Drag handlers
  const handleMouseDown = (e) => {
    if (e.button === 0 && (e.target.tagName === 'svg' || e.target.id === 'blueprint-canvas-bg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Status helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'OPERATIONAL':
        return { dot: '#10b981', ring: 'rgba(16, 185, 129, 0.25)', label: 'Operational' };
      case 'WARNING':
        return { dot: '#f59e0b', ring: 'rgba(245, 158, 11, 0.35)', label: 'Warning' };
      case 'FAULT':
        return { dot: '#ef4444', ring: 'rgba(239, 68, 68, 0.4)', label: 'Fault' };
      case 'OFFLINE':
      default:
        return { dot: '#94a3b8', ring: 'rgba(148, 163, 184, 0.2)', label: 'Offline' };
    }
  };

  // Helper to resolve hovered item information
  const getHoveredInfo = () => {
    if (!hoveredId) return null;
    const sys = systemStates[hoveredId];
    if (sys) return { name: sys.name, code: sys.code, status: sys.status, category: sys.category };
    // Check if hovered was a room
    const rm = floorData.rooms?.find((r) => r.id === hoveredId || r.equipmentId === hoveredId);
    if (rm) {
      const roomSys = systemStates[rm.equipmentId] || {};
      return { name: rm.name, code: rm.code, status: roomSys.status || 'OPERATIONAL', category: roomSys.category || 'Station Module' };
    }
    return { name: hoveredId, code: 'ZONE', status: 'OPERATIONAL', category: 'Infrastructure' };
  };

  const hoveredInfo = getHoveredInfo();

  // Helper to wrap long room or component names into multiple lines
  const wrapText = (text, maxChars) => {
    if (!text) return [];
    if (text.length <= maxChars) return [text];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= maxChars) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // ==========================================================================
  // SMART ROOM HEADER RENDERER
  // Guarantees zero collision between Room Name and Room ID:
  // - Zone 1: Dedicated header card at top of room
  // - Room ID is ALWAYS stacked vertically below Room Name
  // - Door clearance: avoids top-wall door arcs (e.g. RO Drinking Water, SatCom)
  // - Intelligent text wrapping with SVG tspans
  // - Adaptive font sizing based on room geometry
  // ==========================================================================
  const renderRoomHeader = (room, isSelected) => {
    const isSmall = room.w < 130;
    const isNarrow = room.w < 180;
    const isLarge = room.w >= 280;

    // Header dimensions and positioning with door clearance calculation
    let hx = room.x + 8;
    let hy = room.y + 8;
    let hw = room.w - 16;
    let hh = isSmall ? 26 : isNarrow ? 28 : (room.h < 160 ? 28 : 32);

    // Door collision avoidance for rooms with top-wall doors
    if (room.id === 'ro') {
      // Top-wall door at x=200; constrain header to left clear zone (x=68 to 186)
      hw = 118;
      hh = 32;
    } else if (room.id === 'satcom') {
      // Top-wall door at x=675; constrain header to left clear zone (x=608 to 668)
      hw = 60;
      hh = 28;
    }

    // Adaptive name selection
    const titleText = (isSmall || isNarrow) && room.shortName 
      ? room.shortName 
      : room.name;

    // Sizing
    const nameFontSize = isSmall ? 8.5 : isNarrow ? 9.5 : isLarge ? 12 : 10.5;
    const idFontSize = isSmall ? 7 : isNarrow ? 7.5 : 8;

    // Calculate intelligent wrapping
    const maxCharsPerLine = Math.max(7, Math.floor((hw - 10) / (nameFontSize * 0.58)));
    const titleLines = wrapText(titleText, maxCharsPerLine);

    // If title wrapped into 2 lines, adjust card height if needed
    if (titleLines.length > 1 && hh < 32) {
      hh = 32;
    }

    return (
      <g className="select-none pointer-events-none">
        {/* Zone 1: Header card container */}
        <rect
          x={hx}
          y={hy}
          width={hw}
          height={hh}
          rx="3"
          fill={isSelected ? '#e0f2fe' : '#f8fafc'}
          stroke={isSelected ? '#2563eb' : '#cbd5e1'}
          strokeWidth={isSelected ? '1.25' : '0.75'}
        />
        {/* Left engineering accent indicator */}
        <rect
          x={hx}
          y={hy}
          width="2.5"
          height={hh}
          rx="1"
          fill={isSelected ? '#2563eb' : '#64748b'}
        />

        {/* Room Name - Line 1 (or Lines 1 & 2 if wrapped) */}
        {titleLines.length === 1 ? (
          <text
            x={hx + 7}
            y={hy + (hh * 0.44)}
            className="font-sans font-bold fill-slate-900 tracking-tight"
            style={{ fontSize: `${nameFontSize}px` }}
          >
            {titleLines[0]}
          </text>
        ) : (
          <text
            x={hx + 7}
            y={hy + 10}
            className="font-sans font-bold fill-slate-900 tracking-tight"
            style={{ fontSize: `${nameFontSize - 0.5}px` }}
          >
            <tspan x={hx + 7} dy="0">{titleLines[0]}</tspan>
            <tspan x={hx + 7} dy="9">{titleLines[1]}</tspan>
          </text>
        )}

        {/* Room ID - ALWAYS stacked vertically on the line below room name */}
        <text
          x={hx + 7}
          y={hy + (titleLines.length > 1 ? hh - 4 : hh * 0.82)}
          className="font-mono font-bold fill-blue-600 tracking-wider"
          style={{ fontSize: `${idFontSize}px` }}
        >
          <tspan fill="#94a3b8" fontWeight="500">ID: </tspan>
          {room.code}
        </text>
      </g>
    );
  };

  return (
    <div 
      className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-0 overflow-hidden flex flex-col relative select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Blueprint Canvas Header Toolbar */}
      <div className="h-11 px-4 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between text-xs text-gray-600 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-bold text-gray-900 px-2 py-0.5 rounded bg-white border border-gray-200 shadow-2xs">
            {activeLevel.toUpperCase()}
          </span>
          <span className="text-gray-400">|</span>
          <span className="font-medium text-gray-700 truncate max-w-sm">
            {floorData.title}
          </span>
        </div>

        {/* Blueprint Pan & Zoom and Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 hover:bg-gray-100 text-gray-600 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold text-gray-700 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 hover:bg-gray-100 text-gray-600 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1 hover:bg-gray-100 text-gray-500 rounded transition-colors border-l border-gray-200 ml-0.5"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 bg-gray-100/70 px-2 py-0.5 rounded">
            <Move className="w-3 h-3" /> Drag to pan
          </span>
        </div>
      </div>

      {/* Main SVG Floor Plan Viewport */}
      <div 
        className="flex-1 relative overflow-hidden bg-[#fafbfc] cursor-crosshair flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Subtle Engineering Blueprint Grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        <svg
          ref={svgRef}
          viewBox="0 0 1000 458"
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Soft Engineering Glow Filter for Selected Component */}
            <filter id="engineering-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Clickable Background for Pan/Deselect */}
          <rect
            id="blueprint-canvas-bg"
            x="0"
            y="0"
            width="1000"
            height="450"
            fill="transparent"
          />

          {/* ============================================================== */}
          {/* CASE 1: INTERNAL FLOORS (LEVEL 1, 2, 3, 4)                     */}
          {/* ============================================================== */}
          {!isExternalSite && (
            <>
              {/* Station Aerodynamic Hull Envelope */}
              <g id="station-hull-envelope">
                <path
                  d="M 90 40 L 910 40 Q 970 40 970 100 L 970 350 Q 970 410 910 410 L 90 410 Q 30 410 30 350 L 30 100 Q 30 40 90 40 Z"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="2.75"
                />
                <path
                  d="M 94 48 L 906 48 Q 962 48 962 104 L 962 346 Q 962 402 906 402 L 94 402 Q 38 402 38 346 L 38 104 Q 38 48 94 48 Z"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                />

                {/* Stilt foundation indicators (with zero text overlap) */}
                {[100, 260, 420, 580, 740, 900].map((x) => (
                  <g key={`stilt-${x}`} opacity="0.6">
                    <rect x={x - 8} y={34} width={16} height={6} fill="#334155" />
                    <rect x={x - 8} y={410} width={16} height={6} fill="#334155" />
                  </g>
                ))}

                {/* Top Outer Dimension Line */}
                <g opacity="0.5" className="font-mono text-[8.5px] fill-slate-400 select-none">
                  <line x1="90" y1="22" x2="910" y2="22" stroke="#94a3b8" strokeWidth="0.75" />
                  <line x1="90" y1="18" x2="90" y2="26" stroke="#94a3b8" strokeWidth="0.75" />
                  <line x1="500" y1="18" x2="500" y2="26" stroke="#94a3b8" strokeWidth="0.75" />
                  <line x1="910" y1="18" x2="910" y2="26" stroke="#94a3b8" strokeWidth="0.75" />
                  <text x="500" y="16" textAnchor="middle" fill="#64748b" fontWeight="600">
                    ◄── BHARATI STRUCTURAL ENVELOPE (52.40 m) ──►
                  </text>
                </g>
              </g>

              {/* Corridors and Circulation (No overlapping text across walls) */}
              <g id="corridors-and-circulation">
                {floorData.corridors?.map((corridor, i) => (
                  <g 
                    key={`corridor-${i}`}
                    onMouseEnter={() => setHoveredId(corridor.label)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-default"
                  >
                    <rect
                      x={corridor.x}
                      y={corridor.y}
                      width={corridor.w}
                      height={corridor.h}
                      fill="#f8fafc"
                      stroke="#cbd5e1"
                      strokeWidth="0.75"
                    />
                    {/* Circulation dashed centerline */}
                    <line
                      x1={corridor.x + corridor.w / 2}
                      y1={corridor.y + 8}
                      x2={corridor.x + corridor.w / 2}
                      y2={corridor.y + corridor.h - 8}
                      stroke="#94a3b8"
                      strokeWidth="0.75"
                      strokeDasharray="4 4"
                      opacity="0.6"
                    />
                    {/* Only render text if corridor width is wide enough to avoid wall crossing */}
                    {corridor.w >= 38 && (
                      <text
                        x={corridor.x + corridor.w / 2}
                        y={corridor.y + corridor.h / 2}
                        textAnchor="middle"
                        transform={`rotate(-90 ${corridor.x + corridor.w / 2} ${corridor.y + corridor.h / 2})`}
                        className="font-mono text-[7px] font-bold fill-slate-400 select-none tracking-widest"
                      >
                        {corridor.label}
                      </text>
                    )}
                  </g>
                ))}

                {/* Staircases (Text placed strictly inside bounds) */}
                {floorData.stairs?.map((stair, i) => (
                  <g 
                    key={`stair-${i}`} 
                    className="select-none cursor-default"
                    onMouseEnter={() => setHoveredId(stair.label)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <rect
                      x={stair.x}
                      y={stair.y}
                      width={stair.w}
                      height={stair.h}
                      fill="#f1f5f9"
                      stroke="#0f172a"
                      strokeWidth="1.25"
                    />
                    {/* Treads */}
                    {Array.from({ length: Math.floor(stair.h / 6) }).map((_, stepIdx) => (
                      <line
                        key={`step-${stepIdx}`}
                        x1={stair.x}
                        y1={stair.y + (stepIdx + 1) * 6}
                        x2={stair.x + stair.w}
                        y2={stair.y + (stepIdx + 1) * 6}
                        stroke="#64748b"
                        strokeWidth="0.75"
                      />
                    ))}
                    {/* Compact directional arrow inside stairwell */}
                    <line
                      x1={stair.x + stair.w / 2}
                      y1={stair.y + stair.h - 10}
                      x2={stair.x + stair.w / 2}
                      y2={stair.y + 8}
                      stroke="#2563eb"
                      strokeWidth="1.25"
                    />
                    <polygon
                      points={`${stair.x + stair.w / 2},${stair.y + 5} ${stair.x + stair.w / 2 - 3},${stair.y + 10} ${stair.x + stair.w / 2 + 3},${stair.y + 10}`}
                      fill="#2563eb"
                    />
                    {/* Crisp label inside stairwell bottom */}
                    <text
                      x={stair.x + stair.w / 2}
                      y={stair.y + stair.h - 3}
                      textAnchor="middle"
                      className="font-mono text-[6.5px] font-black fill-slate-800"
                    >
                      {stair.direction === 'up' ? '▲ UP' : '▼ DN'}
                    </text>
                  </g>
                ))}
              </g>

              {/* Rooms & Systems with Strict Vertical Zoning */}
              <g id="rooms-and-systems">
                {floorData.rooms?.map((room) => {
                  const isSelected = selectedComponentId === room.equipmentId || selectedComponentId === room.id;
                  const isHovered = hoveredId === room.equipmentId || hoveredId === room.id;
                  const system = systemStates[room.equipmentId] || { status: 'OPERATIONAL' };
                  const statusCfg = getStatusColor(system.status);

                  return (
                    <g
                      key={room.id}
                      onClick={() => onSelectComponent(room.equipmentId)}
                      onMouseEnter={() => setHoveredId(room.equipmentId)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="cursor-pointer"
                    >
                      <title>{room.name} ({room.code}) - {system.status}</title>
                      {/* Room boundary walls */}
                      <rect
                        x={room.x}
                        y={room.y}
                        width={room.w}
                        height={room.h}
                        fill={isSelected ? '#f0f7ff' : isHovered ? '#f8fafc' : '#ffffff'}
                        stroke={isSelected ? '#2563eb' : isHovered ? '#3b82f6' : '#1e293b'}
                        strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '1.75'}
                        filter={isSelected ? 'url(#engineering-glow)' : 'none'}
                        className="transition-colors duration-150"
                      />

                      {/* Wall corner construction markers */}
                      <line x1={room.x} y1={room.y} x2={room.x + 8} y2={room.y} stroke="#0f172a" strokeWidth="2.5" />
                      <line x1={room.x} y1={room.y} x2={room.x} y2={room.y + 8} stroke="#0f172a" strokeWidth="2.5" />
                      <line x1={room.x + room.w - 8} y1={room.y} x2={room.x + room.w} y2={room.y} stroke="#0f172a" strokeWidth="2.5" />
                      <line x1={room.x + room.w} y1={room.y} x2={room.x + room.w} y2={room.y + 8} stroke="#0f172a" strokeWidth="2.5" />

                      {/* Door & Swing Arc */}
                      {room.door && (
                        <g opacity="0.9">
                          <line
                            x1={room.door.x}
                            y1={room.door.dir === 'bottom' || room.door.dir === 'top' ? room.door.y : room.door.y - 12}
                            x2={room.door.x}
                            y2={room.door.dir === 'bottom' || room.door.dir === 'top' ? room.door.y : room.door.y + 12}
                            stroke="#ffffff"
                            strokeWidth="3"
                          />
                          <line
                            x1={room.door.x}
                            y1={room.door.y}
                            x2={room.door.dir === 'left' ? room.door.x - 14 : room.door.x + 14}
                            y2={room.door.dir === 'bottom' ? room.door.y + 14 : room.door.y - 14}
                            stroke="#475569"
                            strokeWidth="1.25"
                          />
                          <path
                            d={
                              room.door.dir === 'left'
                                ? `M ${room.door.x} ${room.door.y - 14} A 14 14 0 0 0 ${room.door.x - 14} ${room.door.y}`
                                : `M ${room.door.x} ${room.door.y - 14} A 14 14 0 0 1 ${room.door.x + 14} ${room.door.y}`
                            }
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="0.8"
                            strokeDasharray="2 2"
                          />
                        </g>
                      )}

                      {/* Service Doors */}
                      {room.serviceDoors?.map((sd, sdi) => (
                        <g key={`sd-${sdi}`}>
                          <rect x={sd.x} y={sd.y} width={sd.w} height={sd.h} fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.5" />
                          {Array.from({ length: Math.floor(sd.h / 8) }).map((_, rIdx) => (
                            <line key={`r-${rIdx}`} x1={sd.x} y1={sd.y + rIdx * 8} x2={sd.x + sd.w} y2={sd.y + rIdx * 8} stroke="#64748b" strokeWidth="0.75" />
                          ))}
                        </g>
                      ))}

                      {/* Equipment Symbols (Strictly in Zone 2 below header) */}
                      {room.subSymbols?.map((sym, symIdx) => (
                        <g key={`sym-${symIdx}`} opacity={isSelected ? '1' : '0.85'}>
                          {sym.type === 'vehicle' && (
                            <g>
                              <rect x={sym.x - 28} y={sym.y - 18} width="56" height="36" rx="4" fill="#f8fafc" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
                              <circle cx={sym.x} cy={sym.y} r="5" fill="none" stroke="#2563eb" strokeWidth="1" />
                              <text x={sym.x} y={sym.y + 12} textAnchor="middle" className="font-mono text-[6.5px] fill-slate-500 font-semibold">
                                {sym.label}
                              </text>
                            </g>
                          )}
                          {sym.type === 'ro_tubes' && (
                            <g>
                              <rect x={sym.x} y={sym.y} width={sym.w} height={sym.h} rx="3" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1" />
                              <line x1={sym.x + 8} y1={sym.y + 10} x2={sym.x + sym.w - 8} y2={sym.y + 10} stroke="#0284c7" strokeWidth="2" />
                              <line x1={sym.x + 8} y1={sym.y + 22} x2={sym.x + sym.w - 8} y2={sym.y + 22} stroke="#0284c7" strokeWidth="2" />
                              <rect x={sym.x + sym.w / 2 - 36} y={sym.y + sym.h / 2 - 6} width="72" height="12" rx="2" fill="#ffffff" stroke="#bae6fd" strokeWidth="0.75" />
                              <text x={sym.x + sym.w / 2} y={sym.y + sym.h / 2 + 2.5} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-sky-800">
                                {sym.label}
                              </text>
                            </g>
                          )}
                          {sym.type === 'bioreactor' && (
                            <g>
                              <rect x={sym.x} y={sym.y} width={sym.w} height={sym.h} rx="5" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
                              <circle cx={sym.x + sym.w / 2} cy={sym.y + 28} r="16" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
                              <circle cx={sym.x + sym.w / 2} cy={sym.y + 28} r="5" fill="#16a34a" opacity="0.3" />
                              <text x={sym.x + sym.w / 2} y={sym.y + sym.h - 8} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-slate-700">
                                {sym.label}
                              </text>
                            </g>
                          )}
                          {sym.type === 'switchgear_cubicle' && (
                            <g>
                              <rect x={sym.x} y={sym.y} width={sym.w} height={sym.h} fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
                              {[0, 1, 2, 3].map((panelIdx) => (
                                <rect
                                  key={panelIdx}
                                  x={sym.x + panelIdx * (sym.w / 4) + 2}
                                  y={sym.y + 4}
                                  width={sym.w / 4 - 4}
                                  height={sym.h - 8}
                                  fill="#f1f5f9"
                                  stroke="#64748b"
                                  strokeWidth="0.75"
                                />
                              ))}
                              <rect x={sym.x + sym.w / 2 - 46} y={sym.y + sym.h / 2 - 6} width="92" height="12" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.75" />
                              <text x={sym.x + sym.w / 2} y={sym.y + sym.h / 2 + 2.5} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-amber-800">
                                ⚡ {sym.label}
                              </text>
                            </g>
                          )}
                          {sym.type === 'air_handling_unit' && (
                            <g>
                              <rect x={sym.x} y={sym.y} width={sym.w} height={sym.h} rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                              <circle cx={sym.x + 30} cy={sym.y + sym.h / 2} r="16" fill="#ffffff" stroke="#2563eb" strokeWidth="1.2" />
                              <circle cx={sym.x + sym.w - 30} cy={sym.y + sym.h / 2} r="16" fill="#ffffff" stroke="#2563eb" strokeWidth="1.2" />
                              <rect x={sym.x + sym.w / 2 - 40} y={sym.y + 8} width="80" height="12" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.75" />
                              <text x={sym.x + sym.w / 2} y={sym.y + 17} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-slate-800">
                                {sym.label}
                              </text>
                            </g>
                          )}
                          {/* Generic block with clipped label to guarantee zero overflow */}
                          {!['vehicle', 'ro_tubes', 'bioreactor', 'switchgear_cubicle', 'air_handling_unit'].includes(sym.type) && sym.w && sym.h && (
                            <g>
                              <rect x={sym.x} y={sym.y} width={sym.w} height={sym.h} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.75" />
                              <text 
                                x={sym.x + sym.w / 2} 
                                y={sym.y + sym.h / 2 + 2.5} 
                                textAnchor="middle" 
                                className="font-mono fill-slate-600 font-medium"
                                style={{
                                  fontSize: `${Math.min(6.5, Math.max(5, (sym.w - 8) / (sym.label.length * 0.62)))}px`
                                }}
                              >
                                {sym.label}
                              </text>
                            </g>
                          )}
                        </g>
                      ))}

                      {/* ========================================================== */}
                      {/* LEVEL 2: DISTINCT INTERACTIVE GENERATOR UNITS              */}
                      {/* ========================================================== */}
                      {room.interactiveSubUnits?.map((unit) => {
                        const unitSystem = systemStates[unit.id] || { status: 'OPERATIONAL' };
                        const unitStatus = getStatusColor(unitSystem.status);
                        const isUnitSelected = selectedComponentId === unit.id;
                        const isUnitHovered = hoveredId === unit.id;

                        return (
                          <g
                            key={unit.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectComponent(unit.id);
                            }}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              setHoveredId(unit.id);
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              setHoveredId(null);
                            }}
                            className="cursor-pointer"
                          >
                            <title>{unit.label} ({unit.subLabel || 'STANDBY'}) - {unitSystem.status}</title>
                            <rect
                              x={unit.x}
                              y={unit.y}
                              width={unit.w}
                              height={unit.h}
                              rx="3"
                              fill={isUnitSelected ? '#eff6ff' : isUnitHovered ? '#f1f5f9' : '#ffffff'}
                              stroke={isUnitSelected ? '#2563eb' : isUnitHovered ? '#3b82f6' : '#0f172a'}
                              strokeWidth={isUnitSelected ? '2' : '1.2'}
                            />
                            {/* Generator rotor icon */}
                            <circle cx={unit.x + unit.w / 2} cy={unit.y + 14} r="7.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1" />
                            <text x={unit.x + unit.w / 2} y={unit.y + 17} textAnchor="middle" className="font-mono text-[7.5px] font-bold fill-blue-700">
                              G
                            </text>
                            {/* Unit Name & Role cleanly stacked */}
                            <text x={unit.x + unit.w / 2} y={unit.y + 29} textAnchor="middle" className="font-mono text-[7px] font-bold fill-slate-800">
                              {unit.label}
                            </text>
                            <text x={unit.x + unit.w / 2} y={unit.y + 38} textAnchor="middle" className="font-mono text-[6px] font-semibold fill-slate-500 tracking-wider">
                              {unit.subLabel || 'STANDBY'}
                            </text>

                            {/* Small status dot on generator unit with 7px margin */}
                            <circle cx={unit.x + unit.w - 7} cy={unit.y + 7} r="3" fill={unitStatus.dot} stroke="#ffffff" strokeWidth="1" />
                            {unitSystem.status !== 'OPERATIONAL' && (
                              <circle cx={unit.x + unit.w - 7} cy={unit.y + 7} r="5.5" fill="none" stroke={unitStatus.dot} strokeWidth="1" className="animate-ping" />
                            )}
                          </g>
                        );
                      })}

                      {/* Smart Zero-Collision Room Header */}
                      {renderRoomHeader(room, isSelected)}

                      {/* Small Status Indicator Dot at Bottom-Right (Clear of all text & symbols) */}
                      {!room.interactiveSubUnits && (
                        <g transform={`translate(${room.x + room.w - 14}, ${room.y + room.h - 14})`}>
                          {system.status !== 'OPERATIONAL' && (
                            <circle cx="0" cy="0" r="6" fill="none" stroke={statusCfg.dot} strokeWidth="1" className="animate-ping" />
                          )}
                          <circle cx="0" cy="0" r="3.5" fill={statusCfg.dot} stroke="#ffffff" strokeWidth="1" />
                          {/* Only show textual status on wide rooms to prevent collision, with exact 10.5px gap to dot edge */}
                          {room.w >= 220 && (
                            <text x="-14" y="2.5" textAnchor="end" className="font-mono text-[7px] font-bold fill-slate-500 uppercase tracking-wider">
                              {system.status}
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </>
          )}

          {/* ============================================================== */}
          {/* CASE 2: EXTERNAL SYSTEMS SITE MAP                              */}
          {/* ============================================================== */}
          {isExternalSite && (
            <g id="external-systems-site-plan">
              {/* Polar Coastline Outline */}
              <path
                d="M 30 250 Q 200 240 380 270 T 700 260 T 970 290"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text x="50" y="268" className="font-mono text-[8px] fill-slate-400 font-bold">
                ◄── COASTAL ICE SHELF / PRYDZ BAY INTAKE
              </text>

              {/* Heated Pipeline trace between Seawater pump & Station */}
              <path
                d="M 210 275 L 210 230 L 370 230"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
              <text x="240" y="222" className="font-mono text-[7px] font-bold fill-sky-700">
                HEATED SEAWATER PIPELINE (TRACE HEATED)
              </text>

              {/* Fuel transfer line to station */}
              <path
                d="M 340 160 L 370 160"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
              />
              <text x="320" y="152" className="font-mono text-[7px] font-bold fill-amber-700">
                FUEL FEED LINE
              </text>

              {/* External Infrastructure Modules */}
              {floorData.rooms?.map((mod) => {
                if (mod.isCoreOutline) {
                  return (
                    <g key={mod.id}>
                      <rect
                        x={mod.x}
                        y={mod.y}
                        width={mod.w}
                        height={mod.h}
                        rx="25"
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                      <text x={mod.x + mod.w / 2} y={mod.y + mod.h / 2 - 2} textAnchor="middle" className="font-sans text-xs font-bold fill-slate-800">
                        BHARATI MAIN COMPLEX
                      </text>
                      <text x={mod.x + mod.w / 2} y={mod.y + mod.h / 2 + 14} textAnchor="middle" className="font-mono text-[8px] fill-slate-500">
                        (Elevated 3.5m Stilt Foundation)
                      </text>
                    </g>
                  );
                }

                const isSelected = selectedComponentId === mod.equipmentId;
                const isHovered = hoveredId === mod.equipmentId;
                const sys = systemStates[mod.equipmentId] || { status: 'OPERATIONAL' };
                const st = getStatusColor(sys.status);

                return (
                  <g
                    key={mod.id}
                    onClick={() => onSelectComponent(mod.equipmentId)}
                    onMouseEnter={() => setHoveredId(mod.equipmentId)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={mod.x}
                      y={mod.y}
                      width={mod.w}
                      height={mod.h}
                      rx="6"
                      fill={isSelected ? '#f0f7ff' : isHovered ? '#f8fafc' : '#ffffff'}
                      stroke={isSelected ? '#2563eb' : isHovered ? '#3b82f6' : '#1e293b'}
                      strokeWidth={isSelected ? '2.5' : '1.75'}
                    />

                    {/* Zero-Collision Header */}
                    {renderRoomHeader(mod, isSelected)}

                    {/* Specific External Symbols */}
                    {mod.subSymbols?.map((sym, sIdx) => (
                      <g key={`ext-sym-${sIdx}`}>
                        {sym.type === 'bulk_tank' && (
                          <g>
                            <circle cx={sym.x + sym.w / 2} cy={sym.y + sym.h / 2} r={sym.w / 2} fill="#fef3c7" stroke="#d97706" strokeWidth="1.2" />
                            <text x={sym.x + sym.w / 2} y={sym.y + sym.h / 2 + 2.5} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-amber-900">
                              {sym.label}
                            </text>
                          </g>
                        )}
                        {sym.type === 'helipad_circle' && (
                          <g>
                            <circle cx={sym.x} cy={sym.y} r={sym.r} fill="#f8fafc" stroke="#dc2626" strokeWidth="2" />
                            <circle cx={sym.x} cy={sym.y} r={sym.r - 8} fill="none" stroke="#dc2626" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={sym.x} y={sym.y + 11} textAnchor="middle" className="font-mono text-3xl font-black fill-red-600">
                              H
                            </text>
                          </g>
                        )}
                        {sym.type === 'survival_bunk' && (
                          <g>
                            <rect x={sym.x} y={sym.y} width={sym.w} height={sym.h} fill="#fef2f2" stroke="#ef4444" strokeWidth="1" rx="3" />
                            <text x={sym.x + sym.w / 2} y={sym.y + sym.h / 2 + 2.5} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-red-800">
                              SURVIVAL POD
                            </text>
                          </g>
                        )}
                        {sym.type === 'subsea_intake' && (
                          <g>
                            <rect x={sym.x} y={sym.y} width={sym.w} height={sym.h} fill="#f0f9ff" stroke="#0284c7" strokeWidth="1" rx="3" />
                            <text x={sym.x + sym.w / 2} y={sym.y + sym.h / 2 + 2.5} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-sky-800">
                              HEATED INTAKE
                            </text>
                          </g>
                        )}
                      </g>
                    ))}

                    {/* Status Dot */}
                    <g transform={`translate(${mod.x + mod.w - 14}, ${mod.y + mod.h - 14})`}>
                      {sys.status !== 'OPERATIONAL' && (
                        <circle cx="0" cy="0" r="6" fill="none" stroke={st.dot} strokeWidth="1" className="animate-ping" />
                      )}
                      <circle cx="0" cy="0" r="3.5" fill={st.dot} stroke="#ffffff" strokeWidth="1" />
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* ============================================================== */}
          {/* ARCHITECTURAL TITLE BLOCK (Clean bottom margin placement)       */}
          {/* ============================================================== */}
          <g transform="translate(60, 420)" opacity="0.9" className="font-mono select-none">
            <rect x="0" y="0" width="330" height="26" fill="#ffffff" stroke="#475569" strokeWidth="0.8" rx="2" />
            <line x1="195" y1="0" x2="195" y2="26" stroke="#cbd5e1" strokeWidth="0.75" />
            <text x="10" y="11" className="text-[7.5px] font-bold fill-slate-900">
              BHARATI ANTARCTIC RESEARCH STATION
            </text>
            <text x="10" y="21" className="text-[6.5px] fill-slate-500">
              MoES / NCPOR SMART AUTOMATION PLATFORM
            </text>
            <text x="205" y="11" className="text-[7.5px] font-bold fill-blue-700">
              PS26060 DIGITAL TWIN
            </text>
            <text x="205" y="21" className="text-[6.5px] fill-slate-500">
              MOCK SIMULATION MODE
            </text>
          </g>

          {/* Dedicated North Compass Rose (Completely clear of rooms at x=945, y=24) */}
          <g transform="translate(945, 24)" opacity="0.85" className="select-none">
            <circle cx="0" cy="0" r="8.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.75" />
            <line x1="0" y1="-7.5" x2="0" y2="7.5" stroke="#475569" strokeWidth="0.75" />
            <line x1="-7.5" y1="0" x2="7.5" y2="0" stroke="#475569" strokeWidth="0.75" />
            <polygon points="0,-7.5 -2,-1.5 2,-1.5" fill="#2563eb" />
            <polygon points="0,7.5 -2,1.5 2,1.5" fill="#64748b" />
            <text x="0" y="-10" textAnchor="middle" className="font-mono text-[7px] font-black fill-blue-700">
              N
            </text>
          </g>
        </svg>

        {/* Dynamic Hover HUD / Status Tooltip */}
        {hoveredInfo && (
          <div className="absolute bottom-3 right-4 z-10 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-lg px-3 py-1.5 shadow-md flex items-center gap-2 text-xs animate-in fade-in duration-100">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(hoveredInfo.status).dot }}
            ></span>
            <span className="font-bold text-gray-900 font-mono text-[11px]">
              {hoveredInfo.name}
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-mono text-[10px] text-blue-600 font-semibold">
              {hoveredInfo.code}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 text-[10px] font-mono">
              {hoveredInfo.status}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 text-[10px]">
              Click to control
            </span>
          </div>
        )}
      </div>

      {/* Blueprint Footer Status Bar */}
      <div className="h-7 px-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] font-mono text-gray-500 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            CAD Vector Layer: Synchronized
          </span>
          <span className="text-gray-300">•</span>
          <span>Lat: 69°24′28″S | Long: 76°11′14″E</span>
        </div>
        <div>
          <span>SIH PS26060 • Smart Automation Architectural Platform</span>
        </div>
      </div>
    </div>
  );
}

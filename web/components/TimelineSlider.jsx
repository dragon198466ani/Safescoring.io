"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/**
 * TimelineSlider - Compact Datafast-style timeline for security map
 * Shows incident counts and allows time-travel through crypto history
 */
export default function TimelineSlider({
  onTimeRangeChange,
  minDate,
  maxDate,
  attacksCount = 0,
  hacksCount = 0,
}) {
  const [value, setValue] = useState(100);
  const [isAllTime, setIsAllTime] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2);
  const isDragging = useRef(false);
  const playIntervalRef = useRef(null);

  // Calculate date from slider value
  const currentDate = useMemo(() => {
    if (!minDate || !maxDate) return new Date();
    const min = new Date(minDate).getTime();
    const max = new Date(maxDate).getTime();
    return new Date(min + (value / 100) * (max - min));
  }, [value, minDate, maxDate]);

  // Generate year markers
  const yearMarkers = useMemo(() => {
    if (!minDate || !maxDate) return [];

    const min = new Date(minDate);
    const max = new Date(maxDate);
    const startYear = min.getFullYear();
    const endYear = max.getFullYear();
    const totalYears = endYear - startYear;

    const markers = [];
    const step = totalYears > 15 ? 4 : totalYears > 8 ? 2 : 1;

    for (let year = startYear; year <= endYear; year += step) {
      const yearDate = new Date(year, 0, 1);
      const position = ((yearDate.getTime() - min.getTime()) / (max.getTime() - min.getTime())) * 100;

      if (position >= 0 && position <= 100) {
        markers.push({ year, position });
      }
    }

    if (markers.length > 0 && markers[markers.length - 1].year !== endYear) {
      markers.push({ year: endYear, position: 100 });
    }

    return markers;
  }, [minDate, maxDate]);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  // Handle slider change
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setValue(newValue);
    setIsAllTime(false);
    setIsPlaying(false);
    isDragging.current = true;
  };

  // Notify parent
  const updateParent = useCallback((date) => {
    onTimeRangeChange?.(date, false);
  }, [onTimeRangeChange]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      updateParent(currentDate);
    }
  }, [currentDate, updateParent]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseUp]);

  // Playback animation
  useEffect(() => {
    if (isPlaying) {
      const speeds = { 1: 200, 2: 100, 3: 50 };
      const increment = { 1: 0.3, 2: 0.5, 3: 1 };

      playIntervalRef.current = setInterval(() => {
        setValue((prev) => {
          const newVal = prev + increment[playSpeed];
          if (newVal >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return newVal;
        });
      }, speeds[playSpeed]);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playSpeed]);

  // Update parent during playback
  useEffect(() => {
    if (isPlaying && !isDragging.current) {
      updateParent(currentDate);
    }
  }, [value, isPlaying, currentDate, updateParent]);

  // Reset to all time
  const handleReset = () => {
    setValue(100);
    setIsAllTime(true);
    setIsPlaying(false);
    onTimeRangeChange?.(null, true);
  };

  // Play/Pause toggle
  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (value >= 99) {
        setValue(0);
      }
      setIsAllTime(false);
      setIsPlaying(true);
    }
  };

  // Click on year marker
  const handleYearClick = (year) => {
    const min = new Date(minDate).getTime();
    const max = new Date(maxDate).getTime();
    const targetDate = new Date(year, 6, 1);
    const newValue = ((targetDate.getTime() - min) / (max - min)) * 100;
    const clampedValue = Math.max(0, Math.min(100, newValue));

    setValue(clampedValue);
    setIsAllTime(false);
    setIsPlaying(false);

    const newDate = new Date(min + (clampedValue / 100) * (max - min));
    updateParent(newDate);
  };

  return (
    <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
      {/* Top row: Stats + Date + Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/30">
        {/* Stats badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-red-400">{attacksCount}</span> attacks
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-amber-400">{hacksCount}</span> hacks
            </span>
          </div>
        </div>

        {/* Current date / All time */}
        <div className="flex items-center gap-3">
          {isAllTime ? (
            <span className="text-sm font-medium text-cyan-400">All Time</span>
          ) : (
            <span className="text-sm font-mono text-purple-400">{formatDate(currentDate)}</span>
          )}

          {isPlaying && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Playing
            </span>
          )}
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-0.5">
          {[1, 2, 3].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaySpeed(speed)}
              className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                playSpeed === speed
                  ? "bg-purple-500 text-white"
                  : "text-slate-500 hover:text-white hover:bg-slate-800"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Main slider area */}
      <div className="px-4 py-3">
        {/* Year markers */}
        <div className="relative h-4 mb-1">
          {yearMarkers.map((marker) => (
            <button
              key={marker.year}
              onClick={() => handleYearClick(marker.year)}
              className={`absolute transform -translate-x-1/2 text-[10px] font-medium transition-all hover:scale-110 ${
                currentDate.getFullYear() >= marker.year && !isAllTime
                  ? "text-purple-400"
                  : "text-slate-600 hover:text-slate-400"
              }`}
              style={{ left: `${marker.position}%` }}
            >
              {marker.year}
            </button>
          ))}
        </div>

        {/* Slider track */}
        <div className="relative">
          {/* Background track */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            {/* Progress fill with gradient */}
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-cyan-500 to-emerald-500 rounded-full transition-all duration-75"
              style={{ width: `${value}%` }}
            />
          </div>

          {/* Native range input (invisible) */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={value}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {/* Custom thumb */}
          <div
            className={`absolute top-1/2 w-4 h-4 rounded-full bg-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all ${
              isPlaying ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950" : ""
            }`}
            style={{ left: `${value}%` }}
          />
        </div>
      </div>

      {/* Bottom row: Playback controls */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/30">
        {/* Rewind */}
        <button
          onClick={() => {
            setValue(0);
            setIsAllTime(false);
            setIsPlaying(false);
            updateParent(new Date(minDate));
          }}
          className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          title="Start"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062A1.125 1.125 0 0121 8.688v8.123zM11.25 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062a1.125 1.125 0 011.683.977v8.123z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${
            isPlaying
              ? "bg-emerald-500 text-white shadow-emerald-500/30"
              : "bg-purple-500 text-white shadow-purple-500/30 hover:bg-purple-400"
          }`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 ml-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          )}
        </button>

        {/* Reset/All Time */}
        <button
          onClick={handleReset}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            isAllTime
              ? "bg-cyan-500/20 text-cyan-400"
              : "bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white"
          }`}
          title="Show all time"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

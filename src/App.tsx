/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Volume2, 
  VolumeX, 
  BookOpen, 
  HelpCircle, 
  Crosshair, 
  Sliders, 
  Terminal, 
  Activity, 
  RotateCcw, 
  Sparkles, 
  Lock, 
  Globe, 
  Award, 
  X, 
  Sun, 
  Zap, 
  Languages, 
  CheckCircle2,
  Info,
  Radio
} from 'lucide-react';
import { STAR_SYSTEMS, StarSystem, FilterType } from './data/systems.ts';
import { sound } from './utils/audio.ts';

interface GraphPoint {
  flux: number;
  day: number;
}

interface LogMessage {
  id: string;
  time: string;
  text: string;
  type?: 'info' | 'success' | 'warn';
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [currentSystemIdx, setCurrentSystemIdx] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('VIS');
  const [score, setScore] = useState<number>(0);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sliders
  const [userDepth, setUserDepth] = useState<number>(0);
  const [userPeriod, setUserPeriod] = useState<number>(1.0);

  // Modals
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showCodex, setShowCodex] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Simulation & HUD State
  const [fps, setFps] = useState<number>(60);
  const [isTransiting, setIsTransiting] = useState<boolean>(false);
  const [transitDepthCurrent, setTransitDepthCurrent] = useState<number>(0);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Refs for animation & canvases
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  const graphPointsRef = useRef<GraphPoint[]>([]);
  const simTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);
  const currentIdxRef = useRef<number>(0);
  const activeFilterRef = useRef<FilterType>('VIS');
  const userDepthRef = useRef<number>(0);
  const userPeriodRef = useRef<number>(1.0);

  // Keep refs in sync
  currentIdxRef.current = currentSystemIdx;
  activeFilterRef.current = activeFilter;
  userDepthRef.current = userDepth;
  userPeriodRef.current = userPeriod;

  const currentSys = STAR_SYSTEMS[currentSystemIdx];
  const currentPlanet = currentSys.planet;

  // Add Log helper
  const addLog = useCallback((text: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs(prev => [
      ...prev.slice(-30),
      { id: `${Date.now()}-${Math.random()}`, time: timeStr, text, type }
    ]);
  }, []);

  // Initialize and target system
  useEffect(() => {
    addLog(
      lang === 'en' 
        ? `Telescope calibrated. Targeted star system: ${currentSys.name} (${currentSys.type})` 
        : `望远镜已完成校准。锁定目标恒星系统: ${currentSys.name} (${currentSys.zhType || currentSys.type})`
    );
    // Reset graph buffer on system switch
    graphPointsRef.current = [];
    setUserDepth(0);
    setUserPeriod(1.0);
  }, [currentSystemIdx, lang, addLog, currentSys.name, currentSys.type, currentSys.zhType]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Real-time Astrophysics Math
  // Planet Radius: Rp = R* * sqrt(Delta F) * 109.2 (Earth radii)
  const calcPlanetRadius = currentSys.radius * Math.sqrt(Math.max(0, userDepth) / 100) * 109.2;
  // Semi-major axis via Kepler's 3rd Law: a = (M* * (P/365.25)^2)^(1/3)
  const pYears = userPeriod / 365.25;
  const calcOrbitDist = Math.cbrt(currentSys.mass * Math.pow(pYears, 2));

  // Match Accuracy Calculation
  const depthDiff = Math.abs(userDepth - currentPlanet.trueDepth) / currentPlanet.trueDepth;
  const periodDiff = Math.abs(userPeriod - currentPlanet.truePeriod) / currentPlanet.truePeriod;
  let matchAccuracy = Math.max(0, Math.min(100, Math.round(100 - (depthDiff * 50 + periodDiff * 50))));
  if (isNaN(matchAccuracy)) matchAccuracy = 0;

  // Sound toggle handler
  const handleToggleSound = () => {
    sound.muted = !sound.muted;
    setIsMuted(sound.muted);
    if (!sound.muted) {
      sound.playBeep(520, 0.08);
    }
  };

  // Filter change handler
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    sound.playBeep(700, 0.05);
    const filterNames = {
      VIS: lang === 'en' ? 'Visible Spectrum' : '可见光波段',
      IR: lang === 'en' ? 'Infrared (JWST NIRCAM)' : '红外波段 (JWST NIRCAM - 降噪优化)',
      UV: lang === 'en' ? 'Ultraviolet' : '紫外波段'
    };
    addLog(
      lang === 'en' 
        ? `Optical spectrum switched to ${filterNames[filter]}.` 
        : `光谱滤波片已切换至: ${filterNames[filter]}。`
    );
  };

  // Auto Assist handler
  const handleAutoAssist = () => {
    setUserDepth(currentPlanet.trueDepth);
    setUserPeriod(currentPlanet.truePeriod);
    sound.playSuccess();
    addLog(
      lang === 'en'
        ? `[Auto-Assist] AI algorithm calibrated filters to detected transit signature!`
        : `[自动辅助校准] 算法已精准对齐至该行星的物理测光特征！`,
      'success'
    );
  };

  // Reset Graph handler
  const handleResetGraph = () => {
    graphPointsRef.current = [];
    sound.playBeep(380, 0.05);
    addLog(
      lang === 'en'
        ? `Light curve buffer flushed and reset.`
        : `光变曲线缓存数据已重置。`
    );
  };

  // Lock Signal & Evaluate Habitability
  const handleLockSignal = () => {
    const dDiff = Math.abs(userDepth - currentPlanet.trueDepth);
    const pDiff = Math.abs(userPeriod - currentPlanet.truePeriod);

    if (dDiff <= 0.45 && pDiff <= 4.0) {
      sound.playSuccess();
      const rpReward = 500;
      setScore(prev => prev + (discovered.has(currentSys.id) ? 100 : rpReward));
      setDiscovered(prev => {
        const next = new Set(prev);
        next.add(currentSys.id);
        return next;
      });
      setShowReport(true);
      addLog(
        lang === 'en'
          ? `[CONFIRMED] Exoplanet ${currentPlanet.name} successfully cataloged! +${rpReward} RP.`
          : `[发现确认] 系外行星 ${currentPlanet.name} 确认入库！获得 +${rpReward} RP 研究点数。`,
        'success'
      );
    } else {
      sound.playError();
      addLog(
        lang === 'en'
          ? `[MISMATCH] Photometric alignment precision insufficient. Try aligning the blue guides with dips or use Auto-Assist!`
          : `[未锁定信号] 测光对齐精度不足。请微调滑动条使蓝线与低谷重合，或点击“自动对齐”！`,
        'warn'
      );
    }
  };

  // Main Animation Loop for Canvases
  useEffect(() => {
    let animId: number;

    const render = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      // FPS Calculation
      frameCountRef.current++;
      fpsTimerRef.current += dt;
      if (fpsTimerRef.current >= 1.0) {
        setFps(Math.round(frameCountRef.current / fpsTimerRef.current));
        frameCountRef.current = 0;
        fpsTimerRef.current = 0;
      }

      const sys = STAR_SYSTEMS[currentIdxRef.current];
      const planet = sys.planet;
      const filter = activeFilterRef.current;

      // Update Simulation Time
      const simSpeed = 2.0;
      simTimeRef.current += dt * simSpeed;
      const daysElapsed = (simTimeRef.current * 2) % 30;
      const period = planet.truePeriod;
      const phase = (daysElapsed % period) / period;
      const transitDuration = 0.08;

      let fluxDrop = 0;
      let transitingNow = false;
      if (phase < transitDuration) {
        transitingNow = true;
        const normTransit = phase / transitDuration;
        fluxDrop = planet.trueDepth * Math.sin(normTransit * Math.PI);
      }

      setIsTransiting(transitingNow);
      setTransitDepthCurrent(fluxDrop);

      // Noise computation based on spectrum filter
      let noiseMultiplier = 0.15;
      if (filter === 'IR') noiseMultiplier = 0.02; // clean infrared
      if (filter === 'UV') noiseMultiplier = 0.08; // moderate ultraviolet
      const noise = (Math.random() - 0.5) * sys.noiseLevel * noiseMultiplier;
      const currentFlux = 100.0 - fluxDrop + noise;

      // Buffer historical graph points
      const points = graphPointsRef.current;
      points.push({ flux: currentFlux, day: daysElapsed });
      if (points.length > 300) {
        points.shift();
      }

      // 1. Draw Star & Transit Camera
      const starCanvas = starCanvasRef.current;
      if (starCanvas) {
        const ctx = starCanvas.getContext('2d');
        if (ctx) {
          const w = starCanvas.width;
          const h = starCanvas.height;
          const cx = w / 2;
          const cy = h / 2;

          ctx.clearRect(0, 0, w, h);

          // Starfield background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          for (let i = 0; i < 24; i++) {
            const sx = (i * 137.5) % w;
            const sy = (i * 219.3) % h;
            ctx.fillRect(sx, sy, 1.5, 1.5);
          }

          // Orbit Ellipse
          const rx = Math.min(w, h) * 0.38;
          const ry = rx * 0.35;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Planet position on orbit
          const periodSec = Math.max(1.0, planet.truePeriod * 0.8);
          const orbitAngle = ((simTimeRef.current / periodSec) % 1.0) * Math.PI * 2;
          const px = cx + Math.cos(orbitAngle) * rx;
          const py = cy + Math.sin(orbitAngle) * ry;
          const isBehind = Math.sin(orbitAngle) < 0;

          // Helper to draw planet
          const drawPlanet = () => {
            const pr = Math.max(4, Math.min(13, planet.trueRadius * 4.5));
            ctx.fillStyle = '#090d16';
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();

            // Atmosphere rim glow
            ctx.strokeStyle = planet.habitable ? '#38bdf8' : '#fb923c';
            ctx.lineWidth = 1.8;
            ctx.stroke();
          };

          // Draw planet behind star
          if (isBehind) {
            drawPlanet();
          }

          // Star Corona & Core Glow
          const starRadius = Math.min(w, h) * 0.18;
          const grad = ctx.createRadialGradient(cx, cy, starRadius * 0.1, cx, cy, starRadius * 1.6);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.25, sys.color);
          grad.addColorStop(0.65, `${sys.color}66`);
          grad.addColorStop(1, 'transparent');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, starRadius * 1.6, 0, Math.PI * 2);
          ctx.fill();

          // Star solid luminous core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy, starRadius * 0.65, 0, Math.PI * 2);
          ctx.fill();

          // Draw planet in front of star (occultation / transit)
          if (!isBehind) {
            drawPlanet();
          }
        }
      }

      // 2. Draw Light Curve Graph
      const graphCanvas = graphCanvasRef.current;
      if (graphCanvas) {
        const ctx = graphCanvas.getContext('2d');
        if (ctx) {
          const w = graphCanvas.width;
          const h = graphCanvas.height;

          ctx.clearRect(0, 0, w, h);

          // Grid lines & flux percentage labels
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
          ctx.lineWidth = 1;
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillStyle = '#64748b';

          const levels = [100.5, 100.0, 99.5, 99.0, 98.5];
          levels.forEach(val => {
            const y = h - ((val - 98.0) / 3.0) * (h - 24) - 12;
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(w - 12, y);
            ctx.stroke();
            ctx.fillText(`${val.toFixed(1)}%`, 6, y + 3);
          });

          const maxPoints = 300;
          const stepX = (w - 52) / maxPoints;

          // Vertical Period candidate lines
          const currentPeriod = userPeriodRef.current;
          if (currentPeriod > 0) {
            const pxPerDay = 10 * stepX;
            const periodSpacingPx = currentPeriod * pxPerDay;

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);

            let anchorX = 40;
            for (let i = 0; i < points.length; i++) {
              if (points[i].flux < 99.65) {
                anchorX = 40 + i * stepX;
                break;
              }
            }

            for (let x = anchorX; x < w - 12; x += periodSpacingPx) {
              ctx.beginPath();
              ctx.moveTo(x, 8);
              ctx.lineTo(x, h - 14);
              ctx.stroke();
            }
            for (let x = anchorX - periodSpacingPx; x >= 40; x -= periodSpacingPx) {
              ctx.beginPath();
              ctx.moveTo(x, 8);
              ctx.lineTo(x, h - 14);
              ctx.stroke();
            }
            ctx.setLineDash([]);
          }

          // User Transit Depth horizontal line
          const currentDepth = userDepthRef.current;
          if (currentDepth > 0) {
            const userY = h - (((100.0 - currentDepth) - 98.0) / 3.0) * (h - 24) - 12;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(40, userY);
            ctx.lineTo(w - 12, userY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#f59e0b';
            ctx.fillText(
              `Target Depth: ${(100.0 - currentDepth).toFixed(2)}%`, 
              w - 130, 
              Math.max(16, userY - 4)
            );
          }

          // Continuous Light Curve Plot
          if (points.length >= 2) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < points.length; i++) {
              const flux = points[i].flux;
              const x = 40 + i * stepX;
              const y = h - ((flux - 98.0) / 3.0) * (h - 24) - 12;

              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);

              // Highlight dip markers
              if (flux < 99.65) {
                ctx.save();
                ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }
            }
            ctx.stroke();

            // Glowing trailing dot
            const lastIdx = points.length - 1;
            const lastFlux = points[lastIdx].flux;
            const lastX = 40 + lastIdx * stepX;
            const lastY = h - ((lastFlux - 98.0) / 3.0) * (h - 24) - 12;

            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      if (starCanvasRef.current && starCanvasRef.current.parentElement) {
        const rect = starCanvasRef.current.parentElement.getBoundingClientRect();
        starCanvasRef.current.width = rect.width * dpr;
        starCanvasRef.current.height = rect.height * dpr;
      }
      if (graphCanvasRef.current && graphCanvasRef.current.parentElement) {
        const rect = graphCanvasRef.current.parentElement.getBoundingClientRect();
        graphCanvasRef.current.width = rect.width * dpr;
        graphCanvasRef.current.height = rect.height * dpr;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-slate-100 bg-[#030712]">
      {/* Top HUD Navigation Header */}
      <header className="hud-panel border-b border-cyan-900/50 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-30 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-lg font-hud font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            EH
          </div>
          <div>
            <h1 className="font-hud text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent tracking-wider">
              {lang === 'en' ? 'EXOPLANET HUNTER' : '系外行星猎手'}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wide">
              {lang === 'en' ? 'DEEP SPACE TRANSIT SPECTROSCOPY HUD v2.5' : '深空凌星测光光谱分析控制台 v2.5'}
            </p>
          </div>
        </div>

        {/* Global Telemetry & Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4 font-hud text-xs">
          <div className="hidden md:flex items-center space-x-6 px-4 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">{lang === 'en' ? 'SYSTEM:' : '当前星系:'}</span>
              <span className="text-cyan-400 font-semibold">{currentSys.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">{lang === 'en' ? 'DISCOVERIES:' : '已编目:'}</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                {discovered.size} / {STAR_SYSTEMS.length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">{lang === 'en' ? 'RESEARCH PTS:' : '研究点数:'}</span>
              <span className="text-amber-400 font-semibold tabular-nums">{score} RP</span>
            </div>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">{lang === 'en' ? '中文' : 'EN'}</span>
          </button>

          {/* Codex Modal Toggle */}
          <button
            onClick={() => {
              setShowCodex(true);
              sound.playBeep(600, 0.05);
            }}
            className="px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-400 text-xs text-cyan-300 transition flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'en' ? 'CODEX' : '图鉴档案'}</span>
          </button>

          {/* Guide Modal Toggle */}
          <button
            onClick={() => {
              setShowGuide(true);
              sound.playBeep(550, 0.05);
            }}
            className="px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'en' ? 'GUIDE' : '指南'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="w-8 h-8 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition"
            title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Scientific Console */}
      <main className="flex-1 p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN: Target Star & Spectrum Settings (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          {/* Target Star System Selector */}
          <div className="hud-panel rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-hud text-xs tracking-widest text-cyan-400 flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5" />
                {lang === 'en' ? 'TARGET STAR SYSTEM' : '目标恒星系统'}
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                JWST READY
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {STAR_SYSTEMS.map((sys, idx) => {
                const isDiscovered = discovered.has(sys.id);
                const isSelected = idx === currentSystemIdx;
                return (
                  <button
                    key={sys.id}
                    onClick={() => {
                      setCurrentSystemIdx(idx);
                      sound.playBeep(600, 0.05);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-3 h-3 rounded-full shadow-[0_0_8px]"
                        style={{ backgroundColor: sys.color, boxShadow: `0 0 8px ${sys.color}` }}
                      />
                      <span className="font-hud font-semibold">{sys.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isDiscovered
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isDiscovered
                        ? (lang === 'en' ? 'CATALOGED' : '已编目')
                        : (lang === 'en' ? 'UNOBSERVED' : '未观测')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spectrum Filter & Stellar Telemetry */}
          <div className="hud-panel rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-hud text-xs tracking-widest text-cyan-400 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                {lang === 'en' ? 'SPECTRUM FILTER' : '波段光谱滤镜'}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {activeFilter === 'VIS' ? (lang === 'en' ? 'VISIBLE' : '可见光') :
                 activeFilter === 'IR' ? (lang === 'en' ? 'INFRARED (IR)' : '红外波段 (IR)') : 
                 (lang === 'en' ? 'ULTRAVIOLET (UV)' : '紫外波段 (UV)')}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              💡 <strong className="text-slate-200">{lang === 'en' ? 'Pro Tip:' : '观测技巧:'}</strong>{' '}
              {lang === 'en' ? (
                <>Switch to <strong className="text-amber-300">IR (Infrared)</strong> to suppress stellar atmospheric flare noise!</>
              ) : (
                <>切换到 <strong className="text-amber-300">IR (红外波段)</strong> 可有效过滤恒星表面耀斑杂波！</>
              )}
            </p>

            {/* Filter Mode Selector Buttons */}
            <div className="grid grid-cols-3 gap-2 font-hud text-[11px]">
              <button
                onClick={() => handleFilterChange('VIS')}
                className={`py-2 px-1 rounded border text-center transition cursor-pointer ${
                  activeFilter === 'VIS'
                    ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <span>VIS</span>
              </button>
              <button
                onClick={() => handleFilterChange('IR')}
                className={`py-2 px-1 rounded border text-center transition cursor-pointer ${
                  activeFilter === 'IR'
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 ring-2 ring-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Radio className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <span>IR (Rec.)</span>
              </button>
              <button
                onClick={() => handleFilterChange('UV')}
                className={`py-2 px-1 rounded border text-center transition cursor-pointer ${
                  activeFilter === 'UV'
                    ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                <span>UV</span>
              </button>
            </div>

            {/* Stellar Physical Parameters */}
            <div className="mt-1 p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === 'en' ? 'Spectral Type:' : '光谱类型:'}</span>
                <span className="text-slate-200">{lang === 'en' ? currentSys.type : (currentSys.zhType || currentSys.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === 'en' ? 'Stellar Mass (M☉):' : '恒星质量 (M☉):'}</span>
                <span className="text-slate-200 tabular-nums">{currentSys.mass} M☉</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === 'en' ? 'Stellar Radius (R☉):' : '恒星半径 (R☉):'}</span>
                <span className="text-slate-200 tabular-nums">{currentSys.radius} R☉</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === 'en' ? 'Effective Temp:' : '有效表面温度:'}</span>
                <span className="text-slate-200 tabular-nums">{currentSys.temp.toLocaleString()} K</span>
              </div>
            </div>
          </div>

          {/* Terminal Science Log Box */}
          <div className="hud-panel rounded-xl p-4 flex flex-col flex-1 min-h-[160px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <span className="font-hud text-xs tracking-widest text-slate-400 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                {lang === 'en' ? 'TERMINAL LOG' : '控制台日志'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="font-mono text-[11px] text-slate-400 space-y-1.5 flex-1 overflow-y-auto max-h-[170px] pr-1">
              {logs.map(log => (
                <p 
                  key={log.id} 
                  className={
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'warn' ? 'text-rose-400' :
                    'text-slate-400'
                  }
                >
                  <span className="text-slate-500 mr-1">[{log.time}]</span>
                  <span>{log.text}</span>
                </p>
              ))}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </section>

        {/* CENTER & RIGHT COLUMN: Observation Viewports & Signal Analysis (8 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {/* Telescope Live Viewport Canvas */}
          <div className="hud-panel rounded-xl p-4 relative scanlines overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-2 z-10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-hud text-xs tracking-wider text-cyan-300">
                  {lang === 'en' ? 'DEEP SPACE CAMERA [VISUAL FEED]' : '深空望远镜相机 [实况成像画面]'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                <span>FPS: <span className="text-cyan-400 tabular-nums">{fps}</span></span>
                <span>ZOOM: <span className="text-slate-200 font-mono">1.0x</span></span>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative w-full h-[220px] sm:h-[260px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <canvas ref={starCanvasRef} className="w-full h-full block cursor-crosshair" />

              {/* HUD Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                <div 
                  className="w-48 h-48 border border-cyan-500/40 rounded-full border-dashed animate-spin" 
                  style={{ animationDuration: '40s' }} 
                />
                <div className="absolute w-full h-[1px] bg-cyan-500/20" />
                <div className="absolute h-full w-[1px] bg-cyan-500/20" />
              </div>

              {/* Transit Status Badge */}
              <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 px-3 py-1 rounded text-[11px] font-mono flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTransiting ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span className={isTransiting ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                  {isTransiting
                    ? (lang === 'en' 
                        ? `TRANSIT IN PROGRESS (DEPTH: -${transitDepthCurrent.toFixed(2)}%)` 
                        : `凌星事件进行中 (光变降幅: -${transitDepthCurrent.toFixed(2)}%)`)
                    : (lang === 'en' ? 'OUT OF TRANSIT' : '未发生凌星 / 行星处于轨道两侧')}
                </span>
              </div>
            </div>
          </div>

          {/* Light Curve Plotting & Signal Analysis Panel */}
          <div className="hud-panel rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-2 gap-2">
              <span className="font-hud text-xs tracking-widest text-cyan-400 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                {lang === 'en' ? 'LIGHT CURVE ANALYZER' : '光变曲线测光分析仪'}
              </span>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={handleAutoAssist}
                  className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.3)] cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Auto-Align Assist' : '自动对齐辅助'}</span>
                </button>
                <button
                  onClick={handleResetGraph}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'en' ? 'Reset' : '重置曲线'}</span>
                </button>
              </div>
            </div>

            {/* Visual Match Guidance Banner */}
            <div className="bg-cyan-950/40 border border-cyan-800/60 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-200">
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold font-hud text-[10px]">
                  {lang === 'en' ? 'VISUAL MATCH' : '对齐准则'}
                </span>
                <span>
                  {lang === 'en' ? (
                    <>Adjust sliders: <strong className="text-amber-300">Yellow line to dip bottom, blue vertical lines to dip intervals</strong>!</>
                  ) : (
                    <>拖动滑块：<strong className="text-amber-300">黄虚线对齐低谷底部，蓝虚线对齐下凹周期</strong>！</>
                  )}
                </span>
              </div>
              <span 
                className={`font-mono font-bold text-xs ${
                  matchAccuracy >= 80 ? 'text-emerald-400 animate-pulse' :
                  matchAccuracy >= 50 ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {matchAccuracy >= 80 
                  ? (lang === 'en' ? `PERFECT MATCH (${matchAccuracy}%) - READY!` : `完美对齐 (${matchAccuracy}%) - 可锁定!`)
                  : matchAccuracy >= 50 
                  ? (lang === 'en' ? `APPROACHING TARGET (${matchAccuracy}%)` : `接近目标 (${matchAccuracy}%)`)
                  : (lang === 'en' ? `NOT ALIGNED (${matchAccuracy}%)` : `未对齐 (${matchAccuracy}%)`)}
              </span>
            </div>

            {/* Alignment Visual Gauge Bar */}
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  matchAccuracy >= 80
                    ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                    : matchAccuracy >= 50
                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${matchAccuracy}%` }}
              />
            </div>

            {/* Light Curve Canvas */}
            <div className="relative w-full h-[200px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 p-1">
              <canvas ref={graphCanvasRef} className="w-full h-full block" />
            </div>

            {/* Interactive Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Slider 1: Transit Depth */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="slider-depth" className="text-xs font-hud text-slate-300">
                    {lang === 'en' ? '1. Transit Depth (Dip Bottom)' : '1. 凌星降幅 (对齐黄线至低谷谷底)'}
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-bold tabular-nums">
                    {userDepth.toFixed(2)} %
                  </span>
                </div>
                <input
                  type="range"
                  id="slider-depth"
                  min="0"
                  max="3"
                  step="0.01"
                  value={userDepth}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setUserDepth(val);
                    sound.playBeep(300 + val * 200, 0.02);
                  }}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0.0%</span>
                  <span>
                    {lang === 'en' ? 'Est. Radius: ' : '计算行星半径: '}
                    <strong className="text-amber-300 tabular-nums">{calcPlanetRadius.toFixed(2)} R⊕</strong>
                  </span>
                  <span>3.0%</span>
                </div>
              </div>

              {/* Slider 2: Orbital Period */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="slider-period" className="text-xs font-hud text-slate-300">
                    {lang === 'en' ? '2. Orbital Period (Dip Interval)' : '2. 公转周期 (对齐蓝线至各个低谷)'}
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-bold tabular-nums">
                    {userPeriod.toFixed(1)} {lang === 'en' ? 'Days' : '天'}
                  </span>
                </div>
                <input
                  type="range"
                  id="slider-period"
                  min="0.5"
                  max="30"
                  step="0.1"
                  value={userPeriod}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setUserPeriod(val);
                    sound.playBeep(300 + val * 20, 0.02);
                  }}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0.5d</span>
                  <span>
                    {lang === 'en' ? 'Est. Orbit: ' : '计算轨道半长轴: '}
                    <strong className="text-amber-300 tabular-nums">{calcOrbitDist.toFixed(3)} AU</strong>
                  </span>
                  <span>30d</span>
                </div>
              </div>
            </div>

            {/* Lock Signal Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {lang === 'en'
                    ? 'Adjust sliders until the progress bar reaches 80%+ to unlock discovery verification!'
                    : '微调滑块直至上方对齐进度条达到80%以上，即可锁定信号并评估宜居性！'}
                </span>
              </div>

              <button
                onClick={handleLockSignal}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-hud font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                  matchAccuracy >= 80
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-bounce'
                    : matchAccuracy >= 50
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {lang === 'en'
                    ? 'LOCK SIGNAL & EVALUATE HABITABILITY'
                    : '锁定信号 & 评估宜居性'}
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL 1: Discovery Confirmation Report */}
      {showReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="hud-panel hud-panel-active rounded-2xl max-w-xl w-full p-6 flex flex-col gap-5 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowReport(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 text-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-2xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-hud text-emerald-400 tracking-widest">
                  {lang === 'en' ? 'DISCOVERY CONFIRMED' : '系外行星发现已确认'}
                </span>
                <h2 className="text-xl font-hud font-bold text-slate-100">
                  {currentPlanet.name}
                </h2>
              </div>
            </div>

            {/* Planet Stats Grid */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">{lang === 'en' ? 'Planet Radius:' : '行星半径:'}</span>
                <span className="text-cyan-300 text-sm font-bold tabular-nums">
                  {currentPlanet.trueRadius} R⊕
                </span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">{lang === 'en' ? 'Orbital Period:' : '公转周期:'}</span>
                <span className="text-cyan-300 text-sm font-bold tabular-nums">
                  {currentPlanet.truePeriod} {lang === 'en' ? 'Days' : '天'}
                </span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">{lang === 'en' ? 'Semi-Major Axis:' : '轨道半长轴:'}</span>
                <span className="text-cyan-300 text-sm font-bold tabular-nums">
                  {currentPlanet.trueDistance} AU
                </span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">{lang === 'en' ? 'Est. Surface Temp:' : '预估表面温度:'}</span>
                <span className="text-cyan-300 text-sm font-bold tabular-nums">
                  {currentPlanet.temp} K ({currentPlanet.temp - 273}°C)
                </span>
              </div>
            </div>

            {/* Atmosphere Spectroscopy Result */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-hud text-xs text-amber-400">
                  {lang === 'en' ? 'JWST ATMOSPHERE SPECTRUM ANALYSIS' : 'JWST 大气吸收光谱分析结果'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    currentPlanet.habitable
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}
                >
                  {currentPlanet.habitable
                    ? (lang === 'en' ? 'POTENTIALLY HABITABLE' : '潜在宜居 / 位于生命带')
                    : (lang === 'en' ? 'UNHABITABLE' : '极端环境 / 不宜居')}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {lang === 'en' ? currentPlanet.desc : (currentPlanet.zhDesc || currentPlanet.desc)}
              </p>
              <div className="flex gap-2 pt-1 flex-wrap">
                {currentPlanet.gases.map((gas) => (
                  <span
                    key={gas}
                    className="text-[10px] px-2.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700"
                  >
                    {gas}
                  </span>
                ))}
              </div>
            </div>

            {/* Reward Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="text-xs text-slate-300">
                  {lang === 'en' ? 'Research Points Earned:' : '获得研究积分:'}{' '}
                  <span className="text-amber-400 font-hud font-bold text-sm tabular-nums">+500 RP</span>
                </span>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-hud font-bold text-xs transition shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                {lang === 'en' ? 'LOG DISCOVERY & CONTINUE' : '录入星表 & 继续探索'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Exoplanet Codex / Catalog */}
      {showCodex && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="hud-panel rounded-2xl max-w-2xl w-full p-6 flex flex-col gap-4 max-h-[85vh] relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCodex(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 text-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <BookOpen className="w-6 h-6 text-cyan-400" />
              <div>
                <h2 className="text-lg font-hud font-bold text-slate-100">
                  {lang === 'en' ? 'EXOPLANET CATALOG (CODEX)' : '系外行星编目数据库 (CODEX)'}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {lang === 'en'
                    ? 'Archive of discovered and analyzed deep space worlds'
                    : '已发现与待确认的深空未知外星世界档案库'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {STAR_SYSTEMS.map((sys) => {
                const isFound = discovered.has(sys.id);
                const p = sys.planet;
                return (
                  <div
                    key={sys.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isFound
                        ? 'border-emerald-500/40 bg-slate-900/80'
                        : 'border-slate-800/80 bg-slate-950/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start sm:items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 ${
                          isFound
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-900 text-slate-600 border border-slate-800'
                        }`}
                      >
                        {isFound ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-hud font-bold text-sm text-slate-200">
                            {isFound ? p.name : `${lang === 'en' ? 'Unknown World' : '未知行星'} (${sys.name})`}
                          </h4>
                          {isFound && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-sans mt-0.5">
                          {isFound
                            ? (lang === 'en' ? p.desc : (p.zhDesc || p.desc))
                            : (lang === 'en'
                                ? 'Pending atmospheric spectroscopy and photometric signal lock.'
                                : '等待光谱分析与测光信号锁定。')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-mono shrink-0">
                      <span
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          isFound
                            ? p.habitable
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isFound
                          ? p.habitable
                            ? (lang === 'en' ? 'Habitable Zone' : '位于宜居带')
                            : (lang === 'en' ? 'Extreme Environment' : '极端环境')
                          : (lang === 'en' ? 'Unobserved' : '未观测')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Astronomy Observation Guide */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="hud-panel rounded-2xl max-w-xl w-full p-6 flex flex-col gap-4 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 text-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <HelpCircle className="w-6 h-6 text-sky-400" />
              <h2 className="text-lg font-hud font-bold text-slate-100">
                {lang === 'en' ? 'ASTRONOMY OBSERVATION GUIDE' : '天文测光观测指南'}
              </h2>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed font-sans max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <h4 className="font-hud text-cyan-400 font-bold mb-1">
                  {lang === 'en' ? '1. What is the Transit Method?' : '1. 什么是“凌星测光法” (Transit Method)?'}
                </h4>
                <p>
                  {lang === 'en'
                    ? 'When an exoplanet passes directly between its host star and our telescope, it blocks a fraction of the stellar disk, producing a periodic dip in the observed light curve.'
                    : '当系外行星运行至母星与望远镜视线之间时，会遮挡母星的一小部分光芒，导致测光光变曲线出现周期性的亮度下凹。'}
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <h4 className="font-hud text-cyan-400 font-bold mb-1">
                  {lang === 'en' ? '2. Deriving Planetary Dimensions' : '2. 测算系外行星的物理参数'}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>
                    <strong className="text-slate-100">{lang === 'en' ? 'Planet Radius:' : '行星半径:'}</strong>{' '}
                    {lang === 'en'
                      ? 'The transit depth ΔF equals the cross-sectional area ratio: Rp ≈ R* × √(ΔF).'
                      : '光变曲线的降幅深度 ΔF 与面积比直接相关：Rp ≈ R* × √(ΔF)。'}
                  </li>
                  <li>
                    <strong className="text-slate-100">{lang === 'en' ? 'Orbital Distance:' : '公转周期与轨道半长轴:'}</strong>{' '}
                    {lang === 'en'
                      ? "The time interval between consecutive dips gives period P. Kepler's 3rd Law gives distance: a = ³√(M* × P²)."
                      : '连续两次凌星的时间间隔即为公转周期 P。根据开普勒第三定律可精确算出轨道半长轴：a = ³√(M* × P²)。'}
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <h4 className="font-hud text-cyan-400 font-bold mb-1">
                  {lang === 'en' ? '3. Infrared Wavelength Filtering' : '3. 为什么红外波段 (IR) 观测更清晰？'}
                </h4>
                <p>
                  {lang === 'en'
                    ? 'Stellar surface magnetic activity (spots and flares) produces high noise in visible and UV light. Using Infrared (JWST) isolates clean transit silhouettes.'
                    : '红矮星表面磁活动剧烈，可见光与紫外波段充斥着恒星耀斑杂波。切换到红外波段 (IR) 能大幅降低噪声，获取最纯净的行星剪影！'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

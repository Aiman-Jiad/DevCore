"use client";

import React, { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Gauge,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Terminal,
  Activity,
} from "lucide-react";

export function StepVisualizer() {
  const executionFrames = useWorkspaceStore((s) => s.executionFrames);
  const currentFrameIndex = useWorkspaceStore((s) => s.currentFrameIndex);
  const setCurrentFrameIndex = useWorkspaceStore((s) => s.setCurrentFrameIndex);
  const stepForward = useWorkspaceStore((s) => s.stepForward);
  const stepBackward = useWorkspaceStore((s) => s.stepBackward);
  const resetExecution = useWorkspaceStore((s) => s.resetExecution);
  const isPlaying = useWorkspaceStore((s) => s.isPlaying);
  const setIsPlaying = useWorkspaceStore((s) => s.setIsPlaying);
  const playbackSpeed = useWorkspaceStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useWorkspaceStore((s) => s.setPlaybackSpeed);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play timer loop
  useEffect(() => {
    if (isPlaying && executionFrames.length > 0) {
      timerRef.current = setInterval(() => {
        const { currentFrameIndex, executionFrames } = useWorkspaceStore.getState();
        if (currentFrameIndex < executionFrames.length - 1) {
          useWorkspaceStore.getState().stepForward();
        } else {
          useWorkspaceStore.getState().setIsPlaying(false);
        }
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, executionFrames.length]);

  const currentFrame = executionFrames[currentFrameIndex];
  const totalFrames = executionFrames.length;
  const progressPercent = totalFrames > 0 ? ((currentFrameIndex + 1) / totalFrames) * 100 : 0;

  if (totalFrames === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-zinc-950">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
          <Activity className="h-7 w-7 animate-pulse" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100">
          Interactive Algorithmic State Machine
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-zinc-400 leading-relaxed font-mono">
          Run a supported twoSum or binarySearch example to inspect deterministic execution frames and pointer transitions. Arbitrary code is not executed.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="cyan" className="font-mono text-[10px]">Step Engine Ready</Badge>
          <Badge variant="emerald" className="font-mono text-[10px]">Deterministic subset</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full bg-zinc-950 overflow-y-auto">
      {/* Top Playback Controls */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-2.5 backdrop-blur-md">
        {/* Frame Step Navigation */}
        <div className="flex items-center gap-1.5">
          <Button
            onClick={resetExecution}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="Reset to Step 1"
          >
            <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
          </Button>

          <Button
            onClick={stepBackward}
            disabled={currentFrameIndex === 0}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="Step Backward"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>

          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            variant={isPlaying ? "destructive" : "neon"}
            size="sm"
            className="h-8 px-3 text-xs font-mono font-semibold gap-1.5"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Play Auto</span>
              </>
            )}
          </Button>

          <Button
            onClick={stepForward}
            disabled={currentFrameIndex === totalFrames - 1}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="Step Forward"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Step Indicator & Speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-400">Step</span>
            <span className="font-bold text-cyan-400">{currentFrameIndex + 1}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{totalFrames}</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] bg-zinc-900 border border-zinc-800 rounded-md p-1">
            <Gauge className="h-3 w-3 text-zinc-400 ml-1" />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-transparent text-zinc-300 text-[10px] focus:outline-none cursor-pointer pr-1"
            >
              <option value={1500} className="bg-zinc-900">0.5x</option>
              <option value={900} className="bg-zinc-900">1.0x</option>
              <option value={400} className="bg-zinc-900">2.0x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-900 h-1">
        <div
          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-1 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Content Visualizer */}
      <div className="p-4 space-y-4">
        {/* Active Line & Micro Explanation Card */}
        <div className="rounded-xl border border-cyan-500/30 bg-zinc-900/60 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-zinc-200">
                Line {currentFrame?.activeLine || 1}
              </span>
            </div>
            <Badge variant="cyan" className="font-mono text-[10px] py-0">
              State Transition #{currentFrameIndex + 1}
            </Badge>
          </div>
          <p className="text-sm font-medium text-zinc-100 leading-relaxed">
            {currentFrame?.explanation || "Executing instruction..."}
          </p>
        </div>

        {/* Dynamic Data Structures Visualizer (e.g. Array Pointers / HashMaps) */}
        {currentFrame?.dataStructures && currentFrame.dataStructures.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                Data Structure Animation
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Array Heap & Pointers
              </span>
            </div>

            {currentFrame.dataStructures.map((ds, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-300 font-bold">
                    {ds.name} : {Array.isArray(ds.values) ? `Array[${ds.values.length}]` : ds.type}
                  </span>
                </div>

                {/* Array Block Visualization */}
                {Array.isArray(ds.values) && (
                  <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
                    {ds.values.map((val: any, i: number) => {
                      const isHighlighted = ds.highlightedIndices?.includes(i);
                      const matchingPointers = Object.entries(ds.pointers || {})
                        .filter(([_, ptrIdx]) => ptrIdx === i)
                        .map(([ptrName]) => ptrName);

                      return (
                        <div key={i} className="relative flex flex-col items-center">
                          {/* Pointer Tag Floating Above */}
                          {matchingPointers.length > 0 && (
                            <div className="absolute -top-7 flex items-center gap-1">
                              {matchingPointers.map((p) => (
                                <span
                                  key={p}
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase shadow-md ${
                                    p === "left" || p === "low"
                                      ? "bg-cyan-500 text-zinc-950"
                                      : p === "right" || p === "high"
                                      ? "bg-emerald-500 text-zinc-950"
                                      : "bg-purple-500 text-white"
                                  }`}
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Array Cell */}
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg border font-mono text-sm font-bold transition-all duration-200 ${
                              isHighlighted
                                ? "border-cyan-400 bg-cyan-950/80 text-cyan-300 ring-2 ring-cyan-400/50 scale-105 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                                : "border-zinc-800 bg-zinc-900 text-zinc-200"
                            }`}
                          >
                            {String(val)}
                          </div>

                          {/* Index Label Below */}
                          <span className="mt-1 font-mono text-[10px] text-zinc-400">
                            [{i}]
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live Variable Inspector Grid */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
            <span className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Stack Variables & Registers
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              Scope: Local Frame
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentFrame?.variables &&
              Object.entries(currentFrame.variables).map(([key, val]) => (
                <div
                  key={key}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5 font-mono"
                >
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    {key}
                  </div>
                  <div className="text-xs font-bold text-cyan-300 mt-0.5 truncate">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Call Stack Frame */}
        {currentFrame?.callStack && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-mono font-semibold text-zinc-300">
              <Terminal className="h-3.5 w-3.5 text-violet-400" />
              Call Stack Frame
            </div>
            <div className="space-y-1">
              {currentFrame.callStack.map((call, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded bg-zinc-950 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 border border-zinc-800"
                >
                  <ArrowRight className="h-3 w-3 text-cyan-400" />
                  <span>{call}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

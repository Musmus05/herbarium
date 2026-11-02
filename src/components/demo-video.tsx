"use client";

import { useEffect, useRef, useState } from "react";

/** Recorded by scripts/record-demo.mjs following docs/demo/SCENARIO.md. */
export const DEMO_VIDEO = { src: "/demo/herbarium-demo.mp4", poster: "/demo/herbarium-demo-poster.webp" };

/** Start time (seconds) of each chapter in the recording. */
export const DEMO_CHAPTERS = [0, 11, 19, 39, 44, 51, 56] as const;

/** Switch on once the recording is in public/demo (see docs/demo/SCENARIO.md). */
export const DEMO_READY = true;

/**
 * The walkthrough video on a herbarium sheet. Plays muted and looped while
 * on screen (paused when reduced motion is requested); the chapter list
 * follows playback and seeks on click.
 */
export function DemoVideo({ chapters, label }: { chapters: readonly string[]; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(prefersReduced);
    if (prefersReduced) return;
    // Play only while visible, so the page stays light.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? video.play().catch(() => {}) : video.pause()),
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function onTime() {
    const t = videoRef.current?.currentTime ?? 0;
    let index = 0;
    DEMO_CHAPTERS.forEach((start, i) => {
      if (t >= start) index = i;
    });
    setCurrent(index);
  }

  function seek(i: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = DEMO_CHAPTERS[i];
    void video.play().catch(() => {});
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
      <div className="border border-rule-strong bg-sheet-raised p-2.5 shadow-sheet sm:p-3.5" style={{ borderRadius: 2 }}>
        <video
          ref={videoRef}
          className="block aspect-[16/10] w-full bg-folder object-cover"
          src={DEMO_VIDEO.src}
          poster={DEMO_VIDEO.poster}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reduced}
          aria-label={label}
          onTimeUpdate={onTime}
        />
      </div>
      <ol className="grid gap-0 border-t border-rule sm:grid-cols-2 lg:grid-cols-1">
        {chapters.map((title, i) => (
          <li key={title} className="border-b border-rule">
            <button
              type="button"
              onClick={() => seek(i)}
              aria-current={current === i ? "step" : undefined}
              className={`flex w-full cursor-pointer items-baseline gap-3 py-2.5 text-left text-[0.9375rem] transition-colors duration-200 ${
                current === i ? "text-ink" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              <span className={`tnum font-serif text-sm ${current === i ? "text-action" : ""}`}>
                {String(Math.floor(DEMO_CHAPTERS[i] / 60))}:{String(DEMO_CHAPTERS[i] % 60).padStart(2, "0")}
              </span>
              <span className={current === i ? "font-semibold" : ""}>{title}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

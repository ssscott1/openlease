"use client";

import { useEffect, useState } from "react";

const HOLD_MS = 2000;
const ROLL_MS = 450;

/**
 * The hero's rotating word. All words are rendered invisibly in the same
 * grid cell so the container is always as wide as the longest word — zero
 * layout shift as words change. The visible layer rolls the current word
 * down and out while the next rolls down into place.
 *
 * Reduced motion: no interval, the first word stays put.
 * Screen readers: the parent <h1> carries an aria-label with the full
 * sentence; everything here is aria-hidden.
 */
export function RotatingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);

  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = setInterval(() => {
      setIndex((current) => {
        setLeaving(current);
        return (current + 1) % words.length;
      });
    }, HOLD_MS);
    return () => clearInterval(interval);
  }, [words.length]);

  useEffect(() => {
    if (leaving === null) return;
    const timer = setTimeout(() => setLeaving(null), ROLL_MS + 50);
    return () => clearTimeout(timer);
  }, [leaving, index]);

  return (
    <span aria-hidden className="inline-grid align-baseline text-accent">
      {/* Invisible sizers: reserve the width of the longest word. */}
      {words.map((word) => (
        <span key={word} className="invisible whitespace-nowrap [grid-area:1/1]">
          {word}
        </span>
      ))}
      <span className="relative overflow-hidden whitespace-nowrap [grid-area:1/1]">
        {leaving !== null && (
          <span
            key={`out-${leaving}`}
            className="absolute inset-0 underline decoration-accent/30 decoration-[0.06em] underline-offset-8"
            style={{ animation: `roll-out ${ROLL_MS}ms ease-in forwards` }}
          >
            {words[leaving]}
          </span>
        )}
        <span
          key={`in-${index}`}
          className="block underline decoration-accent/30 decoration-[0.06em] underline-offset-8"
          style={
            leaving !== null
              ? { animation: `roll-in ${ROLL_MS}ms ease-out both` }
              : undefined
          }
        >
          {words[index]}
        </span>
      </span>
    </span>
  );
}

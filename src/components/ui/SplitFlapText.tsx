"use client";

import { useEffect, useRef, useState } from "react";
import { playFlap } from "@/lib/board-sound";

/**
 * SplitFlapText
 *
 * Renders text with a mechanical split-flap board animation.
 * Each character "flips" through a random sequence of characters
 * before landing on the target, exactly like a railway departure board.
 *
 * Props:
 *  text        – the final string to display
 *  className   – optional CSS class on the outer span
 *  charWidth   – fixed width for each character cell (default "0.62em")
 *  speed       – flip duration in ms per character step (default 40)
 *  sound       – whether to play the board click sound (default true)
 */

const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .:/-";

type CharCellProps = {
  target: string;
  speed: number;
  charWidth: string;
  sound: boolean;
  delay: number;
};

function CharCell({ target, speed, charWidth, sound, delay }: CharCellProps) {
  const [displayed, setDisplayed] = useState(target);
  const prevTarget = useRef(target);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;

    // How many random frames to show before landing
    const frames = 5 + Math.floor(Math.random() * 4);
    let count = 0;

    const delayTimer = window.setTimeout(() => {
      if (sound) playFlap(1);

      timerRef.current = setInterval(() => {
        count++;
        if (count >= frames) {
          setDisplayed(target);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          const randomChar = CHARSET[Math.floor(Math.random() * CHARSET.length)];
          setDisplayed(randomChar ?? target);
          if (sound && count === 1) playFlap(1);
        }
      }, speed);
    }, delay);

    return () => {
      window.clearTimeout(delayTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [target, speed, sound, delay]);

  return (
    <span
      className="split-flap-char"
      aria-hidden="true"
      style={{ display: "inline-block", width: charWidth, textAlign: "center" }}
    >
      {displayed === " " ? "\u00a0" : displayed}
    </span>
  );
}

type SplitFlapTextProps = {
  text: string;
  className?: string;
  charWidth?: string;
  speed?: number;
  sound?: boolean;
  /** If true, the text is shown immediately without animation on first mount */
  skipInitialAnimation?: boolean;
};

export function SplitFlapText({
  text,
  className,
  charWidth = "0.62em",
  speed = 40,
  sound = true,
  skipInitialAnimation = true,
}: SplitFlapTextProps) {
  const upper = text.toUpperCase();
  const isFirstMount = useRef(true);

  // On first mount: don't animate (avoid distracting flips on page load)
  const [initialText, setInitialText] = useState(skipInitialAnimation ? upper : "");

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setInitialText(upper);
    }
  }, [upper]);

  return (
    <span className={className} aria-label={text} role="text">
      {upper.split("").map((char, index) => (
        <CharCell
          key={index}
          target={char}
          speed={speed}
          charWidth={charWidth}
          sound={sound && !isFirstMount.current}
          delay={index * 18}
        />
      ))}
      {/* Accessible hidden text for screen readers */}
      <span className="sr-only">{text}</span>
    </span>
  );
}

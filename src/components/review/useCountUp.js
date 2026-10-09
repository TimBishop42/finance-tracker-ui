import { useEffect, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";

/** True when the OS asks for reduced motion; read on first render (noSsr) so nothing animates first. */
export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)", { noSsr: true });

/**
 * Animates a number from 0 to `target` (ease-out) for the walkthrough's
 * headline figures. Jumps straight to the value when reduced motion is set.
 */
export default function useCountUp(target, duration = 1200) {
  const reduceMotion = useReducedMotion();
  const end = Number(target) || 0;
  const [value, setValue] = useState(reduceMotion ? end : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(end);
      return undefined;
    }
    let frame;
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const progress = Math.min(1, (t - start) / duration);
      setValue(end * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [end, duration, reduceMotion]);

  return value;
}

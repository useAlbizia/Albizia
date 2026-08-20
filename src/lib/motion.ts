import type { Variants, Transition } from "framer-motion";

// Motion language for ALBIZIA: everything gathers toward the center rather
// than sliding in from an edge — echoing the tree that closes its leaves
// inward to preserve itself. Keep every transition slow and deliberate;
// nothing here should feel abrupt.

export const EASE: Transition["ease"] = [0.16, 1, 0.3, 1];

export const converge: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, ease: EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.5, ease: EASE },
  },
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE },
  },
};

export const staggerChildren = (stagger = 0.12): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: 0.1 },
  },
});

export const fadeSlow: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.1, ease: EASE } },
};

// For the real logo artwork: it doesn't slide in, it comes into being —
// soft-focus and slightly adrift, settling into sharp stillness. This is
// the "forming" beat for the wordmark reveal (see video-prompts.md).
export const materialize: Variants = {
  hidden: { opacity: 0, scale: 1.06, y: 8, filter: "blur(14px)" },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.8, ease: EASE },
  },
};

/**
 * Zoom transition animation variants
 * Creates the "zoom in/out" effect for level transitions
 */

export const zoomVariants = {
  initial: (direction: 'in' | 'out' | null) => ({
    scale: direction === 'in' ? 0.8 : 1.2,
    opacity: 0,
    filter: 'blur(10px)',
  }),
  animate: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20,
      mass: 0.8,
    },
  },
  exit: (direction: 'in' | 'out' | null) => ({
    scale: direction === 'in' ? 1.2 : 0.8,
    opacity: 0,
    filter: 'blur(10px)',
    transition: {
      duration: 0.3,
    },
  }),
};

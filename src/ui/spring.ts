export const switchSpring = { type: 'spring' as const, stiffness: 420, damping: 28, mass: 0.72 }

export const switchPhysics = { stiffness: 420, damping: 28, mass: 0.72 }

export const viewSpring = {
  opacity: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  y: { type: 'spring' as const, stiffness: 340, damping: 18, mass: 0.8 },
  scaleX: { type: 'spring' as const, stiffness: 210, damping: 11, mass: 0.8 },
  scaleY: { type: 'spring' as const, stiffness: 210, damping: 11, mass: 0.8 },
}

import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'

type Tone = 'clear' | 'aegean' | 'gold' | 'dark'
type Size = 'md' | 'lg' | 'xl' | 'icon'

type Props = Omit<HTMLMotionProps<'button'>, 'children'> & { tone?: Tone; size?: Size; children?: ReactNode }

/** Pill-shaped liquid-glass button with a springy press. */
export const GlassButton = forwardRef<HTMLButtonElement, Props>(function GlassButton(
  { tone = 'clear', size = 'md', className = '', children, ...rest },
  ref,
) {
  const cls = ['gbtn', 'glass', tone !== 'clear' && `glass--${tone}`, size !== 'md' && `gbtn--${size}`, className]
    .filter(Boolean)
    .join(' ')
  return (
    <motion.button
      ref={ref}
      type="button"
      className={cls}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      {...rest}
    >
      {children}
    </motion.button>
  )
})

export const Icon = {
  plus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  minus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M5 12h14" />
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  back: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  arrow: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  bag: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  heart: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  ),
}

import { motion } from 'motion/react'
import { LogoEmblem } from '../ui/Logo'

/**
 * Shown only on the first load of the page: iPad needs one touch before any sound may play.
 * After that the logo intro (with its music) starts by itself, including after every waiter reset.
 */
export function Welcome({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.button
      type="button"
      className="screen welcome"
      onClick={onBegin}
      aria-label="Touch to begin"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <motion.span
        className="welcome__orb glass"
        animate={{ scale: [1, 1.05, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <LogoEmblem size={92} />
      </motion.span>
      <motion.span
        className="welcome__text"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        Touch to begin
      </motion.span>
    </motion.button>
  )
}

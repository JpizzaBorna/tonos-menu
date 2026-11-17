import { motion } from 'motion/react'
import { GlassButton } from '../ui/Glass'
import { LogoEmblem, LogoWord, wordSrc } from '../ui/Logo'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Opening with the real Tonos logo: the blue tuna emblem rolls in and settles,
 * the TONOS / GREEK RESTAURANT wordmark is unveiled left to right with a light sweep,
 * then the START button appears. Timed to the opening music (hit at ~1.1 s).
 */
export function Intro({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      className="screen intro"
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(14px)' }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <motion.div
        className="intro__emblem"
        initial={{ opacity: 0, scale: 0.4, rotate: -200, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.3, ease: EASE, delay: 0.15 }}
      >
        <motion.span
          className="intro__halo"
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0.45], scale: [0.6, 1.25, 1.1] }}
          transition={{ duration: 2.2, delay: 1.0 }}
        />
        <LogoEmblem size={190} />
      </motion.div>

      <motion.div
        className="intro__word"
        initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)', filter: 'blur(8px)' }}
        animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)', filter: 'blur(0px)' }}
        transition={{ delay: 1.1, duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
      >
        <span className="intro__word-inner">
          <LogoWord height={96} />
          {wordSrc() && (
            <motion.span
              className="intro__shine"
              aria-hidden
              style={{ WebkitMaskImage: `url(${wordSrc()})`, maskImage: `url(${wordSrc()})` }}
              initial={{ backgroundPosition: '-60% 0' }}
              animate={{ backgroundPosition: '160% 0' }}
              transition={{ delay: 2.6, duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 }}
            />
          )}
        </span>
      </motion.div>

      <motion.div
        className="intro__start-wrap"
        initial={{ opacity: 0, y: 40, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 3.0, type: 'spring', stiffness: 110, damping: 15 }}
      >
        <motion.span
          className="intro__pulse"
          aria-hidden
          animate={{ scale: [1, 1.3], opacity: [0.7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 3.6 }}
        />
        <GlassButton tone="aegean" size="xl" onClick={onStart}>
          START
        </GlassButton>
      </motion.div>
      <motion.p className="intro__hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6 }}>
        Tap to open the menu
      </motion.p>
    </motion.section>
  )
}

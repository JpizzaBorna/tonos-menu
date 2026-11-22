import { motion, useTransform } from 'motion/react'
import { menuScroll } from '../scrollBus'
import { asset, backgroundPhoto, decor } from '../data'

/*
 * The living world under the glass. Everything here moves so the glass above has something to bend and blur:
 * large drifting colour pools, sweeping light beams and slow Aegean waves.
 * Only transform/opacity are animated, so it stays smooth on iPad.
 */
const POOLS = [
  { c: '#1f4f86', w: 820, x: '-20%', y: '-28%', anim: 'pool1', d: 46 },
  { c: '#1d5a57', w: 700, x: '55%', y: '45%', anim: 'pool2', d: 52 },
  { c: '#5a4a2a', w: 520, x: '70%', y: '-22%', anim: 'pool3', d: 58 },
  { c: '#3b3478', w: 600, x: '-8%', y: '55%', anim: 'pool4', d: 64 },
]

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <SantoriniPhoto />
      {POOLS.map((b, i) => (
        // drifting colour pools: CSS animations (run off the main thread), soft edges come from the gradient itself
        <div
          key={i}
          className="backdrop__blob"
          style={{ background: `radial-gradient(circle closest-side, ${b.c}, transparent)`, width: b.w, height: b.w, left: b.x, top: b.y, animation: `${b.anim} ${b.d}s ease-in-out infinite` }}
        />
      ))}

      <Garnish />
    </div>
  )
}

/* Greek blue-hour backdrop (ChatGPT photo of Santorini), dimmed and softly blurred, drifting very slowly. */
const SCROLL_DRIVEN = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')

function SantoriniPhoto() {
  const src = backgroundPhoto('santorini-tall') ?? backgroundPhoto()
  // Parallax: the village moves at a constant 5% of the scroll distance (pixels, not % of the menu, so it never
  // leaps when the list grows), clamped to the extra height of the picture. Only a transform changes — smooth.
  const y = useTransform(menuScroll, (v) => -Math.min(v * 0.05, window.innerHeight * 0.6))
  if (!src) return null
  // Prefer the browser's scroll-driven animation (smooth, compositor); fall back to the JS value elsewhere.
  if (SCROLL_DRIVEN)
    return (
      <div className="backdrop__photo-wrap is-scroll-driven">
        <img className="backdrop__photo" src={asset(src)} alt="" />
      </div>
    )
  return (
    <motion.div className="backdrop__photo-wrap" style={{ y }}>
      <img className="backdrop__photo" src={asset(src)} alt="" />
    </motion.div>
  )
}

/* Two Greek pieces resting in opposite corners of the screen — different kinds, never the olive branch twice. */
const CORNERS: { slugs: string[]; style: React.CSSProperties; rot: number }[] = [
  { slugs: ['lemons-leaves', 'pomegranate', 'grapes-vine', 'rosemary-sprig'], style: { right: '-4%', bottom: '-5%', width: '24vw' }, rot: -150 },
]
function Garnish() {
  const d = decor()
  return (
    <>
      {CORNERS.map((c, i) => {
        const slug = c.slugs.find((s) => d[s])
        if (!slug) return null
        return (
          <img
            key={i}
            className="garnish"
            src={asset(d[slug])}
            alt=""
            style={{ ...c.style, ['--rot' as string]: `${c.rot}deg`, animationDuration: `${16 + i * 4}s` }}
          />
        )
      })}
    </>
  )
}

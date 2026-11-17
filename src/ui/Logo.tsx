import { motion, type HTMLMotionProps } from 'motion/react'
import { DATA, asset } from '../data'

/*
 * The real Tonos logo, recreated from the storefront sign:
 * a blue tuna ("tonos") in a Greek-key ring with waves, and the TONOS / GREEK RESTAURANT wordmark.
 * On the dark menu it is used like the sign: blue emblem + white wordmark.
 */
const L = DATA.logo ?? {}

/** Blue tuna emblem on a white medallion (Greek white-and-blue) so it stays crisp on the dark blue screens. */
export function LogoEmblem({ size = 120, ...rest }: { size?: number } & HTMLMotionProps<'img'>) {
  const src = (L as Record<string, string | undefined>).emblem_color
  if (!src) return null
  const pad = Math.round(size * 0.09)
  return (
    <span className="emblem-badge" style={{ width: size + pad * 2, height: size + pad * 2, padding: pad }}>
      <motion.img src={asset(src)} alt="" width={size} style={{ width: size, height: 'auto', display: 'block' }} draggable={false} {...rest} />
    </span>
  )
}

export function LogoWord({ height = 48, ...rest }: { height?: number } & HTMLMotionProps<'img'>) {
  const src = (L as Record<string, string | undefined>).word_white
  if (!src) return <span style={{ fontSize: height * 0.8, letterSpacing: '0.1em' }}>TONOS</span>
  return <motion.img src={asset(src)} alt="Tonos Greek Restaurant" style={{ height, width: 'auto', display: 'block' }} draggable={false} {...rest} />
}

export const wordSrc = () => {
  const src = (L as Record<string, string | undefined>).word_white
  return src ? asset(src) : undefined
}

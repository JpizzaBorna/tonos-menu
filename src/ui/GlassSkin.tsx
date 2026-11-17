import { asset } from '../data'

/**
 * Lays a ChatGPT-rendered glass panel over an element as a 9-slice "skin":
 * the rounded corners and rim keep their shape at any size, the see-through middle stretches.
 */
export function GlassSkin({ src, slice = '210', edge = 52, style }: { src: string; slice?: string; edge?: number; style?: React.CSSProperties }) {
  return (
    <span
      className="glass-skin"
      aria-hidden
      style={{
        borderStyle: 'solid',
        borderColor: 'transparent',
        borderWidth: edge,
        borderImageSource: `url(${asset(src)})`,
        borderImageSlice: `${slice} fill`,
        borderImageWidth: `${edge}px`,
        borderImageRepeat: 'stretch',
        ...style,
      }}
    />
  )
}

import { motion } from 'motion/react'
import { useOrder } from '../order'

/** The item's picture arcs from where it was tapped into the Order button, then the button bounces. */
export function FlyLayer() {
  const { flights, landed, cartRef } = useOrder()
  return (
    <>
      {flights.map((f) => {
        const to = cartRef.current?.getBoundingClientRect()
        const size = Math.min(f.from.width, f.from.height, 220)
        const sx = f.from.left + f.from.width / 2 - size / 2
        const sy = f.from.top + f.from.height / 2 - size / 2
        const tx = to ? to.left + to.width / 2 - size / 2 : window.innerWidth - 120
        const ty = to ? to.top + to.height / 2 - size / 2 : 20
        return (
          <motion.img
            key={f.key}
            className="fly"
            src={f.src}
            alt=""
            style={{ left: sx, top: sy, width: size, height: size }}
            initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            animate={{
              x: [0, (tx - sx) * 0.45, tx - sx],
              y: [0, Math.min(0, ty - sy) - 160, ty - sy],
              scale: [1, 0.7, 0.12],
              rotate: [0, 120, 300],
              opacity: [1, 1, 0.6],
            }}
            transition={{ duration: 0.85, ease: [0.45, 0, 0.2, 1] }}
            onAnimationComplete={() => landed(f.key)}
          />
        )
      })}
    </>
  )
}

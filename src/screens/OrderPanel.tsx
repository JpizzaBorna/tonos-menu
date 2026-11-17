import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { asset, findItem, listImage, money, menuById } from '../data'
import { useOrder } from '../order'
import { GlassButton, Icon } from '../ui/Glass'

/** Right-hand glass sheet with the guest's order. */
export function OrderPanel({ open, onClose, onWaiter, onReset }: { open: boolean; onClose: () => void; onWaiter: () => void; onReset: () => void }) {
  const { lines, total, count, setQty } = useOrder()
  const entries = Object.entries(lines)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="sv" className="sheet-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            key="sheet"
            className="sheet glass glass--dark"
            aria-label="Your order"
            initial={{ x: '110%', rotateY: -12 }}
            animate={{ x: 0, rotateY: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          >
            <div className="sheet__head">
              <h2 className="sheet__title">YOUR ORDER</h2>
              <GlassButton size="icon" aria-label="Close order" onClick={onClose}>
                {Icon.close}
              </GlassButton>
            </div>
            <div className="sheet__list">
              {entries.length === 0 && (
                <p className="sheet__empty">
                  Nothing here yet.
                  <br />
                  Tap <b>+</b> on any dish or drink to add it.
                </p>
              )}
              <AnimatePresence initial={false}>
                {entries.map(([id, q]) => {
                  const f = findItem(id)
                  if (!f) return null
                  const img = listImage(f.item)
                  return (
                    <motion.div
                      key={id}
                      layout
                      className="line"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 60, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                    >
                      {img ? <img className={img.cutout ? 'line__img' : 'line__img line__img--photo'} src={asset(img.src)} alt="" /> : <span />}
                      <div>
                        <div className="line__name">{f.item.name}</div>
                        <div className="line__price">{money(f.item.price.min * q)}</div>
                      </div>
                      <div className="stepper stepper--sm glass">
                        <GlassButton size="icon" aria-label={`One less ${f.item.name}`} onClick={() => setQty(id, q - 1)}>
                          {Icon.minus}
                        </GlassButton>
                        <span className="stepper__n">{q}</span>
                        <GlassButton size="icon" aria-label={`One more ${f.item.name}`} onClick={() => setQty(id, q + 1)}>
                          {Icon.plus}
                        </GlassButton>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
            <div className="sheet__foot">
              <div className="total">
                <span>
                  Total <small>{count} items</small>
                </span>
                <span>{money(total)}</span>
              </div>
              <GlassButton tone="gold" size="lg" disabled={!count} onClick={onWaiter}>
                Show to waiter
              </GlassButton>
              <HoldButton label="Hold to reset for next guest" onDone={onReset} />
              <p className="sheet__hint">Waiter: press and hold to clear the order and restart the menu.</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/** Full-screen, easy-to-read order for the waiter, with the hold-to-reset for the next guest. */
export function WaiterView({ open, onClose, onReset }: { open: boolean; onClose: () => void; onReset: () => void }) {
  const { lines, total, count } = useOrder()
  const [table, setTable] = useState('')
  const [time, setTime] = useState('')
  useEffect(() => {
    if (open) setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="waiter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="waiter__card glass glass--dark"
            role="dialog"
            aria-modal="true"
            aria-label="Order for the waiter"
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          >
            <div className="waiter__head">
              <div>
                <h2>ORDER</h2>
                <p>
                  {count} items · {time}
                </p>
              </div>
              <label className="waiter__table">
                Table
                <input inputMode="numeric" value={table} onChange={(e) => setTable(e.target.value.slice(0, 4))} placeholder="—" />
              </label>
            </div>
            <div className="waiter__list">
              {Object.entries(lines).map(([id, q]) => {
                const f = findItem(id)
                if (!f) return null
                return (
                  <div key={id} className="wline">
                    <span className="wline__q">{q}×</span>
                    <span>
                      {f.item.name}
                      <span className="wline__menu">{menuById(f.menu).title}</span>
                    </span>
                    <span>{money(f.item.price.min * q)}</span>
                  </div>
                )
              })}
              <div className="total" style={{ padding: 'var(--s-5) 0' }}>
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
            <div className="waiter__foot">
              <GlassButton size="lg" onClick={onClose}>
                {Icon.back} Back to menu
              </GlassButton>
              <HoldButton
                label="Hold to reset for next guest"
                onDone={() => {
                  setTable('')
                  onReset()
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Press and hold (1.4 s) so a guest can't wipe the order by accident. */
export function HoldButton({ label, onDone, ms = 1400 }: { label: string; onDone: () => void; ms?: number }) {
  const p = useMotionValue(0)
  const ctl = useRef<ReturnType<typeof animate> | null>(null)
  const start = () => {
    ctl.current?.stop()
    ctl.current = animate(p, 1, {
      duration: (ms / 1000) * (1 - p.get()),
      ease: 'linear',
      onComplete: () => {
        p.set(0)
        onDone()
      },
    })
  }
  const cancel = () => {
    ctl.current?.stop()
    ctl.current = animate(p, 0, { duration: 0.25 })
  }
  return (
    <motion.button
      type="button"
      className="gbtn gbtn--lg glass hold hold--danger"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      whileTap={{ scale: 0.96 }}
      aria-label={label}
    >
      <motion.span className="hold__fill" style={{ scaleX: p }} />
      ↺ {label}
    </motion.button>
  )
}

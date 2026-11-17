import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { asset, detailImage, listImage, money, priceText, type Img, type Item } from '../data'
import { useOrder } from '../order'
import { GlassButton, Icon } from '../ui/Glass'
import { LogoEmblem } from '../ui/Logo'

/**
 * Big pop-up for one item. Food opens on its top view, which spins away while the
 * dramatic side view rises into place ("the other angle"); guests can flip between the two.
 */
export function ItemModal({ item, onClose }: { item: Item | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="veil"
          key="veil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Card item={item} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Card({ item, onClose }: { item: Item; onClose: () => void }) {
  const { add, fly } = useOrder()
  const [qty, setQty] = useState(1)
  const top = item.images.top ?? null
  const other = detailImage(item)
  const hasTwo = !!(top && item.images.side)
  const [view, setView] = useState<'top' | 'side'>('top')
  const stageRef = useRef<HTMLDivElement>(null)

  // the turn: show the top view first, then swing to the other angle
  useEffect(() => {
    if (!hasTwo) return
    const t = setTimeout(() => setView('side'), 650)
    return () => clearTimeout(t)
  }, [hasTwo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown: Img = hasTwo ? (view === 'top' ? top : item.images.side!) : other
  const unit = item.price.min

  const addToOrder = () => {
    add(item.id, qty)
    const img = listImage(item) ?? shown
    fly(stageRef.current?.querySelector('img') ?? null, img ? asset(img.src) : undefined)
    onClose()
  }

  return (
    <motion.div
      className="modal glass glass--dark"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.86, y: 60, rotateX: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 30 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
    >
      <GlassButton size="icon" className="modal__close" aria-label="Close" onClick={onClose}>
        {Icon.close}
      </GlassButton>

      <div className="modal__stage" ref={stageRef}>
        <motion.div
          className="modal__stage-glow"
          animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        {!shown && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.85, scale: 1 }} transition={{ duration: 0.8 }}>
            <LogoEmblem size={200} style={{ width: 200, opacity: 0.85 }} />
          </motion.div>
        )}
        <AnimatePresence initial={false} mode="popLayout">
          {shown && (
            <motion.img
              key={shown.src}
              src={asset(shown.src)}
              alt={item.name}
              className={`modal__img${shown.cutout ? '' : ' modal__img--photo'}${!shown.cutout && view === 'side' && hasTwo ? ' modal__img--rect' : ''}`}
              initial={view === 'side' ? { opacity: 0, y: 120, scale: 0.7, rotateX: 40 } : { opacity: 0, scale: 0.6, rotate: -60 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, rotateX: 0 }}
              exit={view === 'side' ? { opacity: 0, scale: 0.5, rotate: 160, y: -40 } : { opacity: 0, y: 80, scale: 0.8, rotateX: 40 }}
              transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            />
          )}
        </AnimatePresence>
        {hasTwo && (
          <div className="modal__views glass" role="group" aria-label="Angle">
            {(['top', 'side'] as const).map((v) => (
              <button key={v} type="button" className="seg__btn" aria-pressed={view === v} onClick={() => setView(v)}>
                {view === v && <motion.span layoutId="view-pill" className="seg__pill glass glass--aegean" />}
                <span className="seg__label">{v === 'top' ? 'Top view' : 'Side view'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <motion.div
        className="modal__info"
        initial="hide"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
      >
        {item.mostLiked && (
          <motion.span variants={rise} className="badge" style={{ width: 'fit-content' }}>
            {Icon.heart} Guest favourite
          </motion.span>
        )}
        <motion.h2 variants={rise} className="modal__name">{item.name}</motion.h2>
        <motion.span variants={rise} className="rule" style={{ marginLeft: 0 }} />
        {item.description && <motion.p variants={rise} className="modal__desc">{item.description}</motion.p>}
        <motion.p variants={rise} className="price" style={{ fontSize: 'var(--fs-2xl)' }}>{priceText(item.price)}</motion.p>
        <motion.div variants={rise} className="stepper glass" aria-label="Quantity">
          <GlassButton size="icon" aria-label="One less" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
            {Icon.minus}
          </GlassButton>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={qty} className="stepper__n" initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }}>
              {qty}
            </motion.span>
          </AnimatePresence>
          <GlassButton size="icon" aria-label="One more" onClick={() => setQty((q) => Math.min(20, q + 1))}>
            {Icon.plus}
          </GlassButton>
        </motion.div>
        <motion.div variants={rise}>
          <GlassButton tone="gold" size="lg" onClick={addToOrder}>
            {Icon.bag} Add to order · {money(unit * qty)}
          </GlassButton>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const rise = { hide: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 160, damping: 20 } } } as const

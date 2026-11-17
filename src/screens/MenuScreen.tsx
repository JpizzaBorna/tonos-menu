import { useEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, animate, motion } from 'motion/react'
import { DATA, asset, assetDims, decor, glassSkin, listImage, menuById, priceText, type Item, type MenuId } from '../data'
import { useOrder } from '../order'
import { GlassButton, Icon } from '../ui/Glass'
import { LogoEmblem, LogoWord } from '../ui/Logo'
import { menuScroll } from '../scrollBus'

type Props = {
  menuId: MenuId
  onBack: () => void
  onSwitch: (id: MenuId) => void
  onOpenItem: (item: Item) => void
  onOpenOrder: () => void
  onWaiter: () => void
}

const SPRING = { type: 'spring', stiffness: 60, damping: 15 } as const
const CHROME_H = 176 // height of the floating glass header (top bar + categories)


export function MenuScreen({ menuId, onBack, onSwitch, onOpenItem, onOpenOrder, onWaiter }: Props) {
  const menu = menuById(menuId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(menu.categories[0]?.id)

  // reset scroll + active tab when the menu changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    animate(menuScroll, 0, { duration: 0.8, ease: [0.22, 1, 0.36, 1] })
    setActive(menu.categories[0]?.id)
  }, [menuId, menu.categories])

  // scroll-spy: the section crossing the upper middle of the screen is the active tab
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id.replace('sec-', ''))),
      { root, rootMargin: '-38% 0px -55% 0px' },
    )
    root.querySelectorAll('.section').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [menuId])

  const goTo = (id: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`#sec-${id}`)
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - CHROME_H + 8, behavior: 'smooth' })
  }

  return (
    <motion.section
      className="screen menu"
      initial={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chrome glass glass--bar">
      <TopBar menuId={menuId} onBack={onBack} onSwitch={onSwitch} onOpenOrder={onOpenOrder} onWaiter={onWaiter} />

      <nav className="cats" aria-label="Categories">
        {menu.categories.map((c) => (
          <button key={c.id} type="button" className="cat" aria-current={active === c.id} onClick={() => goTo(c.id)}>
            {active === c.id && (
              <motion.span layoutId="cat-pill" className="cat__pill glass glass--clear" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
            )}
            {c.name}
          </button>
        ))}
      </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={menuId}
          ref={scrollRef}
          onScroll={(e) => menuScroll.set(e.currentTarget.scrollTop)}
          className="scroll"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4 }}
        >
          {menu.note && <p className="menu-note glass">{menu.note}</p>}
          {menu.categories.map((c, ci) => (
            <section key={c.id} id={`sec-${c.id}`} className="section">
              <SectionHead title={c.name} index={ci} kicker={KICKER[menuId]} root={scrollRef} />
              {menuId === 'food' ? (
                <div className="dishes">
                  {c.items.map((it, i) => (
                    <FoodTile key={it.id} item={it} index={i} onOpen={onOpenItem} />
                  ))}
                </div>
              ) : (
                <div className={`grid grid--${menuId}`}>
                  {c.items.map((it) => (
                    <DrinkCard key={it.id} item={it} onOpen={onOpenItem} />
                  ))}
                </div>
              )}
            </section>
          ))}
          {menu.tips && (
            <section id="sec-tips" className="section">
              <SectionHead title="Hookah Tips" index={menu.categories.length} kicker={KICKER[menuId]} root={scrollRef} />
              <div className="tips">
                {menu.tips.map((t, i) => (
                  <motion.div
                    key={t.title}
                    className="tip glass"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ root: scrollRef, amount: 0.4 }}
                    transition={{ ...SPRING, delay: (i % 2) * 0.1 }}
                  >
                    <h3>{t.title}</h3>
                    <p>{t.text}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
          <p className="menu-end">TONOS · GREEK RESTAURANT</p>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  )
}

function TopBar({ menuId, onBack, onSwitch, onOpenOrder, onWaiter }: Omit<Props, 'onOpenItem'>) {
  // hidden waiter shortcut: press and hold the logo for 2 s to open the waiter view (order + reset)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startHold = () => {
    holdTimer.current = setTimeout(onWaiter, 2000)
  }
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }
  const { count, bump, cartRef } = useOrder()
  return (
    <header className="topbar">
      <div className="topbar__left">
        <GlassButton size="icon" aria-label="Back to menus" onClick={onBack}>
          {Icon.back}
        </GlassButton>
        <span className="topbar__logo" onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold} onContextMenu={(e) => e.preventDefault()}><LogoEmblem size={56} /><LogoWord height={30} /></span>
      </div>
      <div className="seg glass glass--clear" role="group" aria-label="Menus">
        {DATA.menus.map((m) => (
          <button key={m.id} type="button" className="seg__btn" aria-pressed={m.id === menuId} onClick={() => onSwitch(m.id)}>
            {m.id === menuId && (
              <motion.span layoutId="seg-pill" className="seg__pill glass glass--aegean" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
            )}
            <span className="seg__label">{m.title.replace(' Menu', '').toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="topbar__right">
        <motion.div key={bump} animate={bump ? { scale: [1, 1.25, 0.92, 1], rotate: [0, -8, 6, 0] } : undefined} transition={{ duration: 0.5 }}>
          <GlassButton ref={cartRef} tone={count ? 'gold' : 'clear'} className="cart-btn" onClick={onOpenOrder} aria-label={`Your order, ${count} items`}>
            {Icon.bag} Order
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  className="cart-btn__badge"
                  initial={{ scale: 0, y: 6 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </GlassButton>
        </motion.div>
      </div>
    </header>
  )
}

const KICKER: Record<MenuId, string> = { food: 'Tonos Kitchen', bar: 'Tonos Bar', shisha: 'Tonos Lounge' }

/** Section title: small spaced label, big handwritten gold script that "writes" itself in, olive-leaf rule. */
function SectionHead({ title, index, kicker, root }: { title: string; index: number; kicker: string; root: RefObject<HTMLDivElement | null> }) {
  // the whole header is the in-view trigger (an element hidden by its own clip-path never counts as "in view")
  return (
    <motion.div className="section__head" initial="hide" whileInView="show" viewport={{ root, amount: 0.5 }}>
      <motion.p
        className="section__kicker"
        variants={{ hide: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
      >
        <span className="section__num">{String(index + 1).padStart(2, '0')}</span>
        <span className="section__kick-text">{kicker}</span>
      </motion.p>
      <motion.h2
        className="section__title"
        variants={{
          hide: { opacity: 0, clipPath: 'inset(0% 100% 0% 0%)', y: 12 },
          show: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', y: 0, transition: { duration: 1.5, delay: 0.15, ease: [0.65, 0, 0.35, 1] } },
        }}
      >
        {title}
      </motion.h2>
      <motion.svg
        className="section__orn"
        viewBox="0 0 220 24"
        fill="none"
        aria-hidden
        variants={{ hide: { opacity: 0, scaleX: 0.3 }, show: { opacity: 1, scaleX: 1, transition: { delay: 0.7, duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }}
      >
        <path d="M0 12 H86" stroke="url(#orn)" strokeWidth="1.2" />
        <path d="M134 12 H220" stroke="url(#orn2)" strokeWidth="1.2" />
        <path d="M110 4 C 102 8, 100 14, 110 20 C 120 14, 118 8, 110 4 Z" fill="#d9b779" opacity=".9" />
        <path d="M96 12 C 100 8, 104 8, 106 12 C 104 16, 100 16, 96 12 Z" fill="#d9b779" opacity=".6" />
        <path d="M124 12 C 120 8, 116 8, 114 12 C 116 16, 120 16, 124 12 Z" fill="#d9b779" opacity=".6" />
        <defs>
          <linearGradient id="orn" x1="0" x2="1"><stop stopColor="#d9b779" stopOpacity="0" /><stop offset="1" stopColor="#d9b779" /></linearGradient>
          <linearGradient id="orn2" x1="0" x2="1"><stop stopColor="#d9b779" /><stop offset="1" stopColor="#d9b779" stopOpacity="0" /></linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  )
}

/* Greek / organic garnish (ChatGPT cut-outs) beside some plates — each one different in kind, size, angle,
   side and mirroring, never the same piece twice in a row. Drifts in with the plate, rustles when touched. */
const GARNISH = [
  'greek-bowl-olives', 'lemons-leaves', 'greek-tile', 'pomegranate', 'olive-branch', 'feta-plate', 'grapes-vine',
  'basil-sprig', 'amphora', 'tomato-vine', 'greek-bowl-salt', 'rosemary-sprig', 'fig-halves', 'oregano-bunch',
  'lemon-olives', 'mint-leaves', 'oil-bowl', 'thyme-sprig', 'herb-scatter',
]
const SPOTS = [
  { left: '-10%', top: '-2%' }, { right: '-9%', bottom: '24%' }, { left: '-8%', bottom: '26%' }, { right: '-10%', top: '0%' },
]
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}
let garnishSeq = 0
const garnishOf = new Map<string, number>()
function Garnish({ id }: { id: string }) {
  const d = decor()
  const list = GARNISH.filter((g) => d[g])
  const wrapRef = useRef<HTMLDivElement>(null)
  if (!list.length) return null
  if (!garnishOf.has(id)) garnishOf.set(id, garnishSeq++)
  const slug = list[garnishOf.get(id)! % list.length]
  const spot = SPOTS[Math.floor(hash(id + 's') * SPOTS.length)]
  const scale = 0.55 + hash(id + 'z') * 0.35
  const rot = (hash(id + 'r') - 0.5) * 80
  const flip = hash(id + 'f') > 0.5 ? -1 : 1
  return (
    // drift (50% scroll speed) and reveal are CSS scroll-driven animations on the outer layers — they run on the
    // iPad's scrolling engine, so they never lag; Motion only handles the sway when touched.
    <div ref={wrapRef} className="garnish-wrap drift" style={{ ...spot, width: `calc(clamp(140px, 17vw, 220px) * ${scale.toFixed(2)})` }}>
      <div className="surface">
        <motion.img
          className="garnish-item"
          src={asset(d[slug])}
          alt=""
          draggable={false}
          style={{ scaleX: flip, rotate: rot }}
          whileHover={{ rotate: [rot, rot - 7, rot + 5, rot - 2, rot], scale: 1.08, transition: { duration: 0.9 } }}
          whileTap={{ rotate: [rot, rot - 10, rot + 7, rot - 3, rot], scale: 1.12, transition: { duration: 0.8 } }}
        />
      </div>
    </div>
  )
}

/** Clear-glass pill: price on the left, glass "+" segment on the right. Tapping adds one; the picture flies into the Order button. */
function PriceAdd({ item, from, small = false }: { item: Item; from: RefObject<HTMLElement | null>; small?: boolean }) {
  const { add, fly } = useOrder()
  const img = listImage(item)
  // ChatGPT liquid-glass pill (made from the user's glass sample): price on the left, the glass "+" is in the picture
  const skin = glassSkin('price-pill')
  const dims = assetDims('price-pill')
  if (skin && dims) {
    // 9-slice: rounded left end and the glass "+" segment keep their shape; only the middle stretches to fit the price
    const [iw, ih] = dims
    const h = small ? 38 : 42
    const k = h / ih
    const capL = Math.round(ih / 2)
    const capR = Math.round(iw * 0.215)
    return (
      <motion.button
        type="button"
        className="pricepill"
        style={{
          height: h,
          borderStyle: 'solid',
          borderColor: 'transparent',
          borderWidth: `${h / 2}px ${Math.round(capR * k)}px ${h / 2}px ${Math.round(capL * k)}px`,
          borderImage: `url(${asset(skin)}) ${capL} ${capR} ${capL} ${capL} fill / ${h / 2}px ${Math.round(capR * k)}px ${h / 2}px ${Math.round(capL * k)}px stretch`,
        }}
        aria-label={`Add ${item.name}, ${priceText(item.price)}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
        onClick={(e) => {
          e.stopPropagation()
          add(item.id)
          fly(from.current, img ? asset(img.src) : undefined)
        }}
      >
        <span className="pricepill__price">{priceText(item.price)}</span>
      </motion.button>
    )
  }
  return (
    <motion.button
      type="button"
      className={`priceadd glass glass--clear${small ? ' priceadd--sm' : ''}`}
      aria-label={`Add ${item.name}, ${priceText(item.price)}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      onClick={(e) => {
        e.stopPropagation()
        add(item.id)
        fly(from.current, img ? asset(img.src) : undefined)
      }}
    >
      <motion.span
        className="priceadd__shine"
        aria-hidden
        initial={{ x: '-120%' }}
        animate={{ x: '320%' }}
        transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 + (item.id.length % 5), delay: item.id.length % 4 }}
      />
      <span className="priceadd__price">{priceText(item.price)}</span>
      <span className="priceadd__plus" aria-hidden>
        {Icon.plus}
      </span>
    </motion.button>
  )
}

/** One dish: big plate, then name and price underneath. Surfaces out of a glassy blur as it scrolls in. */
function FoodTile({ item, index, onOpen }: { item: Item; index: number; onOpen: (i: Item) => void }) {
  const img = listImage(item)
  const plateRef = useRef<HTMLButtonElement>(null)
  return (
    <article className="dish">
      <div className="dish__inner surface">
      {index % 4 === 2 && <Garnish id={item.id} />}
      <motion.button
        ref={plateRef}
        type="button"
        className="plate"
        aria-label={`See ${item.name}`}
        onClick={() => onOpen(item)}
        whileTap={{ scale: 0.96 }}
      >
        {/* water ripple: two soft rings spread out from the plate each time the dish comes into view */}
        {[0, 0.45].map((delay) => (
          <motion.span
            key={delay}
            className="plate__ripple"
            aria-hidden
            initial={{ scale: 0.7, opacity: 0 }}
            whileInView={{ scale: [0.7, 1.14], opacity: [0, 0.55, 0] }}
            viewport={{ amount: 0.35 }}
            transition={{ duration: 1.7, ease: 'easeOut', delay: 0.15 + delay }}
          />
        ))}
        {img && <img className={img.cutout ? 'plate__cut' : 'plate__photo'} src={asset(img.src)} alt="" loading="lazy" decoding="async" />}
      </motion.button>
      <div className="dish__text">
        {item.mostLiked && <span className="badge">{Icon.heart} Guest favourite</span>}
        <button type="button" className="dish__name" onClick={() => onOpen(item)}>
          {item.name}
        </button>
        <span className="rule" />
        <div className="dish__foot">
          <PriceAdd item={item} from={plateRef} />
        </div>
      </div>
      </div>
    </article>
  )
}

function DrinkCard({ item, onOpen }: { item: Item; onOpen: (i: Item) => void }) {
  const img = listImage(item)
  const imgRef = useRef<HTMLDivElement>(null)
  return (
    <motion.article className="card surface" whileTap={{ scale: 0.97 }}>
      <button type="button" className="card__open" onClick={() => onOpen(item)} aria-label={`See ${item.name}`}>
        <div ref={imgRef} className="card__img">
          {img && <img className={img.cutout ? '' : 'card__photo'} src={asset(img.src)} alt="" loading="lazy" decoding="async" />}
        </div>
        {item.mostLiked && <span className="badge">{Icon.heart} Guest favourite</span>}
        <h3 className="card__name">{item.name}</h3>
      </button>
      <div className="card__foot">
        <PriceAdd item={item} from={imgRef} small />
      </div>
    </motion.article>
  )
}

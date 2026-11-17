import { motion } from 'motion/react'
import { DATA, asset, glassSkin, heroFor, type Menu, type MenuId } from '../data'
import { GlassSkin } from '../ui/GlassSkin'
import { LogoEmblem, LogoWord } from '../ui/Logo'
import { Icon } from '../ui/Glass'

export const TINT: Record<MenuId, string> = {
  food: 'radial-gradient(circle, rgba(217,183,121,.9), rgba(228,138,100,.4) 60%, transparent)',
  bar: 'radial-gradient(circle, rgba(90,162,230,.9), rgba(69,179,168,.45) 60%, transparent)',
  shisha: 'radial-gradient(circle, rgba(139,123,242,.9), rgba(228,138,168,.45) 60%, transparent)',
}

/** Iridescent glass colours per menu card (fill gradient + light cast underneath). */
const CARD_TINT: Record<MenuId, Record<string, string>> = {
  food: { '--g1': 'rgba(255,196,150,.42)', '--g2': 'rgba(240,150,175,.30)', '--g3': 'rgba(255,214,140,.38)', '--glow1': 'rgba(255,150,120,.6)', '--glow2': 'rgba(255,210,120,.5)' },
  bar: { '--g1': 'rgba(120,220,232,.40)', '--g2': 'rgba(120,160,255,.30)', '--g3': 'rgba(170,150,255,.36)', '--glow1': 'rgba(90,200,232,.6)', '--glow2': 'rgba(140,130,255,.5)' },
  shisha: { '--g1': 'rgba(255,180,200,.40)', '--g2': 'rgba(190,150,255,.34)', '--g3': 'rgba(110,225,215,.40)', '--glow1': 'rgba(220,130,255,.55)', '--glow2': 'rgba(90,220,200,.5)' },
}

const count = (m: Menu) => m.categories.reduce((n, c) => n + c.items.length, 0)

/** The visual of one menu card. */
function CardFace({ menu }: { menu: Menu }) {
  const hero = heroFor(menu.id)
  const float = { y: [0, -10, 0], rotate: menu.id === 'food' ? [0, 4, 0] : [0, -2, 0] }
  return (
    <div className="face">
      <div className="face__glow" style={{ background: TINT[menu.id] }} />
      <div className="face__stage">
        {hero && (
          <motion.img
            className={hero.cutout ? 'face__img' : 'face__img face__img--photo'}
            src={asset(hero.src)}
            alt=""
            animate={float}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
      <div className="face__body">
        <h2 className="face__title">{menu.title.replace(' Menu', '')}</h2>
        <p className="face__sub">{menu.subtitle}</p>
        <span className="face__go glass">
          {count(menu)} items {Icon.arrow}
        </span>
      </div>
    </div>
  )
}

type PickProps = { onPick: (id: MenuId) => void }

export function Picker({ onPick }: PickProps) {
  return (
    <motion.section
      className="screen picker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(10px)', transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}
    >
      <motion.header className="picker__head" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h1 className="picker__logo"><LogoEmblem size={52} /><LogoWord height={40} /></h1>
        <p>Choose your menu</p>
      </motion.header>
      <div className="picker__cards">
        {DATA.menus.map((m, i) => (
          <PickCard key={m.id} menu={m} index={i} onPick={onPick} />
        ))}
      </div>
      <motion.p className="picker__foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        Boulevard Plaza · Downtown Dubai
      </motion.p>
    </motion.section>
  )
}

function PickCard({ menu, index, onPick }: { menu: Menu; index: number; onPick: PickProps['onPick'] }) {
  // realistic clear glass panel from ChatGPT (neutral, no colour tint) — same glass on all three cards
  const skin = glassSkin('real-cut') ?? glassSkin('real-card') ?? glassSkin('card-crystal') ?? glassSkin('card-clear')
  const skinStyle = undefined
  return (
    <motion.button
      type="button"
      className={skin ? 'pick pick--skinned' : 'pick glass glass--card'}
      style={CARD_TINT[menu.id] as React.CSSProperties}
      aria-label={`Open ${menu.title}`}
      initial={{ opacity: 0, y: 120, rotateX: 35, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ delay: 0.25 + index * 0.14, type: 'spring', stiffness: 70, damping: 15 }}
      whileHover={{ y: -8, rotateX: 4 }}
      whileTap={{ scale: 0.96, rotateX: 6 }}
      onClick={() => onPick(menu.id)}
    >
      {skin && <GlassSkin src={skin} style={skinStyle} slice="220" edge={54} />}
      <CardFace menu={menu} />
    </motion.button>
  )
}

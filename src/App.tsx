import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { type Item, type MenuId } from './data'
import { OrderProvider, useOrder } from './order'
import { Backdrop } from './ui/Backdrop'
import { Intro } from './screens/Intro'
import { Picker } from './screens/Picker'
import { MenuScreen } from './screens/MenuScreen'
import { ItemModal } from './screens/ItemModal'
import { OrderPanel, WaiterView } from './screens/OrderPanel'
import { FlyLayer } from './fx/FlyLayer'
import { audioUnlocked, playIntroMusic, unlockAudio } from './fx/introSound'
import { Welcome } from './screens/Welcome'
import { OfflineStatus } from './ui/OfflineStatus'
import { isLite, probeFrameRate, subscribeLite } from './perf'

type Screen = { name: 'welcome' } | { name: 'intro' } | { name: 'picker' } | { name: 'menu'; id: MenuId }

function Tablet() {
  const { reset } = useOrder()
  // tonos.website/#food (or #bar, #shisha) opens straight on that menu — handy for staff and screenshots
  const [screen, setScreen] = useState<Screen>(() => {
    const h = location.hash.slice(1)
    return h === 'food' || h === 'bar' || h === 'shisha' ? { name: 'menu', id: h } : { name: 'welcome' }
  })
  const [item, setItem] = useState<Item | null>(null)
  const [orderOpen, setOrderOpen] = useState(false)
  const [waiterOpen, setWaiterOpen] = useState(false)

  const pick = (id: MenuId) => setScreen({ name: 'menu', id })

  // the logo intro always comes with its music (once audio has been unlocked by a first touch)
  useEffect(() => {
    if (screen.name === 'intro' && audioUnlocked()) playIntroMusic()
  }, [screen.name])
  const closeItem = useCallback(() => setItem(null), [])

  const resetForNextGuest = () => {
    // a newer menu was published in the admin panel: reload now (instant, everything is saved on the device)
    if ((window as Window & { tonosMenuUpdated?: boolean }).tonosMenuUpdated) {
      try { localStorage.removeItem('tonos-order-v1') } catch { /* ignore */ }
      return location.reload()
    }
    reset()
    setWaiterOpen(false)
    setOrderOpen(false)
    setItem(null)
    setScreen({ name: 'intro' })
  }

  return (
    <div className="app">
      <Backdrop />
      <AnimatePresence>
        {screen.name === 'welcome' && (
          <Welcome
            key="welcome"
            onBegin={() => {
              unlockAudio()
              setScreen({ name: 'intro' })
            }}
          />
        )}
        {screen.name === 'intro' && <Intro key="intro" onStart={() => setScreen({ name: 'picker' })} />}
        {screen.name === 'picker' && <Picker key="picker" onPick={pick} />}
        {screen.name === 'menu' && (
          <MenuScreen
            key="menu"
            menuId={screen.id}
            onBack={() => setScreen({ name: 'picker' })}
            onSwitch={(id) => setScreen({ name: 'menu', id })}
            onOpenItem={setItem}
            onOpenOrder={() => setOrderOpen(true)}
            onWaiter={() => setWaiterOpen(true)}
          />
        )}
      </AnimatePresence>

      <ItemModal item={item} onClose={closeItem} />
      <OrderPanel open={orderOpen} onClose={() => setOrderOpen(false)} onWaiter={() => setWaiterOpen(true)} onReset={resetForNextGuest} />
      <WaiterView open={waiterOpen} onClose={() => setWaiterOpen(false)} onReset={resetForNextGuest} />
      <FlyLayer />
      <OfflineStatus />
    </div>
  )
}

export default function App() {
  // old / slow device: Motion keeps fades only (no blur, scale or slide effects)
  const lite = useSyncExternalStore(subscribeLite, isLite)
  useEffect(() => probeFrameRate(), [])
  return (
    <MotionConfig reducedMotion={lite ? 'always' : 'user'}>
      <OrderProvider>
        <Tablet />
      </OrderProvider>
    </MotionConfig>
  )
}

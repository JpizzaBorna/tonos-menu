import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { findItem } from './data'

/* Guest order, kept on the tablet only. Survives an accidental reload; the waiter clears it with "Reset". */
type Lines = Record<string, number>
type Flight = { key: number; src: string; from: DOMRect }

type OrderCtx = {
  lines: Lines
  count: number
  total: number
  add: (id: string, qty?: number) => void
  setQty: (id: string, qty: number) => void
  reset: () => void
  cartRef: RefObject<HTMLButtonElement | null>
  bump: number
  flights: Flight[]
  fly: (from: Element | null, src: string | undefined) => void
  landed: (key: number) => void
}

const KEY = 'tonos-order-v1'
const Ctx = createContext<OrderCtx | null>(null)

function load(): Lines {
  try {
    const v = localStorage.getItem(KEY)
    return v ? (JSON.parse(v) as Lines) : {}
  } catch {
    return {}
  }
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Lines>(load)
  const [bump, setBump] = useState(0)
  const [flights, setFlights] = useState<Flight[]>([])
  const cartRef = useRef<HTMLButtonElement | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines))
    } catch {
      /* storage blocked: order still works for this session */
    }
  }, [lines])

  const add = useCallback((id: string, qty = 1) => {
    setLines((l) => ({ ...l, [id]: (l[id] ?? 0) + qty }))
  }, [])
  const setQty = useCallback((id: string, qty: number) => {
    setLines((l) => {
      const n = { ...l }
      if (qty <= 0) delete n[id]
      else n[id] = qty
      return n
    })
  }, [])
  const reset = useCallback(() => setLines({}), [])

  const fly = useCallback((from: Element | null, src: string | undefined) => {
    if (!from || !src) {
      setBump((b) => b + 1)
      return
    }
    setFlights((f) => [...f, { key: ++seq.current, src, from: from.getBoundingClientRect() }])
  }, [])
  const landed = useCallback((key: number) => {
    setFlights((f) => f.filter((x) => x.key !== key))
    setBump((b) => b + 1)
  }, [])

  const { count, total } = useMemo(() => {
    let count = 0
    let total = 0
    for (const [id, q] of Object.entries(lines)) {
      const f = findItem(id)
      if (!f) continue
      count += q
      total += q * f.item.price.min
    }
    return { count, total }
  }, [lines])

  const value = useMemo(
    () => ({ lines, count, total, add, setQty, reset, cartRef, bump, flights, fly, landed }),
    [lines, count, total, add, setQty, reset, bump, flights, fly, landed],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useOrder() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useOrder outside OrderProvider')
  return c
}

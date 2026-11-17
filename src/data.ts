import raw from './data/menu.json'

export type Img = { src: string; cutout: boolean } | null
export type Price = { min: number; max: number; label: string }
export type Item = {
  id: string
  name: string
  description: string
  price: Price
  images: { top?: Img; side?: Img; main?: Img }
  mostLiked?: boolean
  /** set in the admin panel: kept in the menu data but not shown to guests */
  hidden?: boolean
}
export type Category = { id: string; name: string; items: Item[] }
export type MenuId = 'food' | 'bar' | 'shisha'
export type Menu = {
  id: MenuId
  title: string
  subtitle: string
  categories: Category[]
  note?: string
  tips?: { title: string; text: string }[]
}
export type MenuData = {
  currency: string
  menus: Menu[]
  logo?: { white?: string; color?: string }
  ui?: { glass: Record<string, string>; deco: Record<string, string>; bg?: Record<string, string>; dims?: Record<string, [number, number]> }
}

/** Menu built into the app (always works, even on the very first offline start). */
export const DATA = raw as unknown as MenuData
export let CURRENCY = DATA.currency

export const menuById = (id: MenuId) => DATA.menus.find((m) => m.id === id)!

const ITEMS = new Map<string, { item: Item; menu: MenuId }>()
function indexItems() {
  ITEMS.clear()
  DATA.menus.forEach((m) => m.categories.forEach((c) => c.items.forEach((i) => ITEMS.set(i.id, { item: i, menu: m.id }))))
}
indexItems()
export const findItem = (id: string) => ITEMS.get(id)

/**
 * Use the menu published from the admin panel instead of the built-in one (called once, before the app draws).
 * Hidden dishes and empty categories are left out; logo / glass / decoration assets stay from the app build.
 */
export function applyLiveMenu(live: unknown) {
  const d = live as Partial<MenuData> | null
  if (!d || !Array.isArray(d.menus) || !d.menus.length) return false
  DATA.menus = d.menus.map((m) => ({
    ...m,
    categories: (m.categories ?? [])
      .map((c) => ({ ...c, items: (c.items ?? []).filter((i) => !i.hidden) }))
      .filter((c) => c.items.length),
  }))
  if (d.currency) CURRENCY = DATA.currency = d.currency
  indexItems()
  return true
}

/** Every photo URL in the menu (used to save newly uploaded photos for offline use). */
export const allPhotoUrls = () =>
  DATA.menus.flatMap((m) =>
    m.categories.flatMap((c) => c.items.flatMap((i) => [i.images.top, i.images.side, i.images.main].filter(Boolean).map((im) => asset(im!.src)))),
  )

/** Asset URL: built-in photos live in media/…, photos uploaded in the admin panel are full https URLs. */
export const asset = (p: string) => (/^https?:\/\//.test(p) ? p : import.meta.env.BASE_URL + p)

/** Main picture of an item for lists: food = top view, drinks/shisha = their one view. */
export const listImage = (i: Item): Img => i.images.top ?? i.images.main ?? null
/** The "other angle" shown big in the item pop-up. */
export const detailImage = (i: Item): Img => i.images.side ?? i.images.main ?? i.images.top ?? null

export const money = (n: number) => `${CURRENCY} ${Number.isInteger(n) ? n : n.toFixed(2)}`
export const priceText = (p: Price) => (p.min === p.max ? money(p.min) : `${CURRENCY} ${p.label}`)

/** Hero picture for each menu on the picker screen. */
export function heroFor(id: MenuId): Img {
  const pick: Record<MenuId, string[]> = {
    food: ['food-classic-greek-salad', 'food-vineyard-fig-couscous-salad'],
    bar: ['bar-blue-lagoon', 'bar-iced-matcha', 'bar-spanish-latte'],
    shisha: ['shisha-mykonos-breeze-light', 'shisha-lemon-mint'],
  }
  for (const key of pick[id]) {
    const f = findItem(key)
    if (f) return listImage(f.item)
  }
  return null
}

/** ChatGPT-made glass panel (9-slice skin) if it has been generated, e.g. glassSkin('card-food'). */
export const glassSkin = (slug: string) => DATA.ui?.glass?.[slug]
export const decor = () => DATA.ui?.deco ?? {}
export const backgroundPhoto = (slug = 'santorini') => DATA.ui?.bg?.[slug]
export const assetDims = (slug: string) => DATA.ui?.dims?.[slug]

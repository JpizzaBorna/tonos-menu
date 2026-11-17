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

export const DATA = raw as unknown as MenuData
export const CURRENCY = DATA.currency

export const menuById = (id: MenuId) => DATA.menus.find((m) => m.id === id)!

const ITEMS = new Map<string, { item: Item; menu: MenuId }>()
DATA.menus.forEach((m) => m.categories.forEach((c) => c.items.forEach((i) => ITEMS.set(i.id, { item: i, menu: m.id }))))
export const findItem = (id: string) => ITEMS.get(id)

/** Public asset URL (media/... built by tools/build_media.py). */
export const asset = (p: string) => import.meta.env.BASE_URL + p

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

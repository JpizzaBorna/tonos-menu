import { createClient } from '@supabase/supabase-js'
import { PHOTO_BUCKET, SUPABASE_KEY, SUPABASE_URL } from '../live'
import type { Img, Item, Menu, MenuData } from '../data'

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, storageKey: 'tonos-admin-auth' } })

export type LiveMenu = Pick<MenuData, 'currency' | 'menus'>

/** "admin" is accepted as a short username for admin@tonos.website */
export const toEmail = (u: string) => (u.includes('@') ? u.trim() : `${u.trim()}@tonos.website`)

/** local test mode (npm run dev + ?demo): the editor runs on the built-in menu and saves nothing. Not in production. */
export const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')

export async function loadMenu() {
  if (DEMO) {
    const raw = (await import('../data/menu.json')).default as unknown as LiveMenu
    return { menu: { currency: raw.currency, menus: raw.menus }, updatedAt: 'demo' }
  }
  const { data, error } = await sb.from('tonos_menu').select('data, updated_at').eq('id', 1).single()
  if (error) throw error
  return { menu: data.data as LiveMenu, updatedAt: data.updated_at as string }
}

/** Publish: refuses if someone else published in the meantime (so nobody overwrites another person's work). */
export async function publishMenu(menu: LiveMenu, expectedUpdatedAt: string) {
  if (DEMO) return new Date().toISOString()
  const { data, error } = await sb
    .from('tonos_menu')
    .update({ data: menu })
    .eq('id', 1)
    .eq('updated_at', expectedUpdatedAt)
    .select('updated_at')
  if (error) throw error
  if (!data?.length) throw new Error('The menu was changed by someone else since you opened it. Reload the page, then make your change again.')
  return data[0].updated_at as string
}

export async function isAdmin() {
  const { data } = await sb.rpc('is_tonos_admin')
  return !!data
}

export async function loadHistory() {
  const { data, error } = await sb.from('tonos_menu_history').select('id, saved_at').order('saved_at', { ascending: false }).limit(15)
  if (error) throw error
  return data as { id: number; saved_at: string }[]
}
export async function loadVersion(id: number) {
  const { data, error } = await sb.from('tonos_menu_history').select('data').eq('id', id).single()
  if (error) throw error
  return data.data as LiveMenu
}

/**
 * Photo upload: resized in the browser (max 1600 px) and saved as WebP.
 * Transparent PNG cut-outs keep their transparency and show without a frame in the menu.
 */
export async function uploadPhoto(file: File, menuId: string, itemId: string, view: string): Promise<NonNullable<Img>> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, w, h)
  // transparent cut-out? (check the four corners and a grid of points)
  const px = ctx.getImageData(0, 0, w, h).data
  let clear = 0
  let n = 0
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 40)))
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) {
      n++
      if (px[(y * w + x) * 4 + 3] < 20) clear++
    }
  const cutout = clear / n > 0.08
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not read this image'))), 'image/webp', 0.88))
  if (DEMO) return { src: URL.createObjectURL(blob), cutout }
  const path = `${menuId}/${itemId}-${view}-${Date.now()}.webp`
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
  if (error) throw error
  return { src: sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl, cutout }
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .slice(0, 40) || 'item'

export const newId = (menu: string, name: string) => `${menu}-${slug(name)}-${Math.random().toString(36).slice(2, 6)}`

export const priceLabel = (min: number, max: number) => (min === max ? String(min) : `${min}–${max}`)

/** which picture is the list photo / the detail photo for each menu */
export const listKey = (m: Menu['id']) => (m === 'food' ? 'top' : 'main') as keyof Item['images']
export const detailKey = 'side' as keyof Item['images']

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Category, Img, Item, Menu, MenuId } from '../data'
import {
  DEMO,
  detailKey,
  isAdmin,
  listKey,
  loadHistory,
  loadMenu,
  loadVersion,
  newId,
  priceLabel,
  publishMenu,
  sb,
  slug,
  toEmail,
  uploadPhoto,
  type LiveMenu,
} from './api'

/** photos: built-in ones are "media/…" (one folder up from /admin/), uploaded ones are full URLs */
const photo = (im: Img | undefined) => (im ? (/^https?:/.test(im.src) ? im.src : `../${im.src}`) : '')
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const MENU_LABEL: Record<MenuId, string> = { food: 'Food', bar: 'Bar', shisha: 'Shisha' }

/* ───────────────────────────── root: login gate ───────────────────────────── */

export function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (session) isAdmin().then(setAllowed)
    else setAllowed(null)
  }, [session])

  if (DEMO) return <Editor email="demo mode (nothing is saved)" />
  if (session === undefined) return <div className="a-center a-muted">Loading…</div>
  if (!session) return <Login />
  if (allowed === null) return <div className="a-center a-muted">Checking access…</div>
  if (!allowed)
    return (
      <div className="a-center">
        <div className="a-card a-login">
          <h1>No access</h1>
          <p className="a-muted">This account cannot edit the Tonos menu.</p>
          <button className="a-btn" onClick={() => sb.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  return <Editor email={session.user.email ?? ''} />
}

function Login() {
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await sb.auth.signInWithPassword({ email: toEmail(user), password: pw })
    setBusy(false)
    if (error) setErr('Wrong username or password.')
  }
  return (
    <div className="a-center">
      <form className="a-card a-login" onSubmit={submit}>
        <img className="a-login__logo" src="../media/logo-emblem-color.webp" alt="" />
        <h1>Tonos Menu Admin</h1>
        <p className="a-muted">Sign in to edit the digital menu.</p>
        <label className="a-field">
          <span>Username</span>
          <input autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} placeholder="admin@tonos.website" required />
        </label>
        <label className="a-field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </label>
        {err && <p className="a-error">{err}</p>}
        <button className="a-btn a-btn--primary a-btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

/* ───────────────────────────── the editor ───────────────────────────── */

function Editor({ email }: { email: string }) {
  const [saved, setSaved] = useState<LiveMenu | null>(null) // last published
  const [draft, setDraft] = useState<LiveMenu | null>(null) // being edited
  const [stamp, setStamp] = useState('')
  const [menuId, setMenuId] = useState<MenuId>('food')
  const [catId, setCatId] = useState<string>('')
  const [editing, setEditing] = useState<string | null>(null) // item id
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<null | 'password' | 'history'>(null)

  const say = (text: string, bad = false) => {
    setToast({ text, bad })
    window.setTimeout(() => setToast(null), bad ? 6000 : 3000)
  }

  const reload = async () => {
    const { menu, updatedAt } = await loadMenu()
    setSaved(menu)
    setDraft(clone(menu))
    setStamp(updatedAt)
  }
  useEffect(() => {
    reload().catch((e) => say(String(e.message ?? e), true))
  }, [])

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  // warn before closing the tab with unpublished changes
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const menu = draft?.menus.find((m) => m.id === menuId)
  const cat = menu?.categories.find((c) => c.id === catId) ?? menu?.categories[0]
  useEffect(() => {
    if (menu && !menu.categories.some((c) => c.id === catId)) setCatId(menu.categories[0]?.id ?? '')
  }, [menuId, menu, catId])

  /** change the draft: fn gets a writable copy of the current menu */
  const edit = (fn: (m: Menu) => void) =>
    setDraft((d) => {
      if (!d) return d
      const next = clone(d)
      const m = next.menus.find((x) => x.id === menuId)!
      fn(m)
      return next
    })

  const publish = async () => {
    if (!draft) return
    setBusy(true)
    try {
      const at = await publishMenu(draft, stamp)
      setStamp(at)
      setSaved(clone(draft))
      say('Published ✓  The iPads show it the next time they open with internet.')
    } catch (e) {
      say(String((e as Error).message ?? e), true)
    } finally {
      setBusy(false)
    }
  }

  if (!draft || !menu) return <div className="a-center a-muted">Loading the menu…</div>

  const item = editing ? findIn(draft, editing) : null

  return (
    <div className="a-app">
      <header className="a-top">
        <div className="a-brand">
          <img src="../media/logo-emblem-color.webp" alt="" />
          <div>
            <b>Tonos</b>
            <span>Menu admin</span>
          </div>
        </div>
        <nav className="a-tabs" aria-label="Menus">
          {draft.menus.map((m) => (
            <button key={m.id} className="a-tab" aria-pressed={m.id === menuId} onClick={() => setMenuId(m.id)}>
              {MENU_LABEL[m.id]}
              <small>{m.categories.reduce((n, c) => n + c.items.length, 0)}</small>
            </button>
          ))}
        </nav>
        <div className="a-actions">
          <span className={dirty ? 'a-status a-status--dirty' : 'a-status'}>{dirty ? '● Unpublished changes' : '✓ All changes published'}</span>
          <button className="a-btn" disabled={!dirty || busy} onClick={() => saved && setDraft(clone(saved))}>
            Discard
          </button>
          <button className="a-btn a-btn--primary" disabled={!dirty || busy} onClick={publish}>
            {busy ? 'Publishing…' : 'Publish'}
          </button>
          <Account email={email} onPassword={() => setModal('password')} onHistory={() => setModal('history')} />
        </div>
      </header>

      <div className="a-body">
        <aside className="a-side">
          <div className="a-side__head">Categories</div>
          <ul className="a-cats">
            {menu.categories.map((c, i) => (
              <li key={c.id}>
                <button className="a-cat" aria-current={c.id === cat?.id} onClick={() => setCatId(c.id)}>
                  <span>{c.name}</span>
                  <small>{c.items.length}</small>
                </button>
                {c.id === cat?.id && (
                  <div className="a-cat__tools">
                    <button title="Move up" disabled={i === 0} onClick={() => edit((m) => move(m.categories, i, -1))}>
                      ↑
                    </button>
                    <button title="Move down" disabled={i === menu.categories.length - 1} onClick={() => edit((m) => move(m.categories, i, 1))}>
                      ↓
                    </button>
                    <button
                      title="Rename"
                      onClick={() => {
                        const name = prompt('Category name', c.name)?.trim()
                        if (name) edit((m) => (m.categories[i].name = name))
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="a-danger-text"
                      title="Delete category"
                      onClick={() => {
                        if (confirm(`Delete the category “${c.name}” and its ${c.items.length} dishes?`)) edit((m) => m.categories.splice(i, 1))
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button
            className="a-btn a-btn--ghost a-btn--block"
            onClick={() => {
              const name = prompt('New category name (e.g. Desserts)')?.trim()
              if (!name) return
              const id = `${menuId}-${slug(name)}-${Math.random().toString(36).slice(2, 5)}`
              edit((m) => m.categories.push({ id, name, items: [] }))
              setCatId(id)
            }}
          >
            + Add category
          </button>
        </aside>

        <main className="a-main">
          {cat ? (
            <>
              <div className="a-main__head">
                <h2>{cat.name}</h2>
                <span className="a-muted">{cat.items.length} items · tap an item to edit it</span>
              </div>
              <div className="a-grid">
                {cat.items.map((it) => (
                  <button key={it.id} className={it.hidden ? 'a-item a-item--hidden' : 'a-item'} onClick={() => setEditing(it.id)}>
                    <div className="a-item__img">
                      {photo(it.images[listKey(menuId)] ?? it.images.main ?? it.images.top) ? (
                        <img src={photo(it.images[listKey(menuId)] ?? it.images.main ?? it.images.top)} alt="" loading="lazy" />
                      ) : (
                        <span className="a-muted">No photo</span>
                      )}
                    </div>
                    <div className="a-item__name">{it.name}</div>
                    <div className="a-item__meta">
                      <span>
                        {draft.currency} {it.price.label}
                      </span>
                      {it.hidden && <span className="a-badge">Hidden</span>}
                      {it.mostLiked && <span className="a-badge a-badge--gold">♥ Favourite</span>}
                    </div>
                  </button>
                ))}
                <button
                  className="a-item a-item--add"
                  onClick={() => {
                    const id = newId(menuId, 'new dish')
                    const blank: Item = { id, name: 'New dish', description: '', price: { min: 0, max: 0, label: '0' }, images: {}, mostLiked: false }
                    edit((m) => m.categories.find((c) => c.id === cat.id)!.items.push(blank))
                    setEditing(id)
                  }}
                >
                  <span>+</span>
                  Add item
                </button>
              </div>
            </>
          ) : (
            <div className="a-empty">
              <p>This menu has no categories yet.</p>
            </div>
          )}
        </main>
      </div>

      {item && (
        <ItemEditor
          key={item.item.id}
          menuId={menuId}
          currency={draft.currency}
          item={item.item}
          catId={item.catId}
          categories={menu.categories}
          onChange={(fn) =>
            edit((m) => {
              const c = m.categories.find((x) => x.items.some((i) => i.id === item.item.id))!
              fn(c.items.find((i) => i.id === item.item.id)!)
            })
          }
          onMoveTo={(toCat) => {
            edit((m) => {
              const from = m.categories.find((x) => x.items.some((i) => i.id === item.item.id))!
              const idx = from.items.findIndex((i) => i.id === item.item.id)
              const [it] = from.items.splice(idx, 1)
              m.categories.find((x) => x.id === toCat)!.items.push(it)
            })
            setCatId(toCat)
          }}
          onMove={(dir) =>
            edit((m) => {
              const c = m.categories.find((x) => x.items.some((i) => i.id === item.item.id))!
              move(c.items, c.items.findIndex((i) => i.id === item.item.id), dir)
            })
          }
          onDelete={() => {
            if (!confirm(`Delete “${item.item.name}” from the menu?`)) return
            edit((m) => m.categories.forEach((c) => (c.items = c.items.filter((i) => i.id !== item.item.id))))
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
          onError={(t) => say(t, true)}
        />
      )}

      {modal === 'password' && <PasswordDialog onClose={() => setModal(null)} onDone={() => say('Password changed ✓')} />}
      {modal === 'history' && (
        <HistoryDialog
          onClose={() => setModal(null)}
          onRestore={(m) => {
            setDraft(clone(m))
            setModal(null)
            say('Old version loaded. Check it, then press Publish to make it live.')
          }}
        />
      )}
      {toast && <div className={toast.bad ? 'a-toast a-toast--bad' : 'a-toast'}>{toast.text}</div>}
    </div>
  )
}

function findIn(d: LiveMenu, id: string) {
  for (const m of d.menus) for (const c of m.categories) for (const i of c.items) if (i.id === id) return { item: i, catId: c.id }
  return null
}
function move<T>(arr: T[], i: number, dir: number) {
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

/* ───────────────────────────── item editor (side drawer) ───────────────────────────── */

function ItemEditor(props: {
  menuId: MenuId
  currency: string
  item: Item
  catId: string
  categories: Category[]
  onChange: (fn: (i: Item) => void) => void
  onMoveTo: (catId: string) => void
  onMove: (dir: number) => void
  onDelete: () => void
  onClose: () => void
  onError: (t: string) => void
}) {
  const { menuId, item, onChange } = props
  const setPrice = (min: number, max: number) =>
    onChange((i) => {
      const lo = Math.max(0, min || 0)
      const hi = Math.max(lo, max || lo)
      i.price = { min: lo, max: hi, label: priceLabel(lo, hi) }
    })

  return (
    <div className="a-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <aside className="a-drawer" role="dialog" aria-label={`Edit ${item.name}`}>
        <div className="a-drawer__head">
          <h3>Edit item</h3>
          <button className="a-btn" onClick={props.onClose}>
            Done
          </button>
        </div>

        <div className="a-drawer__body">
          <div className="a-photos">
            <PhotoSlot
              label={menuId === 'food' ? 'Menu photo (top view)' : 'Menu photo'}
              img={item.images[listKey(menuId)] ?? (menuId === 'food' ? undefined : item.images.top)}
              menuId={menuId}
              itemId={item.id}
              view={listKey(menuId)}
              onSet={(im) => onChange((i) => (i.images[listKey(menuId)] = im))}
              onError={props.onError}
            />
            <PhotoSlot
              label="Detail photo (side view, in the pop-up)"
              img={item.images[detailKey]}
              menuId={menuId}
              itemId={item.id}
              view={detailKey}
              onSet={(im) => onChange((i) => (i.images[detailKey] = im))}
              onError={props.onError}
            />
          </div>

          <label className="a-field">
            <span>Name</span>
            <input value={item.name} onChange={(e) => onChange((i) => (i.name = e.target.value))} />
          </label>
          <label className="a-field">
            <span>Description</span>
            <textarea rows={3} value={item.description} onChange={(e) => onChange((i) => (i.description = e.target.value))} />
          </label>
          <div className="a-row">
            <label className="a-field">
              <span>Price ({props.currency})</span>
              <input type="number" min={0} step="1" inputMode="decimal" value={item.price.min} onChange={(e) => setPrice(+e.target.value, Math.max(+e.target.value, item.price.max))} />
            </label>
            <label className="a-field">
              <span>Up to (optional)</span>
              <input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                value={item.price.max === item.price.min ? '' : item.price.max}
                placeholder="—"
                onChange={(e) => setPrice(item.price.min, e.target.value === '' ? item.price.min : +e.target.value)}
              />
            </label>
          </div>
          <label className="a-field">
            <span>Category</span>
            <select value={props.catId} onChange={(e) => props.onMoveTo(e.target.value)}>
              {props.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="a-switch">
            <input type="checkbox" checked={!!item.mostLiked} onChange={(e) => onChange((i) => (i.mostLiked = e.target.checked))} />
            <span>Guest favourite (shows a ♥ badge)</span>
          </label>
          <label className="a-switch">
            <input type="checkbox" checked={!!item.hidden} onChange={(e) => onChange((i) => (i.hidden = e.target.checked))} />
            <span>Hide from the menu (e.g. sold out today)</span>
          </label>

          <div className="a-drawer__tools">
            <button className="a-btn" onClick={() => props.onMove(-1)}>
              ↑ Move up
            </button>
            <button className="a-btn" onClick={() => props.onMove(1)}>
              ↓ Move down
            </button>
            <button className="a-btn a-btn--danger" onClick={props.onDelete}>
              Delete item
            </button>
          </div>
          <p className="a-hint">Changes are kept here until you press <b>Publish</b> at the top.</p>
        </div>
      </aside>
    </div>
  )
}

function PhotoSlot(props: {
  label: string
  img: Img | undefined
  menuId: string
  itemId: string
  view: string
  onSet: (im: Img | undefined) => void
  onError: (t: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      props.onSet(await uploadPhoto(f, props.menuId, props.itemId, props.view))
    } catch (e) {
      props.onError(`Photo upload failed: ${(e as Error).message ?? e}`)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="a-photo">
      <span className="a-photo__label">{props.label}</span>
      <div className="a-photo__box" onClick={() => input.current?.click()}>
        {busy ? <span className="a-muted">Uploading…</span> : props.img ? <img src={photo(props.img)} alt="" /> : <span className="a-muted">+ Upload photo</span>}
      </div>
      <div className="a-photo__tools">
        <button className="a-btn a-btn--sm" onClick={() => input.current?.click()} disabled={busy}>
          {props.img ? 'Replace' : 'Upload'}
        </button>
        {props.img && (
          <button className="a-btn a-btn--sm a-danger-text" onClick={() => props.onSet(undefined)} disabled={busy}>
            Remove
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}

/* ───────────────────────────── account menu & dialogs ───────────────────────────── */

function Account({ email, onPassword, onHistory }: { email: string; onPassword: () => void; onHistory: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="a-account">
      <button className="a-btn a-btn--icon" aria-label="Account" onClick={() => setOpen((o) => !o)}>
        ☰
      </button>
      {open && (
        <div className="a-menu" onMouseLeave={() => setOpen(false)}>
          <div className="a-menu__who">{email}</div>
          <a href="../" target="_blank" rel="noreferrer">
            Open the guest menu ↗
          </a>
          <button onClick={() => (setOpen(false), onHistory())}>Earlier versions (undo)</button>
          <button onClick={() => (setOpen(false), onPassword())}>Change password</button>
          <button onClick={() => sb.auth.signOut()}>Sign out</button>
        </div>
      )}
    </div>
  )
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="a-dialog-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-card a-dialog" role="dialog" aria-label={title}>
        <div className="a-drawer__head">
          <h3>{title}</h3>
          <button className="a-btn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [err, setErr] = useState('')
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (a.length < 8) return setErr('Use at least 8 characters.')
    if (a !== b) return setErr('The two passwords are not the same.')
    const { error } = await sb.auth.updateUser({ password: a })
    if (error) return setErr(error.message)
    onDone()
    onClose()
  }
  return (
    <Dialog title="Change password" onClose={onClose}>
      <form onSubmit={save} className="a-stack">
        <label className="a-field">
          <span>New password</span>
          <input type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="a-field">
          <span>Repeat new password</span>
          <input type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} />
        </label>
        {err && <p className="a-error">{err}</p>}
        <button className="a-btn a-btn--primary">Save password</button>
      </form>
    </Dialog>
  )
}

function HistoryDialog({ onClose, onRestore }: { onClose: () => void; onRestore: (m: LiveMenu) => void }) {
  const [rows, setRows] = useState<{ id: number; saved_at: string }[] | null>(null)
  useEffect(() => {
    loadHistory().then(setRows).catch(() => setRows([]))
  }, [])
  return (
    <Dialog title="Earlier versions" onClose={onClose}>
      <p className="a-muted">Every time you publish, the previous menu is kept here. Load one to undo a mistake.</p>
      {!rows ? (
        <p className="a-muted">Loading…</p>
      ) : !rows.length ? (
        <p className="a-muted">No earlier versions yet.</p>
      ) : (
        <ul className="a-history">
          {rows.map((r) => (
            <li key={r.id}>
              <span>{new Date(r.saved_at).toLocaleString()}</span>
              <button className="a-btn a-btn--sm" onClick={async () => onRestore(await loadVersion(r.id))}>
                Load this version
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

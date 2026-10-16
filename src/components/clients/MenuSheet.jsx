import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { ALL_MENU_FIELDS, MENU_CATEGORIES, categoryForService, normalizeItem, selectedMenu } from '../../lib/menu'
import { patchServiceData } from './serviceData'
import { inputClass, selectClass } from './styles'

export default function MenuSheet({ client, setClient, menuLibrary, onMenuItemCreated }) {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(() => new Set())
    const [newItem, setNewItem] = useState(null) // { name, category } while the form is open
    const [adding, setAdding] = useState(false)
    const sd = useMemo(() => client.service_data || {}, [client.service_data])
    const chosen = useMemo(() => selectedMenu(sd, menuLibrary), [sd, menuLibrary])

    const library = useMemo(() => MENU_CATEGORIES.map(cat => ({
        ...cat,
        items: menuLibrary.filter(s => categoryForService(s).key === cat.key).map(s => s.name),
    })), [menuLibrary])

    const q = normalizeItem(query)
    const anyMatch = !q || library.some(s => s.items.some(i => normalizeItem(i).includes(q)))

    function toggle(name, categoryField) {
        const key = normalizeItem(name)
        if (chosen.set.has(key)) {
            const patch = {}
            ALL_MENU_FIELDS.forEach(f => {
                if ((sd[f] || []).some(i => normalizeItem(i) === key)) patch[f] = sd[f].filter(i => normalizeItem(i) !== key)
            })
            patchServiceData(setClient, patch)
        } else {
            patchServiceData(setClient, { [categoryField]: [...(sd[categoryField] || []), name] })
        }
    }

    const toggleSection = (key) => setOpen(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
    })

    async function createItem(e) {
        e.preventDefault()
        const name = newItem.name.trim()
        if (!name) return
        const cat = MENU_CATEGORIES.find(c => c.key === newItem.category)
        const existing = menuLibrary.find(s => normalizeItem(s.name) === normalizeItem(name))
        if (existing) {
            if (!chosen.set.has(normalizeItem(name))) toggle(existing.name, categoryForService(existing).field)
        } else {
            setAdding(true)
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase.from('services')
                .insert({ name, category: cat.key, item_type: 'catering', user_id: user.id, description: '' })
                .select('id, name, category').single()
            setAdding(false)
            if (error) return alert(t('menu.addFailed', { message: error.message }))
            onMenuItemCreated(data)
            toggle(data.name, cat.field)
        }
        setNewItem(null)
        setQuery('')
    }

    return (
        <div>
            {/* ON THIS EVENT */}
            <section className="mb-5 rounded-xl border border-blue-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-800">
                    {t('menu.onThisEvent')} <span className="font-semibold text-blue-600">· {chosen.set.size}</span>
                </h3>
                {chosen.groups.length === 0 ? (
                    <div className="text-sm text-slate-400">{t('menu.nothingSelected')}</div>
                ) : (
                    <div className="space-y-3">
                        {chosen.groups.map(g => (
                            <div key={g.key}>
                                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t(`menu.category.${g.key}`)}</div>
                                <div className="flex flex-wrap gap-2">
                                    {g.items.map(name => (
                                        <button key={name} onClick={() => toggle(name, g.field)} className="flex items-center gap-1.5 rounded-full bg-blue-600 py-1.5 pl-3 pr-2 text-sm font-medium text-white active:bg-blue-800" aria-label={`${t('common.remove')} ${name}`}>
                                            {name} <X size={14} className="opacity-80" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ADD ITEMS */}
            <h3 className="mb-2 px-1 text-sm font-bold text-slate-800">{t('menu.addItems')}</h3>
            <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('menu.search')} className={`${inputClass} pl-9`} />
                    {query && (
                        <button onClick={() => setQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-slate-400" aria-label={t('common.cancel')}>
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button onClick={() => setNewItem({ name: query.trim(), category: 'Entree' })} className="flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-blue-600" aria-label={t('menu.newItem')}>
                    <Plus size={18} /> <span className="hidden sm:inline">{t('menu.newItem')}</span>
                </button>
            </div>

            {newItem && (
                <form onSubmit={createItem} className="mb-3 space-y-2 rounded-xl border border-blue-200 bg-white p-3">
                    <input autoFocus value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder={t('menu.newItemName')} className={inputClass} />
                    <div className="flex gap-2">
                        <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className={`${selectClass} min-w-0 flex-1`}>
                            {MENU_CATEGORIES.map(c => <option key={c.key} value={c.key}>{t(`menu.categorySingular.${c.key}`)}</option>)}
                        </select>
                        <button type="button" onClick={() => setNewItem(null)} className="px-2 text-sm text-slate-500">{t('common.cancel')}</button>
                        <button type="submit" disabled={adding || !newItem.name.trim()} className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {t('common.add')}
                        </button>
                    </div>
                </form>
            )}

            {!anyMatch && !newItem && (
                <button onClick={() => setNewItem({ name: query.trim(), category: 'Entree' })} className="mb-3 w-full rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    {t('menu.noMatches', { query })} <span className="font-bold text-blue-600">{t('menu.addAsNew', { query: query.trim() })}</span>
                </button>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {library.map(section => {
                    const items = q ? section.items.filter(i => normalizeItem(i).includes(q)) : section.items
                    if (q && items.length === 0) return null
                    const expanded = !!q || open.has(section.key)
                    const count = section.items.filter(i => chosen.set.has(normalizeItem(i))).length
                    return (
                        <div key={section.key} className="border-b border-slate-100 last:border-b-0">
                            <button onClick={() => toggleSection(section.key)} className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left active:bg-slate-50">
                                <span className="font-semibold text-slate-800">
                                    {t(`menu.category.${section.key}`)}
                                    {!section.food && <span className="block text-xs font-normal text-slate-400">{t('menu.suppliesHint')}</span>}
                                </span>
                                <span className="flex shrink-0 items-center gap-2 text-sm text-slate-400">
                                    {count > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{count} ✓</span>}
                                    {section.items.length}
                                    <ChevronDown size={18} className={`transition ${expanded ? 'rotate-180' : ''}`} />
                                </span>
                            </button>
                            {expanded && (
                                <div className="flex flex-wrap gap-2 px-4 pb-4">
                                    {items.length === 0 && <div className="text-sm italic text-slate-400">{t('menu.noItems')}</div>}
                                    {items.map(name => {
                                        const on = chosen.set.has(normalizeItem(name))
                                        return (
                                            <button
                                                key={name}
                                                onClick={() => toggle(name, section.field)}
                                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-blue-50'}`}
                                            >
                                                {on ? <Check size={14} /> : <Plus size={14} className="text-slate-400" />} {name}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">{t('menu.manageInSettings')}</p>
        </div>
    )
}

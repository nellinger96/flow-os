import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Plus, Search, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { ALL_MENU_FIELDS, LEGACY_MENU_FIELD, MENU_CATEGORIES, categoryForService, normalizeItem } from '../../lib/menu'
import { patchServiceData } from './serviceData'
import { inputClass, selectClass } from './styles'

export default function MenuTab({ client, setClient, menuLibrary, onMenuItemCreated }) {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')
    const [newItem, setNewItem] = useState(null) // { name, category } while the form is open
    const [adding, setAdding] = useState(false)
    const sd = useMemo(() => client.service_data || {}, [client.service_data])

    // Every item already on this event, keyed by normalized name
    const selected = useMemo(() => {
        const set = new Set()
        ALL_MENU_FIELDS.forEach(f => (sd[f] || []).forEach(i => set.add(normalizeItem(i))))
        return set
    }, [sd])

    // Build one chip list per category: saved items + custom items on this event
    const sections = useMemo(() => {
        const libraryNames = new Set(menuLibrary.map(s => normalizeItem(s.name)))
        return MENU_CATEGORIES.map(cat => {
            const saved = menuLibrary.filter(s => categoryForService(s).key === cat.key).map(s => ({ name: s.name, custom: false }))
            const onEvent = [...(sd[cat.field] || []), ...(cat.key === 'Entree' ? sd[LEGACY_MENU_FIELD] || [] : [])]
            const custom = onEvent.filter(i => !libraryNames.has(normalizeItem(i))).map(name => ({ name, custom: true }))
            const seen = new Set()
            const items = [...custom, ...saved].filter(i => {
                const k = normalizeItem(i.name)
                if (seen.has(k)) return false
                seen.add(k)
                return true
            })
            return { ...cat, items, count: items.filter(i => selected.has(normalizeItem(i.name))).length }
        })
    }, [menuLibrary, sd, selected])

    const q = normalizeItem(query)
    const anyMatch = !q || sections.some(s => s.items.some(i => normalizeItem(i.name).includes(q)))

    function toggle(name, categoryField) {
        const key = normalizeItem(name)
        if (selected.has(key)) {
            // Remove from wherever it is stored
            const patch = {}
            ALL_MENU_FIELDS.forEach(f => {
                if ((sd[f] || []).some(i => normalizeItem(i) === key)) patch[f] = sd[f].filter(i => normalizeItem(i) !== key)
            })
            patchServiceData(setClient, patch)
        } else {
            patchServiceData(setClient, { [categoryField]: [...(sd[categoryField] || []), name] })
        }
    }

    async function createItem(e) {
        e.preventDefault()
        const name = newItem.name.trim()
        if (!name) return
        const cat = MENU_CATEGORIES.find(c => c.key === newItem.category)
        const existing = menuLibrary.find(s => normalizeItem(s.name) === normalizeItem(name))
        if (existing) {
            if (!selected.has(normalizeItem(name))) toggle(existing.name, categoryForService(existing).field)
            setNewItem(null)
            setQuery('')
            return
        }
        setAdding(true)
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('services')
            .insert({ name, category: cat.key, item_type: 'catering', user_id: user.id, description: '' })
            .select('id, name, category').single()
        setAdding(false)
        if (error) return alert(t('menu.addFailed', { message: error.message }))
        onMenuItemCreated(data)
        toggle(data.name, cat.field)
        setNewItem(null)
        setQuery('')
    }

    return (
        <div>
            <div className="sticky top-0 z-10 -mx-4 mb-4 bg-slate-50/95 px-4 pb-2 pt-1 backdrop-blur md:-mx-6 md:px-6">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('menu.search')} className={`${inputClass} pl-9`} />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" aria-label={t('common.cancel')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button onClick={() => setNewItem({ name: query, category: 'Entree' })} className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-blue-600 hover:bg-blue-50">
                        <Plus size={16} /> {t('menu.newItem')}
                    </button>
                </div>

                {newItem && (
                    <form onSubmit={createItem} className="mt-2 flex flex-wrap gap-2 rounded-lg border border-blue-200 bg-white p-3">
                        <input autoFocus value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder={t('menu.newItemName')} className={`${inputClass} min-w-[10rem] flex-1`} />
                        <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className={selectClass}>
                            {MENU_CATEGORIES.map(c => <option key={c.key} value={c.key}>{t(`menu.categorySingular.${c.key}`)}</option>)}
                        </select>
                        <button type="submit" disabled={adding || !newItem.name.trim()} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {t('menu.addAndSelect')}
                        </button>
                        <button type="button" onClick={() => setNewItem(null)} className="px-2 text-sm text-slate-500 hover:text-slate-800">{t('common.cancel')}</button>
                    </form>
                )}
            </div>

            {!anyMatch && (
                <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
                    {t('menu.noMatches', { query })}
                    <button onClick={() => setNewItem({ name: query.trim(), category: 'Entree' })} className="mt-2 block w-full font-bold text-blue-600 hover:underline">
                        {t('menu.addAsNew', { query: query.trim() })}
                    </button>
                </div>
            )}

            {sections.map(section => {
                const items = q ? section.items.filter(i => normalizeItem(i.name).includes(q)) : section.items
                if (q && items.length === 0) return null
                return (
                    <section key={section.key} className={`mb-4 rounded-xl border bg-white p-4 ${section.food ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
                        <div className="mb-3 flex items-baseline justify-between gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                {t(`menu.category.${section.key}`)}
                                {!section.food && <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">{t('menu.suppliesHint')}</span>}
                            </h3>
                            {section.count > 0 && <span className="text-xs font-semibold text-blue-600">{t('menu.selectedCount', { count: section.count })}</span>}
                        </div>
                        {items.length === 0 ? (
                            <div className="text-sm italic text-slate-400">{t('menu.noItems')}</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {items.map(item => {
                                    const on = selected.has(normalizeItem(item.name))
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => toggle(item.name, section.field)}
                                            title={item.custom ? t('menu.customHint') : undefined}
                                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                                : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                                            } ${item.custom ? 'border-dashed' : ''}`}
                                        >
                                            {on && <Check size={14} />}
                                            {item.name}
                                            {item.custom && <span className={`text-[10px] uppercase ${on ? 'text-blue-100' : 'text-slate-400'}`}>{t('menu.custom')}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                )
            })}

            <p className="text-center text-xs text-slate-400">{t('menu.manageInSettings')}</p>
        </div>
    )
}

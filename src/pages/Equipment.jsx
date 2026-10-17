import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, Loader2, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatQty, GEAR_CATEGORIES, STARTER_GEAR } from '../lib/loadout'
import { MENU_CATEGORIES, categoryForService } from '../lib/menu'
import { inputClass, selectClass } from '../components/clients/styles'
import Sheet from '../components/clients/Sheet'
import Segmented from '../components/loadout/Segmented'

const EMPTY = { name: '', category: 'serving', stock: '', rule: 'manual', qty: 1, guests_per: 50 }

function ruleText(t, e) {
    if (e.rule === 'every_event') return t('loadout.rule.everySummary', { qty: formatQty(e.qty) })
    if (e.rule === 'per_guests') return t('loadout.rule.guestsSummary', { qty: formatQty(e.qty), per: e.guests_per })
    return t('loadout.rule.manualSummary')
}

function GearForm({ value, onChange }) {
    const { t } = useTranslation()
    const set = (patch) => onChange({ ...value, ...patch })
    const label = 'mb-1 block text-sm font-semibold text-slate-700'
    return (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block">
                <span className={label}>{t('loadout.form.name')}</span>
                <input value={value.name} onChange={e => set({ name: e.target.value })} maxLength={120} placeholder={t('loadout.form.namePlaceholder')} className={inputClass} autoFocus />
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block">
                    <span className={label}>{t('loadout.form.category')}</span>
                    <select value={value.category} onChange={e => set({ category: e.target.value })} className={`${selectClass} w-full`}>
                        {GEAR_CATEGORIES.map(c => <option key={c} value={c}>{t(`loadout.category.${c}`)}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className={label}>{t('loadout.form.stock')}</span>
                    <input type="number" min="0" inputMode="numeric" value={value.stock ?? ''} onChange={e => set({ stock: e.target.value })} placeholder={t('loadout.form.stockPlaceholder')} className={inputClass} />
                </label>
            </div>
            <fieldset>
                <legend className={label}>{t('loadout.form.when')}</legend>
                <div className="space-y-2">
                    {['manual', 'every_event', 'per_guests'].map(r => (
                        <label key={r} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${value.rule === r ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                            <input type="radio" name="rule" checked={value.rule === r} onChange={() => set({ rule: r })} className="mt-1" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-slate-900">{t(`loadout.rule.${r}`)}</span>
                                <span className="block text-xs text-slate-500">{t(`loadout.rule.${r}Hint`)}</span>
                                {value.rule === r && r !== 'manual' && (
                                    <span className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                        <input type="number" min="0.5" step="0.5" inputMode="decimal" value={value.qty} onChange={e => set({ qty: e.target.value })} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5" aria-label={t('loadout.qty')} />
                                        {r === 'per_guests' ? (
                                            <>
                                                {t('loadout.form.forEvery')}
                                                <input type="number" min="1" inputMode="numeric" value={value.guests_per ?? ''} onChange={e => set({ guests_per: e.target.value })} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5" aria-label={t('loadout.form.guestsPer')} />
                                                {t('home.guests').toLowerCase()}
                                            </>
                                        ) : t('loadout.form.perEvent')}
                                    </span>
                                )}
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>
        </div>
    )
}

export default function Equipment() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [tab, setTab] = useState('gear')
    const [loading, setLoading] = useState(true)
    const [gear, setGear] = useState([])
    const [services, setServices] = useState([])
    const [links, setLinks] = useState([])
    const [editing, setEditing] = useState(null) // gear row being edited, or EMPTY for new
    const [saving, setSaving] = useState(false)
    const [seeding, setSeeding] = useState(false)
    const [query, setQuery] = useState('')
    const [picker, setPicker] = useState(null) // service id whose "add gear" picker is open

    useEffect(() => {
        let cancelled = false
        async function load() {
            const [eq, sv, ml] = await Promise.all([
                supabase.from('equipment').select('*').order('name'),
                supabase.from('services').select('id, name, category').neq('item_type', 'rental').order('name'),
                supabase.from('menu_equipment').select('*'),
            ])
            if (cancelled) return
            setGear(eq.data || [])
            setServices((sv.data || []).filter(s => categoryForService(s).food))
            setLinks(ml.data || [])
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [])

    const gearById = useMemo(() => new Map(gear.map(g => [g.id, g])), [gear])

    async function saveGear() {
        const name = editing.name.trim()
        if (!name) return alert(t('loadout.form.nameRequired'))
        const payload = {
            name,
            category: editing.category,
            stock: editing.stock === '' || editing.stock === null ? null : Math.max(0, Math.round(Number(editing.stock))),
            rule: editing.rule,
            qty: Math.max(0.5, Number(editing.qty) || 1),
            guests_per: editing.rule === 'per_guests' ? Math.max(1, Math.round(Number(editing.guests_per) || 50)) : null,
        }
        setSaving(true)
        const query = editing.id
            ? supabase.from('equipment').update(payload).eq('id', editing.id).select().single()
            : supabase.from('equipment').insert(payload).select().single()
        const { data, error } = await query
        setSaving(false)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setGear(prev => [...prev.filter(g => g.id !== data.id), data].sort((a, b) => a.name.localeCompare(b.name)))
        setEditing(null)
    }

    async function deleteGear() {
        if (!window.confirm(t('loadout.form.deleteConfirm', { name: editing.name }))) return
        const { error } = await supabase.from('equipment').delete().eq('id', editing.id)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setGear(prev => prev.filter(g => g.id !== editing.id))
        setLinks(prev => prev.filter(l => l.equipment_id !== editing.id))
        setEditing(null)
    }

    async function seedStarter() {
        setSeeding(true)
        const rows = STARTER_GEAR.map(({ key, ...g }) => ({ ...g, name: t(`loadout.starter.${key}`) }))
        const { data, error } = await supabase.from('equipment').insert(rows).select()
        setSeeding(false)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setGear(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)))
    }

    async function addLink(serviceId, equipmentId) {
        setPicker(null)
        if (!equipmentId) return
        const { data, error } = await supabase.from('menu_equipment').insert({ service_id: serviceId, equipment_id: Number(equipmentId), qty: 1 }).select().single()
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setLinks(prev => [...prev, data])
    }

    async function changeLinkQty(link) {
        const answer = window.prompt(t('loadout.qtyPrompt', { name: gearById.get(link.equipment_id)?.name }), formatQty(link.qty))
        if (answer === null) return
        const qty = Number(answer)
        if (!Number.isFinite(qty) || qty <= 0) return alert(t('loadout.badQty'))
        const { error } = await supabase.from('menu_equipment').update({ qty }).eq('service_id', link.service_id).eq('equipment_id', link.equipment_id)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setLinks(prev => prev.map(l => (l === link ? { ...l, qty } : l)))
    }

    async function removeLink(link) {
        const { error } = await supabase.from('menu_equipment').delete().eq('service_id', link.service_id).eq('equipment_id', link.equipment_id)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setLinks(prev => prev.filter(l => l !== link))
    }

    const visibleServices = services.filter(s => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    const menuGroups = MENU_CATEGORIES.filter(c => c.food)
        .map(c => ({ key: c.key, items: visibleServices.filter(s => categoryForService(s).key === c.key) }))
        .filter(g => g.items.length)

    return (
        <div className="bg-slate-50 font-sans">
            <div className="mx-auto max-w-3xl px-4 py-5 md:py-8">
                <button onClick={() => navigate('/day?tab=loadout')} className="-ml-2 mb-2 flex items-center gap-1 rounded-lg p-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                    <ArrowLeft size={18} />{t('loadout.title')}
                </button>
                <h1 className="text-2xl font-extrabold text-slate-900">{t('loadout.equipment')}</h1>
                <p className="mb-4 text-sm text-slate-500">{t('loadout.equipmentIntro')}</p>

                <div className="mb-4">
                    <Segmented value={tab} onChange={setTab} options={[['gear', t('loadout.tabGear')], ['menu', t('loadout.tabMenu')]]} />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-20 text-slate-400"><Loader2 size={20} className="animate-spin" />{t('common.loading')}</div>
                ) : tab === 'gear' ? (
                    <div className="space-y-3">
                        {gear.length === 0 && (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <div className="font-bold text-blue-900">{t('loadout.starterTitle')}</div>
                                <div className="mb-3 text-sm text-blue-800">{t('loadout.starterBody')}</div>
                                <button onClick={seedStarter} disabled={seeding} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                                    {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{t('loadout.starterButton')}
                                </button>
                            </div>
                        )}
                        <button onClick={() => setEditing({ ...EMPTY })} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700">
                            <Plus size={16} />{t('loadout.addGear')}
                        </button>
                        {GEAR_CATEGORIES.map(cat => {
                            const rows = gear.filter(g => (GEAR_CATEGORIES.includes(g.category) ? g.category : 'other') === cat)
                            if (!rows.length) return null
                            return (
                                <div key={cat} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                    <div className="bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-500">{t(`loadout.category.${cat}`)}</div>
                                    {rows.map(g => (
                                        <button key={g.id} onClick={() => setEditing({ ...g, stock: g.stock ?? '' })} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left first:border-0 hover:bg-slate-50">
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-slate-900">{g.name}</span>
                                                <span className="block text-xs text-slate-500">{ruleText(t, g)}</span>
                                            </span>
                                            {g.stock !== null && <span className="shrink-0 text-xs text-slate-500">{t('loadout.own', { count: g.stock })}</span>}
                                            <ChevronRight size={16} className="shrink-0 text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">{t('loadout.menuIntro')}</p>
                        {gear.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">{t('loadout.addGearFirst')}</div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('menu.search')} className={`${inputClass} pl-9`} />
                                </div>
                                {menuGroups.map(group => (
                                    <div key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                        <div className="bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-500">{t(`menu.category.${group.key}`)}</div>
                                        {group.items.map(s => {
                                            const own = links.filter(l => l.service_id === s.id)
                                            const free = gear.filter(g => !own.some(l => l.equipment_id === g.id))
                                            return (
                                                <div key={s.id} className="border-t border-slate-100 px-4 py-3 first:border-0">
                                                    <div className="font-semibold text-slate-900">{s.name}</div>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                        {own.map(l => (
                                                            <span key={l.equipment_id} className="flex items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-800">
                                                                <button onClick={() => changeLinkQty(l)} className="py-1 pl-3 pr-1 hover:underline">{formatQty(l.qty)}× {gearById.get(l.equipment_id)?.name}</button>
                                                                <button onClick={() => removeLink(l)} className="rounded-full p-1 pr-2 text-blue-400 hover:text-red-600" aria-label={t('common.remove')}><X size={14} /></button>
                                                            </span>
                                                        ))}
                                                        {picker === s.id ? (
                                                            <select autoFocus defaultValue="" onChange={e => addLink(s.id, e.target.value)} onBlur={() => setPicker(null)} className={`${selectClass} py-1`}>
                                                                <option value="" disabled>{t('loadout.pickGear')}</option>
                                                                {free.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                            </select>
                                                        ) : free.length > 0 && (
                                                            <button onClick={() => setPicker(s.id)} className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-700">
                                                                <Plus size={14} />{t('loadout.gear')}
                                                            </button>
                                                        )}
                                                        {own.length === 0 && picker !== s.id && <span className="text-xs text-slate-400">{t('loadout.noGearLinked')}</span>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                                {menuGroups.length === 0 && <div className="p-6 text-center text-sm text-slate-500">{t('menu.noMatches', { query })}</div>}
                            </>
                        )}
                    </div>
                )}
            </div>

            {editing && (
                <Sheet
                    title={editing.id ? editing.name || t('loadout.editGear') : t('loadout.addGear')}
                    onClose={() => setEditing(null)}
                    footer={
                        <div className="flex gap-2">
                            {editing.id && (
                                <button onClick={deleteGear} className="rounded-xl border border-red-200 px-4 text-red-600 hover:bg-red-50" aria-label={t('common.delete')}><Trash2 size={18} /></button>
                            )}
                            <button onClick={saveGear} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white disabled:opacity-60">
                                {saving && <Loader2 size={18} className="animate-spin" />}{t('common.save')}
                            </button>
                        </div>
                    }
                >
                    <GearForm value={editing} onChange={setEditing} />
                </Sheet>
            )}
        </div>
    )
}

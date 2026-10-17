import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2, Navigation, Truck } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDate, toNumber } from '../lib/format'
import { buildLoadList, dayRouteUrl, dayShortages } from '../lib/loadout'
import EventChecklist from '../components/loadout/EventChecklist'
import Segmented from '../components/loadout/Segmented'

const NAME_KEY = 'crew.name'
function savedName() {
    try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' }
}

// Public page a crew opens from the day's share link. No login: every read and
// write goes through crew_* database functions that check the link.
export default function CrewDay() {
    const { token } = useParams()
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [phase, setPhase] = useState('load')
    const [pending, setPending] = useState(() => new Set())
    const [name, setName] = useState(savedName)
    const [nameDraft, setNameDraft] = useState('')

    const refresh = useCallback(async () => {
        const { data: day, error: err } = await supabase.rpc('crew_day', { p_token: token })
        if (err) setError(err.message)
        else { setError(''); setData(day) }
    }, [token])
    const errorText = /expired|turned off/i.test(error) ? t('crew.expired') : error

    useEffect(() => {
        let cancelled = false
        async function first() {
            const { data: day, error: err } = await supabase.rpc('crew_day', { p_token: token })
            if (cancelled) return
            if (err) setError(err.message)
            else setData(day)
        }
        first()
        // Other crew members check items off too
        const id = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 15000)
        return () => { cancelled = true; clearInterval(id) }
    }, [token, refresh])

    const lists = useMemo(() => {
        if (!data) return []
        return data.events.map(client => ({
            client,
            list: buildLoadList({ client, equipment: data.equipment, menuLinks: data.menu_links, items: data.items.filter(i => i.customer_id === client.id) }),
        }))
    }, [data])
    const shortages = useMemo(() => (data ? dayShortages(lists.map(l => l.list.items), data.equipment) : []), [lists, data])

    function saveName(e) {
        e.preventDefault()
        const n = nameDraft.trim().slice(0, 60)
        if (!n) return
        try { localStorage.setItem(NAME_KEY, n) } catch { /* storage unavailable */ }
        setName(n)
    }

    const actionsFor = (client) => ({
        toggle: async (item, done) => {
            const key = `${client.id}:${item.key}`
            const field = phase === 'load' ? ['loaded_at', 'loaded_by'] : ['returned_at', 'returned_by']
            // Show the check right away
            setData(prev => {
                const existing = prev.items.find(r => r.customer_id === client.id && r.item_key === item.key)
                const row = { ...(existing || { customer_id: client.id, item_key: item.key, removed: false }), [field[0]]: done ? new Date().toISOString() : null, [field[1]]: done ? name : null }
                return { ...prev, items: [...prev.items.filter(r => r !== existing), row] }
            })
            setPending(prev => new Set(prev).add(key))
            const { error: err } = await supabase.rpc('crew_mark', { p_token: token, p_customer_id: client.id, p_item_key: item.key, p_phase: phase, p_done: done, p_by: name })
            setPending(prev => { const next = new Set(prev); next.delete(key); return next })
            if (err) alert(t('loadout.saveFailed', { message: err.message }))
            refresh()
        },
        add: async (label, qty) => {
            const { error: err } = await supabase.rpc('crew_add_item', { p_token: token, p_customer_id: client.id, p_label: label, p_qty: qty })
            if (err) { alert(t('loadout.saveFailed', { message: err.message })); return false }
            await refresh()
            return true
        },
    })

    const langToggle = (
        <button onClick={() => i18n.changeLanguage(lng === 'es' ? 'en' : 'es')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
            {lng === 'es' ? 'English' : 'Español'}
        </button>
    )

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
                <Truck size={48} className="mb-4 text-slate-300" />
                <div className="text-lg font-bold text-slate-800">{t('crew.linkProblem')}</div>
                <div className="mt-1 max-w-sm text-sm text-slate-500">{errorText}</div>
                <div className="mt-6">{langToggle}</div>
            </div>
        )
    }
    if (!data) {
        return <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-50 font-sans text-slate-400"><Loader2 className="animate-spin" />{t('common.loading')}</div>
    }

    if (!name) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans">
                <form onSubmit={saveName} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="mb-1 flex items-center justify-between">
                        <Truck size={28} className="text-blue-600" />
                        {langToggle}
                    </div>
                    <div className="mt-3 text-xl font-extrabold text-slate-900">{data.business_name || t('loadout.title')}</div>
                    <div className="mb-4 text-sm text-slate-500">{t('crew.whoAreYou')}</div>
                    <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={60} placeholder={t('crew.namePlaceholder')} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none" />
                    <button type="submit" className="mt-3 w-full rounded-xl bg-blue-600 py-3 font-bold text-white">{t('crew.start')}</button>
                </form>
            </div>
        )
    }

    const route = dayRouteUrl(data.events)
    const totals = lists.reduce((s, l) => {
        const key = phase === 'load' ? 'loadedAt' : 'returnedAt'
        return { done: s.done + l.list.items.filter(i => i[key]).length, all: s.all + l.list.items.length }
    }, { done: 0, all: 0 })

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-500">{data.business_name}</div>
                        <h1 className="text-2xl font-extrabold text-slate-900 first-letter:uppercase">{formatDate(data.day, lng, { weekday: 'long', month: 'long', day: 'numeric' })}</h1>
                        <div className="text-sm text-slate-500">
                            {t('calendar.eventsCount', { count: data.events.length })} · {t('crew.hi', { name })}{' '}
                            <button onClick={() => { setNameDraft(name); setName('') }} className="font-semibold text-blue-600">{t('crew.notYou')}</button>
                        </div>
                    </div>
                    {langToggle}
                </div>

                {route && (
                    <a href={route} target="_blank" rel="noreferrer" className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700">
                        <Navigation size={16} />{t('loadout.route')}
                    </a>
                )}

                <div className="sticky top-0 z-10 -mx-4 mb-3 bg-slate-50/95 px-4 py-2 backdrop-blur">
                    <Segmented value={phase} onChange={setPhase} options={[['load', t('loadout.phaseLoad')], ['return', t('loadout.phaseReturn')]]} />
                    <div className="mt-1.5 text-center text-xs font-semibold text-slate-500">
                        {t(phase === 'load' ? 'loadout.progressLoad' : 'loadout.progressReturn', { done: totals.done, total: totals.all })}
                    </div>
                </div>

                {shortages.length > 0 && (
                    <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        <div className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle size={16} />{t('loadout.shortTitle')}</div>
                        {shortages.map(s => <div key={s.id}>{t('loadout.shortLine', { name: s.name, need: toNumber(s.need), stock: s.stock })}</div>)}
                    </div>
                )}

                <div className="space-y-4">
                    {data.events.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{t('loadout.noEvents')}</div>}
                    {lists.map(({ client, list }) => (
                        <EventChecklist key={client.id} client={client} list={list} phase={phase} pending={pending} actions={actionsFor(client)} />
                    ))}
                </div>
            </div>
        </div>
    )
}

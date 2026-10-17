import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Link2, Loader2, MessageSquare, Printer, Settings2, Truck } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDate, formatTimeRange, parseLocalDate, todayISO, toNumber } from '../lib/format'
import { isoDay } from '../lib/payments'
import { buildLoadList, dayShortages } from '../lib/loadout'
import { buildRunSheet, DEFAULT_SETTINGS, TRUCK_COLORS } from '../lib/runsheet'
import { loadoutHtml, printHtml, runSheetHtml } from '../lib/printDocs'
import EventChecklist from '../components/loadout/EventChecklist'
import TruckLane from '../components/runsheet/TruckLane'
import OpsSettingsSheet from '../components/runsheet/OpsSettingsSheet'
import Sheet from '../components/clients/Sheet'
import Segmented from '../components/loadout/Segmented'

const byTime = (a, b) => String(a.service_data?.event_time || '99').localeCompare(String(b.service_data?.event_time || '99'))
const STATUS_FIELD = { departed: 'departed_at', arrived: 'arrived_at', setup_done: 'setup_done_at', finished: 'finished_at' }

function nowMinutes() {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
}

// Old /loadout links (bookmarks, texts) open the Load-out tab of the same day
export function LoadoutRedirect() {
    const [params] = useSearchParams()
    const date = params.get('date')
    return <Navigate replace to={`/day?${date ? `date=${encodeURIComponent(date)}&` : ''}tab=loadout`} />
}

// Everything for one event day: truck schedules and load-out checklists
export default function EventDay() {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [booked, setBooked] = useState([])
    const [equipment, setEquipment] = useState([])
    const [menuLinks, setMenuLinks] = useState([])
    const [trucks, setTrucks] = useState([])
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [items, setItems] = useState([])
    const [runs, setRuns] = useState([])
    const [pending, setPending] = useState(() => new Set())
    const [phase, setPhase] = useState('load')
    const [showSettings, setShowSettings] = useState(false)
    const [share, setShare] = useState(null) // { scope, link }
    const [shareBusy, setShareBusy] = useState(false)
    const [copied, setCopied] = useState(false)
    const [ownerName, setOwnerName] = useState('')
    const [clock, setClock] = useState(nowMinutes)
    const today = todayISO()

    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const [ev, eq, ml, tr, ops] = await Promise.all([
                supabase.from('customers').select('id, full_name, phone, address, city, status, service_data').eq('user_id', user.id).eq('status', 'sold'),
                supabase.from('equipment').select('*').order('name'),
                supabase.from('menu_equipment').select('equipment_id, qty, services(name)'),
                supabase.from('trucks').select('*').order('created_at'),
                supabase.from('ops_settings').select('*').maybeSingle(),
            ])
            if (cancelled) return
            setOwnerName(user.user_metadata?.business_name || t('loadout.owner'))
            setBooked((ev.data || []).filter(c => isoDay(c.service_data?.event_date)))
            setEquipment(eq.data || [])
            setMenuLinks((ml.data || []).map(l => ({ equipment_id: l.equipment_id, qty: l.qty, service_name: l.services?.name || '' })))
            setTrucks(tr.data || [])
            if (ops.data) setSettings(ops.data)
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [t])

    useEffect(() => {
        const id = setInterval(() => setClock(nowMinutes()), 60000)
        return () => clearInterval(id)
    }, [])

    // Days with booked events, for jumping between them
    const eventDays = useMemo(() => [...new Set(booked.map(c => isoDay(c.service_data.event_date)))].sort(), [booked])
    const defaultDay = eventDays.find(d => d >= today) || today
    const day = isoDay(searchParams.get('date')) || defaultDay
    const tab = searchParams.get('tab') === 'loadout' ? 'loadout' : 'schedule'
    const go = (patch) => setSearchParams({ date: day, tab, ...patch })
    const setDay = (d) => { setShare(null); go({ date: d }) }
    const prevDay = [...eventDays].reverse().find(d => d < day)
    const nextDay = eventDays.find(d => d > day)

    const events = useMemo(() => booked.filter(c => isoDay(c.service_data.event_date) === day).sort(byTime), [booked, day])
    const eventIds = useMemo(() => events.map(c => c.id), [events])

    // Crews update checklists and status from their phones, so keep this page fresh
    useEffect(() => {
        if (!eventIds.length) return
        let cancelled = false
        async function refresh() {
            const [it, rn] = await Promise.all([
                supabase.from('event_load_items').select('*').in('customer_id', eventIds),
                supabase.from('event_runs').select('*').in('customer_id', eventIds),
            ])
            if (cancelled) return
            if (it.data) setItems(it.data)
            if (rn.data) setRuns(rn.data)
        }
        refresh()
        const id = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 20000)
        return () => { cancelled = true; clearInterval(id) }
    }, [eventIds])

    const sheet = useMemo(() => buildRunSheet({ events, runs: runs.filter(r => eventIds.includes(r.customer_id)), trucks, settings }), [events, runs, eventIds, trucks, settings])
    const lists = useMemo(() => events.map(client => ({
        client,
        list: buildLoadList({ client, equipment, menuLinks, items: items.filter(i => i.customer_id === client.id) }),
    })), [events, equipment, menuLinks, items])
    const shortages = useMemo(() => dayShortages(lists.map(l => l.list.items), equipment), [lists, equipment])
    const problems = sheet.lanes.reduce((n, l) => n + l.stops.filter(s => s.lateBy > 0).length, 0)

    // ---------- saving ----------
    async function saveRow(table, conflict, row, keyFields, rows, setRows) {
        const match = (r) => keyFields.every(k => r[k] === row[k])
        const original = rows.find(match)
        const putBack = (replacement) => setRows(prev => [...prev.filter(r => !match(r)), ...(replacement ? [replacement] : [])])
        putBack({ ...(original || {}), ...row })
        const key = keyFields.map(k => row[k]).join(':')
        setPending(prev => new Set(prev).add(key))
        const { data, error } = await supabase.from(table).upsert(row, { onConflict: conflict }).select().single()
        setPending(prev => { const next = new Set(prev); next.delete(key); return next })
        if (error) {
            putBack(original)
            alert(t('loadout.saveFailed', { message: error.message }))
            return false
        }
        putBack(data)
        return true
    }
    const saveItem = (clientId, itemKey, patch) =>
        saveRow('event_load_items', 'customer_id,item_key', { customer_id: clientId, item_key: itemKey, ...patch }, ['customer_id', 'item_key'], items, setItems)
    const saveRun = (clientId, patch) =>
        saveRow('event_runs', 'customer_id', { customer_id: clientId, ...patch, updated_at: new Date().toISOString() }, ['customer_id'], runs, setRuns)

    const runActions = {
        assign: (client, truckId) => saveRun(client.id, { truck_id: truckId }),
        setRun: (client, patch) => saveRun(client.id, patch),
        status: (client, step, done) => saveRun(client.id, { [STATUS_FIELD[step]]: done ? new Date().toISOString() : null, status_by: ownerName }),
    }

    const loadActions = (client) => ({
        toggle: (item, done) => {
            const now = done ? new Date().toISOString() : null
            const by = done ? ownerName : null
            return saveItem(client.id, item.key, phase === 'load' ? { loaded_at: now, loaded_by: by } : { returned_at: now, returned_by: by })
        },
        add: (label, qty) => saveItem(client.id, `custom:${crypto.randomUUID()}`, { label, qty }),
        remove: (item) => saveItem(client.id, item.key, { removed: true }),
        restore: (item) => saveItem(client.id, item.key, { removed: false }),
        setQty: (item) => {
            const answer = window.prompt(t('loadout.qtyPrompt', { name: item.name }), String(item.qty ?? ''))
            if (answer === null) return
            const n = Number(answer)
            if (!Number.isFinite(n) || n < 0) return alert(t('loadout.badQty'))
            return saveItem(client.id, item.key, { qty: n })
        },
    })

    // ---------- crew links ----------
    async function openShare(scope) {
        setShareBusy(true)
        let query = supabase.from('crew_links').select('*')
            .eq('day', day).is('revoked_at', null).gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false }).limit(1)
        query = scope ? query.eq('truck_id', scope) : query.is('truck_id', null)
        const { data: existing } = await query
        let link = existing?.[0]
        if (!link) {
            // Works through the end of the day after the event
            const expires = parseLocalDate(day)
            expires.setDate(expires.getDate() + 2)
            const { data, error } = await supabase.from('crew_links').insert({ day, truck_id: scope, expires_at: expires.toISOString() }).select().single()
            if (error) { setShareBusy(false); return alert(t('loadout.saveFailed', { message: error.message })) }
            link = data
        }
        setShareBusy(false)
        setCopied(false)
        setShare({ scope, link })
    }

    async function revokeShare() {
        if (!window.confirm(t('loadout.share.revokeConfirm'))) return
        const { error } = await supabase.from('crew_links').update({ revoked_at: new Date().toISOString() }).eq('token', share.link.token)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setShare(null)
    }

    const shareUrl = share ? `${window.location.origin}/crew/${share.link.token}` : ''
    const shareTruck = share?.scope ? trucks.find(x => x.id === share.scope) : null
    const shareText = share ? t('day.shareMessage', {
        who: shareTruck ? shareTruck.name : t('day.allTrucks'),
        date: formatDate(day, lng, { weekday: 'long', month: 'short', day: 'numeric' }),
        url: shareUrl,
    }) : ''

    async function copy() {
        try { await navigator.clipboard.writeText(shareUrl); setCopied(true) } catch { window.prompt(t('loadout.share.copyManually'), shareUrl) }
    }

    function print() {
        if (tab === 'loadout') printHtml(loadoutHtml({ day, events: lists.map(l => ({ client: l.client, items: l.list.items })), t, lng }))
        else printHtml(runSheetHtml({ day, sheet, t, lng }))
    }

    const totals = lists.reduce((s, l) => {
        const key = phase === 'load' ? 'loadedAt' : 'returnedAt'
        return { done: s.done + l.list.items.filter(i => i[key]).length, all: s.all + l.list.items.length }
    }, { done: 0, all: 0 })
    const btn = 'flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40'

    return (
        <div className="bg-slate-50 font-sans">
            <div className={`mx-auto px-4 py-5 md:py-8 ${tab === 'schedule' && trucks.length > 1 ? 'max-w-6xl' : 'max-w-3xl'}`}>
                {/* DAY PICKER */}
                <div className="mb-4 flex items-center justify-between gap-2">
                    <button onClick={() => prevDay && setDay(prevDay)} disabled={!prevDay} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-30" aria-label={t('loadout.prevDay')}><ChevronLeft size={20} /></button>
                    <label className="relative min-w-0 flex-1 cursor-pointer text-center">
                        <div className="truncate text-xl font-extrabold text-slate-900 first-letter:uppercase md:text-2xl">{formatDate(day, lng, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        <div className="text-sm text-slate-500">
                            {[day === today ? t('home.today') : '', events.length ? t('calendar.eventsCount', { count: events.length }) : ''].filter(Boolean).join(' · ')}
                        </div>
                        <input type="date" value={day} onChange={e => isoDay(e.target.value) && setDay(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t('loadout.pickDay')} />
                    </label>
                    <button onClick={() => nextDay && setDay(nextDay)} disabled={!nextDay} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-30" aria-label={t('loadout.nextDay')}><ChevronRight size={20} /></button>
                </div>

                <div className="mb-3">
                    <Segmented value={tab} onChange={v => go({ tab: v })} options={[['schedule', t('day.tabSchedule')], ['loadout', t('day.tabLoadout')]]} />
                </div>

                {/* ACTIONS */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button onClick={() => openShare(null)} disabled={!events.length || day < today || shareBusy} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                        {shareBusy ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}{t('day.shareShort')}
                    </button>
                    <button onClick={print} disabled={!events.length} className={btn}><Printer size={16} />{t('loadout.print')}</button>
                    {tab === 'schedule'
                        ? <button onClick={() => setShowSettings(true)} className={btn}><Truck size={16} />{t('day.trucksTimes')}</button>
                        : <button onClick={() => navigate('/loadout/equipment')} className={btn}><Settings2 size={16} />{t('loadout.equipment')}</button>}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-20 text-slate-400"><Loader2 size={20} className="animate-spin" />{t('common.loading')}</div>
                ) : events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                        {t('loadout.noEvents')}
                        {nextDay && <button onClick={() => setDay(nextDay)} className="mt-3 block w-full font-semibold text-blue-600">{t('loadout.goToNext', { date: formatDate(nextDay, lng, { weekday: 'short', month: 'short', day: 'numeric' }) })}</button>}
                    </div>
                ) : tab === 'schedule' ? (
                    <div className="space-y-4">
                        {trucks.length === 0 && (
                            <button onClick={() => setShowSettings(true)} className="flex w-full items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left">
                                <Truck size={22} className="mt-0.5 shrink-0 text-blue-700" />
                                <span>
                                    <span className="block font-bold text-blue-900">{t('day.setupTrucksTitle')}</span>
                                    <span className="block text-sm text-blue-800">{t('day.setupTrucksBody')}</span>
                                </span>
                            </button>
                        )}
                        {problems > 0 && (
                            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                                <AlertTriangle size={16} className="shrink-0" />{t('day.problemsBanner', { count: problems })}
                            </div>
                        )}

                        {sheet.unassigned.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-white">
                                <div className="px-4 pb-1 pt-3 text-sm font-bold text-amber-700">{t('day.unassigned', { count: sheet.unassigned.length })}</div>
                                {sheet.unassigned.map(client => (
                                    <div key={client.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 px-4 py-3 first:border-0">
                                        <div className="min-w-0 flex-1">
                                            <button onClick={() => navigate(`/clients?id=${client.id}`)} className="truncate text-left font-bold text-slate-900 hover:underline">{client.full_name || '—'}</button>
                                            <div className="text-sm text-slate-500">{[formatTimeRange(client.service_data?.event_time, client.service_data?.event_end_time, lng) || t('calendar.noTime'), client.city].filter(Boolean).join(' · ')}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {trucks.map(tr => (
                                                <button key={tr.id} onClick={() => runActions.assign(client, tr.id)} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                    <span className={`h-2 w-2 rounded-full ${TRUCK_COLORS[tr.color]?.dot}`} />{tr.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={`grid grid-cols-1 gap-6 ${trucks.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                            {sheet.lanes.map(lane => (
                                <div key={lane.truck.id} className="min-w-0">
                                    <TruckLane lane={lane} settings={sheet.settings} now={day === today ? clock : null} owner trucks={trucks} actions={runActions} onOpenClient={id => navigate(`/clients?id=${id}`)} />
                                    {lane.stops.length > 0 && day >= today && (
                                        <button onClick={() => openShare(lane.truck.id)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-600 hover:bg-white">
                                            <Link2 size={14} />{t('day.shareTruck', { name: lane.truck.name })}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {equipment.length === 0 && (
                            <button onClick={() => navigate('/loadout/equipment')} className="flex w-full items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left">
                                <Truck size={22} className="mt-0.5 shrink-0 text-blue-700" />
                                <span>
                                    <span className="block font-bold text-blue-900">{t('loadout.setupGearTitle')}</span>
                                    <span className="block text-sm text-blue-800">{t('loadout.setupGearBody')}</span>
                                </span>
                            </button>
                        )}
                        <div className="sticky top-0 z-10 -mx-4 bg-slate-50/95 px-4 py-2 backdrop-blur">
                            <Segmented value={phase} onChange={setPhase} options={[['load', t('loadout.phaseLoad')], ['return', t('loadout.phaseReturn')]]} />
                            <div className="mt-1.5 text-center text-xs font-semibold text-slate-500">
                                {t(phase === 'load' ? 'loadout.progressLoad' : 'loadout.progressReturn', { done: totals.done, total: totals.all })}
                            </div>
                        </div>
                        {shortages.length > 0 && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                <div className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle size={16} />{t('loadout.shortTitle')}</div>
                                {shortages.map(s => <div key={s.id}>{t('loadout.shortLine', { name: s.name, need: toNumber(s.need), stock: s.stock })}</div>)}
                            </div>
                        )}
                        {lists.map(({ client, list }) => (
                            <EventChecklist key={client.id} client={client} list={list} phase={phase} pending={pending} actions={loadActions(client)} onOpenClient={() => navigate(`/clients?id=${client.id}`)} />
                        ))}
                    </div>
                )}
            </div>

            {showSettings && (
                <OpsSettingsSheet settings={settings} trucks={trucks} onSettings={setSettings} onTrucks={setTrucks} onClose={() => setShowSettings(false)} />
            )}

            {share && (
                <Sheet title={shareTruck ? t('day.shareTruck', { name: shareTruck.name }) : t('loadout.shareWithCrew')} onClose={() => setShare(null)}>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            {shareTruck
                                ? t('day.shareExplainTruck', { name: shareTruck.name, date: formatDate(day, lng, { weekday: 'long', month: 'short', day: 'numeric' }) })
                                : t('loadout.share.explain', { date: formatDate(day, lng, { weekday: 'long', month: 'short', day: 'numeric' }) })}
                        </p>
                        <div className="break-all rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm text-slate-700">{shareUrl}</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={copy} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                                <Copy size={16} />{copied ? t('contract.linkCopied') : t('loadout.share.copy')}
                            </button>
                            <a href={`sms:?&body=${encodeURIComponent(shareText)}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">
                                <MessageSquare size={16} />{t('loadout.share.text')}
                            </a>
                        </div>
                        <p className="text-xs text-slate-500">{t('loadout.share.expires', { date: formatDate(new Date(new Date(share.link.expires_at).getTime() - 60000), lng, { weekday: 'short', month: 'short', day: 'numeric' }) })}</p>
                        <button onClick={revokeShare} className="text-sm font-semibold text-red-600 hover:underline">{t('loadout.share.revoke')}</button>
                    </div>
                </Sheet>
            )}
        </div>
    )
}

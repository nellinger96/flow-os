import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Link2, Loader2, MessageSquare, Navigation, Printer, Settings2, Truck } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDate, parseLocalDate, todayISO, toNumber } from '../lib/format'
import { isoDay } from '../lib/payments'
import { buildLoadList, dayRouteUrl, dayShortages } from '../lib/loadout'
import { loadoutHtml, printHtml } from '../lib/printDocs'
import EventChecklist from '../components/loadout/EventChecklist'
import Sheet from '../components/clients/Sheet'
import Segmented from '../components/loadout/Segmented'

const byTime = (a, b) => String(a.service_data?.event_time || '99').localeCompare(String(b.service_data?.event_time || '99'))

export default function Loadout() {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [booked, setBooked] = useState([])
    const [equipment, setEquipment] = useState([])
    const [menuLinks, setMenuLinks] = useState([])
    const [items, setItems] = useState([])
    const [pending, setPending] = useState(() => new Set())
    const [phase, setPhase] = useState('load')
    const [share, setShare] = useState(null)
    const [shareBusy, setShareBusy] = useState(false)
    const [copied, setCopied] = useState(false)
    const [ownerName, setOwnerName] = useState('')
    const today = todayISO()

    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const [ev, eq, ml] = await Promise.all([
                supabase.from('customers').select('id, full_name, phone, address, city, status, service_data').eq('user_id', user.id).eq('status', 'sold'),
                supabase.from('equipment').select('*').order('name'),
                supabase.from('menu_equipment').select('equipment_id, qty, services(name)'),
            ])
            if (cancelled) return
            setOwnerName(user.user_metadata?.business_name || t('loadout.owner'))
            setBooked((ev.data || []).filter(c => isoDay(c.service_data?.event_date)))
            setEquipment(eq.data || [])
            setMenuLinks((ml.data || []).map(l => ({ equipment_id: l.equipment_id, qty: l.qty, service_name: l.services?.name || '' })))
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [t])

    // Days with booked events, for jumping between them
    const eventDays = useMemo(() => [...new Set(booked.map(c => isoDay(c.service_data.event_date)))].sort(), [booked])
    const defaultDay = eventDays.find(d => d >= today) || today
    const day = isoDay(searchParams.get('date')) || defaultDay
    const setDay = (d) => { setShare(null); setSearchParams({ date: d }) }
    const prevDay = [...eventDays].reverse().find(d => d < day)
    const nextDay = eventDays.find(d => d > day)

    const events = useMemo(() => booked.filter(c => isoDay(c.service_data.event_date) === day).sort(byTime), [booked, day])
    const eventIds = useMemo(() => events.map(c => c.id), [events])

    // Crews check items off from their phones, so keep this page fresh.
    // Rows are filtered per event below, so rows from other days are harmless.
    useEffect(() => {
        if (!eventIds.length) return
        let cancelled = false
        async function refresh() {
            const { data } = await supabase.from('event_load_items').select('*').in('customer_id', eventIds)
            if (!cancelled && data) setItems(data)
        }
        refresh()
        const id = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 20000)
        return () => { cancelled = true; clearInterval(id) }
    }, [eventIds])

    const lists = useMemo(() => events.map(client => ({
        client,
        list: buildLoadList({ client, equipment, menuLinks, items: items.filter(i => i.customer_id === client.id) }),
    })), [events, equipment, menuLinks, items])
    const shortages = useMemo(() => dayShortages(lists.map(l => l.list.items), equipment), [lists, equipment])

    // Save one change to an event's item; the screen updates right away
    async function saveItem(clientId, itemKey, patch) {
        const key = `${clientId}:${itemKey}`
        const before = items
        setItems(prev => {
            const existing = prev.find(r => r.customer_id === clientId && r.item_key === itemKey)
            const rest = prev.filter(r => r !== existing)
            return [...rest, { ...(existing || { customer_id: clientId, item_key: itemKey, removed: false }), ...patch }]
        })
        setPending(prev => new Set(prev).add(key))
        const { data: row, error } = await supabase.from('event_load_items')
            .upsert({ customer_id: clientId, item_key: itemKey, ...patch }, { onConflict: 'customer_id,item_key' })
            .select().single()
        setPending(prev => { const next = new Set(prev); next.delete(key); return next })
        if (error) {
            setItems(before)
            alert(t('loadout.saveFailed', { message: error.message }))
            return false
        }
        setItems(prev => [...prev.filter(r => !(r.customer_id === clientId && r.item_key === itemKey)), row])
        return true
    }

    const actionsFor = (client) => ({
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

    async function openShare() {
        setShareBusy(true)
        const { data: existing } = await supabase.from('crew_links').select('*')
            .eq('day', day).is('revoked_at', null).gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false }).limit(1)
        let link = existing?.[0]
        if (!link) {
            // Works through the end of the day after the event
            const expires = parseLocalDate(day)
            expires.setDate(expires.getDate() + 2)
            const { data, error } = await supabase.from('crew_links').insert({ day, expires_at: expires.toISOString() }).select().single()
            if (error) { setShareBusy(false); return alert(t('loadout.saveFailed', { message: error.message })) }
            link = data
        }
        setShareBusy(false)
        setCopied(false)
        setShare(link)
    }

    async function revokeShare() {
        if (!window.confirm(t('loadout.share.revokeConfirm'))) return
        const { error } = await supabase.from('crew_links').update({ revoked_at: new Date().toISOString() }).eq('token', share.token)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        setShare(null)
    }

    const shareUrl = share ? `${window.location.origin}/crew/${share.token}` : ''
    const shareText = share ? t('loadout.share.message', { date: formatDate(day, lng, { weekday: 'long', month: 'short', day: 'numeric' }), url: shareUrl }) : ''
    const route = dayRouteUrl(events)
    const totals = lists.reduce((s, l) => {
        const key = phase === 'load' ? 'loadedAt' : 'returnedAt'
        return { done: s.done + l.list.items.filter(i => i[key]).length, all: s.all + l.list.items.length }
    }, { done: 0, all: 0 })

    async function copy() {
        try { await navigator.clipboard.writeText(shareUrl); setCopied(true) } catch { window.prompt(t('loadout.share.copyManually'), shareUrl) }
    }

    return (
        <div className="min-h-[calc(100vh-60px)] bg-slate-50 font-sans">
            <div className="mx-auto max-w-3xl px-4 py-5 md:py-8">
                {/* DAY PICKER */}
                <div className="mb-4 flex items-center justify-between gap-2">
                    <button onClick={() => prevDay && setDay(prevDay)} disabled={!prevDay} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-30" aria-label={t('loadout.prevDay')}><ChevronLeft size={20} /></button>
                    <label className="relative min-w-0 flex-1 cursor-pointer text-center">
                        <div className="truncate text-xl font-extrabold text-slate-900 first-letter:uppercase md:text-2xl">{formatDate(day, lng, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        <div className="text-sm text-slate-500">
                            {day === today ? t('home.today') : ''}{day === today && events.length ? ' · ' : ''}
                            {events.length ? t('calendar.eventsCount', { count: events.length }) : ''}
                        </div>
                        <input type="date" value={day} onChange={e => isoDay(e.target.value) && setDay(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t('loadout.pickDay')} />
                    </label>
                    <button onClick={() => nextDay && setDay(nextDay)} disabled={!nextDay} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-30" aria-label={t('loadout.nextDay')}><ChevronRight size={20} /></button>
                </div>

                {/* ACTIONS */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button onClick={openShare} disabled={!events.length || day < today || shareBusy} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                        {shareBusy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}{t('loadout.shareWithCrew')}
                    </button>
                    <button onClick={() => printHtml(loadoutHtml({ day, events: lists.map(l => ({ client: l.client, items: l.list.items })), t, lng }))} disabled={!events.length} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                        <Printer size={16} />{t('loadout.print')}
                    </button>
                    <a href={route || undefined} target="_blank" rel="noreferrer" aria-disabled={!route} className={`flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 ${route ? '' : 'pointer-events-none opacity-40'}`}>
                        <Navigation size={16} />{t('loadout.route')}
                    </a>
                    <button onClick={() => navigate('/loadout/equipment')} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        <Settings2 size={16} />{t('loadout.equipment')}
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-20 text-slate-400"><Loader2 size={20} className="animate-spin" />{t('common.loading')}</div>
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

                        {events.length > 0 && (
                            <div className="sticky top-0 z-10 -mx-4 bg-slate-50/95 px-4 py-2 backdrop-blur">
                                <Segmented value={phase} onChange={setPhase} options={[['load', t('loadout.phaseLoad')], ['return', t('loadout.phaseReturn')]]} />
                                <div className="mt-1.5 text-center text-xs font-semibold text-slate-500">
                                    {t(phase === 'load' ? 'loadout.progressLoad' : 'loadout.progressReturn', { done: totals.done, total: totals.all })}
                                </div>
                            </div>
                        )}

                        {shortages.length > 0 && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                <div className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle size={16} />{t('loadout.shortTitle')}</div>
                                {shortages.map(s => <div key={s.id}>{t('loadout.shortLine', { name: s.name, need: toNumber(s.need), stock: s.stock })}</div>)}
                            </div>
                        )}

                        {events.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                                {t('loadout.noEvents')}
                                {nextDay && <button onClick={() => setDay(nextDay)} className="mt-3 block w-full font-semibold text-blue-600">{t('loadout.goToNext', { date: formatDate(nextDay, lng, { weekday: 'short', month: 'short', day: 'numeric' }) })}</button>}
                            </div>
                        ) : lists.map(({ client, list }) => (
                            <EventChecklist
                                key={client.id}
                                client={client}
                                list={list}
                                phase={phase}
                                pending={pending}
                                actions={actionsFor(client)}
                                onOpenClient={() => navigate(`/clients?id=${client.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {share && (
                <Sheet title={t('loadout.shareWithCrew')} onClose={() => setShare(null)}>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">{t('loadout.share.explain', { date: formatDate(day, lng, { weekday: 'long', month: 'short', day: 'numeric' }) })}</p>
                        <div className="break-all rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm text-slate-700">{shareUrl}</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={copy} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                                <Copy size={16} />{copied ? t('contract.linkCopied') : t('loadout.share.copy')}
                            </button>
                            <a href={`sms:?&body=${encodeURIComponent(shareText)}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">
                                <MessageSquare size={16} />{t('loadout.share.text')}
                            </a>
                        </div>
                        <p className="text-xs text-slate-500">{t('loadout.share.expires', { date: formatDate(new Date(new Date(share.expires_at).getTime() - 60000), lng, { weekday: 'short', month: 'short', day: 'numeric' }) })}</p>
                        <button onClick={revokeShare} className="text-sm font-semibold text-red-600 hover:underline">{t('loadout.share.revoke')}</button>
                    </div>
                </Sheet>
            )}
        </div>
    )
}

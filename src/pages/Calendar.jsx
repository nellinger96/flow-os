import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, DollarSign, List, Loader2,
    MapPin, MessageSquare, Phone, Plus, Printer, ShoppingBag, Truck, Users,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { dialable, formatDate, formatTime, formatTimeRange, money, toNumber, todayISO } from '../lib/format'
import { PIPELINE } from '../lib/status'
import { isoDay as isoDate, paymentSummary } from '../lib/payments'
import { createLead } from '../lib/clients'
import { kitchenSheetHtml, printHtml } from '../lib/printDocs'
import Sheet from '../components/clients/Sheet'
import StatusBadge from '../components/clients/StatusBadge'
import GroceryModal from '../components/clients/GroceryModal'

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const CHIP = {
    lead: 'bg-slate-100 text-slate-700',
    tasting: 'bg-amber-100 text-amber-800',
    proposal: 'bg-blue-100 text-blue-800',
    sold: 'bg-green-100 text-green-800',
}
const DOT = { lead: 'bg-slate-400', tasting: 'bg-amber-500', proposal: 'bg-blue-500', sold: 'bg-green-600' }

function readPref(key, fallback) {
    try { return localStorage.getItem(key) || fallback } catch { return fallback }
}
function writePref(key, value) {
    try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

function Segmented({ value, onChange, options }) {
    return (
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {options.map(([key, label, Icon]) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${value === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    {Icon && <Icon size={15} />}{label}
                </button>
            ))}
        </div>
    )
}

function EventCard({ entry, onOpen, onMove, onGrocery }) {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const { client, status } = entry
    const sd = client.service_data || {}
    const phone = dialable(client.phone)
    const place = [client.address, client.city].filter(Boolean).join(', ')
    const guests = toNumber(sd.guest_count)

    const actions = [
        [Phone, t('summary.call'), phone ? `tel:${phone}` : null],
        [MessageSquare, t('summary.text'), phone ? `sms:${phone}` : null],
        [MapPin, t('summary.map'), place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null],
    ]
    const actionClass = 'flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold'

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <button onClick={onOpen} className="min-w-0 text-left">
                    <div className="truncate text-lg font-bold text-slate-900 hover:underline">{client.full_name || '—'}</div>
                </button>
                <StatusBadge status={status} small />
            </div>
            <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                    <Clock size={14} className="shrink-0" />
                    {formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('calendar.noTime')}
                    {guests > 0 && <> · {t('clients.guestsShort', { count: guests })}</>}
                </div>
                {place && <div className="flex items-center gap-1.5"><MapPin size={14} className="shrink-0" /><span className="truncate">{place}</span></div>}
                {sd.dietary_restrictions && (
                    <div className="flex items-center gap-1.5 font-semibold text-red-600">
                        <AlertTriangle size={14} className="shrink-0" /><span className="truncate">{sd.dietary_restrictions}</span>
                    </div>
                )}
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5">
                {actions.map(([Icon, label, href]) => href ? (
                    <a key={label} href={href} {...(Icon === MapPin ? { target: '_blank', rel: 'noreferrer' } : {})} className={`${actionClass} bg-blue-50 text-blue-700 active:bg-blue-100`}>
                        <Icon size={18} />{label}
                    </a>
                ) : (
                    <span key={label} className={`${actionClass} bg-slate-50 text-slate-300`}><Icon size={18} />{label}</span>
                ))}
                <button onClick={() => printHtml(kitchenSheetHtml({ client, t, lng }))} className={`${actionClass} bg-blue-50 text-blue-700 active:bg-blue-100`}>
                    <Printer size={18} />{t('calendar.kitchen')}
                </button>
                <button onClick={onGrocery} className={`${actionClass} bg-blue-50 text-blue-700 active:bg-blue-100`}>
                    <ShoppingBag size={18} />{t('calendar.grocery')}
                </button>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-500">
                    <span className="shrink-0 font-semibold">{t('calendar.moveTo')}</span>
                    <input
                        type="date"
                        value={isoDate(sd.event_date)}
                        onChange={e => onMove(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                </label>
                <button onClick={onOpen} className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white active:bg-slate-700">
                    {t('calendar.openClient')}
                </button>
            </div>
        </div>
    )
}

export default function CalendarPage() {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const navigate = useNavigate()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
    const [view, setView] = useState(() => readPref('calendar.view', window.matchMedia('(min-width: 768px)').matches ? 'month' : 'list'))
    const [filter, setFilter] = useState(() => readPref('calendar.filter', 'all'))
    const [showPayments, setShowPayments] = useState(() => readPref('calendar.payments', 'on') === 'on')
    const [openDay, setOpenDay] = useState(null)
    const [groceryFor, setGroceryFor] = useState(null)
    const [dragOver, setDragOver] = useState(null)
    const newDateRef = useRef(null)
    const today = todayISO()

    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const { data } = await supabase.from('customers').select('*').eq('user_id', user.id)
            if (cancelled) return
            setClients(data || [])
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [])

    const changeView = (v) => { setView(v); writePref('calendar.view', v) }
    const changeFilter = (f) => { setFilter(f); writePref('calendar.filter', f) }
    const togglePayments = () => setShowPayments(on => { writePref('calendar.payments', on ? 'off' : 'on'); return !on })

    // Week runs Sunday to Saturday, matching the grid
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
    const weekFrom = toISO(weekStart)
    const weekTo = toISO(weekEnd)

    const data = useMemo(() => {
        const eventsByDay = {}
        const paymentsByDay = {}
        const week = { events: 0, guests: 0, due: 0 }
        let overdue = 0

        clients.forEach(c => {
            const sd = c.service_data || {}
            const status = PIPELINE.includes(c.status) ? c.status : 'lead'
            const date = isoDate(sd.event_date)

            if (date && (filter === 'all' || status === 'sold')) {
                if (!eventsByDay[date]) eventsByDay[date] = []
                eventsByDay[date].push({ client: c, status })
            }
            if (date && status === 'sold' && date >= weekFrom && date <= weekTo) {
                week.events += 1
                week.guests += toNumber(sd.guest_count)
            }

            // Money due, only for booked jobs (same rules as Invoices)
            if (status !== 'sold') return
            const pay = paymentSummary(c, today)
            overdue += pay.overdueAmount
            pay.dues.forEach(d => {
                if (!d.date) return
                if (!d.late && d.date <= weekTo) week.due += d.amount
                if (!paymentsByDay[d.date]) paymentsByDay[d.date] = []
                paymentsByDay[d.date].push({ key: `${c.id}-${d.index ?? 'rest'}`, client: c, amount: d.amount, late: d.late })
            })
        })

        const timeOf = (e) => e.client.service_data?.event_time || '99'
        Object.values(eventsByDay).forEach(list => list.sort((a, b) => timeOf(a).localeCompare(timeOf(b))))
        return { eventsByDay, paymentsByDay, week, overdue }
    }, [clients, filter, today, weekFrom, weekTo])

    function dayInfo(iso) {
        const events = data.eventsByDay[iso] || []
        const payments = showPayments ? (data.paymentsByDay[iso] || []) : []
        const guests = events.reduce((s, e) => s + toNumber(e.client.service_data?.guest_count), 0)
        // Busy days are normal; flag only booked events that start within an hour of each other
        const starts = events
            .filter(e => e.status === 'sold')
            .map(e => /^(\d{1,2}):(\d{2})/.exec(e.client.service_data?.event_time || ''))
            .filter(Boolean)
            .map(m => Number(m[1]) * 60 + Number(m[2]))
            .sort((a, b) => a - b)
        const conflict = starts.some((m, i) => i > 0 && m - starts[i - 1] < 60)
        return { events, payments, guests, conflict }
    }

    const openClient = (id) => navigate(`/clients?id=${id}`)

    // Open the browser's date picker; where that isn't supported, open today's panel instead
    function pickNewDate() {
        try { newDateRef.current.showPicker() } catch { setOpenDay(today) }
    }

    async function createOn(iso) {
        if (!isoDate(iso)) return
        setBusy(true)
        const id = await createLead(t, { event_date: iso })
        setBusy(false)
        if (id) openClient(id)
    }

    async function moveEvent(client, rawDate) {
        const newDate = isoDate(rawDate)
        const oldDate = isoDate(client.service_data?.event_date)
        if (!newDate || newDate === oldDate) return

        let message = t('calendar.moveConfirm', { name: client.full_name || '—', date: formatDate(newDate, lng) })
        if (client.contract_url === 'SIGNED_DIGITALLY') message += `\n\n${t('calendar.moveSignedWarning')}`
        if (!window.confirm(message)) return

        setBusy(true)
        // Re-read first so only the date changes and nothing saved elsewhere is overwritten
        const { data: fresh, error: readError } = await supabase.from('customers').select('service_data').eq('id', client.id).single()
        const result = readError
            ? { error: readError }
            : await supabase.from('customers')
                .update({ service_data: { ...(fresh.service_data || {}), event_date: newDate } })
                .eq('id', client.id).select().single()
        setBusy(false)
        if (result.error) return alert(t('calendar.moveFailed', { message: result.error.message }))

        setClients(prev => prev.map(c => (c.id === client.id ? result.data : c)))
        if (openDay) {
            setOpenDay(newDate)
            const d = new Date(`${newDate}T00:00:00`)
            setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
        }
    }

    function onDrop(e, iso) {
        e.preventDefault()
        setDragOver(null)
        const client = clients.find(c => String(c.id) === e.dataTransfer.getData('text/plain'))
        if (client) moveEvent(client, iso)
    }

    // --- MONTH MATH ---
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingBlanks = cursor.getDay()
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, month, i + 1)))
    const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(new Date(2023, 0, 1 + i), lng, { weekday: 'short' }))
    const shiftMonth = (n) => setCursor(new Date(year, month + n, 1))
    const goToday = () => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }

    const listDays = monthDays.filter(iso => { const d = dayInfo(iso); return d.events.length || d.payments.length })
    const panel = openDay ? dayInfo(openDay) : null

    return (
        <div className="min-h-[calc(100vh-60px)] bg-slate-50 font-sans">
            <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">

                {/* THIS WEEK */}
                <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('calendar.thisWeek')}</span>
                    {data.week.events === 0 ? (
                        <span className="text-slate-300">{t('calendar.nothingThisWeek')}</span>
                    ) : (
                        <>
                            <span className="flex items-center gap-1.5"><CalendarDays size={15} className="text-green-400" />{t('calendar.bookedEvents', { count: data.week.events })}</span>
                            <span className="flex items-center gap-1.5"><Users size={15} className="text-blue-300" />{t('clients.guestsShort', { count: data.week.guests })}</span>
                        </>
                    )}
                    {data.week.due > 0 && <span className="flex items-center gap-1.5"><DollarSign size={15} className="text-amber-300" />{t('calendar.dueThisWeek', { amount: money(data.week.due) })}</span>}
                    {data.overdue > 0 && (
                        <button onClick={() => navigate('/invoices')} className="ml-auto flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 font-semibold text-red-300 hover:bg-red-500/30">
                            <AlertTriangle size={14} />{t('calendar.overdue', { amount: money(data.overdue) })}
                        </button>
                    )}
                </div>

                {/* HEADER */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label={t('calendar.prevMonth')}><ChevronLeft size={18} /></button>
                        <button onClick={() => shiftMonth(1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label={t('calendar.nextMonth')}><ChevronRight size={18} /></button>
                        <h1 className="ml-1 text-xl font-extrabold text-slate-900 first-letter:uppercase md:text-2xl">{formatDate(cursor, lng, { month: 'long', year: 'numeric' })}</h1>
                        <button onClick={goToday} className="ml-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t('calendar.today')}</button>
                        {(loading || busy) && <Loader2 size={18} className="animate-spin text-slate-400" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Segmented value={view} onChange={changeView} options={[['month', t('calendar.month'), CalendarDays], ['list', t('calendar.list'), List]]} />
                        <Segmented value={filter} onChange={changeFilter} options={[['all', t('calendar.allEvents')], ['booked', t('calendar.bookedOnly')]]} />
                        <button
                            onClick={togglePayments}
                            aria-pressed={showPayments}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${showPayments ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-500'}`}
                        >
                            <DollarSign size={15} />{t('calendar.payments')}
                        </button>
                        <div className="relative">
                            <button onClick={pickNewDate} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                                <Plus size={16} />{t('calendar.newEvent')}
                            </button>
                            <input ref={newDateRef} type="date" tabIndex={-1} aria-hidden="true" onChange={e => createOn(e.target.value)} className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0" />
                        </div>
                    </div>
                </div>

                {/* LEGEND */}
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {PIPELINE.filter(s => filter === 'all' || s === 'sold').map(s => (
                        <span key={s} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${DOT[s]}`} />{t(`status.${s}`)}</span>
                    ))}
                    {showPayments && <span className="flex items-center gap-1.5"><DollarSign size={12} className="text-amber-600" />{t('calendar.paymentDue')}</span>}
                    {view === 'month' && <span className="hidden md:inline">· {t('calendar.dragHint')}</span>}
                </div>

                {view === 'month' ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                            {weekdays.map(w => <div key={w} className="py-2 text-center text-xs font-bold uppercase text-slate-500">{w}</div>)}
                        </div>
                        <div className="grid grid-cols-7">
                            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} className="border-b border-r border-slate-100 bg-slate-50/50" />)}
                            {monthDays.map((iso, i) => {
                                const d = dayInfo(iso)
                                const isToday = iso === today
                                const past = iso < today
                                // Up to 4 lines per cell: events first, then payments
                                const shownEvents = d.events.slice(0, 3)
                                const shownPayments = d.payments.slice(0, Math.min(2, 4 - shownEvents.length))
                                const hidden = d.events.length + d.payments.length - shownEvents.length - shownPayments.length
                                return (
                                    <div
                                        key={iso}
                                        onClick={() => setOpenDay(iso)}
                                        onDragOver={e => { e.preventDefault(); setDragOver(iso) }}
                                        onDragLeave={() => setDragOver(cur => (cur === iso ? null : cur))}
                                        onDrop={e => onDrop(e, iso)}
                                        className={`group relative min-h-[64px] cursor-pointer border-b border-r border-slate-100 p-1 md:min-h-[118px] md:p-1.5 ${(leadingBlanks + i) % 7 === 6 ? 'border-r-0' : ''} ${dragOver === iso ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-slate-50'} ${d.conflict ? 'bg-red-50/60' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-blue-600 text-white' : past ? 'text-slate-400' : 'text-slate-700'}`}>
                                                {i + 1}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                {d.conflict && <AlertTriangle size={13} className="text-red-500" aria-label={t('calendar.doubleBooked')} />}
                                                {d.guests > 0 && <span className="hidden text-[10px] font-semibold text-slate-400 md:inline">{t('calendar.guestsTiny', { count: d.guests })}</span>}
                                                <Plus size={14} className="hidden text-slate-300 group-hover:md:block" />
                                            </span>
                                        </div>

                                        {/* Phones: dots */}
                                        <div className="mt-1 flex flex-wrap justify-center gap-0.5 md:hidden">
                                            {d.events.slice(0, 4).map(e => <span key={e.client.id} className={`h-1.5 w-1.5 rounded-full ${DOT[e.status]}`} />)}
                                            {d.payments.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ring-1 ring-amber-600" />}
                                        </div>

                                        {/* Larger screens: chips */}
                                        <div className="mt-1 hidden space-y-1 md:block">
                                            {shownEvents.map(e => (
                                                <div
                                                    key={e.client.id}
                                                    draggable
                                                    onDragStart={ev => { ev.stopPropagation(); ev.dataTransfer.setData('text/plain', String(e.client.id)) }}
                                                    onClick={ev => { ev.stopPropagation(); openClient(e.client.id) }}
                                                    title={e.client.full_name}
                                                    className={`cursor-grab truncate rounded px-1.5 py-0.5 text-[11px] font-semibold hover:brightness-95 active:cursor-grabbing ${CHIP[e.status]}`}
                                                >
                                                    {e.client.service_data?.event_time && <span className="mr-1 opacity-70">{formatTime(e.client.service_data.event_time, lng)}</span>}
                                                    {e.client.full_name || '—'}
                                                </div>
                                            ))}
                                            {shownPayments.map(p => (
                                                <div key={p.key} className={`truncate rounded border px-1.5 py-0.5 text-[11px] font-semibold ${p.late ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                                                    {money(p.amount)} · {p.client.full_name}
                                                </div>
                                            ))}
                                            {hidden > 0 && <div className="px-1 text-[11px] font-semibold text-slate-500">{t('calendar.more', { count: hidden })}</div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {!loading && listDays.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">{t('calendar.noEventsMonth')}</div>
                        )}
                        {listDays.map(iso => {
                            const d = dayInfo(iso)
                            const past = iso < today
                            return (
                                <button key={iso} onClick={() => setOpenDay(iso)} className={`block w-full overflow-hidden rounded-2xl border bg-white text-left active:bg-slate-50 ${d.conflict ? 'border-red-200' : 'border-slate-200'} ${past ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                                        <span className="text-sm inline-block font-bold text-slate-900 first-letter:uppercase">
                                            {formatDate(iso, lng, { weekday: 'long', month: 'short', day: 'numeric' })}
                                            {iso === today && <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{t('calendar.today')}</span>}
                                        </span>
                                        <span className="flex items-center gap-2 text-xs text-slate-500">
                                            {d.conflict && <span className="flex items-center gap-1 font-semibold text-red-600"><AlertTriangle size={13} />{t('calendar.doubleBookedShort')}</span>}
                                            {d.guests > 0 && t('clients.guestsShort', { count: d.guests })}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {d.events.map(e => (
                                            <div key={e.client.id} className="flex items-center gap-3 px-4 py-3">
                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[e.status]}`} />
                                                <span className="w-16 shrink-0 text-sm text-slate-500">{formatTime(e.client.service_data?.event_time, lng) || '—'}</span>
                                                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{e.client.full_name || '—'}</span>
                                                {e.client.city && <span className="hidden truncate text-sm text-slate-500 sm:inline">{e.client.city}</span>}
                                                <StatusBadge status={e.status} small />
                                            </div>
                                        ))}
                                        {d.payments.map(p => (
                                            <div key={p.key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                                <DollarSign size={14} className={`shrink-0 ${p.late ? 'text-red-600' : 'text-amber-600'}`} />
                                                <span className={`w-16 shrink-0 font-bold ${p.late ? 'text-red-700' : 'text-amber-800'}`}>{money(p.amount)}</span>
                                                <span className="min-w-0 flex-1 truncate text-slate-600">{t(p.late ? 'calendar.paymentLateFrom' : 'calendar.paymentFrom', { name: p.client.full_name || '—' })}</span>
                                            </div>
                                        ))}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* DAY PANEL */}
            {openDay && panel && (
                <Sheet
                    title={formatDate(openDay, lng, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    onClose={() => setOpenDay(null)}
                    footer={
                        <button onClick={() => createOn(openDay)} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white shadow active:bg-blue-700 disabled:opacity-60">
                            {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            {t('calendar.newEventOn', { date: formatDate(openDay, lng, { month: 'short', day: 'numeric' }) })}
                        </button>
                    }
                >
                    <div className="space-y-3">
                        {panel.conflict && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                                <AlertTriangle size={18} className="shrink-0" />
                                {t('calendar.doubleBooked')}
                            </div>
                        )}
                        {panel.events.length > 0 && panel.guests > 0 && (
                            <div className="text-sm text-slate-500">
                                {t('calendar.eventsCount', { count: panel.events.length })} · {t('clients.guestsShort', { count: panel.guests })}
                            </div>
                        )}
                        {panel.events.some(e => e.status === 'sold') && (
                            <button onClick={() => navigate(`/day?date=${openDay}`)} className="flex w-full items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-left text-blue-800 hover:bg-blue-100">
                                <Truck size={20} className="shrink-0" />
                                <span className="flex-1 font-bold">{t('day.planForDay')}</span>
                                <ChevronRight size={18} />
                            </button>
                        )}
                        {panel.events.map(e => (
                            <EventCard
                                key={e.client.id}
                                entry={e}
                                onOpen={() => openClient(e.client.id)}
                                onMove={(date) => moveEvent(e.client, date)}
                                onGrocery={() => setGroceryFor(e.client)}
                            />
                        ))}

                        {panel.payments.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="border-b border-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('calendar.paymentsDue')}</div>
                                {panel.payments.map(p => (
                                    <button key={p.key} onClick={() => openClient(p.client.id)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 active:bg-slate-50 md:hover:bg-slate-50">
                                        <DollarSign size={16} className={p.late ? 'text-red-600' : 'text-amber-600'} />
                                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{p.client.full_name || '—'}</span>
                                        <span className={`font-bold ${p.late ? 'text-red-700' : 'text-slate-900'}`}>{money(p.amount)}</span>
                                        {p.late && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">{t('calendar.late')}</span>}
                                        <ChevronRight size={16} className="text-slate-300" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {panel.events.length === 0 && panel.payments.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">{t('calendar.noEventsDay')}</div>
                        )}
                    </div>
                </Sheet>
            )}

            {groceryFor && <GroceryModal client={groceryFor} onClose={() => setGroceryFor(null)} />}
        </div>
    )
}

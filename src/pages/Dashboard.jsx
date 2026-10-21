import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Clock, DollarSign, FileSignature, Loader2, MapPin, Phone, Truck, UserPlus, Users, UserRound,
} from 'lucide-react'
import { dialable, formatDate, formatTimeRange, money, parseLocalDate, toNumber, todayISO } from '../lib/format'
import { isoDay, paymentSummary } from '../lib/payments'
import { createLead } from '../lib/clients'
import { ALL_MENU_FIELDS } from '../lib/menu'
import StatusBadge from '../components/clients/StatusBadge'

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function addDays(iso, n) {
    const d = parseLocalDate(iso)
    d.setDate(d.getDate() + n)
    return toISO(d)
}
const daysBetween = (from, to) => Math.round((parseLocalDate(to) - parseLocalDate(from)) / 86400000)

const OPEN_STAGES = ['lead', 'tasting', 'proposal']
const TONE = {
    red: { icon: 'bg-red-100 text-red-600', text: 'text-red-700' },
    amber: { icon: 'bg-amber-100 text-amber-700', text: 'text-amber-800' },
    blue: { icon: 'bg-blue-100 text-blue-700', text: 'text-slate-600' },
}
const TONE_ORDER = { red: 0, amber: 1, blue: 2 }

function Card({ title, action, children, className = '' }) {
    return (
        <section className={`rounded-2xl border border-slate-200 bg-white ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 md:px-5">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    {action}
                </div>
            )}
            {children}
        </section>
    )
}

function LinkButton({ onClick, children }) {
    return (
        <button onClick={onClick} className="-my-2 flex items-center gap-0.5 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
            {children}<ChevronRight size={16} />
        </button>
    )
}

// One event with what the caterer needs on the day
function EventBlock({ client, today, big, onOpen, onLoadout }) {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const sd = client.service_data || {}
    const date = isoDay(sd.event_date)
    const phone = dialable(client.phone)
    const place = [client.address, client.city].filter(Boolean).join(', ')
    const guests = toNumber(sd.guest_count)
    const days = date ? daysBetween(today, date) : null
    const when = days === 0 ? t('home.today') : days === 1 ? t('home.tomorrow') : t('home.inDays', { count: days })

    const btn = 'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold'
    return (
        <div className="px-4 py-3 md:px-5">
            <div className="flex items-start justify-between gap-3">
                <button onClick={onOpen} className="min-w-0 text-left">
                    <div className={`truncate font-extrabold text-slate-900 hover:underline ${big ? 'text-xl' : 'text-base'}`}>{client.full_name || '—'}</div>
                </button>
                {big && days !== null && days > 0 && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{when}</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                {big && date && <span className="flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(date, lng, { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
                <span className="flex items-center gap-1.5"><Clock size={14} />{formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('calendar.noTime')}</span>
                {guests > 0 && <span className="flex items-center gap-1.5"><Users size={14} />{t('clients.guestsShort', { count: guests })}</span>}
                {client.city && <span className="flex items-center gap-1.5"><MapPin size={14} />{client.city}</span>}
            </div>
            {sd.dietary_restrictions && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-sm font-semibold text-red-700">
                    <AlertTriangle size={14} className="shrink-0" /><span className="truncate">{t('doc.dietaryAlert')}: {sd.dietary_restrictions}</span>
                </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={onOpen} className={`${btn} bg-slate-900 text-white hover:bg-slate-700`}>{t('calendar.openClient')}</button>
                {days !== null && days <= 1 && <button onClick={onLoadout} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}><Truck size={16} />{t('nav.eventDay')}</button>}
                {place && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`} target="_blank" rel="noreferrer" className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100`}><MapPin size={16} />{t('summary.map')}</a>}
                {phone && <a href={`tel:${phone}`} className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100`}><Phone size={16} />{t('summary.call')}</a>}
            </div>
        </div>
    )
}

export default function Dashboard() {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const [user, setUser] = useState(null)
    const [searchParams, setSearchParams] = useSearchParams()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [showAllTodos, setShowAllTodos] = useState(false)
    const navigate = useNavigate()

    // --- 1. THE STRIPE CATCHER ---
    // Stripe Connect sends the user back here with ?code=... after they link their account
    useEffect(() => {
        const stripeCode = searchParams.get('code')
        if (stripeCode) finishStripeConnection(stripeCode)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    async function finishStripeConnection(code) {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error("No user logged in.")

            const { error } = await supabase.functions.invoke('stripe-connect', {
                body: { code: code, user_id: user.id }
            })
            if (error) throw error

            alert("Bank Account Connected Successfully!")
            setSearchParams({})
            navigate('/settings')
        } catch (error) {
            console.error("Stripe Connection Failed:", error)
            alert("Failed to connect Stripe. Check the console.")
            setSearchParams({})
        }
    }

    // --- 2. DATA ---
    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const { data } = await supabase.from('customers').select('*').eq('user_id', user.id)
            if (cancelled) return
            setUser(user)
            setClients(data || [])
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [])

    const today = todayISO()

    const d = useMemo(() => {
        const in7 = addDays(today, 7)
        const in14 = addDays(today, 14)
        const in30 = addDays(today, 30)
        const weekStart = addDays(today, -parseLocalDate(today).getDay())
        const weekEnd = addDays(weekStart, 6)
        const monthPrefix = today.slice(0, 7)

        const rows = clients.filter(c => c.status !== 'canceled').map(c => ({
            client: c,
            status: OPEN_STAGES.includes(c.status) || c.status === 'sold' ? c.status : 'lead',
            date: isoDay(c.service_data?.event_date),
        }))
        const booked = rows.filter(r => r.status === 'sold')
        const byDate = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.client.service_data?.event_time || '99').localeCompare(b.client.service_data?.event_time || '99')

        const todayEvents = booked.filter(r => r.date === today).sort(byDate)
        const upcoming = booked.filter(r => r.date > today).sort(byDate)

        const week = { events: 0, guests: 0, due: 0 }
        const cash = { owed: 0, overdue: 0, overdueClients: 0, dueSoon: 0, bookedThisMonth: 0 }
        const todos = []
        const add = (tone, kind, r, title, detail, sortDate) => todos.push({ key: `${kind}-${r.client.id}`, tone, kind, client: r.client, title, detail, sortDate: sortDate || r.date || '9999' })
        const fmt = (iso) => formatDate(iso, lng, { month: 'short', day: 'numeric' })

        booked.forEach(r => {
            const sd = r.client.service_data || {}
            if (r.date >= weekStart && r.date <= weekEnd) {
                week.events += 1
                week.guests += toNumber(sd.guest_count)
            }
            if (r.date.startsWith(monthPrefix)) cash.bookedThisMonth += toNumber(r.client.job_price)

            const pay = paymentSummary(r.client, today)
            cash.owed += pay.balance
            if (pay.overdueAmount > 0) {
                cash.overdue += pay.overdueAmount
                cash.overdueClients += 1
                const oldest = pay.dues.find(x => x.late)
                add('red', 'overdue', r, t('home.todo.overdue', { amount: money(pay.overdueAmount) }), t('home.todo.wasDue', { date: fmt(oldest.date) }), oldest.date)
            }
            const soon = pay.dues.filter(x => !x.late && x.date && x.date <= in7)
            if (soon.length) {
                add('amber', 'due', r, t('home.todo.dueSoon', { amount: money(soon.reduce((s, x) => s + x.amount, 0)) }), t('home.todo.dueOn', { date: fmt(soon[0].date) }), soon[0].date)
            }
            pay.dues.forEach(x => {
                if (x.late || !x.date) return
                if (x.date <= weekEnd) week.due += x.amount
                if (x.date <= in30) cash.dueSoon += x.amount
            })

            // Booked events coming up soon that are missing details
            if (r.date >= today && r.date <= in14) {
                const missing = []
                if (!ALL_MENU_FIELDS.some(f => Array.isArray(sd[f]) && sd[f].length)) missing.push(t('home.missing.menu'))
                if (!toNumber(sd.guest_count)) missing.push(t('home.missing.guests'))
                if (!sd.event_time) missing.push(t('home.missing.time'))
                if (!sd.event_end_time) missing.push(t('home.missing.endTime'))
                if (!r.client.address?.trim()) missing.push(t('home.missing.address'))
                if (toNumber(r.client.job_price) > 0 && !(sd.payment_plan || []).length) missing.push(t('home.missing.schedule'))
                if (!r.client.contract_url) missing.push(t('home.missing.contract'))
                if (missing.length) add('amber', 'missing', r, t('home.todo.missing', { list: missing.join(', ') }), t('home.todo.eventOn', { date: fmt(r.date) }))
            }
        })

        // Pipeline: open quotes for dates that haven't passed
        const stages = Object.fromEntries(OPEN_STAGES.map(s => [s, { count: 0, value: 0 }]))
        let undated = 0
        rows.filter(r => OPEN_STAGES.includes(r.status)).forEach(r => {
            if (!r.date) { undated += 1; return }
            if (r.date < today) return
            stages[r.status].count += 1
            stages[r.status].value += toNumber(r.client.job_price)

            if (r.status === 'proposal' && !r.client.contract_url) {
                add('blue', 'proposal', r, t('home.todo.proposal'), t('home.todo.eventOn', { date: fmt(r.date) }))
            } else if (r.date <= in30) {
                add('blue', 'unbooked', r, t('home.todo.unbooked', { stage: t(`status.${r.status}`), count: daysBetween(today, r.date) }), t('home.todo.eventOn', { date: fmt(r.date) }))
            }
        })
        const pipeline = {
            stages,
            undated,
            count: OPEN_STAGES.reduce((s, k) => s + stages[k].count, 0),
            value: OPEN_STAGES.reduce((s, k) => s + stages[k].value, 0),
        }

        todos.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.sortDate.localeCompare(b.sortDate))
        return { todayEvents, nextUp: upcoming[0] || null, week, cash, todos, pipeline }
    }, [clients, today, t, lng])

    const openClient = (id) => navigate(`/clients?id=${id}`)

    async function newClient(serviceData) {
        setBusy(true)
        const id = await createLead(t, serviceData)
        setBusy(false)
        if (id) openClient(id)
    }


    const hour = new Date().getHours()
    const greetingKey = hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening'
    const businessName = user?.user_metadata?.business_name
    const todos = showAllTodos ? d.todos : d.todos.slice(0, 4)
    const ICONS = { overdue: DollarSign, due: DollarSign, missing: AlertTriangle, proposal: FileSignature, unbooked: UserRound }

    return (
        <div className="bg-slate-50 font-sans">
            <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">

                {/* HEADER + QUICK ACTIONS */}
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-500 first-letter:uppercase">{formatDate(today, lng, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
                            {businessName ? t(greetingKey, { name: businessName }) : t(`${greetingKey}Plain`)}
                        </h1>
                    </div>
                    <button onClick={() => newClient({})} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto">
                        {busy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}{t('home.newClient')}
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-24 text-slate-400"><Loader2 size={20} className="animate-spin" />{t('common.loading')}</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* LEFT: today + to-dos */}
                        <div className="min-w-0 space-y-4 lg:col-span-2">
                            <Card title={d.todayEvents.length ? t('home.todayTitle', { count: d.todayEvents.length }) : t('home.nextUp')} action={<LinkButton onClick={() => navigate('/calendar')}>{t('nav.calendar')}</LinkButton>}>
                                {d.todayEvents.length > 0 ? (
                                    <div className="divide-y divide-slate-100 pb-1">
                                        {d.todayEvents.map(r => <EventBlock key={r.client.id} client={r.client} today={today} onOpen={() => openClient(r.client.id)} onLoadout={() => navigate(`/day?date=${r.date}`)} />)}
                                    </div>
                                ) : d.nextUp ? (
                                    <>
                                        <div className="px-4 text-sm text-slate-500 md:px-5">{t('home.noEventsToday')}</div>
                                        <EventBlock client={d.nextUp.client} today={today} big onOpen={() => openClient(d.nextUp.client.id)} onLoadout={() => navigate(`/day?date=${d.nextUp.date}`)} />
                                    </>
                                ) : (
                                    <div className="px-5 pb-6 pt-2 text-slate-500">{t('home.nothingUpcoming')}</div>
                                )}
                                {d.todayEvents.length > 0 && d.nextUp && (
                                    <button onClick={() => openClient(d.nextUp.client.id)} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-50 md:px-5">
                                        <span className="font-semibold text-slate-500">{t('home.after')}</span>
                                        <span className="min-w-0 flex-1 truncate">{formatDate(d.nextUp.date, lng, { weekday: 'short', month: 'short', day: 'numeric' })} · {d.nextUp.client.full_name}</span>
                                        <ChevronRight size={16} className="text-slate-300" />
                                    </button>
                                )}
                            </Card>

                            <Card title={t('home.attention')} action={d.todos.length > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-700">{d.todos.length}</span>}>
                                {d.todos.length === 0 ? (
                                    <div className="flex items-center gap-2 px-5 pb-5 pt-1 text-sm font-semibold text-green-700"><CheckCircle2 size={18} />{t('home.allCaughtUp')}</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {todos.map(item => {
                                            const Icon = ICONS[item.kind]
                                            return (
                                                <button key={item.key} onClick={() => openClient(item.client.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 md:px-5">
                                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE[item.tone].icon}`}><Icon size={18} /></span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-center gap-2">
                                                            <span className="truncate font-semibold text-slate-900">{item.client.full_name || '—'}</span>
                                                            {item.kind === 'unbooked' || item.kind === 'proposal' ? <StatusBadge status={item.client.status} small /> : null}
                                                        </span>
                                                        <span className={`block truncate text-sm ${TONE[item.tone].text}`}>{item.title} · <span className="text-slate-500">{item.detail}</span></span>
                                                    </span>
                                                    <ChevronRight size={18} className="shrink-0 text-slate-300" />
                                                </button>
                                            )
                                        })}
                                        {d.todos.length > 4 && (
                                            <button onClick={() => setShowAllTodos(v => !v)} className="w-full px-5 py-3 text-center text-sm font-semibold text-blue-600 hover:bg-slate-50">
                                                {showAllTodos ? t('home.showLess') : t('home.showAll', { count: d.todos.length })}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* RIGHT: week, money, pipeline */}
                        <div className="min-w-0 space-y-4">
                            <Card title={t('calendar.thisWeek')}>
                                <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center md:px-5">
                                    <div className="rounded-xl bg-slate-50 py-3"><div className="text-2xl font-extrabold text-slate-900">{d.week.events}</div><div className="text-sm text-slate-500">{t('home.events')}</div></div>
                                    <div className="rounded-xl bg-slate-50 py-3"><div className="text-2xl font-extrabold text-slate-900">{d.week.guests}</div><div className="text-sm text-slate-500">{t('home.guests')}</div></div>
                                    <div className="rounded-xl bg-slate-50 py-3"><div className="text-2xl font-extrabold text-slate-900">{money(d.week.due)}</div><div className="text-sm text-slate-500">{t('home.due')}</div></div>
                                </div>
                            </Card>

                            <Card title={t('home.money')} action={<LinkButton onClick={() => navigate('/invoices')}>{t('nav.invoices')}</LinkButton>}>
                                <dl className="divide-y divide-slate-100 px-4 pb-2 md:px-5">
                                    {[
                                        [t('home.overdue'), d.cash.overdue, d.cash.overdue > 0 ? 'text-red-600' : 'text-slate-900', d.cash.overdueClients > 0 ? t('home.clientsCount', { count: d.cash.overdueClients }) : null],
                                        [t('home.dueNext30'), d.cash.dueSoon, 'text-slate-900'],
                                        [t('home.stillOwed'), d.cash.owed, 'text-slate-900'],
                                    ].map(([label, value, color, note]) => (
                                        <div key={label} className="flex items-baseline justify-between gap-3 py-2.5">
                                            <dt className="text-base text-slate-700">{label}{note && <span className="ml-1.5 text-sm text-slate-400">· {note}</span>}</dt>
                                            <dd className={`text-lg font-extrabold tabular-nums ${color}`}>{money(value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </Card>

                            {d.pipeline.count > 0 && (
                                <button onClick={() => navigate('/clients')} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 md:p-5">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-lg font-bold text-slate-900">{t('home.pipeline')}</span>
                                        <span className="block text-sm text-slate-500">{t('home.openQuotes', { count: d.pipeline.count })}</span>
                                    </span>
                                    <span className="text-lg font-extrabold tabular-nums text-slate-900">{money(d.pipeline.value)}</span>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

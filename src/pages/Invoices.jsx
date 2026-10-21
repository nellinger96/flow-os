import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatDate, money, toNumber, todayISO } from '../lib/format'
import { paymentSummary } from '../lib/payments'
import { cancellationPending } from '../lib/cancellation'
import Segmented from '../components/loadout/Segmented'

const PILL = {
    Overdue: 'bg-red-100 text-red-800',
    Partial: 'bg-amber-100 text-amber-800',
    Unpaid: 'bg-slate-100 text-slate-700',
    Paid: 'bg-green-100 text-green-800',
    Canceled: 'bg-red-100 text-red-800',
}

// Who owes money for booked events, and when
export default function Invoices() {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const navigate = useNavigate()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('owing')

    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            // Only booked jobs are owed money; leads, tastings and quotes are not
            const { data } = await supabase.from('customers')
                .select('id, full_name, job_price, service_data, status')
                .eq('user_id', user.id)
                .in('status', ['sold', 'canceled'])
            if (cancelled) return
            const today = todayISO()
            const list = (data || []).flatMap(c => {
                const base = { id: c.id, name: c.full_name || '—', date: c.service_data?.event_date || c.service_data?.service_date || '' }
                if (c.status !== 'canceled') return [{ ...base, ...paymentSummary(c, today) }]
                // Canceled: only listed while a fee is still owed or a refund still has to go out
                if (!cancellationPending(c)) return []
                const x = c.service_data.cancellation
                const owes = x.fee_paid ? 0 : toNumber(x.owes)
                return [{
                    ...base, status: 'Canceled', canceled: true, total: toNumber(x.total), paid: toNumber(x.paid),
                    balance: owes, overdueAmount: 0, nextDue: null, refundDue: x.refund_done ? 0 : toNumber(x.refund),
                }]
            })
            // Late first, then whatever is due soonest, then paid-up jobs
            const rank = { Overdue: 0, Partial: 1, Unpaid: 1, Canceled: 1, Paid: 2 }
            list.sort((a, b) => rank[a.status] - rank[b.status] || (a.nextDue?.date || '9999').localeCompare(b.nextDue?.date || '9999'))
            setRows(list)
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [])

    const totals = useMemo(() => ({
        late: rows.reduce((s, r) => s + r.overdueAmount, 0),
        owed: rows.reduce((s, r) => s + r.balance, 0),
        collected: rows.reduce((s, r) => s + r.paid, 0),
        lateCount: rows.filter(r => r.overdueAmount > 0).length,
        owingCount: rows.filter(r => r.balance > 0).length,
    }), [rows])

    const shown = rows.filter(r => (
        tab === 'owing' ? r.balance > 0 || r.refundDue > 0
            : tab === 'late' ? r.overdueAmount > 0
                : tab === 'paid' ? r.status === 'Paid'
                    : true
    ))
    const short = (iso) => formatDate(iso, lng, { month: 'short', day: 'numeric' })

    return (
        <div className="mx-auto max-w-3xl px-4 py-5 md:py-8">
            <h1 className="mb-1 hidden text-3xl font-extrabold text-slate-900 md:block">{t('nav.payments')}</h1>
            <p className="mb-5 text-slate-500">{t('pay.intro')}</p>

            {/* TOTALS */}
            <div className="mb-5 grid grid-cols-3 gap-2 md:gap-3">
                <button onClick={() => setTab('late')} className={`rounded-2xl border p-3 text-left md:p-4 ${totals.late > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                    <div className={`text-sm font-semibold ${totals.late > 0 ? 'text-red-700' : 'text-slate-500'}`}>{t('pay.late')}</div>
                    <div className={`text-xl font-extrabold tabular-nums md:text-2xl ${totals.late > 0 ? 'text-red-700' : 'text-slate-900'}`}>{money(totals.late)}</div>
                </button>
                <button onClick={() => setTab('owing')} className="rounded-2xl border border-slate-200 bg-white p-3 text-left md:p-4">
                    <div className="text-sm font-semibold text-slate-500">{t('pay.owed')}</div>
                    <div className="text-xl font-extrabold tabular-nums text-slate-900 md:text-2xl">{money(totals.owed)}</div>
                </button>
                <button onClick={() => setTab('paid')} className="rounded-2xl border border-slate-200 bg-white p-3 text-left md:p-4">
                    <div className="text-sm font-semibold text-slate-500">{t('pay.collected')}</div>
                    <div className="text-xl font-extrabold tabular-nums text-green-700 md:text-2xl">{money(totals.collected)}</div>
                </button>
            </div>

            <div className="mb-4">
                <Segmented value={tab} onChange={setTab} options={[
                    ['owing', t('pay.tab.owing', { count: totals.owingCount })],
                    ['late', t('pay.tab.late', { count: totals.lateCount })],
                    ['paid', t('pay.tab.paid')],
                    ['all', t('pay.tab.all')],
                ]} />
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-slate-400"><Loader2 size={20} className="animate-spin" />{t('common.loading')}</div>
            ) : shown.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{t(`pay.empty.${tab}`)}</div>
            ) : (
                <div className="space-y-3">
                    {shown.map(r => (
                        <button key={r.id} onClick={() => navigate(`/clients?id=${r.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50">
                            <div className="min-w-0 flex-1">
                                <div className="text-lg font-bold leading-snug text-slate-900">{r.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PILL[r.status]}`}>{t(`pay.status.${r.status}`)}</span>
                                    <span className="flex items-center gap-1"><CalendarDays size={14} />{formatDate(r.date, lng, { month: 'short', day: 'numeric', year: 'numeric' }) || t('common.tbd')}</span>
                                </div>
                                {r.canceled && (
                                    <div className="mt-1 text-sm font-semibold text-red-700">
                                        {r.refundDue > 0 ? t('pay.refundDue', { amount: money(r.refundDue) }) : t('pay.cancelFeeDue', { amount: money(r.balance) })}
                                    </div>
                                )}
                                {r.nextDue && (
                                    <div className={`mt-1 text-sm font-semibold ${r.nextDue.late ? 'text-red-700' : 'text-slate-700'}`}>
                                        {r.nextDue.date
                                            ? t(r.nextDue.late ? 'pay.wasDue' : 'pay.nextDue', { amount: money(r.nextDue.amount), date: short(r.nextDue.date) })
                                            : t('pay.noDate', { amount: money(r.nextDue.amount) })}
                                    </div>
                                )}
                            </div>
                            <div className="shrink-0 text-right">
                                {r.refundDue > 0 ? (
                                    <>
                                        <div className="text-xs text-slate-500">{t('pay.toRefund')}</div>
                                        <div className="text-lg font-extrabold tabular-nums text-blue-700">{money(r.refundDue)}</div>
                                    </>
                                ) : r.balance > 0 ? (
                                    <>
                                        <div className="text-xs text-slate-500">{t('payments.balance')}</div>
                                        <div className={`text-lg font-extrabold tabular-nums ${r.overdueAmount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{money(r.balance)}</div>
                                    </>
                                ) : (
                                    <div className="text-lg font-extrabold tabular-nums text-green-700">{money(r.total)}</div>
                                )}
                                <div className="text-xs text-slate-400">{t('pay.ofTotal', { total: money(r.total) })}</div>
                            </div>
                            <ChevronRight size={18} className="shrink-0 text-slate-300" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

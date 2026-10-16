import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, CreditCard, DollarSign, Loader2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { money, toNumber } from '../../lib/format'
import { patchServiceData } from './serviceData'
import { Card } from './ui'
import { inputClass, selectClass } from './styles'

const MAX_PAYMENTS = 6

export default function PaymentsTab({ client, setClient }) {
    const { t } = useTranslation()
    const [processing, setProcessing] = useState(null)
    const plan = client.service_data?.payment_plan || []
    const setPlan = (rows) => patchServiceData(setClient, { payment_plan: rows })

    const total = toNumber(client.job_price)
    const collected = plan.reduce((s, p) => (p.paid ? s + toNumber(p.amount) : s), 0)
    const scheduled = plan.reduce((s, p) => s + toNumber(p.amount), 0)
    const balance = total - collected
    const percent = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0
    const mismatch = plan.length > 0 && total > 0 && Math.abs(scheduled - total) >= 0.01

    function setCount(n) {
        const rows = plan.slice(0, n)
        while (rows.length < n) rows.push({ date: '', amount: '', paid: false })
        setPlan(rows)
    }

    const editRow = (i, field, value) => setPlan(plan.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

    function fillRemaining() {
        const last = plan.length - 1
        const others = plan.reduce((s, p, i) => (i === last ? s : s + toNumber(p.amount)), 0)
        editRow(last, 'amount', String(Math.round((total - others) * 100) / 100))
    }

    async function payOnline(index, amount) {
        if (!(toNumber(amount) > 0)) return alert(t('payments.enterAmount'))
        setProcessing(index)
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    amount: toNumber(amount),
                    description: `Catering Payment #${index + 1}`,
                    clientName: client.full_name || 'Client',
                    returnUrl: window.location.href,
                    user_id: client.user_id,
                },
            })
            if (error) throw error
            if (!data?.url) throw new Error('No payment URL returned')
            window.location.href = data.url
        } catch (err) {
            alert(t('payments.paymentError', { message: err.message }))
            setProcessing(null)
        }
    }

    return (
        <>
            <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                    ['payments.booked', total, 'text-slate-900'],
                    ['payments.collected', collected, 'text-green-600'],
                    ['payments.balance', balance, balance > 0 ? 'text-red-600' : 'text-slate-400'],
                ].map(([label, value, color]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t(label)}</div>
                        <div className={`mt-1 text-lg font-extrabold sm:text-xl ${color}`}>{money(value)}</div>
                    </div>
                ))}
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full transition-all ${percent === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }} />
            </div>

            <Card
                title={t('payments.schedule')}
                action={
                    <select value={plan.length} onChange={e => setCount(Number(e.target.value))} className={`${selectClass} py-1.5`}>
                        {Array.from({ length: MAX_PAYMENTS + 1 }, (_, n) => (
                            <option key={n} value={n}>{t('payments.installments', { count: n })}</option>
                        ))}
                    </select>
                }
            >
                {plan.length === 0 && <div className="text-sm text-slate-400">{t('payments.noSchedule')}</div>}

                <div className="space-y-2">
                    {plan.map((p, i) => (
                        <div key={i} className={`rounded-xl border p-3 ${p.paid ? 'border-green-200 bg-green-50/50' : 'border-slate-200'}`}>
                            <div className="mb-2 flex items-center gap-2">
                                <span className="w-7 shrink-0 text-sm font-bold text-slate-400">#{i + 1}</span>
                                <span className="shrink-0 text-xs font-semibold text-slate-500">{t('payments.dueDate')}</span>
                                <input type="date" value={p.date || ''} onChange={e => editRow(i, 'date', e.target.value)} aria-label={t('payments.dueDate')} className={`${inputClass} min-w-0 flex-1`} />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative min-w-0 flex-1">
                                    <DollarSign size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="number" min="0" step="0.01" inputMode="decimal" value={p.amount ?? ''} onChange={e => editRow(i, 'amount', e.target.value)} aria-label={t('payments.amount')} placeholder="0" className={`${inputClass} pl-8 font-semibold`} />
                                </div>
                                <button
                                    onClick={() => editRow(i, 'paid', !p.paid)}
                                    className={`flex shrink-0 items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-bold transition ${p.paid ? 'border-green-300 bg-green-100 text-green-700' : 'border-slate-300 bg-white text-slate-600 active:bg-green-50'}`}
                                >
                                    {p.paid ? <><Check size={16} /> {t('payments.paid')}</> : t('payments.markPaid')}
                                </button>
                                {!p.paid && toNumber(p.amount) > 0 && (
                                    <button
                                        onClick={() => payOnline(i, p.amount)}
                                        disabled={processing !== null}
                                        title={t('payments.payOnline')}
                                        aria-label={t('payments.payOnline')}
                                        className="flex shrink-0 items-center justify-center rounded-lg bg-blue-600 p-2.5 text-white active:bg-blue-700 disabled:opacity-50"
                                    >
                                        {processing === i ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {mismatch && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangle size={16} />
                        {t('payments.scheduleMismatch', { scheduled: money(scheduled), total: money(total) })}
                        <button onClick={fillRemaining} className="font-bold underline">
                            {t('payments.fillRemaining', { amount: money(total - plan.slice(0, -1).reduce((s, p) => s + toNumber(p.amount), 0)) })}
                        </button>
                    </div>
                )}
            </Card>
        </>
    )
}

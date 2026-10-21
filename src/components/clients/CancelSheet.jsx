import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, Loader2, Printer, RotateCcw } from 'lucide-react'
import { formatDate, money, toNumber, todayISO } from '../../lib/format'
import { CANCELED, settlement, suggestCancellation } from '../../lib/cancellation'
import { cancellationHtml, printHtml } from '../../lib/printDocs'
import { Card, Label } from './ui'
import { inputClass } from './styles'

// Cancel an event: decide the fee from the contract terms, record why, and
// print a cancellation confirmation for the client. Once canceled, the same
// panel tracks the refund / fee and can reactivate the event.
export default function CancelSheet({ client, business, dirty, onQuickUpdate, onDone }) {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const sd = client.service_data || {}
    const existing = client.status === CANCELED ? sd.cancellation : null
    const [busy, setBusy] = useState(false)
    const [form, setForm] = useState(() => {
        const today = todayISO()
        const s = suggestCancellation(client, today)
        return { canceled_on: today, requested_by: 'client', reason: '', fee: String(s.fee) }
    })

    const suggestion = suggestCancellation(client, form.canceled_on)
    const fee = Math.min(Math.max(toNumber(form.fee), 0), suggestion.total || toNumber(form.fee))
    const result = settlement(suggestion.paid, fee)

    async function confirmCancel() {
        if (dirty) return alert(t('cancel.saveFirst'))
        if (!window.confirm(t('cancel.confirm', { name: client.full_name || '—' }))) return
        setBusy(true)
        const cancellation = {
            canceled_on: form.canceled_on,
            requested_by: form.requested_by,
            reason: form.reason.trim(),
            total: suggestion.total,
            paid: suggestion.paid,
            fee,
            refund: result.refund,
            owes: result.owes,
            rule: suggestion.rule,
            days_before: suggestion.daysBefore,
            previous_status: client.status || 'sold',
            fee_paid: false,
            refund_done: false,
            recorded_at: new Date().toISOString(),
        }
        await onQuickUpdate({ status: CANCELED, service_data: { ...sd, cancellation } })
        setBusy(false)
    }

    async function update(patch) {
        if (dirty) return alert(t('cancel.saveFirst'))
        setBusy(true)
        await onQuickUpdate({ service_data: { ...sd, cancellation: { ...existing, ...patch } } })
        setBusy(false)
    }

    async function reactivate() {
        if (dirty) return alert(t('cancel.saveFirst'))
        if (!window.confirm(t('cancel.reactivateConfirm'))) return
        setBusy(true)
        const rest = { ...sd }
        delete rest.cancellation
        const ok = await onQuickUpdate({ status: existing?.previous_status || 'sold', service_data: rest })
        setBusy(false)
        if (ok) onDone()
    }

    const print = (lang) => printHtml(cancellationHtml({ client, business, t: i18n.getFixedT(lang), lng: lang }))
    const ruleText = (rule, days) => t(`cancel.rule.${rule}`, { count: days ?? 0 })

    // ---------- already canceled ----------
    if (existing) {
        return (
            <>
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                    <div className="text-lg font-bold">{t('cancel.canceledOn', { date: formatDate(existing.canceled_on, lng, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) })}</div>
                    <div className="mt-1 text-sm">{t(`cancel.by.${existing.requested_by || 'client'}`)}{existing.reason ? ` · ${existing.reason}` : ''}</div>
                </div>

                <Card title={t('cancel.money')}>
                    <dl className="space-y-1.5 text-base">
                        <div className="flex justify-between"><dt className="text-slate-600">{t('cancel.total')}</dt><dd className="font-semibold">{money(existing.total)}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-600">{t('cancel.paid')}</dt><dd className="font-semibold">{money(existing.paid)}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-600">{t('cancel.fee')}</dt><dd className="font-semibold">{money(existing.fee)}</dd></div>
                    </dl>
                    {toNumber(existing.refund) > 0 && (
                        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
                            <input type="checkbox" checked={Boolean(existing.refund_done)} disabled={busy} onChange={e => update({ refund_done: e.target.checked })} className="h-6 w-6 accent-green-600" />
                            <span className="text-base font-semibold text-slate-800">{t(existing.refund_done ? 'cancel.refundDone' : 'cancel.refundPending', { amount: money(existing.refund) })}</span>
                        </label>
                    )}
                    {toNumber(existing.owes) > 0 && (
                        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
                            <input type="checkbox" checked={Boolean(existing.fee_paid)} disabled={busy} onChange={e => update({ fee_paid: e.target.checked })} className="h-6 w-6 accent-green-600" />
                            <span className="text-base font-semibold text-slate-800">{t(existing.fee_paid ? 'cancel.feePaid' : 'cancel.feePending', { amount: money(existing.owes) })}</span>
                        </label>
                    )}
                    {toNumber(existing.refund) === 0 && toNumber(existing.owes) === 0 && <p className="mt-3 text-sm font-semibold text-green-700">{t('cancel.settled')}</p>}
                </Card>

                <Card title={t('cancel.document')}>
                    <p className="mb-3 text-sm text-slate-500">{t('cancel.documentHint')}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button onClick={() => print('es')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"><Printer size={18} />{t('cancel.printEs')}</button>
                        <button onClick={() => print('en')} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800"><Printer size={18} />{t('cancel.printEn')}</button>
                    </div>
                </Card>

                <button onClick={reactivate} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}{t('cancel.reactivate')}
                </button>
            </>
        )
    }

    // ---------- cancel now ----------
    return (
        <>
            <Card>
                <label className="block">
                    <Label>{t('cancel.date')}</Label>
                    <input type="date" value={form.canceled_on} onChange={e => {
                        const v = e.target.value
                        setForm(f => ({ ...f, canceled_on: v, fee: String(suggestCancellation(client, v).fee) }))
                    }} className={`${inputClass} text-base`} />
                </label>
                <fieldset className="mt-4">
                    <Label>{t('cancel.whoAsked')}</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {['client', 'business'].map(v => (
                            <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${form.requested_by === v ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                <input type="radio" name="requested_by" checked={form.requested_by === v} onChange={() => setForm(f => ({ ...f, requested_by: v }))} className="h-5 w-5 accent-blue-600" />
                                <span className="text-base font-semibold text-slate-800">{t(`cancel.by.${v}`)}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <label className="mt-4 block">
                    <Label hint={t('cancel.optional')}>{t('cancel.reason')}</Label>
                    <textarea rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('cancel.reasonPlaceholder')} maxLength={300} className={`${inputClass} text-base`} />
                </label>
            </Card>

            <Card title={t('cancel.money')}>
                <dl className="space-y-1.5 text-base">
                    <div className="flex justify-between"><dt className="text-slate-600">{t('cancel.total')}</dt><dd className="font-semibold">{money(suggestion.total)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-600">{t('cancel.paid')}</dt><dd className="font-semibold">{money(suggestion.paid)}</dd></div>
                </dl>
                <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>{ruleText(suggestion.rule, suggestion.daysBefore)} {t('cancel.suggested', { amount: money(suggestion.fee) })}</span>
                </div>
                <label className="mt-3 block">
                    <Label hint={t('cancel.feeHint')}>{t('cancel.fee')}</Label>
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} className={`${inputClass} text-lg font-bold`} />
                </label>
                <div className={`mt-3 rounded-xl p-3 text-base font-bold ${result.refund > 0 ? 'bg-blue-50 text-blue-800' : result.owes > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {result.refund > 0 ? t('cancel.youRefund', { amount: money(result.refund) })
                        : result.owes > 0 ? t('cancel.theyOwe', { amount: money(result.owes) })
                            : t('cancel.nothingDue')}
                </div>
            </Card>

            <button onClick={confirmCancel} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white hover:bg-red-700 disabled:opacity-60">
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}{t('cancel.button')}
            </button>
            <p className="mt-2 text-center text-sm text-slate-500">{t('cancel.afterHint')}</p>
        </>
    )
}

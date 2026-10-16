import { useTranslation } from 'react-i18next'
import { DollarSign, Plus, Printer, Trash2, X } from 'lucide-react'
import { invoiceHtml, kitchenSheetHtml, printHtml } from '../../lib/printDocs'
import { patchServiceData } from './serviceData'
import { Card, Label } from './ui'
import { inputClass } from './styles'

export default function EventTab({ client, setClient, business }) {
    const { t, i18n } = useTranslation()
    const sd = client.service_data || {}
    const timeline = sd.timeline || []
    const update = (patch) => patchServiceData(setClient, patch)

    const setTimeline = (rows) => update({ timeline: rows })
    const editRow = (i, field, value) => setTimeline(timeline.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

    return (
        <>
            <Card>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <label className="col-span-2 sm:col-span-1">
                        <Label>{t('event.date')}</Label>
                        <input type="date" value={sd.event_date || ''} onChange={e => update({ event_date: e.target.value })} className={inputClass} />
                    </label>
                    <label>
                        <Label>{t('event.time')}</Label>
                        <input type="time" value={sd.event_time || ''} onChange={e => update({ event_time: e.target.value })} className={inputClass} />
                    </label>
                    <label>
                        <Label>{t('event.guests')}</Label>
                        <input type="number" min="0" inputMode="numeric" value={sd.guest_count ?? ''} onChange={e => update({ guest_count: e.target.value })} className={`${inputClass} font-bold`} />
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-blue-50 p-3">
                    <label className="min-w-[8rem] flex-1">
                        <Label>{t('event.pricePerPerson')}</Label>
                        <div className="relative">
                            <DollarSign size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="number" min="0" step="0.01" inputMode="decimal" value={sd.price_per_head ?? ''} onChange={e => update({ price_per_head: e.target.value })} className={`${inputClass} pl-7`} />
                        </div>
                    </label>
                    <X size={16} className="mb-3 text-blue-300" />
                    <div className="mb-2 text-sm font-semibold text-slate-600">{sd.guest_count || 0}</div>
                    <span className="mb-2 text-blue-300">=</span>
                    <label className="min-w-[8rem] flex-1">
                        <Label hint={t('event.totalHint')}>{t('event.total')}</Label>
                        <div className="relative">
                            <DollarSign size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400" />
                            <input type="number" min="0" step="0.01" inputMode="decimal" value={client.job_price ?? ''} onChange={e => setClient(prev => ({ ...prev, job_price: e.target.value === '' ? null : Number(e.target.value) }))} className={`${inputClass} border-blue-400 pl-7 font-bold text-blue-700`} />
                        </div>
                    </label>
                </div>
            </Card>

            <Card>
                <label className="block">
                    <Label hint={t('event.clientNotesHint')}>{t('event.clientNotes')}</Label>
                    <textarea rows={3} value={client.job_notes || ''} onChange={e => setClient(prev => ({ ...prev, job_notes: e.target.value }))} placeholder={t('event.clientNotesPlaceholder')} className={inputClass} />
                </label>
                <label className="mt-3 block">
                    <Label>{t('event.dietary')}</Label>
                    <input value={sd.dietary_restrictions || ''} onChange={e => update({ dietary_restrictions: e.target.value })} placeholder={t('event.dietaryPlaceholder')} className={`${inputClass} border-red-200 bg-red-50 font-semibold text-red-700 placeholder:font-normal placeholder:text-red-300`} />
                </label>
                <label className="mt-3 block">
                    <Label hint={t('event.kitchenNotesHint')}>{t('event.kitchenNotes')}</Label>
                    <textarea rows={3} value={sd.kitchen_notes || ''} onChange={e => update({ kitchen_notes: e.target.value })} placeholder={t('event.kitchenNotesPlaceholder')} className={`${inputClass} bg-slate-50`} />
                </label>
            </Card>

            <Card
                title={t('event.timeline')}
                action={
                    <button onClick={() => setTimeline([...timeline, { time: '', action: '' }])} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                        <Plus size={14} /> {t('event.addTime')}
                    </button>
                }
            >
                {timeline.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">{t('event.noTimeline')}</div>
                ) : (
                    <div className="space-y-2">
                        {timeline.map((row, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input type="time" value={row.time || ''} onChange={e => editRow(i, 'time', e.target.value)} className={`${inputClass} w-32`} />
                                <input value={row.action || ''} onChange={e => editRow(i, 'action', e.target.value)} placeholder={t('event.activity')} className={inputClass} />
                                <button onClick={() => setTimeline(timeline.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:text-red-600" aria-label={t('common.remove')}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => printHtml(kitchenSheetHtml({ client, t, lng: i18n.language }))} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                    <Printer size={16} /> {t('event.printKitchenSheet')}
                </button>
                <button onClick={() => printHtml(invoiceHtml({ client, business, t, lng: i18n.language }))} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                    <Printer size={16} /> {t('event.printInvoice')}
                </button>
            </div>
        </>
    )
}

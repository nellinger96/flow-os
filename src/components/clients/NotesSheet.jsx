import { useTranslation } from 'react-i18next'
import { Plus, Printer, Trash2 } from 'lucide-react'
import { kitchenSheetHtml, printHtml } from '../../lib/printDocs'
import { patchServiceData } from './serviceData'
import { Card, Label } from './ui'
import { inputClass } from './styles'

export default function NotesSheet({ client, setClient }) {
    const { t, i18n } = useTranslation()
    const sd = client.service_data || {}
    const timeline = sd.timeline || []
    const update = (patch) => patchServiceData(setClient, patch)
    const setTimeline = (rows) => update({ timeline: rows })
    const editRow = (i, field, value) => setTimeline(timeline.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

    return (
        <>
            <Card>
                <label className="block">
                    <Label>{t('event.clientNotes')}</Label>
                    <div className="mb-1.5 text-xs text-slate-400">{t('event.clientNotesHint')}</div>
                    <textarea rows={3} value={client.job_notes || ''} onChange={e => setClient(prev => ({ ...prev, job_notes: e.target.value }))} placeholder={t('event.clientNotesPlaceholder')} className={`${inputClass} text-base`} />
                </label>
                <label className="mt-4 block">
                    <Label>{t('event.dietary')}</Label>
                    <input value={sd.dietary_restrictions || ''} onChange={e => update({ dietary_restrictions: e.target.value })} placeholder={t('event.dietaryPlaceholder')} className={`${inputClass} border-red-200 bg-red-50 text-base font-semibold text-red-700 placeholder:font-normal placeholder:text-red-300`} />
                </label>
                <label className="mt-4 block">
                    <Label>{t('event.kitchenNotes')}</Label>
                    <div className="mb-1.5 text-xs text-slate-400">{t('event.kitchenNotesHint')}</div>
                    <textarea rows={3} value={sd.kitchen_notes || ''} onChange={e => update({ kitchen_notes: e.target.value })} placeholder={t('event.kitchenNotesPlaceholder')} className={`${inputClass} bg-slate-50 text-base`} />
                </label>
            </Card>

            <Card
                title={t('event.timeline')}
                action={
                    <button onClick={() => setTimeline([...timeline, { time: '', action: '' }])} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-blue-600 hover:bg-blue-50">
                        <Plus size={16} /> {t('event.addTime')}
                    </button>
                }
            >
                {timeline.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">{t('event.noTimeline')}</div>
                ) : (
                    <div className="space-y-2">
                        {timeline.map((row, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input type="time" value={row.time || ''} onChange={e => editRow(i, 'time', e.target.value)} className={`${inputClass} w-32 shrink-0 text-base`} />
                                <input value={row.action || ''} onChange={e => editRow(i, 'action', e.target.value)} placeholder={t('event.activity')} className={`${inputClass} text-base`} />
                                <button onClick={() => setTimeline(timeline.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:text-red-600" aria-label={t('common.remove')}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <button onClick={() => printHtml(kitchenSheetHtml({ client, t, lng: i18n.language }))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Printer size={18} /> {t('event.printKitchenSheet')}
            </button>
        </>
    )
}

import { useTranslation } from 'react-i18next'
import { DollarSign } from 'lucide-react'
import { patchServiceData } from './serviceData'
import { Label } from './ui'
import { inputClass } from './styles'

export default function EventSheet({ client, setClient }) {
    const { t } = useTranslation()
    const sd = client.service_data || {}
    const update = (patch) => patchServiceData(setClient, patch)

    return (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block">
                <Label>{t('event.date')}</Label>
                <input type="date" value={sd.event_date || ''} onChange={e => update({ event_date: e.target.value })} className={`${inputClass} text-base`} />
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block">
                    <Label>{t('event.time')}</Label>
                    <input type="time" value={sd.event_time || ''} onChange={e => update({ event_time: e.target.value })} className={`${inputClass} text-base`} />
                </label>
                <label className="block">
                    <Label>{t('event.guests')}</Label>
                    <input type="number" min="0" inputMode="numeric" value={sd.guest_count ?? ''} onChange={e => update({ guest_count: e.target.value })} className={`${inputClass} text-base font-bold`} />
                </label>
            </div>
            <label className="block">
                <Label>{t('event.pricePerPerson')}</Label>
                <div className="relative">
                    <DollarSign size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={sd.price_per_head ?? ''} onChange={e => update({ price_per_head: e.target.value })} className={`${inputClass} pl-8 text-base`} />
                </div>
            </label>
            <label className="block rounded-lg bg-blue-50 p-3">
                <Label hint={t('event.totalHint')}>{t('event.total')}</Label>
                <div className="relative">
                    <DollarSign size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                    <input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        value={client.job_price ?? ''}
                        onChange={e => setClient(prev => ({ ...prev, job_price: e.target.value === '' ? null : Number(e.target.value) }))}
                        className={`${inputClass} border-blue-300 pl-8 text-lg font-extrabold text-blue-700`}
                    />
                </div>
            </label>
        </div>
    )
}

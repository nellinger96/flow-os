import { useTranslation } from 'react-i18next'
import { guessCity } from '../../lib/city'
import { Label } from './ui'
import { inputClass } from './styles'

export default function InfoSheet({ client, setClient, knownCities }) {
    const { t } = useTranslation()
    const set = (field, value) => setClient(prev => ({ ...prev, [field]: value }))
    const suggestedCity = !client.city?.trim() ? guessCity(client.address, knownCities) : ''

    return (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block">
                <Label>{t('clients.name')}</Label>
                <input value={client.full_name || ''} onChange={e => set('full_name', e.target.value)} className={`${inputClass} text-base`} />
            </label>
            <label className="block">
                <Label>{t('clients.phone')}</Label>
                <input type="tel" inputMode="tel" value={client.phone || ''} onChange={e => set('phone', e.target.value)} className={`${inputClass} text-base`} />
            </label>
            <label className="block">
                <Label>{t('clients.email')}</Label>
                <input type="email" inputMode="email" value={client.email || ''} onChange={e => set('email', e.target.value)} className={`${inputClass} text-base`} />
            </label>
            <label className="block">
                <Label>{t('clients.address')}</Label>
                <input value={client.address || ''} onChange={e => set('address', e.target.value)} className={`${inputClass} text-base`} />
            </label>
            <label className="block">
                <Label hint={!client.city?.trim() ? t('clients.cityMissing') : undefined}>{t('clients.city')}</Label>
                <input value={client.city || ''} onChange={e => set('city', e.target.value)} list="known-cities" className={`${inputClass} text-base`} />
                <datalist id="known-cities">{knownCities.map(c => <option key={c} value={c} />)}</datalist>
            </label>
            {suggestedCity && (
                <button onClick={() => set('city', suggestedCity)} className="w-full rounded-lg bg-amber-100 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-200">
                    {t('clients.useCity', { city: suggestedCity })}
                </button>
            )}
        </div>
    )
}

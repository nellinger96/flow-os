import { useTranslation } from 'react-i18next'
import { patchServiceData } from './serviceData'
import { Card, Label } from './ui'
import { inputClass } from './styles'

const COVER_COLORS = ['White', 'Black', 'Ivory', 'Gold', 'Silver', 'Champagne', 'Red', 'Burgundy', 'Navy', 'Royal blue', 'Pink', 'Green']

// Setup details the crew needs on site; shown big on the load-out checklist
export default function SetupSheet({ client, setClient }) {
    const { t } = useTranslation()
    const setup = client.service_data?.setup || {}
    const update = (field, value) => patchServiceData(setClient, { setup: { ...setup, [field]: value } })

    return (
        <Card>
            <div className="mb-4 text-sm text-slate-500">{t('loadout.setup.hint')}</div>
            <label className="block">
                <Label>{t('loadout.setup.table_covers')}</Label>
                <input value={setup.table_covers || ''} onChange={e => update('table_covers', e.target.value)} placeholder={t('loadout.setup.coversPlaceholder')} maxLength={80} className={`${inputClass} text-base font-semibold`} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {COVER_COLORS.map(c => {
                        const label = t(`loadout.colors.${c}`)
                        return (
                            <button key={c} type="button" onClick={() => update('table_covers', label)} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${setup.table_covers === label ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                {label}
                            </button>
                        )
                    })}
                </div>
            </label>
            <label className="mt-4 block">
                <Label>{t('loadout.setup.tables')}</Label>
                <input value={setup.tables || ''} onChange={e => update('tables', e.target.value)} placeholder={t('loadout.setup.tablesPlaceholder')} maxLength={80} className={`${inputClass} text-base`} />
            </label>
            <label className="mt-4 block">
                <Label>{t('loadout.setup.colors')}</Label>
                <input value={setup.colors || ''} onChange={e => update('colors', e.target.value)} placeholder={t('loadout.setup.colorsPlaceholder')} maxLength={120} className={`${inputClass} text-base`} />
            </label>
            <label className="mt-4 block">
                <Label>{t('loadout.setup.notes')}</Label>
                <textarea rows={3} value={setup.notes || ''} onChange={e => update('notes', e.target.value)} placeholder={t('loadout.setup.notesPlaceholder')} maxLength={500} className={`${inputClass} text-base`} />
            </label>
        </Card>
    )
}

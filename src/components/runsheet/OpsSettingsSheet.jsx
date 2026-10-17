import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { TRUCK_COLORS, TRUCK_COLOR_KEYS } from '../../lib/runsheet'
import { inputClass } from '../clients/styles'
import Sheet from '../clients/Sheet'

const label = 'mb-1 block text-sm font-semibold text-slate-700'

// Kitchen address, default timings and the list of trucks
export default function OpsSettingsSheet({ settings, trucks, onSettings, onTrucks, onClose }) {
    const { t } = useTranslation()
    const [form, setForm] = useState({
        kitchen_address: settings.kitchen_address || '',
        setup_minutes: settings.setup_minutes,
        drive_minutes: settings.drive_minutes,
        service_minutes: settings.service_minutes,
        teardown_minutes: settings.teardown_minutes,
    })
    const [saving, setSaving] = useState(false)
    const [newTruck, setNewTruck] = useState('')

    async function saveSettings() {
        setSaving(true)
        const payload = {
            kitchen_address: form.kitchen_address.trim() || null,
            setup_minutes: Math.min(600, Math.max(0, Math.round(Number(form.setup_minutes) || 0))),
            drive_minutes: Math.min(600, Math.max(0, Math.round(Number(form.drive_minutes) || 0))),
            service_minutes: Math.min(1440, Math.max(0, Math.round(Number(form.service_minutes) || 0))),
            teardown_minutes: Math.min(600, Math.max(0, Math.round(Number(form.teardown_minutes) || 0))),
            updated_at: new Date().toISOString(),
        }
        const { data, error } = await supabase.from('ops_settings').upsert(payload, { onConflict: 'user_id' }).select().single()
        setSaving(false)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        onSettings(data)
        onClose()
    }

    async function addTruck(e) {
        e.preventDefault()
        const name = newTruck.trim()
        if (!name) return
        const color = TRUCK_COLOR_KEYS[trucks.length % TRUCK_COLOR_KEYS.length]
        const { data, error } = await supabase.from('trucks').insert({ name, color }).select().single()
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        onTrucks([...trucks, data])
        setNewTruck('')
    }

    async function updateTruck(truck, patch) {
        const { data, error } = await supabase.from('trucks').update(patch).eq('id', truck.id).select().single()
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        onTrucks(trucks.map(x => (x.id === truck.id ? data : x)))
    }

    async function deleteTruck(truck) {
        if (!window.confirm(t('day.settings.deleteTruck', { name: truck.name }))) return
        const { error } = await supabase.from('trucks').delete().eq('id', truck.id)
        if (error) return alert(t('loadout.saveFailed', { message: error.message }))
        onTrucks(trucks.filter(x => x.id !== truck.id))
    }

    return (
        <Sheet
            title={t('day.settings.title')}
            onClose={onClose}
            footer={
                <button onClick={saveSettings} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white disabled:opacity-60">
                    {saving && <Loader2 size={18} className="animate-spin" />}{t('common.save')}
                </button>
            }
        >
            <div className="space-y-4">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                    <label className="block">
                        <span className={label}>{t('day.settings.kitchen')}</span>
                        <input value={form.kitchen_address} onChange={e => setForm(f => ({ ...f, kitchen_address: e.target.value }))} maxLength={200} placeholder={t('day.settings.kitchenPlaceholder')} className={inputClass} />
                        <span className="mt-1 block text-xs text-slate-500">{t('day.settings.kitchenHint')}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className={label}>{t('day.settings.setup')}</span>
                            <input type="number" min="0" inputMode="numeric" value={form.setup_minutes} onChange={e => setForm(f => ({ ...f, setup_minutes: e.target.value }))} className={inputClass} />
                            <span className="mt-1 block text-xs text-slate-500">{t('day.settings.setupHint')}</span>
                        </label>
                        <label className="block">
                            <span className={label}>{t('day.settings.drive')}</span>
                            <input type="number" min="0" inputMode="numeric" value={form.drive_minutes} onChange={e => setForm(f => ({ ...f, drive_minutes: e.target.value }))} className={inputClass} />
                            <span className="mt-1 block text-xs text-slate-500">{t('day.settings.driveHint')}</span>
                        </label>
                        <label className="block">
                            <span className={label}>{t('day.settings.teardown')}</span>
                            <input type="number" min="0" inputMode="numeric" value={form.teardown_minutes} onChange={e => setForm(f => ({ ...f, teardown_minutes: e.target.value }))} className={inputClass} />
                            <span className="mt-1 block text-xs text-slate-500">{t('day.settings.teardownHint')}</span>
                        </label>
                        <label className="block">
                            <span className={label}>{t('day.settings.service')}</span>
                            <input type="number" min="0" inputMode="numeric" value={form.service_minutes} onChange={e => setForm(f => ({ ...f, service_minutes: e.target.value }))} className={inputClass} />
                            <span className="mt-1 block text-xs text-slate-500">{t('day.settings.serviceHint')}</span>
                        </label>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 pb-1 pt-3 text-sm font-bold text-slate-500">{t('day.settings.trucks')}</div>
                    {trucks.map(truck => (
                        <div key={truck.id} className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                            <div className="flex gap-1">
                                {TRUCK_COLOR_KEYS.map(c => (
                                    <button key={c} onClick={() => updateTruck(truck, { color: c })} aria-label={c}
                                        className={`h-5 w-5 rounded-full ${TRUCK_COLORS[c].dot} ${truck.color === c ? 'ring-2 ring-slate-900 ring-offset-1' : 'opacity-40 hover:opacity-100'}`} />
                                ))}
                            </div>
                            <input defaultValue={truck.name} maxLength={40} onBlur={e => e.target.value.trim() && e.target.value.trim() !== truck.name && updateTruck(truck, { name: e.target.value.trim() })}
                                className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 font-semibold text-slate-900 hover:border-slate-200 focus:border-blue-500 focus:outline-none" />
                            <button onClick={() => deleteTruck(truck)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t('common.delete')}><Trash2 size={16} /></button>
                        </div>
                    ))}
                    <form onSubmit={addTruck} className="flex gap-2 p-3">
                        <input value={newTruck} onChange={e => setNewTruck(e.target.value)} maxLength={40} placeholder={t('day.settings.truckPlaceholder', { n: trucks.length + 1 })} className={inputClass} />
                        <button type="submit" className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white"><Plus size={16} />{t('common.add')}</button>
                    </form>
                </div>
            </div>
        </Sheet>
    )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Loader2, Mail, MapPin, MoreHorizontal, Phone, Save, ShoppingBag, Trash2 } from 'lucide-react'
import { guessCity } from '../../lib/city'
import { PIPELINE } from '../../lib/status'
import EventTab from './EventTab'
import MenuTab from './MenuTab'
import PaymentsTab from './PaymentsTab'
import ContractTab from './ContractTab'

const TABS = ['event', 'menu', 'payments', 'contract']

function Field({ icon: Icon, value, onChange, placeholder, type = 'text' }) {
    return (
        <label className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 focus-within:bg-slate-50 hover:bg-slate-50">
            <Icon size={15} className="shrink-0 text-slate-400" />
            <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent placeholder:text-slate-300 focus:outline-none" />
        </label>
    )
}

export default function ClientDetail({
    client, setClient, savedClient, onClientReplaced, dirty, saving, onSave, onDelete, onBack, onGrocery,
    menuLibrary, onMenuItemCreated, knownCities, business,
}) {
    const { t } = useTranslation()
    const [tab, setTab] = useState('event')
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        if (!menuOpen) return
        const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [menuOpen])

    const set = (field, value) => setClient(prev => ({ ...prev, [field]: value }))
    const suggestedCity = !client.city?.trim() ? guessCity(client.address, knownCities) : ''
    const step = PIPELINE.includes(client.status) ? client.status : 'lead'

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* HEADER */}
            <div className="border-b border-slate-200 bg-white px-4 pb-3 pt-3 md:px-6">
                <div className="flex items-start gap-2">
                    <button onClick={onBack} className="-ml-1 mt-1.5 rounded-lg p-1 text-slate-500 hover:bg-slate-100 md:hidden" aria-label={t('common.back')}>
                        <ArrowLeft size={20} />
                    </button>
                    <input
                        value={client.full_name || ''}
                        onChange={e => set('full_name', e.target.value)}
                        placeholder={t('clients.name')}
                        className="min-w-0 flex-1 rounded-lg bg-transparent px-1 text-2xl font-extrabold text-slate-900 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            onClick={onSave}
                            disabled={saving || !dirty}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${dirty ? 'bg-blue-600 text-white shadow hover:bg-blue-700' : 'bg-slate-100 text-slate-400'}`}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : dirty ? <Save size={16} /> : <Check size={16} />}
                            {saving ? t('common.saving') : dirty ? t('common.save') : t('common.saved')}
                        </button>
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setMenuOpen(o => !o)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label={t('common.more')}>
                                <MoreHorizontal size={18} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                    <button onClick={() => { setMenuOpen(false); onGrocery() }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                        <ShoppingBag size={15} /> {t('clients.groceryList')}
                                    </button>
                                    <button onClick={() => { setMenuOpen(false); onDelete() }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                        <Trash2 size={15} /> {t('clients.deleteClient')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                    <Field icon={Phone} type="tel" value={client.phone} onChange={v => set('phone', v)} placeholder={t('clients.phone')} />
                    <Field icon={Mail} type="email" value={client.email} onChange={v => set('email', v)} placeholder={t('clients.email')} />
                    <Field icon={MapPin} value={client.address} onChange={v => set('address', v)} placeholder={t('clients.address')} />
                    <div>
                        <Field icon={MapPin} value={client.city} onChange={v => set('city', v)} placeholder={t('clients.city')} />
                        {!client.city?.trim() && (
                            <div className="flex flex-wrap items-center gap-2 px-2 pb-1 text-xs text-amber-600">
                                {t('clients.cityMissing')}
                                {suggestedCity && (
                                    <button onClick={() => set('city', suggestedCity)} className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 hover:bg-amber-200">
                                        {t('clients.useCity', { city: suggestedCity })}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* STATUS */}
                <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
                    {PIPELINE.map((s, i) => {
                        const active = s === step
                        const past = PIPELINE.indexOf(step) > i
                        return (
                            <button
                                key={s}
                                onClick={() => set('status', s)}
                                className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-bold transition ${active ? (s === 'sold' ? 'bg-green-600 text-white shadow' : 'bg-blue-600 text-white shadow') : past ? 'text-blue-700 hover:bg-white' : 'text-slate-500 hover:bg-white'}`}
                            >
                                {past && <Check size={12} />} {t(`status.${s}`)}
                            </button>
                        )
                    })}
                </div>

                {/* TABS */}
                <div className="-mb-3 mt-3 flex gap-1 overflow-x-auto">
                    {TABS.map(key => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            {t(`tabs.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl p-4 md:p-6">
                    {tab === 'event' && <EventTab client={client} setClient={setClient} business={business} />}
                    {tab === 'menu' && <MenuTab client={client} setClient={setClient} menuLibrary={menuLibrary} onMenuItemCreated={onMenuItemCreated} />}
                    {tab === 'payments' && <PaymentsTab client={client} setClient={setClient} business={business} />}
                    {tab === 'contract' && <ContractTab client={client} savedClient={savedClient} dirty={dirty} onClientReplaced={onClientReplaced} business={business} />}
                </div>
            </div>
        </div>
    )
}

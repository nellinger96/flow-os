import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, Check, CheckCircle2, ChevronRight, CreditCard, ExternalLink, Loader2, Pencil, Plus, Trash2, Truck, UtensilsCrossed, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { MENU_CATEGORIES } from '../lib/menu'
import { inputClass, selectClass } from '../components/clients/styles'

// --- STRIPE CONFIGURATION ---
// NOTE: When you go live, you will change this Client ID to the Live one!
const STRIPE_CLIENT_ID = 'ca_U6kYuZzJeEPABPOFJCuVBoMFafdBLFhN'
const REDIRECT_URI = 'https://caterflowos.netlify.app/'
const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${REDIRECT_URI}`

function Section({ icon: Icon, title, hint, children }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
            <div className="mb-4 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Icon size={20} /></span>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    {hint && <p className="text-sm text-slate-500">{hint}</p>}
                </div>
            </div>
            {children}
        </section>
    )
}

export default function Settings() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [profile, setProfile] = useState({ business_name: '', city: '', state: '' })
    const [stripeId, setStripeId] = useState(null)
    const [savingProfile, setSavingProfile] = useState(false)
    const [savedProfile, setSavedProfile] = useState(false)
    const [items, setItems] = useState([])
    const [newItem, setNewItem] = useState({ name: '', category: 'Entree' })
    const [editing, setEditing] = useState(null) // { id, name }

    useEffect(() => {
        let cancelled = false
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return
            setProfile({
                business_name: user.user_metadata?.business_name || '',
                city: user.user_metadata?.city || '',
                state: user.user_metadata?.state || '',
            })
            const [{ data: dbProfile }, { data: services }] = await Promise.all([
                supabase.from('profiles').select('stripe_account_id').eq('id', user.id).single(),
                supabase.from('services').select('*').order('created_at', { ascending: true }),
            ])
            if (cancelled) return
            setStripeId(dbProfile?.stripe_account_id || null)
            setItems((services || []).filter(i => i.item_type !== 'rental'))
        }
        init()
        return () => { cancelled = true }
    }, [])

    async function saveProfile(e) {
        e.preventDefault()
        setSavingProfile(true)
        const { error } = await supabase.auth.updateUser({ data: { business_name: profile.business_name.trim(), city: profile.city.trim(), state: profile.state.trim() } })
        setSavingProfile(false)
        if (error) return alert(t('clients.saveFailed', { message: error.message }))
        setSavedProfile(true)
        setTimeout(() => setSavedProfile(false), 2500)
    }

    async function disconnectStripe() {
        if (!window.confirm(t('settings.card.disconnectConfirm'))) return
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('profiles').update({ stripe_account_id: null }).eq('id', user.id)
        if (error) return alert(t('clients.saveFailed', { message: error.message }))
        setStripeId(null)
    }

    async function addItem(e) {
        e.preventDefault()
        const name = newItem.name.trim()
        if (!name) return
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('services')
            .insert({ name, category: newItem.category, item_type: 'catering', user_id: user.id, description: '' })
            .select().single()
        if (error) return alert(t('menu.addFailed', { message: error.message }))
        setItems(prev => [...prev, data])
        setNewItem(n => ({ ...n, name: '' }))
    }

    async function renameItem(e) {
        e.preventDefault()
        const name = editing.name.trim()
        if (!name) return
        const { error } = await supabase.from('services').update({ name }).eq('id', editing.id)
        if (error) return alert(t('clients.saveFailed', { message: error.message }))
        setItems(prev => prev.map(i => (i.id === editing.id ? { ...i, name } : i)))
        setEditing(null)
    }

    async function deleteItem(item) {
        if (!window.confirm(t('settings.menu.deleteConfirm', { name: item.name }))) return
        const { error } = await supabase.from('services').delete().eq('id', item.id)
        if (error) return alert(t('clients.deleteFailed', { message: error.message }))
        setItems(prev => prev.filter(i => i.id !== item.id))
    }

    const label = 'mb-1 block text-sm font-semibold text-slate-700'

    return (
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:py-8">
            <h1 className="hidden text-3xl font-extrabold text-slate-900 md:block md:pb-2">{t('nav.settings')}</h1>

            {/* BUSINESS */}
            <Section icon={Building2} title={t('settings.business.title')} hint={t('settings.business.hint')}>
                <form onSubmit={saveProfile} className="space-y-3">
                    <label className="block">
                        <span className={label}>{t('settings.business.name')}</span>
                        <input value={profile.business_name} onChange={e => setProfile(p => ({ ...p, business_name: e.target.value }))} className={inputClass} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className={label}>{t('clients.city')}</span>
                            <input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} className={inputClass} />
                        </label>
                        <label className="block">
                            <span className={label}>{t('settings.business.state')}</span>
                            <input value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} className={inputClass} />
                        </label>
                    </div>
                    <button type="submit" disabled={savingProfile} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                        {savingProfile ? <Loader2 size={18} className="animate-spin" /> : savedProfile ? <Check size={18} /> : null}
                        {savedProfile ? t('common.saved') : t('common.save')}
                    </button>
                </form>
            </Section>

            {/* CARD PAYMENTS */}
            <Section icon={CreditCard} title={t('settings.card.title')} hint={t('settings.card.hint')}>
                {stripeId ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 p-4">
                        <span className="flex items-center gap-2 font-bold text-green-800"><CheckCircle2 size={20} />{t('settings.card.connected')}</span>
                        <button onClick={disconnectStripe} className="text-sm font-semibold text-red-600 underline">{t('settings.card.disconnect')}</button>
                    </div>
                ) : (
                    <a href={stripeConnectUrl} className="inline-flex items-center gap-2 rounded-xl bg-[#635bff] px-5 py-3 font-bold text-white hover:opacity-90">
                        <CreditCard size={18} />{t('settings.card.connect')}<ExternalLink size={14} />
                    </a>
                )}
            </Section>

            {/* MENU */}
            <Section icon={UtensilsCrossed} title={t('settings.menu.title')} hint={t('settings.menu.hint')}>
                <form onSubmit={addItem} className="mb-5 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row">
                    <select value={newItem.category} onChange={e => setNewItem(n => ({ ...n, category: e.target.value }))} className={`${selectClass} sm:w-40`}>
                        {MENU_CATEGORIES.map(c => <option key={c.key} value={c.key}>{t(`menu.categorySingular.${c.key}`)}</option>)}
                    </select>
                    <input value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))} placeholder={t('settings.menu.placeholder')} className={`${inputClass} flex-1`} />
                    <button type="submit" className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"><Plus size={18} />{t('common.add')}</button>
                </form>
                <div className="space-y-5">
                    {MENU_CATEGORIES.map(cat => {
                        const list = items.filter(i => (i.category || 'Entree') === cat.key)
                        return (
                            <div key={cat.key}>
                                <div className="mb-2 text-base font-bold text-slate-800">{t(`menu.category.${cat.key}`)} <span className="font-normal text-slate-400">({list.length})</span></div>
                                {list.length === 0 ? <div className="text-sm text-slate-400">{t('menu.noItems')}</div> : (
                                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                                        {list.map(item => (
                                            editing?.id === item.id ? (
                                                <form key={item.id} onSubmit={renameItem} className="flex gap-2 p-2">
                                                    <input autoFocus value={editing.name} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} className={`${inputClass} flex-1`} />
                                                    <button type="submit" className="rounded-lg bg-blue-600 px-3 text-white" aria-label={t('common.save')}><Check size={18} /></button>
                                                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-2 text-slate-500" aria-label={t('common.cancel')}><X size={18} /></button>
                                                </form>
                                            ) : (
                                                <div key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                                                    <span className="min-w-0 flex-1 truncate text-slate-800">{item.name}</span>
                                                    <button onClick={() => setEditing({ id: item.id, name: item.name })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t('summary.editInfo')}><Pencil size={16} /></button>
                                                    <button onClick={() => deleteItem(item)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t('common.delete')}><Trash2 size={16} /></button>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Section>

            {/* EVENT DAY */}
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {[
                    [UtensilsCrossed, t('loadout.equipment'), t('settings.links.equipment'), '/loadout/equipment'],
                    [Truck, t('day.settings.title'), t('settings.links.trucks'), '/day'],
                ].map(([Icon, title, hint, to]) => (
                    <button key={to} onClick={() => navigate(to)} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 md:px-6">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Icon size={20} /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-base font-bold text-slate-900">{title}</span>
                            <span className="block text-sm text-slate-500">{hint}</span>
                        </span>
                        <ChevronRight size={18} className="text-slate-300" />
                    </button>
                ))}
            </div>
        </div>
    )
}

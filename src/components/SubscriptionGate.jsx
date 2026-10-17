import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { Lock, CreditCard, LogOut, Loader2 } from 'lucide-react'
import { LANGUAGES } from '../i18n'

const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/8x2cN69Ih3azcDdakN4Vy00'

// Checked once for the whole app (not on every page)
export default function SubscriptionGate({ children }) {
    const { t, i18n } = useTranslation()
    const [status, setStatus] = useState('loading')
    const [userId, setUserId] = useState(null)

    useEffect(() => {
        let cancelled = false
        async function check() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return
            setUserId(user.id)
            const { data } = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
            if (!cancelled) setStatus(data?.subscription_status === 'active' ? 'active' : 'inactive')
        }
        check()
        return () => { cancelled = true }
    }, [])

    if (status === 'loading') {
        return (
            <div className="flex h-[70vh] items-center justify-center gap-2 text-slate-400">
                <Loader2 className="animate-spin" /> {t('common.loading')}
            </div>
        )
    }
    if (status === 'active') return children

    // Stripe sends client_reference_id back to us, so the payment is linked to this account
    const payLink = `${STRIPE_PAYMENT_LINK}${userId ? `?client_reference_id=${encodeURIComponent(userId)}` : ''}`

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <Lock size={30} className="text-blue-600" />
                </div>
                <h1 className="mb-2 text-2xl font-extrabold text-slate-900">{t('gate.title')}</h1>
                <p className="mb-6 text-slate-600">{t('gate.body')}</p>
                <div className="mb-6 text-4xl font-black text-slate-900">$29<span className="text-lg font-medium text-slate-400">{t('gate.perMonth')}</span></div>
                <a href={payLink} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700">
                    <CreditCard size={20} />{t('gate.start')}
                </a>
                <button onClick={() => window.location.reload()} className="mt-5 block w-full text-sm text-slate-500 underline hover:text-slate-800">{t('gate.alreadyPaid')}</button>
                <div className="mt-6 flex justify-center gap-2">
                    {LANGUAGES.map(l => (
                        <button key={l.code} onClick={() => i18n.changeLanguage(l.code)} className={`rounded-lg px-3 py-1 text-xs font-bold ${i18n.language === l.code ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{l.label}</button>
                    ))}
                </div>
                <button onClick={() => supabase.auth.signOut()} className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-red-500">
                    <LogOut size={12} />{t('nav.signOut')}
                </button>
            </div>
        </div>
    )
}

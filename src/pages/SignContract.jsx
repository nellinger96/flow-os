import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CheckCircle2, ChevronRight, Clock, CreditCard, Loader2, MapPin, PenLine, ShieldCheck, Users, UtensilsCrossed } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../supabaseClient'
import { menuSections } from '../lib/menu'
import { CURRENT_TERMS_VERSION, termsFor } from '../lib/contractTerms'
import { contractHtml, printHtml } from '../lib/printDocs'
import { formatDate, formatDateTime, formatTimeRange, money, toNumber } from '../lib/format'
import { LANGUAGES } from '../i18n'

function LanguageSwitch() {
    const { i18n } = useTranslation()
    return (
        <div className="flex gap-1 rounded-xl bg-white/10 p-1">
            {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${i18n.language === l.code ? 'bg-white text-slate-900' : 'text-white/80'}`}>
                    {l.label}
                </button>
            ))}
        </div>
    )
}

// Public page where the client reads and signs their contract (link from the caterer)
export default function SignContract() {
    const { id } = useParams()
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [signature, setSignature] = useState('')
    const [signed, setSigned] = useState(false)
    const [signing, setSigning] = useState(false)
    const [error, setError] = useState(null)
    const [agreedToTerms, setAgreedToTerms] = useState(false)

    const fetchContract = useCallback(async () => {
        // Secure fetch through the token function: only client-facing fields come back
        const { data: clientData, error: err } = await supabase.rpc('get_contract_by_token', { token: id }).maybeSingle()
        if (err || !clientData) {
            setError(true)
            setLoading(false)
            return
        }
        setClient(clientData)
        if (clientData.contract_url === 'SIGNED_DIGITALLY') setSigned(true)
        setLoading(false)
    }, [id])

    useEffect(() => {
        let cancelled = false
        supabase.rpc('get_contract_by_token', { token: id }).maybeSingle().then(({ data, error: err }) => {
            if (cancelled) return
            if (err || !data) setError(true)
            else {
                setClient(data)
                if (data.contract_url === 'SIGNED_DIGITALLY') setSigned(true)
            }
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [id])

    async function handleSign() {
        if (!agreedToTerms) return alert(t('sign.acceptFirst'))
        if (signature.trim().length < 3) return alert(t('sign.nameFirst'))
        setSigning(true)
        // Only the signer's name is used by the database; everything else comes from the record
        const { error: err } = await supabase.rpc('sign_contract_by_token', {
            token: id,
            new_service_data: { ...client.service_data, signed_by: signature.trim(), signed_at: new Date().toISOString(), terms_accepted: true },
        })
        setSigning(false)
        if (err) return alert(t('sign.error', { message: err.message }))
        setSigned(true)
        fetchContract() // load the signed copy so the client can print it
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
    }

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-50 font-sans text-slate-500"><Loader2 className="animate-spin" />{t('common.loading')}</div>
    }
    if (error) {
        return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center font-sans text-lg font-bold text-red-600">{t('sign.notFound')}</div>
    }

    const sd = client.service_data || {}
    const sections = menuSections(sd)
    const paymentPlan = sd.payment_plan || []
    const terms = termsFor(CURRENT_TERMS_VERSION, lng)

    // --- ALREADY SIGNED ---
    if (signed) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-12 font-sans">
                <div className="mx-auto max-w-lg text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 size={52} className="text-green-600" />
                    </div>
                    <h1 className="mb-2 text-3xl font-extrabold text-slate-900">{t('sign.doneTitle')}</h1>
                    <p className="text-lg text-slate-600">{t('sign.doneBody', { name: client.full_name })}</p>
                    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-left">
                        <div className="text-sm font-semibold text-slate-500">{t('sign.signature')}</div>
                        <div className="mt-1 font-mono text-xl font-bold text-slate-800">{sd.signed_by || signature}</div>
                        <div className="mt-1 text-sm text-slate-500">{formatDateTime(sd.signed_at || new Date().toISOString(), lng)}</div>
                    </div>
                    {client.signed_contract && (
                        <button
                            onClick={() => printHtml(contractHtml({ contract: client.signed_contract, business: { business_name: client.signed_contract.business_name || client.business_name }, t, lng }))}
                            className="mt-5 w-full rounded-xl bg-slate-900 px-6 py-4 text-base font-bold text-white"
                        >
                            {t('contract.printSigned')}
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // --- CONTRACT TO SIGN ---
    const heading = 'mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-lg font-bold text-slate-900'
    return (
        <div className="min-h-screen bg-slate-50 font-sans md:px-4 md:py-10">
            <div className="mx-auto max-w-3xl overflow-hidden bg-white md:rounded-3xl md:border md:border-slate-200 md:shadow-sm">
                {/* HEADER */}
                <div className="bg-slate-900 px-5 py-6 text-white md:px-10 md:py-8">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white/70">{client.business_name || t('sign.proposal')}</div>
                        <LanguageSwitch />
                    </div>
                    <div className="text-sm font-semibold text-white/70">{t('sign.proposal')}</div>
                    <h1 className="mt-1 text-3xl font-extrabold">{client.full_name}</h1>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm">
                        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><CalendarDays size={16} />{formatDate(sd.event_date, lng, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || t('common.tbd')}</span>
                        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><Clock size={16} />{formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('common.tbd')}</span>
                    </div>
                </div>

                <div className="space-y-8 px-5 py-6 md:px-10 md:py-8">
                    {/* KEY DETAILS */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <div className="text-sm font-semibold text-slate-500">{t('sign.location')}</div>
                            <div className="mt-1 flex gap-2 text-base text-slate-800"><MapPin size={20} className="shrink-0 text-blue-600" />{[client.address, client.city].filter(Boolean).join(', ') || t('common.tbd')}</div>
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-500">{t('sign.guests')}</div>
                            <div className="mt-1 flex gap-2 text-base text-slate-800"><Users size={20} className="shrink-0 text-blue-600" />{t('clients.guestsShort', { count: toNumber(sd.guest_count) })}</div>
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-500">{t('sign.total')}</div>
                            <div className="mt-1 text-2xl font-extrabold text-green-700">{money(client.job_price)}</div>
                        </div>
                    </div>

                    {/* MENU */}
                    <section>
                        <h2 className={heading}><UtensilsCrossed size={20} />{t('sign.menu')}</h2>
                        {sections.length ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {sections.map((section, si) => (
                                    <div key={si}>
                                        <div className="mb-1 text-sm font-bold text-slate-500">{section.legacy ? t('sign.included') : t(`menu.category.${section.key}`)}</div>
                                        <ul className="space-y-1 text-base text-slate-800">{section.items.map((item, i) => <li key={i}>• {item}</li>)}</ul>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-slate-500">{t('sign.noMenu')}</div>}
                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-700">
                            <strong>{t('doc.notes')}: </strong>{client.job_notes || t('sign.standardNotes')}
                        </div>
                    </section>

                    {/* PAYMENTS */}
                    {paymentPlan.length > 0 && (
                        <section>
                            <h2 className={heading}><CreditCard size={20} />{t('sign.payments')}</h2>
                            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                                {paymentPlan.map((pay, i) => (
                                    <div key={i} className={`flex items-center justify-between gap-3 px-4 py-3 ${pay.paid ? 'bg-green-50' : 'bg-white'}`}>
                                        <div>
                                            <div className="font-bold text-slate-800">{t('payments.number', { n: i + 1 })} · {money(pay.amount)}</div>
                                            <div className="text-sm text-slate-500">{t('sign.dueBy', { date: formatDate(pay.date, lng) || t('common.tbd') })}</div>
                                        </div>
                                        <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${pay.paid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {pay.paid ? t('payments.paid') : t('payments.unpaid')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* TERMS */}
                    <section>
                        <h2 className={heading}><ShieldCheck size={20} />{t('sign.terms')}</h2>
                        <ol className="max-h-64 list-decimal space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 pl-8 text-sm text-slate-700">
                            {terms.map(([title, text], i) => <li key={i}><strong>{title}:</strong> {text}</li>)}
                        </ol>
                        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 active:bg-slate-50">
                            <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-blue-600" />
                            <span className="text-base text-slate-800">{t('sign.agree')}</span>
                        </label>
                    </section>

                    {/* SIGN */}
                    <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
                        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><PenLine size={20} />{t('sign.signHere')}</h2>
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">{t('sign.typeName')}</span>
                            <input type="text" autoComplete="name" placeholder={t('sign.namePlaceholder')} value={signature} onChange={e => setSignature(e.target.value)}
                                className="w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 font-mono text-lg focus:border-blue-600 focus:outline-none" />
                        </label>
                        <button onClick={handleSign} disabled={!agreedToTerms || signing}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow disabled:bg-slate-400">
                            {signing ? <Loader2 size={20} className="animate-spin" /> : null}{t('sign.button')}<ChevronRight size={20} />
                        </button>
                        {!agreedToTerms && <p className="mt-2 text-center text-sm text-slate-500">{t('sign.acceptFirst')}</p>}
                    </section>
                </div>
            </div>
        </div>
    )
}

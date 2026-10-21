import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronRight, CreditCard, FileSignature, Loader2,
    Ban, MapPin, MessageSquare, MoreHorizontal, NotebookPen, Pencil, Phone, Printer, ShoppingBag, Trash2, Truck, UtensilsCrossed,
} from 'lucide-react'
import { dialable, formatDate, formatTimeRange, money, toNumber } from '../../lib/format'
import { selectedMenu } from '../../lib/menu'
import { PIPELINE } from '../../lib/status'
import { invoiceHtml, kitchenSheetHtml, printHtml } from '../../lib/printDocs'
import Sheet from './Sheet'
import InfoSheet from './InfoSheet'
import EventSheet from './EventSheet'
import MenuSheet from './MenuSheet'
import PaymentsTab from './PaymentsTab'
import ContractTab from './ContractTab'
import NotesSheet from './NotesSheet'
import SetupSheet from './SetupSheet'
import CancelSheet from './CancelSheet'
import { CANCELED } from '../../lib/cancellation'

const STATUS_STYLE = {
    lead: 'bg-slate-100 text-slate-700',
    tasting: 'bg-amber-100 text-amber-800',
    proposal: 'bg-blue-100 text-blue-800',
    sold: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
}

function Row({ icon: Icon, title, subtitle, alert, onClick }) {
    return (
        <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 md:hover:bg-slate-50">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${alert ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{title}</span>
                <span className={`block truncate text-sm ${alert ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{subtitle}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
        </button>
    )
}

function QuickAction({ href, icon: Icon, label, external }) {
    const base = 'flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-semibold'
    if (!href) {
        return <span className={`${base} bg-slate-50 text-slate-300`}><Icon size={20} />{label}</span>
    }
    return (
        <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`${base} bg-blue-50 text-blue-700 active:bg-blue-100`}>
            <Icon size={20} />{label}
        </a>
    )
}

export default function ClientDetail({
    client, setClient, savedClient, onClientReplaced, dirty, saving, onSave, onDiscard, onQuickUpdate,
    onDelete, onBack, onGrocery, menuLibrary, onMenuItemCreated, knownCities, business,
}) {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const navigate = useNavigate()
    const [sheet, setSheet] = useState(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [statusSaving, setStatusSaving] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        if (!menuOpen) return
        const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [menuOpen])

    const sd = client.service_data || {}
    const canceled = client.status === CANCELED
    const status = canceled ? CANCELED : PIPELINE.includes(client.status) ? client.status : 'lead'
    const plan = sd.payment_plan || []
    const total = toNumber(client.job_price)
    const collected = plan.reduce((s, p) => (p.paid ? s + toNumber(p.amount) : s), 0)
    const owed = Math.max(total - collected, 0)
    const percent = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0
    const menu = selectedMenu(sd, menuLibrary)
    const menuNames = menu.groups.filter(g => g.food).flatMap(g => g.items)
    const signed = client.contract_url === 'SIGNED_DIGITALLY'
    const signedBy = client.signed_contract?.signed_by || sd.signed_by
    const phone = dialable(client.phone)
    const place = [client.address, client.city].filter(Boolean).join(', ')

    function closeSheet() {
        if (dirty && !window.confirm(t('clients.discardChanges'))) return
        if (dirty) onDiscard()
        setSheet(null)
    }

    async function saveAndClose() {
        if (await onSave()) setSheet(null)
    }

    async function changeStatus(next) {
        setStatusSaving(true)
        await onQuickUpdate({ status: next })
        setStatusSaving(false)
    }

    const saveFooter = (
        <button
            onClick={saveAndClose}
            disabled={saving || !dirty}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition ${dirty ? 'bg-blue-600 text-white shadow active:bg-blue-700' : 'bg-slate-100 text-slate-400'}`}
        >
            {saving ? <Loader2 size={18} className="animate-spin" /> : dirty ? null : <Check size={18} />}
            {saving ? t('common.saving') : dirty ? t('clients.saveChanges') : t('common.saved')}
        </button>
    )

    const sheets = {
        info: { title: t('clients.contactInfo'), body: <InfoSheet client={client} setClient={setClient} knownCities={knownCities} />, footer: saveFooter },
        event: { title: t('summary.eventDetails'), body: <EventSheet client={client} setClient={setClient} />, footer: saveFooter },
        menu: { title: t('tabs.menu'), body: <MenuSheet client={client} setClient={setClient} menuLibrary={menuLibrary} onMenuItemCreated={onMenuItemCreated} />, footer: saveFooter },
        payments: { title: t('tabs.payments'), body: <PaymentsTab client={client} setClient={setClient} business={business} />, footer: saveFooter },
        contract: { title: t('tabs.contract'), body: <ContractTab client={client} savedClient={savedClient} dirty={dirty} onClientReplaced={onClientReplaced} business={business} /> },
        notes: { title: t('summary.notesKitchen'), body: <NotesSheet client={client} setClient={setClient} />, footer: saveFooter },
        setup: { title: t('loadout.setup.title'), body: <SetupSheet client={client} setClient={setClient} />, footer: saveFooter },
        cancel: { title: t(canceled ? 'cancel.titleDone' : 'cancel.title'), body: <CancelSheet client={client} business={business} dirty={dirty} onQuickUpdate={onQuickUpdate} onDone={() => setSheet(null)} /> },
    }
    const active = sheet && sheets[sheet]

    const eventLine = [formatDate(sd.event_date, lng, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), formatTimeRange(sd.event_time, sd.event_end_time, lng)].filter(Boolean).join(' · ')
    const placeLine = [client.city, sd.guest_count ? t('clients.guestsShort', { count: Number(sd.guest_count) }) : null].filter(Boolean).join(' · ')

    let paymentsLine = t('summary.noPayments')
    if (plan.length) {
        const paidCount = plan.filter(p => p.paid).length
        paymentsLine = t('summary.paymentsLine', { paid: paidCount, total: plan.length })
        if (owed > 0) paymentsLine += ` · ${t('summary.owes', { amount: money(owed) })}`
    }

    let contractLine = t('contract.notSent')
    if (signed) contractLine = `✓ ${signedBy ? t('contract.signedBy', { name: signedBy }) : t('contract.signed')}`
    else if (client.contract_url) contractLine = `✓ ${t('contract.paperOnFile')}`

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-2xl px-4 pb-10 pt-3 md:px-6 md:pt-6">
                    {/* TOP BAR */}
                    <div className="mb-2 flex items-center justify-between">
                        <button onClick={onBack} className="-ml-2 flex items-center gap-1 rounded-lg p-2 text-sm font-semibold text-slate-600 active:bg-slate-100 lg:hidden">
                            <ArrowLeft size={20} /> {t('nav.directory')}
                        </button>
                        <span className="hidden lg:block" />
                        <div className="flex items-center gap-1">
                            <button onClick={() => setSheet('info')} className="flex items-center gap-1.5 rounded-lg p-2 text-sm font-semibold text-blue-600 active:bg-blue-50 md:hover:bg-blue-50">
                                <Pencil size={16} /> {t('summary.editInfo')}
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setMenuOpen(o => !o)} className="rounded-lg p-2 text-slate-500 active:bg-slate-100 md:hover:bg-slate-100" aria-label={t('common.more')}>
                                    <MoreHorizontal size={20} />
                                </button>
                                {menuOpen && (
                                    <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                                        {[
                                            [Printer, t('event.printInvoice'), () => printHtml(invoiceHtml({ client, business, t, lng }))],
                                            [Printer, t('event.printKitchenSheet'), () => printHtml(kitchenSheetHtml({ client, t, lng }))],
                                            [ShoppingBag, t('clients.groceryList'), onGrocery],
                                            ...(sd.event_date ? [[Truck, t('loadout.checklistForEvent'), () => {
                                                if (dirty && !window.confirm(t('clients.discardChanges'))) return
                                                navigate(`/day?date=${String(sd.event_date).slice(0, 10)}&tab=loadout`)
                                            }]] : []),
                                        ].map(([Icon, label, action]) => (
                                            <button key={label} onClick={() => { setMenuOpen(false); action() }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 active:bg-slate-50 md:hover:bg-slate-50">
                                                <Icon size={16} /> {label}
                                            </button>
                                        ))}
                                        <button onClick={() => { setMenuOpen(false); setSheet('cancel') }} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm text-red-600 active:bg-red-50 md:hover:bg-red-50">
                                            <Ban size={16} /> {t(canceled ? 'cancel.titleDone' : 'cancel.menu')}
                                        </button>
                                        <button onClick={() => { setMenuOpen(false); onDelete() }} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm text-red-600 active:bg-red-50 md:hover:bg-red-50">
                                            <Trash2 size={16} /> {t('clients.deleteClient')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* NAME + STATUS */}
                    <div className="flex items-start justify-between gap-3">
                        <h1 className="min-w-0 break-words text-2xl font-extrabold leading-tight text-slate-900">{client.full_name || '—'}</h1>
                        {canceled ? (
                            <button onClick={() => setSheet('cancel')} className={`mt-0.5 shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${STATUS_STYLE.canceled}`}>{t('status.canceled')}</button>
                        ) : (
                            <label className={`relative mt-0.5 flex shrink-0 items-center gap-1 rounded-full py-1.5 pl-3.5 pr-2.5 text-sm font-bold ${STATUS_STYLE[status]}`}>
                                {statusSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                                {t(`status.${status}`)}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6" /></svg>
                                <select
                                    value={status}
                                    onChange={e => changeStatus(e.target.value)}
                                    disabled={statusSaving}
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    aria-label={t('summary.status')}
                                >
                                    {PIPELINE.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                                </select>
                            </label>
                        )}
                    </div>
                    <div className="mt-1 text-[15px] font-medium text-slate-700">{eventLine || t('summary.noDate')}</div>
                    {placeLine && <div className="text-sm text-slate-500">{placeLine}</div>}
                    {canceled && (
                        <button onClick={() => setSheet('cancel')} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-red-800">
                            <Ban size={20} className="shrink-0" />
                            <span className="min-w-0 flex-1">
                                <span className="block font-bold">{t('cancel.canceledOn', { date: formatDate(sd.cancellation?.canceled_on, lng, { month: 'short', day: 'numeric', year: 'numeric' }) })}</span>
                                <span className="block text-sm">{t('cancel.bannerHint')}</span>
                            </span>
                            <ChevronRight size={18} className="shrink-0" />
                        </button>
                    )}
                    {!client.city?.trim() && (
                        <button onClick={() => setSheet('info')} className="mt-1 text-xs font-semibold text-amber-600">
                            {t('clients.cityMissing')} ›
                        </button>
                    )}

                    {/* QUICK ACTIONS */}
                    <div className="mt-4 flex gap-2">
                        <QuickAction href={phone ? `tel:${phone}` : null} icon={Phone} label={t('summary.call')} />
                        <QuickAction href={phone ? `sms:${phone}` : null} icon={MessageSquare} label={t('summary.text')} />
                        <QuickAction href={place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null} icon={MapPin} label={t('summary.map')} external />
                    </div>

                    {/* MONEY */}
                    <button onClick={() => setSheet('payments')} className="mt-4 block w-full rounded-2xl bg-slate-900 p-4 text-left text-white active:bg-slate-800">
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-400">{t('payments.booked')}</div>
                                <div className="text-3xl font-extrabold">{money(total)}</div>
                            </div>
                            <div className="text-right text-sm">
                                <div className="text-green-400">{t('summary.paid', { amount: money(collected) })}</div>
                                <div className={owed > 0 ? 'text-amber-300' : 'text-slate-400'}>{t('summary.owes', { amount: money(owed) })}</div>
                            </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                            <div className={`h-full ${percent === 100 ? 'bg-green-400' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
                        </div>
                    </button>

                    {/* SECTIONS */}
                    <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <Row icon={CalendarDays} title={t('summary.eventDetails')} onClick={() => setSheet('event')}
                            subtitle={[sd.guest_count ? t('clients.guestsShort', { count: Number(sd.guest_count) }) : null, sd.price_per_head ? t('summary.perPerson', { amount: money(sd.price_per_head) }) : null].filter(Boolean).join(' · ') || t('summary.tapToAdd')} />
                        <Row icon={UtensilsCrossed} title={t('tabs.menu')} onClick={() => setSheet('menu')}
                            subtitle={menu.set.size ? `${t('summary.items', { count: menu.set.size })} · ${menuNames.slice(0, 3).join(', ')}` : t('summary.tapToAdd')} />
                        <Row icon={Truck} title={t('loadout.setup.title')} onClick={() => setSheet('setup')}
                            subtitle={sd.setup?.table_covers ? `${t('loadout.setup.table_covers')}: ${sd.setup.table_covers}` : (sd.setup?.tables || sd.setup?.colors || t('summary.tapToAdd'))} />
                        <Row icon={CreditCard} title={t('tabs.payments')} onClick={() => setSheet('payments')} subtitle={paymentsLine} />
                        <Row icon={FileSignature} title={t('tabs.contract')} onClick={() => setSheet('contract')} subtitle={contractLine} />
                        <Row icon={sd.dietary_restrictions ? AlertTriangle : NotebookPen} title={t('summary.notesKitchen')} onClick={() => setSheet('notes')}
                            alert={!!sd.dietary_restrictions}
                            subtitle={sd.dietary_restrictions ? `${t('doc.dietaryAlert')}: ${sd.dietary_restrictions}` : (client.job_notes || sd.kitchen_notes || t('summary.tapToAdd'))} />
                    </div>
                </div>
            </div>

            {active && <Sheet title={active.title} onClose={closeSheet} footer={active.footer}>{active.body}</Sheet>}
        </div>
    )
}

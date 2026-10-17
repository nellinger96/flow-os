import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, Clock, FileText, MapPin, Pencil, Phone, Plus, RotateCcw, Users, X } from 'lucide-react'
import { dialable, formatTimeRange, toNumber } from '../../lib/format'
import { formatQty, GEAR_CATEGORIES } from '../../lib/loadout'

// One event's checklist. Used by the owner (Load-out page) and by crews (share link).
//   phase:   'load' (into the truck) | 'return' (packed back up)
//   actions: { toggle(item, done), add(label, qty), remove?(item), restore?(item), setQty?(item, qty) }
//            remove / restore / setQty are owner-only.
export default function EventChecklist({ client, list, phase, actions, pending, onOpenClient, onContract }) {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const [adding, setAdding] = useState(false)
    const [label, setLabel] = useState('')
    const [qty, setQty] = useState('')
    const sd = client.service_data || {}
    const setup = sd.setup || {}
    const guests = toNumber(sd.guest_count)
    const place = [client.address, client.city].filter(Boolean).join(', ')
    const phone = dialable(client.phone)
    const owner = Boolean(actions.remove)

    const doneKey = phase === 'load' ? 'loadedAt' : 'returnedAt'
    const byKey = phase === 'load' ? 'loadedBy' : 'returnedBy'
    const done = list.items.filter(i => i[doneKey]).length
    const total = list.items.length
    const percent = total ? Math.round((done / total) * 100) : 0

    const groups = GEAR_CATEGORIES
        .map(cat => ({ cat, items: list.items.filter(i => (GEAR_CATEGORIES.includes(i.category) ? i.category : 'other') === cat) }))
        .filter(g => g.items.length)

    async function submitAdd(e) {
        e.preventDefault()
        if (!label.trim()) return
        const ok = await actions.add(label.trim(), qty === '' ? null : toNumber(qty))
        if (ok !== false) { setLabel(''); setQty(''); setAdding(false) }
    }

    function reasonText(item) {
        return item.reasons.map(r => {
            if (r.type === 'every') return t('loadout.reason.every')
            if (r.type === 'guests') return t('loadout.reason.guests', { per: r.per })
            if (r.type === 'menu') return r.item
            if (r.type === 'supply') return t('loadout.reason.supply')
            return ''
        }).filter(Boolean).join(' · ')
    }

    const time = (iso) => (iso ? new Date(iso).toLocaleTimeString(lng === 'es' ? 'es-MX' : 'en-US', { hour: 'numeric', minute: '2-digit' }) : '')

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* EVENT */}
            <div className="px-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {onOpenClient ? (
                            <button onClick={onOpenClient} className="truncate text-left text-lg font-extrabold text-slate-900 hover:underline">{client.full_name || '—'}</button>
                        ) : (
                            <div className="truncate text-lg font-extrabold text-slate-900">{client.full_name || '—'}</div>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-600">
                            <span className="flex items-center gap-1"><Clock size={13} />{formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('calendar.noTime')}</span>
                            {guests > 0 && <span className="flex items-center gap-1"><Users size={13} />{t('clients.guestsShort', { count: guests })}</span>}
                            {client.city && <span className="flex items-center gap-1"><MapPin size={13} />{client.city}</span>}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                        {onContract && <button onClick={onContract} className="rounded-xl bg-blue-50 p-2.5 text-blue-700" aria-label={t('crew.contract')}><FileText size={18} /></button>}
                        {place && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-50 p-2.5 text-blue-700" aria-label={t('summary.map')}><MapPin size={18} /></a>}
                        {phone && <a href={`tel:${phone}`} className="rounded-xl bg-blue-50 p-2.5 text-blue-700" aria-label={t('summary.call')}><Phone size={18} /></a>}
                    </div>
                </div>

                {/* SETUP: the details that get mixed up */}
                {(setup.table_covers || setup.tables || setup.colors || setup.notes) ? (
                    <div className="mt-3 rounded-xl border-2 border-slate-900 p-3">
                        {setup.table_covers && <div className="text-lg font-extrabold text-slate-900">{t('loadout.setup.table_covers')}: {setup.table_covers}</div>}
                        {setup.tables && <div className="text-sm text-slate-700"><span className="font-semibold">{t('loadout.setup.tables')}:</span> {setup.tables}</div>}
                        {setup.colors && <div className="text-sm text-slate-700"><span className="font-semibold">{t('loadout.setup.colors')}:</span> {setup.colors}</div>}
                        {setup.notes && <div className="text-sm text-slate-700"><span className="font-semibold">{t('loadout.setup.notes')}:</span> {setup.notes}</div>}
                    </div>
                ) : owner ? (
                    <button onClick={onOpenClient} className="mt-3 w-full rounded-xl border border-dashed border-amber-300 bg-amber-50 p-2.5 text-left text-sm font-semibold text-amber-800">
                        {t('loadout.noSetup')}
                    </button>
                ) : null}
                {sd.dietary_restrictions && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-sm font-semibold text-red-700">
                        <AlertTriangle size={14} className="shrink-0" />{t('doc.dietaryAlert')}: {sd.dietary_restrictions}
                    </div>
                )}

                {/* PROGRESS */}
                <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full transition-all ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${percent === 100 ? 'text-green-700' : 'text-slate-600'}`}>
                        {percent === 100 && total > 0 ? <span className="flex items-center gap-1"><Check size={15} />{t(phase === 'load' ? 'loadout.allLoaded' : 'loadout.allBack')}</span> : `${done}/${total}`}
                    </span>
                </div>
            </div>

            {/* ITEMS */}
            {total === 0 ? (
                <div className="px-4 py-5 text-sm text-slate-500">{t('loadout.emptyList')}</div>
            ) : (
                <div className="mt-2">
                    {groups.map(g => (
                        <div key={g.cat}>
                            <div className="bg-slate-50 px-4 py-1 text-sm font-semibold text-slate-500">{t(`loadout.category.${g.cat}`)}</div>
                            {g.items.map(item => {
                                const isDone = Boolean(item[doneKey])
                                const busy = pending?.has(`${client.id}:${item.key}`)
                                return (
                                    <div key={item.key} className={`flex items-center gap-2 border-b border-slate-100 pr-2 ${isDone ? 'bg-green-50/50' : ''}`}>
                                        <button
                                            onClick={() => actions.toggle(item, !isDone)}
                                            disabled={busy}
                                            className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
                                            aria-pressed={isDone}
                                        >
                                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${isDone ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 bg-white'} ${busy ? 'opacity-50' : ''}`}>
                                                {isDone && <Check size={18} strokeWidth={3} />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={`block text-[15px] font-semibold ${isDone ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
                                                    {formatQty(item.qty) && <span className="mr-1.5 tabular-nums text-blue-700">{formatQty(item.qty)}×</span>}
                                                    {item.name}
                                                </span>
                                                <span className="block truncate text-xs text-slate-500">
                                                    {isDone
                                                        ? [item[byKey], time(item[doneKey])].filter(Boolean).join(' · ')
                                                        : [reasonText(item), item.custom ? t('loadout.addedForEvent') : '', item.qtyChanged ? t('loadout.qtyChanged') : ''].filter(Boolean).join(' · ')}
                                                </span>
                                            </span>
                                        </button>
                                        {owner && phase === 'load' && (
                                            <span className="flex shrink-0 gap-0.5">
                                                {!item.custom && item.equipmentId && (
                                                    <button onClick={() => actions.setQty(item)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t('loadout.changeQty')}><Pencil size={15} /></button>
                                                )}
                                                <button onClick={() => actions.remove(item)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t('loadout.removeItem')}><X size={16} /></button>
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* REMOVED FOR THIS EVENT (owner) */}
            {owner && phase === 'load' && list.removed.length > 0 && (
                <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                    <span className="font-semibold">{t('loadout.removedForEvent')}:</span>{' '}
                    {list.removed.map((item, i) => (
                        <span key={item.key}>
                            {i > 0 && ', '}
                            <button onClick={() => actions.restore(item)} className="inline-flex items-center gap-0.5 font-semibold text-blue-600 hover:underline">
                                {item.name}<RotateCcw size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* ADD ONE-OFF ITEM */}
            {phase === 'load' && (adding ? (
                <form onSubmit={submitAdd} className="flex gap-2 p-3">
                    <input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder={t('loadout.addPlaceholder')} maxLength={120} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none md:text-sm" />
                    <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0" inputMode="numeric" placeholder={t('loadout.qty')} className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-base focus:border-blue-500 focus:outline-none md:text-sm" />
                    <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">{t('common.add')}</button>
                    <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-2 text-slate-500" aria-label={t('common.cancel')}><X size={18} /></button>
                </form>
            ) : (
                <button onClick={() => setAdding(true)} className="flex w-full items-center gap-1.5 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-slate-50">
                    <Plus size={16} />{t('loadout.addItem')}
                </button>
            ))}
        </section>
    )
}

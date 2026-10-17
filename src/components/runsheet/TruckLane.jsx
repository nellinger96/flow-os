import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Car, Check, ChevronDown, ExternalLink, FileText, MapPin, Navigation, Phone, SlidersHorizontal, Users } from 'lucide-react'
import { dialable, toNumber } from '../../lib/format'
import { TRUCK_COLORS, mapsLeg, mapsRoute, minutesLabel, minutesOfDay, placeOf, stopState } from '../../lib/runsheet'

const STEPS = [['departed', 'departed_at'], ['arrived', 'arrived_at'], ['setup_done', 'setup_done_at'], ['finished', 'finished_at']]

function MinutesField({ label, value, placeholder, onSave }) {
    const [draft, setDraft] = useState(value ?? '')
    const commit = () => {
        const v = String(draft).trim()
        const next = v === '' ? null : Math.max(0, Math.round(Number(v)))
        if (v !== '' && !Number.isFinite(next)) return setDraft(value ?? '')
        if (next !== (value ?? null)) onSave(next)
    }
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-500">{label}</span>
            <span className="flex items-center gap-1">
                <input type="number" min="0" inputMode="numeric" value={draft} placeholder={String(placeholder)} onChange={e => setDraft(e.target.value)} onBlur={commit}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-base focus:border-blue-500 focus:outline-none md:text-sm" />
                <span className="text-xs text-slate-500">min</span>
            </span>
        </label>
    )
}

function Stop({ stop, index, settings, now, owner, trucks, actions, onOpenClient, onContract }) {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const [adjusting, setAdjusting] = useState(false)
    const { client, run } = stop
    const sd = client.service_data || {}
    const place = placeOf(client)
    const phone = dialable(client.phone)
    const guests = toNumber(sd.guest_count)
    const state = stopState(stop, now)
    const fmt = (m) => minutesLabel(m, lng)
    const at = (iso) => minutesLabel(minutesOfDay(iso), lng)

    const stateChip = {
        finished: ['bg-slate-900 text-white', t('day.state.finished', { time: at(run?.finished_at) })],
        setupDone: ['bg-green-100 text-green-800', t('day.state.setupDone', { time: at(run?.setup_done_at) })],
        arrived: ['bg-green-50 text-green-700', t('day.state.arrived', { time: at(run?.arrived_at) })],
        onTheWay: ['bg-blue-100 text-blue-800', t('day.state.onTheWay', { time: at(run?.departed_at) })],
        shouldHaveLeft: ['bg-red-100 text-red-700', t('day.state.shouldHaveLeft', { count: state.minutes })],
        waiting: null,
    }[state.key]

    return (
        <div>
            {/* DRIVE LEG */}
            <div className="flex items-center gap-2 py-2 pl-5 text-xs text-slate-500">
                <span className="h-5 border-l-2 border-dashed border-slate-300" />
                <Car size={14} className="shrink-0" />
                <span>{t('day.driveFrom', { count: stop.drive, from: index === 0 ? t('day.kitchen') : t('day.prevStop') })}</span>
                {mapsLeg(stop.from, place) && (
                    <a href={mapsLeg(stop.from, place)} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 font-semibold text-blue-600 hover:underline">
                        {t('day.checkMaps')}<ExternalLink size={11} />
                    </a>
                )}
            </div>

            <div className={`rounded-2xl border bg-white ${stop.lateBy > 0 ? 'border-red-300' : 'border-slate-200'}`}>
                {stop.lateBy > 0 && (
                    <div className="flex items-start gap-2 rounded-t-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />{t('day.cantMakeIt', { count: stop.lateBy })}
                    </div>
                )}
                <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            {onOpenClient ? (
                                <button onClick={() => onOpenClient(client.id)} className="truncate text-left text-lg font-extrabold text-slate-900 hover:underline">{client.full_name || '—'}</button>
                            ) : <div className="truncate text-lg font-extrabold text-slate-900">{client.full_name || '—'}</div>}
                            <div className="flex flex-wrap gap-x-3 text-sm text-slate-600">
                                {client.city && <span className="flex items-center gap-1"><MapPin size={13} />{client.city}</span>}
                                {guests > 0 && <span className="flex items-center gap-1"><Users size={13} />{t('clients.guestsShort', { count: guests })}</span>}
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                            {onContract && <button onClick={() => onContract(client)} className="rounded-xl bg-blue-50 p-2.5 text-blue-700" aria-label={t('crew.contract')}><FileText size={18} /></button>}
                            {place && <a href={mapsLeg(null, place)} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-50 p-2.5 text-blue-700" aria-label={t('summary.map')}><Navigation size={18} /></a>}
                            {phone && <a href={`tel:${phone}`} className="rounded-xl bg-blue-50 p-2.5 text-blue-700" aria-label={t('summary.call')}><Phone size={18} /></a>}
                        </div>
                    </div>

                    {stop.service === null ? (
                        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t('day.noTime')}</div>
                    ) : (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div className={`rounded-xl px-1 py-2 ${state.key === 'shouldHaveLeft' ? 'bg-red-50' : 'bg-slate-50'}`}>
                                <div className="text-sm font-semibold text-slate-500">{t('day.leaveBy')}</div>
                                <div className={`text-lg font-extrabold tabular-nums ${state.key === 'shouldHaveLeft' ? 'text-red-700' : 'text-slate-900'}`}>{fmt(stop.leaveBy)}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-1 py-2">
                                <div className="text-sm font-semibold text-slate-500">{t('day.arriveBy')}</div>
                                <div className="text-lg font-extrabold tabular-nums text-slate-900">{fmt(stop.arriveBy)}</div>
                            </div>
                            <div className="rounded-xl bg-slate-900 px-1 py-2 text-white">
                                <div className="text-sm font-semibold text-slate-400">{t('day.service')}</div>
                                <div className="text-lg font-extrabold tabular-nums">{fmt(stop.service)}</div>
                                <div className="text-[11px] text-slate-300">{t(stop.endEstimated ? 'day.untilEstimated' : 'day.until', { time: fmt(stop.serviceEnd) })}</div>
                            </div>
                        </div>
                    )}
                    {stop.service !== null && (
                        <div className="mt-1.5 text-xs text-slate-500">
                            {t('day.setupInfo', { count: stop.setup })}
                            {' · '}
                            {t('day.packUpInfo', { count: stop.teardown, time: fmt(stop.departAt) })}
                            {stop.endEstimated && <span className="font-semibold text-amber-700"> · {t('day.noEndTime')}</span>}
                        </div>
                    )}

                    {/* STATUS */}
                    {stateChip && <div className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${stateChip[0]}`}>{stateChip[1]}</div>}
                    <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {STEPS.map(([step, field]) => {
                            const done = Boolean(run?.[field])
                            return (
                                <button key={step} onClick={() => actions.status(client, step, !done)}
                                    className={`flex items-center justify-center gap-1 rounded-xl border px-1 py-2.5 text-sm font-bold transition ${done ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-100'}`}>
                                    {done && <Check size={15} strokeWidth={3} />}{t(`day.step.${step}`)}
                                </button>
                            )
                        })}
                    </div>
                    {run?.status_by && (run.departed_at || run.arrived_at || run.setup_done_at || run.finished_at) && (
                        <div className="mt-1 text-right text-[11px] text-slate-400">{t('day.updatedBy', { name: run.status_by })}</div>
                    )}

                    {/* OWNER: truck + timing */}
                    {owner && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {trucks.map(tr => (
                                    <button key={tr.id} onClick={() => actions.assign(client, tr.id)} disabled={tr.id === run?.truck_id}
                                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${tr.id === run?.truck_id ? TRUCK_COLORS[tr.color].soft : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                        <span className={`h-2 w-2 rounded-full ${TRUCK_COLORS[tr.color].dot}`} />{tr.name}
                                    </button>
                                ))}
                                <button onClick={() => actions.assign(client, null)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">{t('day.unassign')}</button>
                                <button onClick={() => setAdjusting(a => !a)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50">
                                    <SlidersHorizontal size={13} />{t('day.adjust')}<ChevronDown size={13} className={adjusting ? 'rotate-180' : ''} />
                                </button>
                            </div>
                            {adjusting && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <MinutesField key={`d${run?.drive_minutes}`} label={t('day.driveMin')} value={run?.drive_minutes} placeholder={settings.drive_minutes} onSave={v => actions.setRun(client, { drive_minutes: v })} />
                                    <MinutesField key={`s${run?.setup_minutes}`} label={t('day.setupMin')} value={run?.setup_minutes} placeholder={settings.setup_minutes} onSave={v => actions.setRun(client, { setup_minutes: v })} />
                                    <MinutesField key={`p${run?.teardown_minutes}`} label={t('day.packUpMin')} value={run?.teardown_minutes} placeholder={settings.teardown_minutes} onSave={v => actions.setRun(client, { teardown_minutes: v })} />
                                    <p className="col-span-3 text-xs text-slate-500">{t('day.adjustHint')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function TruckLane({ lane, settings, now, owner, trucks, actions, onOpenClient, onContract }) {
    const { t, i18n } = useTranslation()
    const color = TRUCK_COLORS[lane.truck.color] || TRUCK_COLORS.blue
    const route = mapsRoute(settings.kitchen_address, lane.stops.map(s => placeOf(s.client)))
    const last = [...lane.stops].reverse().find(s => s.departAt !== null)
    const late = lane.stops.filter(s => s.lateBy > 0).length

    return (
        <section className="min-w-0">
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${color.soft}`}>
                <span className={`h-3 w-3 shrink-0 rounded-full ${color.dot}`} />
                <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold">{lane.truck.name}</div>
                    <div className="text-xs opacity-80">
                        {t('calendar.eventsCount', { count: lane.stops.length })}
                        {late > 0 && <span className="ml-1 font-bold text-red-700">· {t('day.problems', { count: late })}</span>}
                    </div>
                </div>
                {route && (
                    <a href={route} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white">
                        <Navigation size={14} />{t('day.route')}
                    </a>
                )}
            </div>

            {lane.stops.length === 0 ? (
                <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">{t('day.noStops')}</div>
            ) : (
                <>
                    {lane.stops.map((stop, i) => (
                        <Stop key={stop.client.id} stop={stop} index={i} settings={settings} now={now} owner={owner} trucks={trucks} actions={actions} onOpenClient={onOpenClient} onContract={onContract} />
                    ))}
                    {last && (
                        <div className="py-2 pl-5 text-xs font-semibold text-slate-500">{t('day.freeAt', { time: minutesLabel(last.departAt, i18n.language) })}</div>
                    )}
                </>
            )}
        </section>
    )
}

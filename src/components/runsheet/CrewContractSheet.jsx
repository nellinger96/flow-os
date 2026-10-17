import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, ExternalLink, FileSignature, MapPin, Users } from 'lucide-react'
import { formatDate, formatDateTime, formatTimeRange, toNumber } from '../../lib/format'
import { menuSections } from '../../lib/menu'
import { termsFor } from '../../lib/contractTerms'
import Sheet from '../clients/Sheet'

// The contract as the crew sees it: what was agreed, without prices or payments.
// `contract` comes from the crew_contract() database function.
export default function CrewContractSheet({ contract, onClose }) {
    const { t, i18n } = useTranslation()
    const lng = i18n.language
    const sd = contract.service_data || {}
    const guests = toNumber(sd.guest_count)
    const place = [contract.address, contract.city].filter(Boolean).join(', ')
    const terms = termsFor(contract.terms_version, lng)
    const sections = menuSections(sd)

    return (
        <Sheet title={`${t('crew.contract')} – ${contract.full_name || ''}`} onClose={onClose}>
            <div className="space-y-3">
                <div className={`flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${contract.status === 'none' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
                    <FileSignature size={18} className="shrink-0" />
                    <span>
                        {contract.status === 'signed' && (contract.signed_by
                            ? t('crew.contractSigned', { name: contract.signed_by, date: formatDateTime(contract.signed_at, lng) })
                            : t('contract.signed'))}
                        {contract.status === 'file' && t('contract.paperOnFile')}
                        {contract.status === 'none' && t('crew.contractNotSigned')}
                    </span>
                </div>
                {contract.file_url && (
                    <a href={contract.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                        <ExternalLink size={16} />{t('contract.viewFile')}
                    </a>
                )}

                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <div className="flex items-center gap-2"><CalendarDays size={15} className="text-slate-400" />{formatDate(sd.event_date, lng, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) || t('common.tbd')}</div>
                    <div className="flex items-center gap-2"><Clock size={15} className="text-slate-400" />{formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('common.tbd')}</div>
                    {guests > 0 && <div className="flex items-center gap-2"><Users size={15} className="text-slate-400" />{t('clients.guestsShort', { count: guests })}</div>}
                    {place && <div className="flex items-center gap-2"><MapPin size={15} className="text-slate-400" />{place}</div>}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 text-sm font-bold text-slate-500">{t('doc.menu')}</div>
                    {sections.length === 0 ? <div className="text-sm text-slate-500">{t('doc.customMenu')}</div> : (
                        <div className="grid grid-cols-2 gap-3">
                            {sections.map((s, i) => (
                                <div key={i}>
                                    <div className="text-xs font-bold text-slate-500">{t(`menu.category.${s.key}`)}</div>
                                    <ul className="mt-0.5 space-y-0.5 text-sm text-slate-800">{s.items.map((item, j) => <li key={j}>• {item}</li>)}</ul>
                                </div>
                            ))}
                        </div>
                    )}
                    {contract.job_notes && <div className="mt-3 text-sm text-slate-700"><span className="font-semibold">{t('doc.notes')}:</span> {contract.job_notes}</div>}
                </div>

                <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <summary className="cursor-pointer font-semibold text-slate-700">{t('crew.terms')}</summary>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-slate-600">
                        {terms.map(([title, text]) => <li key={title}><strong>{title}:</strong> {text}</li>)}
                    </ol>
                </details>

                <p className="text-center text-xs text-slate-400">{t('crew.pricesHidden')}</p>
            </div>
        </Sheet>
    )
}

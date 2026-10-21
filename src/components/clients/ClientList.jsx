import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { formatDate, parseLocalDate } from '../../lib/format'
import StatusBadge from './StatusBadge'

const FILTERS = [
    { key: 'all', label: 'clients.filterAll' },
    { key: 'upcoming', label: 'clients.filterUpcoming' },
    { key: 'lead', label: 'clients.filterLeads' },
    { key: 'sold', label: 'clients.filterBooked' },
    { key: 'canceled', label: 'clients.filterCanceled' },
]

function startOfToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

export default function ClientList({ clients, loading, selectedId, onSelect, onCreate }) {
    const { t, i18n } = useTranslation()
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState('all')

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        const today = startOfToday()
        let list = clients.filter(c => !q || [c.full_name, c.address, c.city, c.phone, c.email].some(v => v?.toLowerCase().includes(q)))

        if (filter === 'upcoming') {
            list = list
                .filter(c => { const d = parseLocalDate(c.service_data?.event_date); return c.status !== 'canceled' && d && d >= today })
                .sort((a, b) => parseLocalDate(a.service_data.event_date) - parseLocalDate(b.service_data.event_date))
        } else if (filter === 'lead') {
            list = list.filter(c => ['lead', 'tasting', 'proposal'].includes(c.status || 'lead'))
        } else if (filter === 'sold') {
            list = list.filter(c => c.status === 'sold')
        } else if (filter === 'canceled') {
            list = list.filter(c => c.status === 'canceled')
        }
        return list
    }, [clients, query, filter])

    return (
        <>
            <div className="space-y-3 border-b border-slate-200 p-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={t('clients.search')}
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    <button onClick={onCreate} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700">
                        <Plus size={16} /> {t('clients.new')}
                    </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${filter === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {t(f.label)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && <div className="p-5 text-sm text-slate-400">{t('common.loading')}</div>}
                {!loading && visible.length === 0 && <div className="p-5 text-sm text-slate-400">{t('clients.noResults')}</div>}
                {visible.map(c => {
                    const sd = c.service_data || {}
                    const date = formatDate(sd.event_date, i18n.language)
                    const active = c.id === selectedId
                    return (
                        <button
                            key={c.id}
                            onClick={() => onSelect(c.id)}
                            className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition ${active ? 'border-l-4 border-l-blue-600 bg-blue-50' : 'border-l-4 border-l-transparent hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-semibold text-slate-800">{c.full_name || '—'}</span>
                                <StatusBadge status={c.status} small />
                            </div>
                            <div className="mt-0.5 truncate text-xs text-slate-500">
                                {[date, sd.guest_count ? t('clients.guestsShort', { count: Number(sd.guest_count) }) : null, c.city].filter(Boolean).join(' · ') || ' '}
                            </div>
                        </button>
                    )
                })}
            </div>
        </>
    )
}

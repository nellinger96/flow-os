import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Segmented from '../components/loadout/Segmented'
import { MENU_CATEGORIES, selectedMenu } from '../lib/menu'
import { supabase } from '../supabaseClient'
import { UtensilsCrossed, MapPin, Calendar, Loader2 } from 'lucide-react'
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area } from 'recharts'

function TrendTooltip({ active, payload, label }) {
    const { t } = useTranslation()
    if (!active || !payload?.length) return null
    const row = payload[0].payload
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
            <div className="font-bold text-slate-900">{label}</div>
            <div className="font-bold text-slate-900">${row.Revenue.toLocaleString()}</div>
            <div className="text-slate-500">{t('calendar.eventsCount', { count: row.Events })}</div>
        </div>
    )
}

const formatAxisMoney = (v) => v >= 1000 ? `$${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : `$${v}`

function RankedList({ rows, total, emptyText }) {
    const { t } = useTranslation()
    if (!rows.length) return <div className="py-3 text-sm text-slate-400">{emptyText}</div>
    const max = rows[0].value
    return (
        <ol className="space-y-4">
            {rows.map((row, i) => {
                const share = total > 0 ? Math.round((row.value / total) * 100) : 0
                return (
                    <li key={row.name}>
                        <div className="mb-1.5 flex items-baseline gap-3">
                            <span className="w-5 text-sm font-bold tabular-nums text-slate-400">{i + 1}</span>
                            <span className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-slate-900">{row.name}</span>
                            <span className="shrink-0 whitespace-nowrap text-sm text-slate-500">{t('reports.share', { percent: share })}</span>
                        </div>
                        <div className="ml-8 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${(row.value / max) * 100}%`, opacity: i === 0 ? 1 : 0.55 }} />
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}

const FOOD_CATEGORIES = MENU_CATEGORIES.filter(c => c.food)

export default function Analytics() {
    const { t, i18n } = useTranslation()
    const locale = i18n.language === 'es' ? 'es-MX' : 'en-US'
    const [loading, setLoading] = useState(true)
    const [rawCustomers, setRawCustomers] = useState([])
    const [menuLibrary, setMenuLibrary] = useState([])
    const [timeframe, setTimeframe] = useState('year')

    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const [{ data: customers }, { data: services }] = await Promise.all([
                supabase.from('customers').select('*').eq('user_id', user.id).not('job_price', 'is', null),
                supabase.from('services').select('name, category').neq('item_type', 'rental'),
            ])
            if (cancelled) return
            if (customers) setRawCustomers(customers)
            setMenuLibrary(services || [])
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [])

    // Helper function to force clean city names
    function cleanCityName(raw) {
        if (!raw) return ''
        let cleaned = raw.split(',')[0] // Drop anything after a comma (e.g., "Fontana, CA" -> "Fontana")
        cleaned = cleaned.replace(/\b(ca|california)\b/gi, '') // Strip state abbreviation
        cleaned = cleaned.replace(/[0-9]/g, '') // Strip zip codes
        cleaned = cleaned.trim()
        
        // Title Case (e.g., "los angeles" -> "Los Angeles")
        return cleaned.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
    }

    const metrics = useMemo(() => {
        if (!rawCustomers.length) return null

        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth()

        const filteredCustomers = rawCustomers.filter(c => {
            if (timeframe === 'all') return true
            const date = new Date(c.service_data?.event_date || c.created_at)
            if (timeframe === 'year') return date.getFullYear() === currentYear
            if (timeframe === 'month') return date.getFullYear() === currentYear && date.getMonth() === currentMonth
            return true
        })

        let bookedRev = 0
        let pipelineRev = 0
        let soldCount = 0
        let totalGuests = 0
        const cityMap = {}
        // Dish counts per menu category (Entree, Side, Drink, Dessert)
        const itemMaps = Object.fromEntries(FOOD_CATEGORIES.map(c => [c.key, {}]))
        const monthMap = {}

        const sortedCustomers = [...filteredCustomers].sort((a, b) => {
            const d1 = new Date(a.service_data?.event_date || a.created_at)
            const d2 = new Date(b.service_data?.event_date || b.created_at)
            return d1 - d2
        })

        sortedCustomers.forEach(c => {
            const price = parseFloat(c.job_price) || 0
            const guests = parseInt(c.service_data?.guest_count) || 0
            const isSold = c.status === 'sold'
            const isCanceled = c.status === 'canceled'

            // REVENUE & KPIs
            if (isSold) {
                bookedRev += price
                soldCount += 1
                totalGuests += guests
            } else if (!isCanceled) {
                pipelineRev += price
            }

            // SMART CITY PARSING WITH CLEANER
            if (isSold) {
                let rawCity = ''
                if (c.city) {
                    rawCity = c.city
                } else if (c.address) {
                    const parts = c.address.split(',').map(p => p.trim())
                    if (parts.length >= 3) rawCity = parts[parts.length - 2]
                    else if (parts.length === 2) rawCity = parts[1].length <= 3 ? parts[0] : parts[1]
                    else rawCity = parts[0]
                }
                
                const finalCity = cleanCityName(rawCity)
                if (finalCity.length > 2 && finalCity.toLowerCase() !== 'tbd') {
                    cityMap[finalCity] = (cityMap[finalCity] || 0) + 1
                }
            }

            // MENU ITEMS: each dish counted once per event, under its category
            if (isSold) {
                selectedMenu(c.service_data, menuLibrary).groups.filter(g => g.food).forEach(group => {
                    group.items.forEach(item => {
                        if (typeof item !== 'string' || !item.trim()) return
                        const name = item.trim().charAt(0).toUpperCase() + item.trim().slice(1).toLowerCase()
                        const map = itemMaps[group.key]
                        map[name] = (map[name] || 0) + 1
                    })
                })
            }

            // TRENDS (bucketed by day in month view, by month otherwise)
            const dateStr = c.service_data?.event_date || c.created_at
            if (dateStr) {
                const date = new Date(dateStr)
                if (!isNaN(date)) {
                    const key = bucketKey(date)
                    if (!monthMap[key]) monthMap[key] = { Events: 0, Revenue: 0 }
                    if (isSold) {
                        monthMap[key].Events += 1
                        monthMap[key].Revenue += price
                    }
                }
            }
        })

        function bucketKey(d) {
            return timeframe === 'month'
                ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                : `${d.getFullYear()}-${d.getMonth()}`
        }

        // Build a continuous axis so empty periods show as zero instead of being skipped
        const buckets = []
        if (timeframe === 'month') {
            const days = new Date(currentYear, currentMonth + 1, 0).getDate()
            for (let d = 1; d <= days; d++) buckets.push(new Date(currentYear, currentMonth, d))
        } else if (sortedCustomers.some(c => !isNaN(new Date(c.service_data?.event_date || c.created_at)))) {
            const dates = sortedCustomers
                .map(c => new Date(c.service_data?.event_date || c.created_at))
                .filter(d => !isNaN(d))
            const first = timeframe === 'year' ? new Date(currentYear, 0, 1) : dates[0]
            const lastDate = dates[dates.length - 1] > now ? dates[dates.length - 1] : now
            const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
            while (cursor <= lastDate && buckets.length < 120) {
                buckets.push(new Date(cursor))
                cursor.setMonth(cursor.getMonth() + 1)
            }
        }
        const monthlyTrends = buckets.map(d => ({
            name: timeframe === 'month'
                ? d.toLocaleString(locale, { month: 'short', day: 'numeric' })
                : d.toLocaleString(locale, { month: 'short', year: '2-digit' }),
            Events: monthMap[bucketKey(d)]?.Events || 0,
            Revenue: monthMap[bucketKey(d)]?.Revenue || 0,
        }))

        const topCities = Object.entries(cityMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)

        const topItems = FOOD_CATEGORIES.map(cat => ({
            key: cat.key,
            rows: Object.entries(itemMaps[cat.key])
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5),
        }))

        return {
            bookedRevenue: bookedRev,
            pipelineRevenue: pipelineRev,
            soldCount,
            avgOrderValue: soldCount > 0 ? bookedRev / soldCount : 0,
            avgGuests: soldCount > 0 ? Math.round(totalGuests / soldCount) : 0,
            conversionRate: filteredCustomers.length > 0 ? Math.round((soldCount / filteredCustomers.length) * 100) : 0,
            topCities, 
            topItems, 
            monthlyTrends
        }
    }, [rawCustomers, menuLibrary, timeframe, locale])

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />{t('common.loading')}
        </div>
    )

    if (!metrics) return <div className="p-10 text-center text-slate-500">{t('reports.noData')}</div>

    const tiles = [
        [t('reports.booked'), `$${metrics.bookedRevenue.toLocaleString()}`, 'text-green-700'],
        [t('reports.average'), `$${metrics.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'text-slate-900'],
        [t('reports.avgGuests'), String(metrics.avgGuests), 'text-slate-900'],
        [t('reports.winRate'), `${metrics.conversionRate}%`, 'text-slate-900'],
    ]

    return (
        <div className="mx-auto max-w-5xl px-4 py-5 md:py-8">
            <h1 className="mb-1 hidden text-3xl font-extrabold text-slate-900 md:block">{t('nav.reports')}</h1>
            <p className="mb-4 text-slate-500">{t('reports.intro')}</p>

            <div className="mb-5 max-w-md">
                <Segmented value={timeframe} onChange={setTimeframe} options={[['month', t('reports.thisMonth')], ['year', t('reports.thisYear')], ['all', t('reports.allTime')]]} />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {tiles.map(([label, value, color]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-semibold text-slate-500">{label}</div>
                        <div className={`mt-1 text-2xl font-extrabold tabular-nums ${color}`}>{value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 lg:col-span-2">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Calendar size={20} className="text-slate-400" />{t('reports.byMonth')}</h2>
                            <p className="text-sm text-slate-500">{timeframe === 'month' ? t('reports.byDayHint') : t('reports.byMonthHint')}</p>
                        </div>
                        {metrics.pipelineRevenue > 0 && <div className="text-sm text-slate-500">{t('reports.notBookedYet', { amount: `$${metrics.pipelineRevenue.toLocaleString()}` })}</div>}
                    </div>
                    <div className="h-64 w-full md:h-72">
                        {metrics.monthlyTrends.length === 0 ? <div className="flex h-full items-center justify-center text-slate-400">{t('reports.notEnough')}</div> :
                            <ResponsiveContainer>
                                <AreaChart data={metrics.monthlyTrends} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.18}/>
                                            <stop offset="100%" stopColor="#16a34a" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} dy={8} minTickGap={24} />
                                    <YAxis tickFormatter={formatAxisMoney} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} width={56} />
                                    <RechartsTooltip content={<TrendTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                                    <Area type="monotone" dataKey="Revenue" stroke="#16a34a" strokeWidth={2} fill="url(#colorRev)" dot={false} activeDot={{ r: 5, fill: '#16a34a', stroke: 'white', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        }
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 lg:col-span-2">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><UtensilsCrossed size={20} className="text-slate-400" />{t('reports.topDishes')}</h2>
                    <p className="mb-4 text-sm text-slate-500">{t('reports.topDishesHint')}</p>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                        {metrics.topItems.map(cat => (
                            <div key={cat.key}>
                                <h3 className="mb-3 border-b border-slate-100 pb-2 text-base font-bold text-slate-800">{t(`menu.category.${cat.key}`)}</h3>
                                <RankedList rows={cat.rows} total={metrics.soldCount} emptyText={t('reports.noDishesIn')} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><MapPin size={20} className="text-slate-400" />{t('reports.topCities')}</h2>
                    <p className="mb-4 text-sm text-slate-500">{t('reports.topCitiesHint')}</p>
                    <RankedList rows={metrics.topCities} total={metrics.soldCount} emptyText={t('reports.noCities')} />
                </section>
            </div>
        </div>
    )
}
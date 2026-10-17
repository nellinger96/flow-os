import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { UtensilsCrossed, MapPin, Calendar, DollarSign, Wallet, Users, Target } from 'lucide-react'
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area } from 'recharts'

export default function Analytics() {
    const [loading, setLoading] = useState(true)
    const [rawCustomers, setRawCustomers] = useState([])
    const [timeframe, setTimeframe] = useState('all')

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .not('job_price', 'is', null) 
        
        if (customers) {
            setRawCustomers(customers)
        }
        setLoading(false)
    }

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
        const itemMap = {}
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

            // REVENUE & KPIs
            if (isSold) {
                bookedRev += price
                soldCount += 1
                totalGuests += guests
            } else {
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

            // MENU ITEMS
            if (isSold) {
                const allItems = [
                    ...(c.service_data?.menu_entrees || []),
                    ...(c.service_data?.menu_sides || []),
                    ...(c.service_data?.menu_drinks || []),
                    ...(c.service_data?.selected_menu_items || [])
                ]
                
                const eventItems = new Set()
                allItems.forEach(item => {
                    if (item && typeof item === 'string' && item.trim()) {
                        // Title case the menu items for uniformity
                        eventItems.add(item.trim().charAt(0).toUpperCase() + item.trim().slice(1).toLowerCase())
                    }
                })
                // Count each item once per event
                eventItems.forEach(name => { itemMap[name] = (itemMap[name] || 0) + 1 })
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
                ? d.toLocaleString('default', { month: 'short', day: 'numeric' })
                : d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            Events: monthMap[bucketKey(d)]?.Events || 0,
            Revenue: monthMap[bucketKey(d)]?.Revenue || 0,
        }))

        const topCities = Object.entries(cityMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)

        const topItems = Object.entries(itemMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)

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
    }, [rawCustomers, timeframe])

    const TrendTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const row = payload[0].payload
        return (
            <div style={{ background: 'white', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(15,23,42,0.08)', fontSize: '13px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{label}</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>${row.Revenue.toLocaleString()}</div>
                <div style={{ color: '#64748b' }}>{row.Events} booked {row.Events === 1 ? 'event' : 'events'}</div>
            </div>
        )
    }

    const formatAxisMoney = (v) => v >= 1000 ? `$${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : `$${v}`

    const RankedList = ({ rows, total, unit, emptyText }) => {
        if (!rows.length) return <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>{emptyText}</div>
        const max = rows[0].value
        return (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {rows.map((row, i) => {
                    const share = total > 0 ? Math.round((row.value / total) * 100) : 0
                    return (
                        <li key={row.name} title={`${row.name}: ${row.value} ${unit} (${share}% of booked events)`}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                                <span style={{ width: '18px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                                <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                                <span style={{ width: '40px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{share}%</span>
                            </div>
                            <div style={{ marginLeft: '28px', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                                <div style={{ width: `${(row.value / max) * 100}%`, height: '100%', borderRadius: '3px', background: '#2563EB', opacity: i === 0 ? 1 : 0.55 }} />
                            </div>
                        </li>
                    )
                })}
            </ol>
        )
    }

    const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }
    const cardTitleStyle = { margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontSize: '17px' }
    const cardSubStyle = { margin: '4px 0 0 30px', fontSize: '13px', color: '#64748b' }

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div className="spin" style={{ marginRight: '10px', width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#2563EB', borderRadius: '50%' }}></div>
            Aggregating Dashboards...
        </div>
    )

    if (!metrics) return <div style={{padding:'40px', textAlign:'center', color:'#64748b'}}>No data available yet. Add some clients to see analytics.</div>

    return (
        <div style={{ padding: 'clamp(16px, 4vw, 30px)', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '28px', fontWeight: '900' }}>Overview Dashboard</h1>
                    <p style={{ margin: 0, color: '#64748b' }}>Real-time insights based on your booked events.</p>
                </div>
                
                <div style={{ background: 'white', padding: '5px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', gap: '5px' }}>
                    <button onClick={() => setTimeframe('all')} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: timeframe === 'all' ? '#0f172a' : 'transparent', color: timeframe === 'all' ? 'white' : '#64748b', transition: 'all 0.2s' }}>All Time</button>
                    <button onClick={() => setTimeframe('year')} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: timeframe === 'year' ? '#0f172a' : 'transparent', color: timeframe === 'year' ? 'white' : '#64748b', transition: 'all 0.2s' }}>This Year (YTD)</button>
                    <button onClick={() => setTimeframe('month')} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: timeframe === 'month' ? '#0f172a' : 'transparent', color: timeframe === 'month' ? 'white' : '#64748b', transition: 'all 0.2s' }}>This Month</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Booked Revenue</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>${metrics.bookedRevenue.toLocaleString()}</div>
                        </div>
                        <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '12px', color: '#16a34a' }}><DollarSign size={20} /></div>
                    </div>
                </div>

                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Avg Order Value</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#2563EB' }}>${metrics.avgOrderValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                        </div>
                        <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '12px', color: '#2563EB' }}><Wallet size={20} /></div>
                    </div>
                </div>

                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Avg Event Size</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#8b5cf6' }}>{metrics.avgGuests} <span style={{fontSize:'16px', color:'#94a3b8'}}>Guests</span></div>
                        </div>
                        <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '12px', color: '#9333ea' }}><Users size={20} /></div>
                    </div>
                </div>

                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Win Rate (Sold)</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#f59e0b' }}>{metrics.conversionRate}%</div>
                        </div>
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '12px', color: '#d97706' }}><Target size={20} /></div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '20px' }}>

                {/* 1. REVENUE TREND */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                        <div>
                            <h3 style={cardTitleStyle}><Calendar size={20} color="#64748b" /> Booked Revenue</h3>
                            <p style={cardSubStyle}>{timeframe === 'month' ? 'By day, this month' : 'By month'} · hover for details</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>${metrics.bookedRevenue.toLocaleString()}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>+ ${metrics.pipelineRevenue.toLocaleString()} in pipeline</div>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: '280px' }}>
                        {metrics.monthlyTrends.length === 0 ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}>Not enough data</div> :
                            <ResponsiveContainer>
                                <AreaChart data={metrics.monthlyTrends} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.18}/>
                                            <stop offset="100%" stopColor="#16a34a" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={8} minTickGap={24} />
                                    <YAxis tickFormatter={formatAxisMoney} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} width={52} />
                                    <RechartsTooltip content={<TrendTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                                    <Area type="monotone" dataKey="Revenue" stroke="#16a34a" strokeWidth={2} fill="url(#colorRev)" dot={false} activeDot={{ r: 5, fill: '#16a34a', stroke: 'white', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        }
                    </div>
                </div>

                {/* 2. TOP MENU ITEMS */}
                <div style={cardStyle}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={cardTitleStyle}><UtensilsCrossed size={20} color="#64748b" /> Top Menu Items</h3>
                        <p style={cardSubStyle}>% of booked events that included it</p>
                    </div>
                    <RankedList rows={metrics.topItems} total={metrics.soldCount} unit="events" emptyText="No menu items tracked yet" />
                </div>

                {/* 3. TOP LOCATIONS */}
                <div style={cardStyle}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={cardTitleStyle}><MapPin size={20} color="#64748b" /> Event Hotspots</h3>
                        <p style={cardSubStyle}>Booked events by city</p>
                    </div>
                    <RankedList rows={metrics.topCities} total={metrics.soldCount} unit="events" emptyText="No locations tracked yet" />
                </div>

            </div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    )
}
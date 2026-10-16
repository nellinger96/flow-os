import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart3, TrendingUp, MapPin, Calendar, DollarSign, Wallet, Users, Target } from 'lucide-react'
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, 
    AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

export default function Analytics() {
    const [loading, setLoading] = useState(true)
    const [rawCustomers, setRawCustomers] = useState([])
    const [timeframe, setTimeframe] = useState('all') 
    
    // Chart Toggles
    const [revenueChartType, setRevenueChartType] = useState('area')
    const [menuChartType, setMenuChartType] = useState('hbar') // hbar, vbar, donut
    const [cityChartType, setCityChartType] = useState('donut') // donut, pie, bar

    // Premium colors for the charts
    const COLORS = ['#2563EB', '#8B5CF6', '#F43F5E', '#F59E0B', '#10B981', '#06B6D4', '#6366F1']

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
                
                allItems.forEach(item => {
                    if (item && typeof item === 'string') {
                        // Title case the menu items for uniformity
                        const cleanItem = item.trim().charAt(0).toUpperCase() + item.trim().slice(1).toLowerCase()
                        itemMap[cleanItem] = (itemMap[cleanItem] || 0) + 1
                    }
                })
            }

            // MONTHLY TRENDS
            const dateStr = c.service_data?.event_date || c.created_at
            if (dateStr) {
                const date = new Date(dateStr)
                const labelName = timeframe === 'month' 
                    ? date.toLocaleString('default', { month: 'short', day: 'numeric' })
                    : date.toLocaleString('default', { month: 'short', year: '2-digit' })
                
                if (!monthMap[labelName]) {
                    monthMap[labelName] = { name: labelName, Events: 0, Revenue: 0 }
                }
                
                monthMap[labelName].Events += 1
                if (isSold) monthMap[labelName].Revenue += price
            }
        })

        const topCities = Object.entries(cityMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)

        const topItems = Object.entries(itemMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)

        const monthlyTrends = Object.values(monthMap)

        return { 
            bookedRevenue: bookedRev, 
            pipelineRevenue: pipelineRev, 
            avgOrderValue: soldCount > 0 ? bookedRev / soldCount : 0,
            avgGuests: soldCount > 0 ? Math.round(totalGuests / soldCount) : 0,
            conversionRate: filteredCustomers.length > 0 ? Math.round((soldCount / filteredCustomers.length) * 100) : 0,
            topCities, 
            topItems, 
            monthlyTrends
        }
    }, [rawCustomers, timeframe])

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'white', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>{payload[0].name}</p>
                    <p style={{ margin: 0, color: '#64748b' }}>{payload[0].value} {payload[0].dataKey === 'Revenue' ? 'Revenue' : 'Orders/Events'}</p>
                </div>
            )
        }
        return null
    }

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div className="spin" style={{ marginRight: '10px', width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#2563EB', borderRadius: '50%' }}></div>
            Aggregating Dashboards...
        </div>
    )

    if (!metrics) return <div style={{padding:'40px', textAlign:'center', color:'#64748b'}}>No data available yet. Add some clients to see analytics.</div>

    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
            
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
                
                {/* 1. REVENUE TREND */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                            <Calendar size={20} color="#64748b" /> Revenue Growth Trend
                        </h3>
                        <select value={revenueChartType} onChange={(e) => setRevenueChartType(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc', color: '#334155', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}>
                            <option value="area">Area Chart</option>
                            <option value="bar">Bar Graph</option>
                            <option value="line">Line Chart</option>
                        </select>
                    </div>

                    <div style={{ width: '100%', height: '300px' }}>
                        {metrics.monthlyTrends.length === 0 ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}>Not enough data</div> : 
                            <ResponsiveContainer>
                                {revenueChartType === 'area' ? (
                                    <AreaChart data={metrics.monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                        <YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                                        <Area type="monotone" dataKey="Revenue" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                ) : revenueChartType === 'bar' ? (
                                    <BarChart data={metrics.monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                        <YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                                        <Bar dataKey="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                ) : (
                                    <LineChart data={metrics.monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                        <YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                                        <Line type="monotone" dataKey="Revenue" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        }
                    </div>
                </div>

                {/* 2. POPULAR SERVICES */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                            <BarChart3 size={20} color="#64748b" /> Top Menu Items
                        </h3>
                        <select value={menuChartType} onChange={(e) => setMenuChartType(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc', color: '#334155', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}>
                            <option value="hbar">Horizontal Bar</option>
                            <option value="vbar">Vertical Bar</option>
                            <option value="donut">Donut Chart</option>
                        </select>
                    </div>

                    <div style={{ width: '100%', height: '300px' }}>
                        {metrics.topItems.length === 0 ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}>No items tracked</div> : 
                            <ResponsiveContainer>
                                {menuChartType === 'hbar' ? (
                                    <BarChart data={metrics.topItems} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 'bold'}} width={100} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={25} name="Orders" />
                                    </BarChart>
                                ) : menuChartType === 'vbar' ? (
                                    <BarChart data={metrics.topItems} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} name="Orders" />
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie data={metrics.topItems} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                            {metrics.topItems.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold', color: '#475569'}} />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        }
                    </div>
                </div>

                {/* 3. TOP LOCATIONS */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                            <MapPin size={20} color="#64748b" /> Event Hotspots
                        </h3>
                        <select value={cityChartType} onChange={(e) => setCityChartType(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc', color: '#334155', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}>
                            <option value="donut">Donut Chart</option>
                            <option value="pie">Pie Chart</option>
                            <option value="bar">Bar Graph</option>
                        </select>
                    </div>

                    <div style={{ width: '100%', height: '300px' }}>
                        {metrics.topCities.length === 0 ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}>No locations tracked</div> : 
                            <ResponsiveContainer>
                                {cityChartType === 'donut' ? (
                                    <PieChart>
                                        <Pie data={metrics.topCities} innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                                            {metrics.topCities.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold', color: '#475569'}} />
                                    </PieChart>
                                ) : cityChartType === 'pie' ? (
                                    <PieChart>
                                        <Pie data={metrics.topCities} outerRadius={110} dataKey="value">
                                            {metrics.topCities.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold', color: '#475569'}} />
                                    </PieChart>
                                ) : (
                                    <BarChart data={metrics.topCities} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={40} name="Events" />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        }
                    </div>
                </div>

            </div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    )
}
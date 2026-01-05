import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, ArrowRight, DollarSign, Sun, Activity, CheckCircle, Clock, FileText, ChevronDown } from 'lucide-react'

export default function Dashboard() {
    const [user, setUser] = useState(null)
    
    // Raw Data State
    const [rawClients, setRawClients] = useState([])

    // Display Stats State
    const [stats, setStats] = useState({ 
        clients: 0, 
        revenueDisplay: 0, // This changes based on filter
        todayEvents: 0,
        leads: 0, tastings: 0, proposals: 0, sold: 0
    })

    // Filters
    const [revenueScope, setRevenueScope] = useState('year') // 'all', 'year', 'month', 'week', 'day'
    const [weather, setWeather] = useState({ temp: '--', condition: 'Loading...' })
    
    const navigate = useNavigate()

    useEffect(() => {
        // 1. Get User & Weather
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
            fetchWeather(user?.user_metadata?.city)
        })
        
        // 2. Fetch Data
        fetchData()
    }, [])

    // --- 3. RE-CALCULATE REVENUE WHEN FILTER CHANGES ---
    useEffect(() => {
        if (rawClients.length > 0) {
            recalculateRevenue(revenueScope, rawClients)
        }
    }, [revenueScope, rawClients])

    async function fetchData() {
        const { data: clients } = await supabase.from('customers').select('job_price, service_data, status, created_at')
        
        if (clients) {
            setRawClients(clients) // Store raw data for filtering later

            // Standard Metrics (Counts)
            const totalClients = clients.length
            const todayStr = new Date().toISOString().split('T')[0]
            const todayCount = clients.filter(c => c.service_data?.event_date === todayStr).length

            // Pipeline Counts
            const leads = clients.filter(c => !c.status || c.status === 'lead').length
            const tastings = clients.filter(c => c.status === 'tasting').length
            const proposals = clients.filter(c => c.status === 'proposal').length
            const sold = clients.filter(c => c.status === 'sold').length

            setStats(prev => ({ 
                ...prev,
                clients: totalClients, 
                todayEvents: todayCount,
                leads, tastings, proposals, sold
            }))
        }
    }

    function recalculateRevenue(scope, clients) {
        const now = new Date()
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // Calculate start of week (Sunday)
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0,0,0,0)

        const todayStr = now.toISOString().split('T')[0]

        const filteredClients = clients.filter(c => {
            // Use event_date if available, otherwise created_at
            const dateStr = c.service_data?.event_date || c.created_at
            if (!dateStr) return false
            const date = new Date(dateStr)

            if (scope === 'all') return true
            if (scope === 'year') return date >= startOfYear
            if (scope === 'month') return date >= startOfMonth
            if (scope === 'week') return date >= startOfWeek
            if (scope === 'day') return dateStr.startsWith(todayStr)
            return true
        })

        const newTotal = filteredClients.reduce((sum, c) => sum + (c.job_price || 0), 0)
        setStats(prev => ({ ...prev, revenueDisplay: newTotal }))
    }

    async function fetchWeather(city) {
        try {
            const queryCity = city || 'Los Angeles'
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${queryCity}&count=1&language=en&format=json`)
            const geoData = await geoRes.json()
            
            if (geoData.results) {
                const { latitude, longitude } = geoData.results[0]
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`)
                const weatherData = await weatherRes.json()
                setWeather({ 
                    temp: Math.round(weatherData.current_weather.temperature), 
                    condition: 'Clear' 
                })
            }
        } catch (e) { console.error("Weather error", e) }
    }

    // --- HELPERS ---
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    const businessName = user?.user_metadata?.business_name || 'Partner'

    // Dropdown Labels
    const scopeLabels = {
        'all': 'All Time',
        'year': 'This Year',
        'month': 'This Month',
        'week': 'This Week',
        'day': 'Today'
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            
            {/* --- HERO SECTION --- */}
            <div style={{ 
                marginBottom: '30px', 
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                borderRadius: '16px', color: 'white', padding: '40px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
            }}>
                <div>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{dateStr}</div>
                    <h1 style={{ margin: 0, fontSize: '36px', fontWeight: '800' }}>{greeting}, <span style={{color: '#60a5fa'}}>{businessName}</span>.</h1>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '15px 25px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{weather.temp}°</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>{user?.user_metadata?.city || 'Local Weather'}</div>
                    </div>
                    <Sun size={40} color="#fbbf24" />
                </div>
            </div>

            {/* --- METRICS GRID --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                
                {/* 1. REVENUE (WITH TOGGLE) */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '8px', color: '#16a34a' }}><DollarSign size={24} /></div>
                        
                        {/* SCOPE TOGGLE BUTTON */}
                        <div style={{position: 'relative'}}>
                            <select 
                                value={revenueScope}
                                onChange={(e) => setRevenueScope(e.target.value)}
                                style={{
                                    appearance: 'none',
                                    background: '#f1f5f9', border: 'none', padding: '5px 25px 5px 10px',
                                    borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', color: '#475569',
                                    cursor: 'pointer', outline: 'none'
                                }}
                            >
                                <option value="year">Yearly</option>
                                <option value="month">Monthly</option>
                                <option value="week">Weekly</option>
                                <option value="day">Daily</option>
                                <option value="all">All Time</option>
                            </select>
                            <ChevronDown size={12} style={{position:'absolute', right:'8px', top:'8px', color:'#64748b', pointerEvents:'none'}}/>
                        </div>
                    </div>
                    
                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>Revenue ({scopeLabels[revenueScope]})</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>
                        ${stats.revenueDisplay.toLocaleString()}
                    </div>
                </div>

                {/* 2. CLIENTS */}
                <div onClick={() => navigate('/clients')} style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor:'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '8px', color: '#2563EB' }}><Users size={24} /></div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>Total Clients</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>{stats.clients}</div>
                </div>

                {/* 3. TODAY'S EVENTS */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', color: '#d97706' }}><Calendar size={24} /></div>
                        <button onClick={() => navigate('/calendar')} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            View Schedule <ArrowRight size={14} />
                        </button>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>Events Today</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>{stats.todayEvents}</div>
                </div>

            </div>

            {/* --- PIPELINE PULSE --- */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection:'column', gap:'20px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: '#f3e8ff', padding: '12px', borderRadius: '50%', color: '#9333ea' }}><Activity size={24}/></div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Pipeline Pulse</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>Live snapshot of your sales funnel.</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/analytics')} style={{ color: '#64748b', background:'none', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'13px' }}>View Full Report →</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop:'10px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #94a3b8' }}>
                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#64748b', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}><Users size={14}/> LEADS</div>
                        <div style={{fontSize:'24px', fontWeight:'900', color:'#334155'}}>{stats.leads}</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #2563EB' }}>
                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#2563EB', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}><Clock size={14}/> TASTINGS</div>
                        <div style={{fontSize:'24px', fontWeight:'900', color:'#1e3a8a'}}>{stats.tastings}</div>
                    </div>
                    <div style={{ background: '#fff7ed', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #f97316' }}>
                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#c2410c', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}><FileText size={14}/> PROPOSALS</div>
                        <div style={{fontSize:'24px', fontWeight:'900', color:'#7c2d12'}}>{stats.proposals}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #16a34a' }}>
                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#15803d', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}><CheckCircle size={14}/> BOOKED</div>
                        <div style={{fontSize:'24px', fontWeight:'900', color:'#14532d'}}>{stats.sold}</div>
                    </div>
                </div>
            </div>

        </div>
    )
}
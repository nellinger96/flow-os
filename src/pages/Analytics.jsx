import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart3, TrendingUp, MapPin, Calendar, DollarSign } from 'lucide-react'

export default function Analytics() {
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        topCities: [],
        topItems: [],
        monthlyTrends: []
    })

    useEffect(() => {
        calculateMetrics()
    }, [])

    async function calculateMetrics() {
        // Fetch all customers who have a price set (real jobs)
        const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .not('job_price', 'is', null) 
        
        if (!customers || customers.length === 0) {
            setLoading(false)
            return
        }

        // 1. CALCULATE REVENUE
        const revenue = customers.reduce((sum, c) => sum + (c.job_price || 0), 0)

        // 2. TOP CITIES (Extract city from address)
        const cityCounts = {}
        customers.forEach(c => {
            if (!c.address) return
            // Logic: Try to grab the city part between commas, otherwise fallback to first word
            let city = c.address.split(' ')[0] // Default fallback
            if (c.address.includes(',')) {
                const parts = c.address.split(',')
                // If address is "Street, City, State", take the second part
                if (parts.length >= 2) city = parts[1].trim()
            }
            // Filter out just numbers to keep data clean
            if (isNaN(city)) {
                cityCounts[city] = (cityCounts[city] || 0) + 1
            }
        })
        const topCities = Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1]) // Sort highest to lowest
            .slice(0, 4) // Take top 4

        // 3. TOP ITEMS (Priority: Tags -> Fallback: Text)
        const itemCounts = {}
        customers.forEach(c => {
            // A. Check for structured tags first (New Method)
            if (c.service_data?.selected_menu_items && Array.isArray(c.service_data.selected_menu_items) && c.service_data.selected_menu_items.length > 0) {
                c.service_data.selected_menu_items.forEach(tag => {
                    itemCounts[tag] = (itemCounts[tag] || 0) + 1
                })
            } 
            // B. Fallback: Parse text notes (Old Method)
            else if (c.job_notes) {
                // Regex splits by ':' or ' - ' to find the package name at the start
                let packageName = c.job_notes.split(/[:\-] /)[0].trim()
                if (packageName && packageName.length < 30) { // Safety check to avoid long sentences
                    itemCounts[packageName] = (itemCounts[packageName] || 0) + 1
                }
            }
        })
        const topItems = Object.entries(itemCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)

        // 4. MONTHLY TRENDS
        const monthCounts = {}
        customers.forEach(c => {
            // Use event date if catering, otherwise creation date
            const dateStr = c.service_data?.event_date || c.created_at
            if (!dateStr) return
            const date = new Date(dateStr)
            const monthName = date.toLocaleString('default', { month: 'short' }) // "Jan", "Feb"
            monthCounts[monthName] = (monthCounts[monthName] || 0) + 1
        })
        const monthlyTrends = Object.entries(monthCounts)

        setMetrics({ totalRevenue: revenue, topCities, topItems, monthlyTrends })
        setLoading(false)
    }

    // Helper for the bar charts
    const Bar = ({ label, value, max, color = '#2563EB' }) => (
        <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                <span>{label}</span>
                <span>{value}</span>
            </div>
            <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '4px', height: '8px' }}>
                <div style={{ width: `${(value / max) * 100}%`, background: color, height: '100%', borderRadius: '4px', transition: 'width 0.5s' }}></div>
            </div>
        </div>
    )

    if (loading) return <div style={{ padding: '40px' }}>Crunching numbers...</div>

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>Performance Analytics</h1>
                <p style={{ margin: 0, color: '#64748b' }}>Insights for your business.</p>
            </div>

            {/* TOP STATS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ color: '#16a34a', marginBottom: '10px' }}><DollarSign size={24} /></div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>${metrics.totalRevenue.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Total Revenue</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ color: '#2563EB', marginBottom: '10px' }}><TrendingUp size={24} /></div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{metrics.topItems[0] ? metrics.topItems[0][0] : 'N/A'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>#1 Best Seller</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* 1. MOST ORDERED ITEMS */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={20} color="#64748b" /> Popular Services
                    </h3>
                    {metrics.topItems.length === 0 ? <p style={{color:'#94a3b8'}}>No sales data yet.</p> : 
                        metrics.topItems.map(([name, count]) => (
                            <Bar key={name} label={name} value={count} max={metrics.topItems[0][1]} color="#8b5cf6" />
                        ))
                    }
                </div>

                {/* 2. TOP CITIES */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MapPin size={20} color="#64748b" /> Top Locations
                    </h3>
                    {metrics.topCities.length === 0 ? <p style={{color:'#94a3b8'}}>No address data yet.</p> : 
                        metrics.topCities.map(([city, count]) => (
                            <Bar key={city} label={city} value={count} max={metrics.topCities[0][1]} color="#f43f5e" />
                        ))
                    }
                </div>

                {/* 3. MONTHLY ACTIVITY */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={20} color="#64748b" /> Busiest Months
                    </h3>
                    {metrics.monthlyTrends.length === 0 ? <p style={{color:'#94a3b8'}}>No date data yet.</p> : 
                        metrics.monthlyTrends.map(([month, count]) => (
                            <Bar key={month} label={month} value={count} max={Math.max(...metrics.monthlyTrends.map(m => m[1]))} color="#f59e0b" />
                        ))
                    }
                </div>
            </div>
        </div>
    )
}
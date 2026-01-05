import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Calendar() {
    const [events, setEvents] = useState([])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [loading, setLoading] = useState(true)
    const [selectedDayEvents, setSelectedDayEvents] = useState(null) // For modal
    const navigate = useNavigate()

    useEffect(() => {
        fetchEvents()
    }, [])

    async function fetchEvents() {
        // Fetch everyone, then filter for those who have dates
        const { data } = await supabase
            .from('customers')
            .select('id, full_name, status, address, service_data')
        
        const validEvents = data?.filter(c => c.service_data?.event_date) || []
        setEvents(validEvents)
        setLoading(false)
    }

    // --- DATE MATH ---
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 = Sunday

    const changeMonth = (offset) => {
        setCurrentDate(new Date(year, month + offset, 1))
    }

    const getEventsForDay = (day) => {
        return events.filter(e => {
            const eDate = new Date(e.service_data.event_date + 'T00:00:00') // Force local time
            return eDate.getDate() === day && eDate.getMonth() === month && eDate.getFullYear() === year
        })
    }

    return (
        <div style={{ padding: '20px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CalIcon size={24} /> {monthNames[month]} {year}
                </h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => changeMonth(-1)} style={{ padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft /></button>
                    <button onClick={() => setCurrentDate(new Date())} style={{ padding: '8px 15px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Today</button>
                    <button onClick={() => changeMonth(1)} style={{ padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight /></button>
                </div>
            </div>

            {/* GRID HEADER (DAYS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>
                <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
            </div>

            {/* CALENDAR GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', gap: '10px', flex: 1 }}>
                
                {/* Empty slots for previous month */}
                {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}

                {/* Days */}
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1
                    const dayEvents = getEventsForDay(day)
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()

                    return (
                        <div 
                            key={day} 
                            onClick={() => dayEvents.length > 0 && setSelectedDayEvents({ day, events: dayEvents })}
                            style={{ 
                                background: 'white', 
                                border: isToday ? '2px solid #2563EB' : '1px solid #e2e8f0', 
                                borderRadius: '8px', 
                                padding: '10px', 
                                minHeight: '100px',
                                cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                                position: 'relative'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', color: isToday ? '#2563EB' : '#334155', marginBottom: '5px' }}>{day}</div>
                            
                            {/* EVENT CHIPS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {dayEvents.map(ev => {
                                    const isSold = ev.status === 'sold'
                                    return (
                                        <div key={ev.id} style={{ 
                                            fontSize: '11px', 
                                            padding: '4px 6px', 
                                            borderRadius: '4px', 
                                            background: isSold ? '#dcfce7' : '#eff6ff', 
                                            color: isSold ? '#166534' : '#1e40af',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {ev.service_data?.event_time && <span style={{opacity:0.7, marginRight:'4px'}}>{ev.service_data.event_time}</span>}
                                            {ev.full_name}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* DAY DETAILS MODAL */}
            {selectedDayEvents && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            {monthNames[month]} {selectedDayEvents.day}, {year}
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {selectedDayEvents.events.map(ev => (
                                <div key={ev.id} style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', borderLeft: ev.status === 'sold' ? '4px solid #16a34a' : '4px solid #2563EB' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{ev.full_name}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                        <Clock size={14}/> {ev.service_data?.event_time || 'No time set'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                        <MapPin size={14}/> {ev.address}
                                    </div>
                                    <div style={{marginTop:'8px', fontSize:'12px', fontWeight:'bold', color: ev.status === 'sold' ? '#16a34a' : '#2563EB', textTransform:'uppercase'}}>
                                        STATUS: {ev.status}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setSelectedDayEvents(null)} style={{ width: '100%', padding: '12px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    )
}
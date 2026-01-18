import { Calendar, Clock, Users, DollarSign, Plus, Trash2 } from 'lucide-react'

export default function CateringView({ formData, setFormData, clientId }) {
    
    // Helper to update deeply nested "service_data" without losing other data
    function updateServiceData(field, value) {
        setFormData({
            ...formData,
            service_data: {
                ...formData.service_data,
                [field]: value
            }
        })
    }

    // Helper to add/remove menu items
    function toggleMenuItem(category, item) {
        const currentList = formData.service_data?.[category] || []
        const newList = currentList.includes(item)
            ? currentList.filter(i => i !== item) // Remove
            : [...currentList, item] // Add
        updateServiceData(category, newList)
    }

    const s = formData.service_data || {}

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            
            {/* TOP ROW: STATUS TRACKING */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Tracking Status</div>
                <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                    {['lead', 'tasting', 'proposal', 'booked'].map(step => (
                        <button 
                            key={step}
                            onClick={() => setFormData({ ...formData, status: step })}
                            style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                textTransform: 'capitalize',
                                background: formData.status === step ? (step === 'booked' ? '#16a34a' : '#2563EB') : 'transparent',
                                color: formData.status === step ? 'white' : '#64748b',
                                transition: '0.2s'
                            }}
                        >
                            {step}
                        </button>
                    ))}
                </div>
            </div>

            {/* EVENT DETAILS CARD */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    
                    {/* Date */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Event Date</label>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', background: 'white' }}>
                            <Calendar size={16} color="#64748b" style={{ marginRight: '8px' }} />
                            <input 
                                type="date" 
                                value={s.service_date || ''} 
                                onChange={e => updateServiceData('service_date', e.target.value)}
                                style={{ border: 'none', width: '100%', outline: 'none', fontSize: '13px', color: '#334155', fontFamily: 'sans-serif' }}
                            />
                        </div>
                    </div>

                    {/* Start Time */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Start Time</label>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', background: 'white' }}>
                            <Clock size={16} color="#64748b" style={{ marginRight: '8px' }} />
                            <input 
                                type="time" 
                                value={s.service_time || ''} 
                                onChange={e => updateServiceData('service_time', e.target.value)}
                                style={{ border: 'none', width: '100%', outline: 'none', fontSize: '13px', color: '#334155', fontFamily: 'sans-serif' }}
                            />
                        </div>
                    </div>

                    {/* End Time (NEW) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>End Time</label>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', background: 'white' }}>
                            <Clock size={16} color="#64748b" style={{ marginRight: '8px' }} />
                            <input 
                                type="time" 
                                value={s.service_end_time || ''} 
                                onChange={e => updateServiceData('service_end_time', e.target.value)}
                                style={{ border: 'none', width: '100%', outline: 'none', fontSize: '13px', color: '#334155', fontFamily: 'sans-serif' }}
                            />
                        </div>
                    </div>

                    {/* Guest Count */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Guest Count</label>
                        <input 
                            type="number" 
                            placeholder="0"
                            value={s.guest_count || ''} 
                            onChange={e => updateServiceData('guest_count', e.target.value)}
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Price Calculator */}
                <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Price Per Person ($)</label>
                        <input 
                            type="number" 
                            value={s.price_per_head || ''} 
                            onChange={e => updateServiceData('price_per_head', e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>
                    <div style={{ paddingBottom: '10px', color: '#94a3b8' }}>x</div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Guest Count</label>
                        <input value={s.guest_count || 0} disabled style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f1f5f9' }} />
                    </div>
                    <div style={{ paddingBottom: '10px', color: '#94a3b8' }}>=</div>
                    <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563EB' }}>Calculated Total</label>
                        <div style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #2563EB', color: '#2563EB', fontWeight: 'bold', background: 'white' }}>
                            ${(parseFloat(s.price_per_head || 0) * parseFloat(s.guest_count || 0)).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* FINANCIALS CARD */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Payment Schedule</h3>
                    <select style={{ padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                        <option>2 Payments (50/50)</option>
                        <option>3 Payments</option>
                    </select>
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                    Collected: <strong>$0</strong> <span style={{ float: 'right' }}>0% Paid</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8', width: '20px' }}>#1</span>
                        <input type="date" style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                        <div style={{ position: 'relative', flex: 1 }}>
                            <DollarSign size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                            <input placeholder="Amount" style={{ width: '100%', padding: '8px 8px 8px 25px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                        </div>
                        <button style={{ padding: '8px 15px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', fontSize: '12px', color: '#94a3b8' }}>Unpaid</button>
                    </div>
                </div>
            </div>

            {/* MENU SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* ENTREES */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Entrees</div>
                    <select 
                        onChange={(e) => {
                            if(e.target.value) toggleMenuItem('menu_entrees', e.target.value);
                            e.target.value = '';
                        }}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}
                    >
                        <option value="">+ Add to Entrees</option>
                        <option value="Tacos">Tacos</option>
                        <option value="Birria">Birria</option>
                        <option value="Chicken Fajitas">Chicken Fajitas</option>
                        <option value="Carne Asada">Carne Asada</option>
                        <option value="Enchiladas">Enchiladas</option>
                        <option value="Chile Verde">Chile Verde</option>
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(s.menu_entrees || []).map(item => (
                            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                                <span>{item}</span>
                                <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => toggleMenuItem('menu_entrees', item)} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* SIDES */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Sides</div>
                    <select 
                        onChange={(e) => {
                            if(e.target.value) toggleMenuItem('menu_sides', e.target.value);
                            e.target.value = '';
                        }}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}
                    >
                        <option value="">+ Add to Sides</option>
                        <option value="Arroz">Arroz</option>
                        <option value="Frijoles">Frijoles</option>
                        <option value="Salsa">Salsa</option>
                        <option value="Guacamole">Guacamole</option>
                        <option value="Chips">Chips</option>
                        <option value="Corn">Corn</option>
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(s.menu_sides || []).map(item => (
                            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                                <span>{item}</span>
                                <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => toggleMenuItem('menu_sides', item)} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* DRINKS */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Drinks</div>
                    <select 
                        onChange={(e) => {
                            if(e.target.value) toggleMenuItem('menu_drinks', e.target.value);
                            e.target.value = '';
                        }}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}
                    >
                        <option value="">+ Add to Drinks</option>
                        <option value="Horchata">Horchata</option>
                        <option value="Jamaica">Jamaica</option>
                        <option value="Soda Cans">Soda Cans</option>
                        <option value="Water Bottles">Water Bottles</option>
                        <option value="Limon con pepino">Limon con pepino</option>
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(s.menu_drinks || []).map(item => (
                            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                                <span>{item}</span>
                                <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => toggleMenuItem('menu_drinks', item)} />
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* NOTES / CUSTOMIZATIONS (FIXED) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Customizations / Notes</div>
                <textarea 
                    placeholder="E.g. No onions in the guacamole, arrive 1 hour early for setup..."
                    value={s.notes || ''} // This ensures it loads correctly when you switch clients
                    onChange={e => updateServiceData('notes', e.target.value)} // This ensures it saves
                    style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                />
            </div>

        </div>
    )
}
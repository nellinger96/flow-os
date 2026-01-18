import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Plus, Search, MapPin, Phone, Mail, User, Save, Trash2, Loader2, ArrowLeft, ShoppingBag, X } from 'lucide-react'
import CateringView from '../components/modules/CateringView'

// --- 1. THE GROCERY MATH ENGINE ---
const INGREDIENT_DB = {
    // Entrees (Per Person Quantities)
    "Pollo Enchilado": { "Chicken Thighs": "0.5 lb", "Guajillo Chiles": "0.1 oz", "Garlic": "0.5 clove" },
    "Birria": { "Beef Chuck": "0.6 lb", "Dried Chiles": "0.2 oz", "Onion": "0.1 unit" },
    "Carne Asada": { "Flap Meat (Ranchera)": "0.5 lb", "Lime": "0.5 unit", "Seasoning": "1 tsp" },
    "Fajitas de Camaron": { "Shrimp (Large)": "0.4 lb", "Bell Peppers": "0.2 unit", "Onion": "0.1 unit" },
    "Fajitas de Pollo": { "Chicken Breast": "0.5 lb", "Bell Peppers": "0.2 unit", "Onion": "0.1 unit" },
    
    // Sides
    "Arroz": { "Rice": "0.25 cups", "Tomato Sauce": "0.1 oz", "Oil": "1 tbsp" },
    "Frijoles": { "Pinto Beans (Dry)": "0.15 lb", "Oil/Lard": "1 tbsp" },
    "Ensalada de Nopales": { "Nopales": "0.2 lb", "Tomato": "0.1 unit", "Onion": "0.05 unit" },
    "Salsa Roja": { "Tomatoes": "0.1 unit", "Chiles de Arbol": "2 units" },
    "Salsa Verde": { "Tomatillos": "2 units", "Jalapenos": "0.5 unit" },
    "Tortillas": { "Corn Tortillas": "3 units" }
}

export default function Clients() {
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showGrocery, setShowGrocery] = useState(false) // Toggle for modal
    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => { fetchClients() }, [])

    async function fetchClients() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) {
            setClients(data)
            const paramId = searchParams.get('id')
            if (paramId) {
                const target = data.find(c => c.id.toString() === paramId)
                if (target) setSelectedClient(target)
            }
        }
        setLoading(false)
    }

    async function createClient() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return alert("Please log in.")
        
        const newClient = { full_name: 'New Client', email: '', phone: '', address: '', job_price: 0, status: 'lead', service_data: {}, user_id: user.id }
        
        const { data, error } = await supabase.from('customers').insert(newClient).select().single()
        
        if (error) {
            alert("Error creating: " + error.message)
        } else {
            setClients([data, ...clients])
            handleSelectClient(data)
        }
    }

    async function updateClientState(newData) {
        setSelectedClient(newData)
        setClients(clients.map(c => c.id === newData.id ? newData : c))
    }

    async function saveToDatabase() {
        if (!selectedClient) return
        setSaving(true)
        const { error } = await supabase.from('customers')
            .update({
                full_name: selectedClient.full_name,
                email: selectedClient.email,
                phone: selectedClient.phone,
                address: selectedClient.address,
                service_data: selectedClient.service_data,
                job_price: selectedClient.job_price,
                status: selectedClient.status
            })
            .eq('id', selectedClient.id)
        setSaving(false)
        if (error) alert("Save Failed: " + error.message)
    }

    async function deleteClient() {
        if (!selectedClient || !confirm('Delete this client?')) return
        const { error } = await supabase.from('customers').delete().eq('id', selectedClient.id)
        if (!error) {
            setClients(clients.filter(c => c.id !== selectedClient.id))
            setSelectedClient(null)
            setSearchParams({})
        } else {
            alert("Delete failed: " + error.message)
        }
    }

    function handleSelectClient(client) {
        setSelectedClient(client)
        setSearchParams({ id: client.id })
    }

    function goBack() {
        setSelectedClient(null)
        setSearchParams({})
    }

    // --- GROCERY CALCULATOR ---
    function calculateGroceries() {
        if (!selectedClient) return []
        
        const guestCount = parseInt(selectedClient.service_data?.guest_count || 0)
        if (guestCount === 0) return []

        // Gather all menu items into one list
        const allItems = [
            ...(selectedClient.service_data?.menu_entrees || []),
            ...(selectedClient.service_data?.menu_sides || []),
            // Add default items everyone gets
            "Tortillas", 
            "Salsa Roja",
            "Salsa Verde"
        ]

        let shoppingList = {}

        allItems.forEach(item => {
            const recipe = INGREDIENT_DB[item]
            if (recipe) {
                Object.keys(recipe).forEach(ingredient => {
                    // Extract number from string (e.g. "0.5 lb" -> 0.5)
                    const baseQty = parseFloat(recipe[ingredient])
                    const unit = recipe[ingredient].replace(/[\d\.\s]/g, '')
                    
                    const totalNeeded = baseQty * guestCount
                    
                    if (!shoppingList[ingredient]) {
                        shoppingList[ingredient] = { qty: 0, unit: unit }
                    }
                    shoppingList[ingredient].qty += totalNeeded
                })
            }
        })

        return Object.entries(shoppingList).map(([name, data]) => ({
            name,
            qty: Math.ceil(data.qty), // Round up to be safe
            unit: data.unit
        }))
    }

    const filteredClients = clients.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="app-container">
            
            {/* SIDEBAR */}
            <div className={`sidebar ${selectedClient ? 'hidden-mobile' : ''}`}>
                <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Directory</h2>
                        <button onClick={createClient} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', fontWeight:'bold' }}><Plus size={16} /> New</button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize:'14px' }} />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? <div style={{padding:'20px', color:'#94a3b8'}}>Loading...</div> : filteredClients.map(client => (
                        <div key={client.id} onClick={() => handleSelectClient(client)} style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedClient?.id === client.id ? 'white' : 'transparent', borderLeft: selectedClient?.id === client.id ? '4px solid #2563EB' : '4px solid transparent' }}>
                            <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '15px' }}>{client.full_name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{client.status || 'LEAD'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className={`main-content ${!selectedClient ? 'hidden-mobile' : ''}`}>
                {!selectedClient ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', flexDirection: 'column' }}>
                        <User size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                        <div>Select a client</div>
                    </div>
                ) : (
                    <>
                        {/* HEADER */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff', position:'sticky', top:0, zIndex:10 }}>
                            <button className="mobile-only" onClick={goBack} style={{background:'none', border:'none', display:'flex', alignItems:'center', gap:'5px', color:'#64748b', fontWeight:'bold', marginBottom:'15px', padding:0}}>
                                <ArrowLeft size={18}/> Back to List
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{width: '100%'}}>
                                    <input value={selectedClient.full_name} onChange={e => updateClientState({...selectedClient, full_name: e.target.value})} style={{ fontSize: '24px', fontWeight: '800', border: 'none', width: '100%', marginBottom:'10px' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#64748b', fontSize: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> <input value={selectedClient.email || ''} onChange={e => updateClientState({...selectedClient, email: e.target.value})} placeholder="Email" style={{ border: 'none', width: '100%' }} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> <input value={selectedClient.phone || ''} onChange={e => updateClientState({...selectedClient, phone: e.target.value})} placeholder="Phone" style={{ border: 'none', width: '100%' }} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> <input value={selectedClient.address || ''} onChange={e => updateClientState({...selectedClient, address: e.target.value})} placeholder="Address" style={{ border: 'none', width: '100%' }} /></div>
                                    </div>
                                </div>
                                
                                {/* ACTION BUTTONS */}
                                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
                                    <button onClick={deleteClient} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #fee2e2', background: 'white', color: '#ef4444', flex: 1 }}><Trash2 size={20} /></button>
                                    
                                    {/* NEW GROCERY BUTTON */}
                                    <button onClick={() => setShowGrocery(true)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#2563EB', flex: 2, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight:'bold' }}>
                                        <ShoppingBag size={18} /> Grocery List
                                    </button>

                                    <button onClick={saveToDatabase} style={{ padding: '10px 25px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : '#0f172a', color: 'white', flex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} {saving ? 'Saving' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div style={{ padding: '15px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                            <CateringView 
                                formData={selectedClient} 
                                setFormData={updateClientState} 
                                clientId={selectedClient.id}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* GROCERY MODAL */}
            {showGrocery && selectedClient && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
                    <div style={{background:'white', width:'100%', maxWidth:'500px', borderRadius:'16px', maxHeight:'80vh', display:'flex', flexDirection:'column'}}>
                        <div style={{padding:'20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h3 style={{margin:0}}>Shopping List</h3>
                            <button onClick={() => setShowGrocery(false)} style={{background:'none', border:'none', cursor:'pointer'}}><X size={24}/></button>
                        </div>
                        <div style={{padding:'20px', overflowY:'auto'}}>
                            <div style={{background:'#eff6ff', padding:'15px', borderRadius:'8px', marginBottom:'20px', color:'#1e40af', fontSize:'14px'}}>
                                <strong>Calculated for:</strong> {selectedClient.service_data?.guest_count || 0} Guests<br/>
                                <small>Includes estimates for selected entrees and sides.</small>
                            </div>
                            
                            {selectedClient.service_data?.guest_count ? (
                                <div style={{display:'grid', gap:'10px'}}>
                                    {calculateGroceries().map((item, i) => (
                                        <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'10px', borderBottom:'1px dashed #e2e8f0'}}>
                                            <span style={{fontWeight:'500', color:'#334155'}}>{item.name}</span>
                                            <span style={{fontWeight:'bold', color:'#2563EB'}}>{item.qty} {item.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{textAlign:'center', color:'#94a3b8', padding:'40px'}}>
                                    Please set the Guest Count in the "Event Details" tab first.
                                </div>
                            )}
                        </div>
                        <div style={{padding:'20px', borderTop:'1px solid #eee'}}>
                            <button onClick={() => window.print()} style={{width:'100%', padding:'15px', background:'#0f172a', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold'}}>Print List</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .app-container { display: flex; height: 100vh; font-family: sans-serif; overflow: hidden; }
                .sidebar { width: 350px; border-right: 1px solid #e2e8f0; background: #f8fafc; display: flex; flexDirection: column; }
                .main-content { flex: 1; background: white; overflow-y: auto; display: flex; flexDirection: column; }
                .mobile-only { display: none !important; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media (max-width: 600px) {
                    .sidebar { width: 100%; border-right: none; }
                    .main-content { width: 100%; }
                    .hidden-mobile { display: none !important; }
                    .mobile-only { display: flex !important; }
                }
            `}</style>
        </div>
    )
}
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Plus, Search, MapPin, Phone, Mail, User, Save, Trash2, Loader2, ArrowLeft, ShoppingBag, X, ChefHat } from 'lucide-react'
import CateringView from '../components/modules/CateringView'

export default function Clients() {
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    
    // --- AI GROCERY STATE ---
    const [showGrocery, setShowGrocery] = useState(false)
    const [groceryList, setGroceryList] = useState([])
    const [aiLoading, setAiLoading] = useState(false)

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
        
        // Added city to new client creation
        const newClient = { full_name: 'New Client', email: '', phone: '', address: '', city: '', job_price: 0, status: 'lead', service_data: {}, user_id: user.id }
        
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
                city: selectedClient.city, // Saved to database
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

    // --- AI GENERATOR FUNCTION ---
    async function generateAiGroceryList() {
        if (!selectedClient) return
        const guestCount = selectedClient.service_data?.guest_count || 0
        
        const menuItems = [
            ...(selectedClient.service_data?.menu_entrees || []),
            ...(selectedClient.service_data?.menu_sides || []),
            ...(selectedClient.service_data?.menu_drinks || []),
            ...(selectedClient.service_data?.selected_menu_items || [])
        ]

        if (guestCount === 0 || menuItems.length === 0) {
            return
        }

        setAiLoading(true)
        setGroceryList([]) 

        const { data, error } = await supabase.functions.invoke('grocery-ai', {
            body: { guest_count: guestCount, menu_items: menuItems }
        })

        setAiLoading(false)

        if (error) {
            console.error(error)
            alert("AI Error: " + error.message)
        } else {
            setGroceryList(data)
        }
    }

    const filteredClients = clients.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
        (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="app-container">
            
            {/* SIDEBAR */}
            <div className={`sidebar ${selectedClient ? 'hidden-mobile' : ''}`}>
                <div style={{ padding: '15px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Directory</h2>
                        <button onClick={createClient} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', fontWeight:'bold' }}><Plus size={16} /> New</button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                        <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 35px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize:'14px' }} />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? <div style={{padding:'20px', color:'#94a3b8'}}>Loading...</div> : filteredClients.map(client => (
                        <div key={client.id} onClick={() => handleSelectClient(client)} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedClient?.id === client.id ? 'white' : 'transparent', borderLeft: selectedClient?.id === client.id ? '4px solid #2563EB' : '4px solid transparent' }}>
                            <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '15px' }}>{client.full_name}</div>
                            {client.city && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{client.city}</div>}
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
                        <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#fff', position:'sticky', top:0, zIndex:10 }}>
                            <button className="mobile-only" onClick={goBack} style={{background:'none', border:'none', display:'flex', alignItems:'center', gap:'5px', color:'#64748b', fontWeight:'bold', marginBottom:'15px', padding:0}}>
                                <ArrowLeft size={18}/> Back to List
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{width: '100%'}}>
                                    <input value={selectedClient.full_name} onChange={e => updateClientState({...selectedClient, full_name: e.target.value})} style={{ fontSize: '24px', fontWeight: '800', border: 'none', width: '100%', marginBottom:'10px', outline:'none' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#64748b', fontSize: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> <input value={selectedClient.email || ''} onChange={e => updateClientState({...selectedClient, email: e.target.value})} placeholder="Email" style={{ border: 'none', width: '100%', outline:'none' }} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> <input value={selectedClient.phone || ''} onChange={e => updateClientState({...selectedClient, phone: e.target.value})} placeholder="Phone" style={{ border: 'none', width: '100%', outline:'none' }} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> <input value={selectedClient.address || ''} onChange={e => updateClientState({...selectedClient, address: e.target.value})} placeholder="Street Address" style={{ border: 'none', width: '100%', outline:'none' }} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '20px' }}><input value={selectedClient.city || ''} onChange={e => updateClientState({...selectedClient, city: e.target.value})} placeholder="City (e.g. Victorville)" style={{ border: 'none', width: '100%', outline:'none', fontWeight: 'bold' }} /></div>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
                                    <button onClick={deleteClient} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #fee2e2', background: 'white', color: '#ef4444', flex: 1 }}><Trash2 size={20} /></button>
                                    
                                    <button 
                                        onClick={() => { setShowGrocery(true); generateAiGroceryList(); }} 
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#2563EB', flex: 2, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight:'bold' }}
                                    >
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
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <div style={{background:'#dbeafe', padding:'8px', borderRadius:'8px', color:'#2563EB'}}><ChefHat size={20}/></div>
                                <div>
                                    <h3 style={{margin:0, fontSize:'16px'}}>AI Chef List</h3>
                                    <div style={{fontSize:'12px', color:'#64748b'}}>Powered by Gemini</div>
                                </div>
                            </div>
                            <button onClick={() => setShowGrocery(false)} style={{background:'none', border:'none', cursor:'pointer'}}><X size={24}/></button>
                        </div>
                        
                        <div style={{padding:'20px', overflowY:'auto', flex:1}}>
                            {!selectedClient.service_data?.guest_count || selectedClient.service_data?.guest_count === '0' ? (
                                <div style={{textAlign:'center', color:'#94a3b8', padding:'40px'}}>
                                    Please set the <strong>Guest Count</strong> and <strong>Menu</strong> first.
                                </div>
                            ) : aiLoading ? (
                                <div style={{textAlign:'center', padding:'40px'}}>
                                    <Loader2 className="spin" size={32} style={{marginBottom:'15px', color:'#2563EB'}}/>
                                    <div style={{fontWeight:'bold', color:'#334155'}}>Calculating Ingredients...</div>
                                    <div style={{fontSize:'13px', color:'#64748b', marginTop:'5px'}}>Analyzing menu for {selectedClient.service_data?.guest_count} people</div>
                                </div>
                            ) : groceryList.length > 0 ? (
                                <div style={{display:'grid', gap:'10px'}}>
                                    {groceryList.map((item, i) => (
                                        <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', borderBottom:'1px dashed #e2e8f0'}}>
                                            <span style={{fontWeight:'500', color:'#334155'}}>{item.item}</span>
                                            <span style={{fontWeight:'bold', color:'#2563EB', background:'#eff6ff', padding:'4px 10px', borderRadius:'12px', fontSize:'13px'}}>{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{textAlign:'center', color:'#94a3b8', padding:'40px'}}>
                                    No ingredients found. Try adding more menu items.
                                </div>
                            )}
                        </div>
                        
                        <div style={{padding:'20px', borderTop:'1px solid #eee'}}>
                            <button onClick={() => window.print()} style={{width:'100%', padding:'15px', background:'#0f172a', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}>Print Shopping List</button>
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
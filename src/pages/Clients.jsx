import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Plus, Search, MapPin, Phone, Mail, User, Save, Trash2, Loader2 } from 'lucide-react'

// Import both modules
import CateringView from '../components/modules/CateringView'


export default function Clients() {
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [businessType, setBusinessType] = useState('General') // Default
    
    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => {
        const init = async () => {
            // 1. Get User's Business Type
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.business_type) {
                setBusinessType(user.user_metadata.business_type)
            }

            // 2. Fetch Clients
            fetchClients()
        }
        init()
    }, [])

    async function fetchClients() {
        const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
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

        const newClient = {
            full_name: 'New Client',
            email: '',
            phone: '',
            address: '',
            job_price: 0,
            status: 'lead',
            service_data: {}, 
            user_id: user.id
        }
        
        const { data, error } = await supabase.from('customers').insert(newClient).select().single()
        
        if (error) alert(error.message)
        else {
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
        const { error } = await supabase.from('customers').update(selectedClient).eq('id', selectedClient.id)
        setSaving(false)
        if (error) alert('Error saving')
    }

    async function deleteClient() {
        if (!selectedClient || !confirm('Delete this client?')) return
        const { error } = await supabase.from('customers').delete().eq('id', selectedClient.id)
        if (!error) {
            setClients(clients.filter(c => c.id !== selectedClient.id))
            setSelectedClient(null)
            setSearchParams({})
        }
    }

    function handleSelectClient(client) {
        setSelectedClient(client)
        setSearchParams({ id: client.id })
    }

    const filteredClients = clients.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', overflow: 'hidden' }}>
            
            {/* SIDEBAR */}
            <div style={{ width: '350px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ flex: 1, background: 'white', overflowY: 'auto', display:'flex', flexDirection:'column' }}>
                {!selectedClient ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', flexDirection: 'column' }}>
                        <User size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                        <div>Select a client</div>
                    </div>
                ) : (
                    <>
                        {/* HEADER */}
                        <div style={{ padding: '30px', borderBottom: '1px solid #e2e8f0', background: '#fff', position:'sticky', top:0, zIndex:10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <input value={selectedClient.full_name} onChange={e => updateClientState({...selectedClient, full_name: e.target.value})} style={{ fontSize: '28px', fontWeight: '800', border: 'none', width: '100%' }} />
                                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', color: '#64748b', fontSize: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> <input value={selectedClient.email || ''} onChange={e => updateClientState({...selectedClient, email: e.target.value})} placeholder="Email" style={{ border: 'none' }} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> <input value={selectedClient.phone || ''} onChange={e => updateClientState({...selectedClient, phone: e.target.value})} placeholder="Phone" style={{ border: 'none' }} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> <input value={selectedClient.address || ''} onChange={e => updateClientState({...selectedClient, address: e.target.value})} placeholder="Address" style={{ border: 'none', width:'300px' }} /></div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={deleteClient} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #fee2e2', background: 'white', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={20} /></button>
                                    <button onClick={saveToDatabase} style={{ padding: '10px 25px', borderRadius: '8px', border: 'none', background: saving ? '#94a3b8' : '#0f172a', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} {saving ? 'Saving' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* THE SWITCHBOARD: Load View Based on Business Type */}
                        <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                            {businessType === 'Party Rental' ? (
                                <PartyRentalView 
                                    formData={selectedClient} 
                                    setFormData={updateClientState} 
                                    clientId={selectedClient.id}
                                />
                            ) : (
                                <CateringView 
                                    formData={selectedClient} 
                                    setFormData={updateClientState} 
                                    clientId={selectedClient.id}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
            <style>{` .spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
        </div>
    )
}
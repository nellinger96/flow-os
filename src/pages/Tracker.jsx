import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient' 
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// --- ICONS ---
const leadIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const soldIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// --- HELPER TO RE-CENTER MAP ---
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom()); 
  }, [center, map]);
  return null;
}

function RealMap({ customers }) {
  // 1. DYNAMIC CENTER: Default to US center, but jump to first customer if exists
  let position = [39.8283, -98.5795]; // Center of US
  let zoom = 4;

  const validCustomers = customers.filter(c => c.lat && c.lng);
  
  if (validCustomers.length > 0) {
      // Use the most recent customer (first in list) as the center
      position = [validCustomers[0].lat, validCustomers[0].lng];
      zoom = 13;
  }

  return (
    <MapContainer center={position} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      
      {/* Auto-update view when data changes */}
      <MapUpdater center={position} />

      {validCustomers.map((customer) => (
          <Marker key={customer.id} position={[customer.lat, customer.lng]} icon={customer.status === 'sold' ? soldIcon : leadIcon}>
            <Popup>
                <strong>{customer.full_name}</strong> <br /> {customer.address} <br/> Status: {customer.status ? customer.status.toUpperCase() : 'LEAD'}
            </Popup>
          </Marker>
      ))}
    </MapContainer>
  )
}

function Tracker() {
  const [customers, setCustomers] = useState([])
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [editingId, setEditingId] = useState(null) 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [mobileTab, setMobileTab] = useState('list')

  const totalLeads = customers.length
  const totalSold = customers.filter(c => c.status === 'sold').length
  const winRate = totalLeads > 0 ? ((totalSold / totalLeads) * 100).toFixed(0) : 0

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: false })
    if (!error) setCustomers(data || [])
  }

  async function deleteCustomer(id) {
    if(!confirm("Are you sure?")) return;
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (!error) fetchCustomers()
  }

  function startEdit(customer) {
    setNewName(customer.full_name); setNewAddress(customer.address); setEditingId(customer.id);
    if(isMobile) setMobileTab('list')
  }

  function cancelEdit() { setNewName(''); setNewAddress(''); setEditingId(null); }

async function handleSave() {
    if (!newAddress || !newName) { alert("Enter name and address!"); return }

    const { data: { user } } = await supabase.auth.getUser()

    if (editingId) {
        const { error } = await supabase.from('customers').update({ full_name: newName, address: newAddress }).eq('id', editingId)
        if (!error) { cancelEdit(); fetchCustomers(); }
        return
    }

    try {
      // 2. FIX: SEARCH ANYWHERE (Removed "Victorville, CA")
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newAddress)}`)
      const data = await response.json()
      
      let lat = null, lng = null
      if (data && data.length > 0) { lat = parseFloat(data[0].lat); lng = parseFloat(data[0].lon) }
      else { alert("Address not found. Try adding City, State."); return; } // Validate result
      
      const { error } = await supabase.from('customers').insert({ 
          full_name: newName, 
          address: newAddress, 
          status: 'lead', 
          lat: lat, 
          lng: lng,
          user_id: user.id
      })

      if (!error) { cancelEdit(); fetchCustomers(); if (isMobile) setMobileTab('map') }
    } catch (err) { alert("Geocoding failed.") }
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase.from('customers').update({ status: newStatus }).eq('id', id)
    if (!error) fetchCustomers() 
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', width: '100vw', margin: 0, fontFamily: 'sans-serif', flexDirection: 'row' }}>
      <div style={{ width: isMobile ? '100%' : '350px', display: (isMobile && mobileTab === 'map') ? 'none' : 'block', padding: '20px', background: 'white', borderRight: '2px solid #ddd', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '10px' }}>RouteDensity</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: '#1e293b', color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalLeads}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>DOORS</div>
            </div>
            <div style={{ flex: 1, background: '#166534', color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalSold}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>SOLD</div>
            </div>
            <div style={{ flex: 1, background: '#ca8a04', color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{winRate}%</div><div style={{ fontSize: '12px', opacity: 0.8 }}>WIN RATE</div>
            </div>
        </div>
        <div style={{ background: editingId ? '#fff7ed' : '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: editingId ? '2px solid orange' : '1px solid #bae6fd' }}>
          <h3 style={{marginTop: 0}}>{editingId ? '✏️ Edit Lead' : 'Add Lead'}</h3>
          <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ display: 'block', width: '90%', padding: '8px', marginBottom: '10px' }} />
          {/* 3. FIX: BETTER PLACEHOLDER */}
          <input type="text" placeholder="Address (e.g. 123 Main St, Miami FL)" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} style={{ display: 'block', width: '90%', padding: '8px', marginBottom: '10px' }} />
          <div style={{display: 'flex', gap: '10px'}}>
            <button onClick={handleSave} style={{ flex: 1, padding: '10px', background: editingId ? 'orange' : '#2563EB', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{editingId ? 'Update Lead' : 'Save Lead'}</button>
            {editingId && (<button onClick={cancelEdit} style={{ padding: '10px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>)}
          </div>
        </div>
        <h3>My Route</h3>
        <ul style={{ listStyle: 'none', padding: 0, paddingBottom: '80px' }}>
          {customers.map((customer) => (
            <li key={customer.id} style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div><div style={{ fontWeight: 'bold' }}>{customer.full_name}</div><div style={{ fontSize: '0.9em', color: '#555' }}>{customer.address}</div></div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end'}}>
                    {customer.status === 'sold' ? (<button onClick={() => updateStatus(customer.id, 'lead')} style={{ background: '#ccc', color: 'black', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Reset</button>) : (<button onClick={() => updateStatus(customer.id, 'sold')} style={{ background: '#166534', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>$$ SOLD</button>)}
                    <div style={{display: 'flex', gap: '5px'}}>
                        <button onClick={() => startEdit(customer)} style={{background: 'none', border: '1px solid #ddd', cursor: 'pointer', borderRadius: '4px', padding: '2px 5px'}}>✏️</button>
                        <button onClick={() => deleteCustomer(customer.id)} style={{background: 'none', border: '1px solid #fee2e2', cursor: 'pointer', borderRadius: '4px', padding: '2px 5px'}}>🗑️</button>
                    </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1, height: '100%', position: 'relative', display: (isMobile && mobileTab === 'list') ? 'none' : 'block' }}>
        <RealMap customers={customers} />
      </div>
      {isMobile && (
        <button onClick={() => setMobileTab(mobileTab === 'list' ? 'map' : 'list')} style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, padding: '15px 25px', background: '#1e293b', color: 'white', borderRadius: '50px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          {mobileTab === 'list' ? '🗺️ Show Map' : '📋 Show List'}
        </button>
      )}
    </div>
  )
}

export default Tracker
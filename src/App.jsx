import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

// --- PAGE IMPORTS ---
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Tracker from './pages/Tracker'
import Analytics from './pages/Analytics'
import Clients from './pages/Clients'
import Invoices from './pages/Invoices'
import Login from './pages/Login'
import UpdatePassword from './pages/UpdatePassword'
import Settings from './pages/Settings'
import SignContract from './pages/SignContract'

// --- COMPONENT IMPORTS ---
import Sidebar from './components/Sidebar'

// --- TOP BAR COMPONENT ---
function TopBar({ onOpenMenu }) {
    const location = useLocation()
    
    // Dynamic Title based on route
    let title = 'Dashboard'
    if (location.pathname === '/calendar') title = 'Event Calendar'
    if (location.pathname === '/map') title = 'Route Map'
    if (location.pathname === '/analytics') title = 'Business Analytics'
    if (location.pathname === '/clients') title = 'Directory'
    if (location.pathname === '/invoices') title = 'Invoices'
    if (location.pathname === '/settings') title = 'Business Settings'
    if (location.pathname.includes('/sign')) title = 'Digital Contract'

    return (
        <div style={{
            height: '60px', background: 'white', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', padding: '0 20px',
            position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 9990,
            boxSizing: 'border-box'
        }}>
            <button onClick={onOpenMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '15px', color: '#334155' }}>
                <Menu size={28} />
            </button>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{title}</h2>
        </div>
    )
}

// --- MAIN APP COMPONENT ---
function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [businessType, setBusinessType] = useState('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.user_metadata?.business_type) setBusinessType(session.user.user_metadata.business_type)
      setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user?.user_metadata?.business_type) setBusinessType(session.user.user_metadata.business_type)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
      await supabase.auth.signOut()
      setIsSidebarOpen(false)
  }

  if (loading) return null

  // --- PUBLIC / LOGIN FLOW ---
  // If no session, only show Login, Update Password, OR Public Contract Page
  if (!session) {
    return (
        <Router>
            <Routes>
                {/* PUBLIC ROUTE: Clients can access this without login */}
                <Route path="/sign/:id" element={<SignContract />} />
                
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="*" element={<Login />} />
            </Routes>
        </Router>
    )
  }

  // --- SECURE APP FLOW (Logged In) ---
  return (
    <Router>
        {/* NAVIGATION COMPONENTS */}
        <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            type={businessType} 
            onLogout={handleLogout}
        />
        <TopBar onOpenMenu={() => setIsSidebarOpen(true)} />

        {/* MAIN CONTENT AREA */}
        <div style={{ 
            height: '100vh', 
            overflowY: 'auto', // Allows scrolling
            paddingTop: '60px', // Push content down below TopBar
            backgroundColor: '#f8fafc'
        }}>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/map" element={<Tracker />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/sign/:id" element={<SignContract />} />
                <Route path="/update-password" element={<UpdatePassword />} />
            </Routes>
        </div>
    </Router>
  )
}

export default App
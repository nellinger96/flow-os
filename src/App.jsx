import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isTestDatabase } from './supabaseClient'

// --- PAGE IMPORTS ---
import LandingPage from './pages/LandingPage' // NEW
import Signup from './pages/Signup' // NEW
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
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import StripeCallback from './pages/StripeCallback'

// --- COMPONENT IMPORTS ---
import Sidebar from './components/Sidebar'
import SubscriptionGate from './components/SubscriptionGate' // NEW

// --- TOP BAR COMPONENT ---
function TopBar({ onOpenMenu }) {
    const location = useLocation()
    const { t } = useTranslation()

    // Dynamic Title based on route
    let title = t('nav.dashboard')
    if (location.pathname === '/calendar') title = t('nav.eventCalendar')
    if (location.pathname === '/map') title = t('nav.routeMap')
    if (location.pathname === '/analytics') title = t('nav.businessAnalytics')
    if (location.pathname === '/clients') title = t('nav.directory')
    if (location.pathname === '/invoices') title = t('nav.invoices')
    if (location.pathname === '/settings') title = t('nav.businessSettings')
    if (location.pathname.includes('/sign')) title = t('nav.digitalContract')

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
            {isTestDatabase && <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' }}>{t('common.testData')}</span>}
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.user_metadata?.business_type) setBusinessType(session.user.user_metadata.business_type)
      setLoading(false)
    })

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

  // --- PUBLIC / VISITOR FLOW (Not Logged In) ---
  if (!session) {
    return (
        <Router>
            <Routes>
                {/* 1. LANDING PAGE (Root) */}
                <Route path="/" element={<LandingPage />} />
                
                {/* 2. AUTH PAGES */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* 3. PUBLIC LEGAL/CONTRACT PAGES */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/sign/:id" element={<SignContract />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                
                {/* Catch-all redirects to Landing Page instead of Login */}
                <Route path="*" element={<LandingPage />} />
            </Routes>
        </Router>
    )
  }

  // --- SECURE APP FLOW (Logged In) ---
  return (
    <Router>
        <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            type={businessType} 
            onLogout={handleLogout}
        />
        <TopBar onOpenMenu={() => setIsSidebarOpen(true)} />

        <div style={{ 
            height: '100vh', 
            overflowY: 'auto', 
            paddingTop: '60px', 
            backgroundColor: '#f8fafc'
        }}>
            <Routes>
                {/* --- PROTECTED ROUTES (Must Pay to Enter) --- */}
                <Route path="/" element={<SubscriptionGate><Dashboard /></SubscriptionGate>} />
                <Route path="/dashboard" element={<SubscriptionGate><Dashboard /></SubscriptionGate>} />
                
                <Route path="/calendar" element={<SubscriptionGate><Calendar /></SubscriptionGate>} />
                <Route path="/map" element={<SubscriptionGate><Tracker /></SubscriptionGate>} />
                <Route path="/analytics" element={<SubscriptionGate><Analytics /></SubscriptionGate>} />
                <Route path="/clients" element={<SubscriptionGate><Clients /></SubscriptionGate>} />
                <Route path="/invoices" element={<SubscriptionGate><Invoices /></SubscriptionGate>} />
                <Route path="/settings" element={<SubscriptionGate><Settings /></SubscriptionGate>} />

                {/* --- PUBLIC ACCESS INSIDE APP (No Paywall) --- */}
                {/* Users need to access these even if subscription is expired */}
                <Route path="/stripe-callback" element={<StripeCallback />} />
                <Route path="/sign/:id" element={<SignContract />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/update-password" element={<UpdatePassword />} />
            </Routes>
        </div>
    </Router>
  )
}

export default App
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// --- PAGE IMPORTS ---
import LandingPage from './pages/LandingPage'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import EventDay, { LoadoutRedirect } from './pages/EventDay'
import Equipment from './pages/Equipment'
import CrewDay from './pages/CrewDay'
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
import AppShell from './components/layout/AppShell'
import SubscriptionGate from './components/SubscriptionGate'

// --- MAIN APP COMPONENT ---
function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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
                <Route path="/crew/:token" element={<CrewDay />} />
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
        <Routes>
            {/* Pages that stand on their own (no app menu, no paywall) */}
            <Route path="/stripe-callback" element={<StripeCallback />} />
            <Route path="/sign/:id" element={<SignContract />} />
            <Route path="/crew/:token" element={<CrewDay />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* The app itself: menu + subscription check, then the page */}
            <Route path="*" element={
                <AppShell businessName={session.user?.user_metadata?.business_name} onLogout={() => supabase.auth.signOut()}>
                    <SubscriptionGate>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/calendar" element={<Calendar />} />
                            <Route path="/day" element={<EventDay />} />
                            <Route path="/loadout" element={<LoadoutRedirect />} />
                            <Route path="/loadout/equipment" element={<Equipment />} />
                            <Route path="/map" element={<Tracker />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/clients" element={<Clients />} />
                            <Route path="/invoices" element={<Invoices />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<Dashboard />} />
                        </Routes>
                    </SubscriptionGate>
                </AppShell>
            } />
        </Routes>
    </Router>
  )
}

export default App

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Lock, CreditCard, LogOut, Loader } from 'lucide-react'

export default function SubscriptionGate({ children }) {
    const [status, setStatus] = useState('loading')
    
    // 🔴 PASTE YOUR STRIPE LINK HERE 🔴
    const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/8x2cN69Ih3azcDdakN4Vy00" 

    useEffect(() => {
        checkSubscription()
    }, [])

    async function checkSubscription() {
        const { data: { user } } = await supabase.auth.getUser()
        
        // If no user, the Auth system will handle it (or we send them to login)
        if (!user) return 

        // Check the database for their status
        const { data, error } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single()

        // If they are active OR if they are your mom (we can manually set her to active later)
        if (data?.subscription_status === 'active') {
            setStatus('active')
        } else {
            setStatus('inactive')
        }
    }

    // 1. LOADING SCREEN
    if (status === 'loading') {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">
                <Loader className="animate-spin mr-2" /> Checking subscription...
            </div>
        )
    }

    // 2. ACCESS GRANTED (Show the Dashboard)
    if (status === 'active') {
        return children 
    }

    // 3. ACCESS DENIED (The Paywall)
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 font-sans">
            <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md text-center border border-slate-200">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} className="text-blue-600"/>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Start Your 14-Day Trial</h1>
                <p className="text-slate-600 mb-8">
                    To access CaterFlow, please activate your subscription. You won't be charged until your trial ends.
                </p>
                
                <div className="text-4xl font-black text-slate-900 mb-8">
                    $29<span className="text-lg text-slate-400 font-medium">/mo</span>
                </div>

                <a 
                    href={STRIPE_PAYMENT_LINK + `?client_reference_id=${supabase.auth.getUser().id}`} 
                    className="block w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg transform hover:scale-105"
                >
                    <CreditCard size={20}/> Start Free Trial
                </a>
                
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-6 text-sm text-slate-500 hover:text-slate-800 underline block w-full"
                >
                    I already paid, let me in!
                </button>

                <button 
                    onClick={() => supabase.auth.signOut()} 
                    className="mt-4 text-xs text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 w-full"
                >
                    <LogOut size={12}/> Sign Out
                </button>
            </div>
        </div>
    )
}
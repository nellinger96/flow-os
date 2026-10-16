import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, DollarSign, FileText, ArrowRight, LayoutDashboard, LogIn } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="font-sans text-slate-800">
      
      {/* NAVBAR */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <div className="text-2xl font-black text-blue-700 tracking-tighter">CaterFlow.</div>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="flex items-center gap-2 px-4 py-2 text-slate-600 font-semibold hover:text-blue-600 transition">
            <LogIn size={18} /> Login
          </Link>
          <Link to="/signup" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md">
            Get Started
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="text-center py-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
          Run your Catering Business <br/><span className="text-blue-600">like a Pro.</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop using messy spreadsheets and texts. Create invoices, sign contracts, and get paid online—all in one simple app.
        </p>
        <div className="flex justify-center gap-4 flex-col sm:flex-row">
          <Link to="/signup" className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:scale-105 transition transform">
            Start 14-Day Free Trial <ArrowRight size={20}/>
          </Link>
          <a href="#features" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 text-lg font-bold rounded-xl hover:bg-slate-50 transition">
            How it works
          </a>
        </div>
        <div className="mt-12 text-sm text-slate-500 font-medium">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full mr-2">✓ No credit card required</span>
          <span>Set up in 2 minutes</span>
        </div>
      </header>

      {/* PROBLEM / SOLUTION */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-10">
          <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6">
              <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Professional Contracts</h3>
            <p className="text-slate-600">Send digital contracts that clients can sign on their phone. No more "I didn't agree to that" disputes.</p>
          </div>

          <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-6">
              <DollarSign size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Payments</h3>
            <p className="text-slate-600">Accept credit card payments instantly. Send an invoice link and get paid before you even start cooking.</p>
          </div>

          <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-6">
              <LayoutDashboard size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Kitchen & Prep Sheets</h3>
            <p className="text-slate-600">Automatically generate kitchen prep lists and shopping guides based on your event menu.</p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / STATS */}
      <section className="bg-slate-900 py-16 text-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8">Built for Caterers, by Caterers.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-80">
            <div><div className="text-4xl font-bold text-blue-400">100%</div><div className="text-sm mt-1">Digital Workflow</div></div>
            <div><div className="text-4xl font-bold text-blue-400">1%</div><div className="text-sm mt-1">Transaction Fee*</div></div>
            <div><div className="text-4xl font-bold text-blue-400">24/7</div><div className="text-sm mt-1">Access Anywhere</div></div>
            <div><div className="text-4xl font-bold text-blue-400">Secure</div><div className="text-sm mt-1">Stripe Payments</div></div>
          </div>
          <p className="text-xs text-slate-500 mt-8">*Standard Stripe processing fees apply.</p>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-6 text-center max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing.</h2>
        <p className="text-slate-600 mb-12">Everything you need to grow your catering business.</p>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* MONTHLY CARD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-lg relative overflow-hidden flex flex-col h-full hover:border-blue-300 transition">
            <h3 className="text-2xl font-bold text-slate-900">Pro Plan</h3>
            <div className="text-5xl font-black text-slate-900 my-6">$29<span className="text-lg font-medium text-slate-500">/mo</span></div>
            <p className="text-slate-500 font-medium mb-6 text-sm bg-slate-100 inline-block px-3 py-1 rounded-full self-center">Cancel Anytime</p>
            <ul className="text-left space-y-4 mb-8 text-slate-600 flex-grow">
              <li className="flex gap-3"><CheckCircle className="text-blue-500" size={20}/> Unlimited Events</li>
              <li className="flex gap-3"><CheckCircle className="text-blue-500" size={20}/> Digital Contracts</li>
              <li className="flex gap-3"><CheckCircle className="text-blue-500" size={20}/> Kitchen Prep Sheets</li>
              <li className="flex gap-3"><CheckCircle className="text-blue-500" size={20}/> Stripe Payments</li>
            </ul>
            <Link to="/signup" className="block w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">
              Start Monthly Trial
            </Link>
          </div>

          {/* ANNUAL CARD */}
          <div className="bg-white border-2 border-blue-600 rounded-3xl p-10 shadow-xl relative overflow-hidden flex flex-col h-full transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">BEST VALUE</div>
            <h3 className="text-2xl font-bold text-slate-900">Annual Plan</h3>
            <div className="text-5xl font-black text-slate-900 my-6">$199<span className="text-lg font-medium text-slate-500">/yr</span></div>
            <p className="text-green-600 font-bold mb-6 text-sm bg-green-50 inline-block px-3 py-1 rounded-full self-center">Save $149 a year</p>
            <ul className="text-left space-y-4 mb-8 text-slate-600 flex-grow">
              <li className="flex gap-3"><CheckCircle className="text-green-500" size={20}/> Unlimited Events</li>
              <li className="flex gap-3"><CheckCircle className="text-green-500" size={20}/> Digital Contracts</li>
              <li className="flex gap-3"><CheckCircle className="text-green-500" size={20}/> Kitchen Prep Sheets</li>
              <li className="flex gap-3"><CheckCircle className="text-green-500" size={20}/> Stripe Payments</li>
            </ul>
            <Link to="/signup" className="block w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md">
              Start Annual Trial
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 py-10 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} CaterFlow OS. All rights reserved.</p>
      </footer>
    </div>
  )
}
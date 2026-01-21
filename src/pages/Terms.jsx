import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6', color: '#333' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#666', marginBottom: '20px' }}>
                <ArrowLeft size={16} /> Back
            </Link>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>Terms of Service</h1>
            <p style={{ color: '#666', fontSize: '14px' }}>Last Updated: January 21, 2026</p>

            <h3>1. Agreement to Terms</h3>
            <p>By accessing our website and using CaterFlow OS, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

            <h3>2. Description of Service</h3>
            <p>CaterFlow OS is a customer relationship management and catering management software. We provide tools for invoicing, scheduling, and client management.</p>

            <h3>3. User Accounts</h3>
            <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms.</p>

            <h3>4. Payments</h3>
            <p>All payments are processed securely via Stripe. We do not store your full credit card information on our servers.</p>

            <h3>5. Termination</h3>
            <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
        </div>
    );
}
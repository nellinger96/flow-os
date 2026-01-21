import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6', color: '#333' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#666', marginBottom: '20px' }}>
                <ArrowLeft size={16} /> Back
            </Link>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>Privacy Policy</h1>
            <p style={{ color: '#666', fontSize: '14px' }}>Last Updated: January 21, 2026</p>

            <h3>1. Introduction</h3>
            <p>Welcome to CaterFlow OS. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website.</p>

            <h3>2. Data We Collect</h3>
            <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows: Identity Data (name), Contact Data (email, phone), and Transaction Data (payments via Stripe).</p>

            <h3>3. How We Use Your Data</h3>
            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data to perform the contract we are about to enter into or have entered into with you.</p>

            <h3>4. Data Security</h3>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way.</p>

            <h3>5. Contact Us</h3>
            <p>If you have any questions about this privacy policy, please contact us at: support@caterflowos.com</p>
        </div>
    );
}
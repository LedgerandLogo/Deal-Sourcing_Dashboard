import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import DealDashboard from './DealDashboard.jsx';
import RegisterPage from './RegisterPage.jsx';
import DealsPage from './DealsPage.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (typeof window !== 'undefined' && window.location.pathname === '/register') {
    return <RegisterPage />;
  }
  if (typeof window !== 'undefined' && window.location.pathname === '/deals') {
    return <DealsPage />;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo('Account created. Check your email to confirm, then sign in.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#666' }}>Loading...</div>;
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'sans-serif', padding: '0 1.5rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Deal flow</h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          {mode === 'signin' ? 'Sign in to your pipeline.' : 'Create an account.'}
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
          {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}
          {info && <p style={{ color: '#27ae60', fontSize: 13, margin: 0 }}>{info}</p>}
          <button type="submit" style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#1d1d1d', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
          style={{ marginTop: 12, background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          {mode === 'signin' ? "Don\'t have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer' }}>
          Sign out ({session.user.email})
        </button>
      </div>
      <DealDashboard userId={session.user.id} />
    </div>
  );
}

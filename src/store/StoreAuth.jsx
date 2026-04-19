import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { Wordmark, Btn, Icon, inputStyle } from '../primitives.jsx';

export default function StoreAuth({ onAuth }) {
  const [mode, setMode]     = useState('signup'); // 'signup' | 'login'
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoad]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoad(true);

    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Fire Firestore write without awaiting — don't block the UI
        setDoc(doc(db, 'stores', cred.user.uid), {
          ownerId:     cred.user.uid,
          ownerEmail:  email,
          onboarded:   false,
          createdAt:   serverTimestamp(),
        });
        onAuth(cred.user, false); // false = needs onboarding
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, 'stores', cred.user.uid));
        const onboarded = snap.exists() && snap.data().onboarded === true;
        onAuth(cred.user, onboarded);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--cream-50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Wordmark size={26} />
          <div style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-500)' }}>
            {mode === 'signup' ? 'Create your store account' : 'Welcome back'}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><Icon name="mail" size={16} color="var(--ink-400)" /></span>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourstore.com"
                  style={{ ...inputStyle, paddingLeft: 38 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><Icon name="lock" size={16} color="var(--ink-400)" /></span>
                <input
                  type="password" required minLength={6}
                  value={password} onChange={e => setPass(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  style={{ ...inputStyle, paddingLeft: 38 }}
                />
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEE2E2', color: '#B91C1C', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <Btn
              variant="accent" size="lg" fullWidth
              disabled={loading}
              icon={loading ? <Spin /> : null}
            >
              {loading
                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'signup' ? 'Create store account' : 'Sign in')}
            </Btn>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-500)' }}>
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--aubergine-600)', fontWeight: 600, cursor: 'pointer' }}>Sign in</button>
              </>
            ) : (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); }} style={{ color: 'var(--aubergine-600)', fontWeight: 600, cursor: 'pointer' }}>Create one</button>
              </>
            )}
          </div>
        </div>

        {/* Store type note */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--ink-400)', lineHeight: 1.6 }}>
          For vintage stores, resale shops, antique malls,<br />
          and curated secondhand boutiques.
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--ink-500)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const iconWrap = {
  position: 'absolute', left: 12, top: '50%',
  transform: 'translateY(-50%)', pointerEvents: 'none',
};

const Spin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.3" />
    <path d="M12 2a10 10 0 0110 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use':    'That email is already registered. Try signing in.',
    'auth/invalid-email':            'Please enter a valid email address.',
    'auth/weak-password':            'Password must be at least 6 characters.',
    'auth/user-not-found':           'No account found for that email.',
    'auth/wrong-password':           'Incorrect password. Try again.',
    'auth/invalid-credential':       'Incorrect email or password.',
    'auth/too-many-requests':        'Too many attempts. Please wait a moment.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

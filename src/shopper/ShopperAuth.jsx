import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { Wordmark, Btn, Icon, inputStyle } from '../primitives.jsx';
import { GarmentSVG } from '../garments.jsx';

export default function ShopperAuth({ onAuth, onSkip }) {
  const [mode, setMode]       = useState('signup');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [handle, setHandle]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Fire Firestore write without awaiting — don't block the UI
        setDoc(doc(db, 'users', cred.user.uid), {
          uid:       cred.user.uid,
          email,
          handle:    handle || email.split('@')[0],
          onboarded: false,
          createdAt: serverTimestamp(),
        });
        onAuth(cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onAuth(cred.user);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', background: 'var(--cream-50)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Decorative background garments */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none', overflow: 'hidden' }}>
        {[
          { kind: 'dress',  color: '#5B4D7A', top: 40,  left: -20,  w: 140, rot: -8 },
          { kind: 'jacket', color: '#B88468', top: 30,  right: -30, w: 120, rot: 12 },
          { kind: 'bag',    color: '#A8B79E', bottom: 180, left: 20, w: 110, rot: -4 },
          { kind: 'boots',  color: '#3A2E3A', bottom: 120, right: 10, w: 120, rot: 6 },
        ].map((g, i) => (
          <div key={i} style={{ position: 'absolute', width: g.w, height: g.w * 1.3, top: g.top, bottom: g.bottom, left: g.left, right: g.right, transform: `rotate(${g.rot}deg)` }}>
            <GarmentSVG kind={g.kind} color={g.color} accent="#3A2E3A" />
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 28px 40px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 36 }}>
          <Wordmark size={24} />
          <div style={{ marginTop: 20 }}>
            <h1 className="display" style={{ fontSize: 32, lineHeight: 1.05, fontWeight: 500, margin: 0 }}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-500)', marginTop: 8, lineHeight: 1.5 }}>
              {mode === 'signup'
                ? 'Find curated vintage fits from stores near you.'
                : 'Sign in to see your personalized feed.'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div>
              <label style={labelStyle}>Your handle</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)', fontSize: 15, pointerEvents: 'none' }}>@</span>
                <input
                  style={{ ...inputStyle, paddingLeft: 28 }}
                  value={handle}
                  onChange={e => setHandle(e.target.value.replace(/[^a-z0-9_.]/gi, '').toLowerCase())}
                  placeholder="yourhandle"
                  autoCapitalize="none"
                />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email" required autoComplete="email"
              style={inputStyle}
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password" required minLength={6}
              style={inputStyle}
              value={password} onChange={e => setPass(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEE2E2', color: '#B91C1C', fontSize: 13 }}>
              {error}
            </div>
          )}

          <Btn variant="accent" size="lg" fullWidth disabled={loading}
            icon={loading ? <Spin /> : null} style={{ marginTop: 4 }}>
            {loading
              ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </Btn>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-500)' }}>
          {mode === 'signup' ? (
            <>Have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--aubergine-600)', fontWeight: 600, cursor: 'pointer' }}>Sign in</button>
            </>
          ) : (
            <>No account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} style={{ color: 'var(--aubergine-600)', fontWeight: 600, cursor: 'pointer' }}>Create one</button>
            </>
          )}
        </div>

        <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <Btn variant="soft" size="lg" fullWidth onClick={onSkip}>
          Browse without account
        </Btn>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--ink-500)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const Spin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.3" />
    <path d="M12 2a10 10 0 0110 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/invalid-email':        'Please enter a valid email.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/user-not-found':       'No account found for that email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Incorrect email or password.',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
  };
  return map[code] || 'Something went wrong. Try again.';
}

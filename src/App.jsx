import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { Spinner, Wordmark, Btn } from './primitives.jsx';
import { GarmentSVG } from './garments.jsx';
import StoreAuth from './store/StoreAuth.jsx';
import StoreOnboarding from './store/StoreOnboarding.jsx';
import StoreOwnerApp from './owner.jsx';
import ShopperAuth from './shopper/ShopperAuth.jsx';
import ShopperApp from './shopper.jsx';

// App state machine:
//   loading      → checking auth
//   landing      → choose "I'm shopping" or "I'm a store owner"
//   shopper-auth → ShopperAuth (signup/login)
//   shopper-app  → ShopperApp (feed, quiz, etc.)
//   store-auth   → StoreAuth
//   onboarding   → StoreOnboarding
//   dashboard    → StoreOwnerApp

export default function App() {
  const [appState, setAppState]       = useState('loading');
  const [user, setUser]               = useState(null);
  const [role, setRole]               = useState(null); // 'shopper' | 'store'
  const [stripeSuccess, setStripeSuccess] = useState(null);

  // Detect Stripe checkout return
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const claimId   = params.get('claim_id');
    if (sessionId && claimId) {
      setStripeSuccess({ sessionId, claimId });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        // Check if user previously chose "I'm shopping" (guest mode)
        if (localStorage.getItem('stylography_role') === 'shopper') {
          setRole('shopper');
          setAppState('shopper-app');
        } else {
          setAppState('landing');
        }
        return;
      }
      setUser(firebaseUser);

      // Check if store owner
      const storeSnap = await getDoc(doc(db, 'stores', firebaseUser.uid));
      if (storeSnap.exists()) {
        setRole('store');
        localStorage.setItem('stylography_role', 'store');
        const onboarded = storeSnap.data().onboarded === true;
        setAppState(onboarded ? 'dashboard' : 'onboarding');
        return;
      }

      // Check if shopper
      const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userSnap.exists()) {
        setRole('shopper');
        localStorage.setItem('stylography_role', 'shopper');
        setAppState('shopper-app');
        return;
      }

      // Authenticated but no doc yet — check localStorage for role
      const savedRole = localStorage.getItem('stylography_role');
      if (savedRole === 'shopper') {
        setRole('shopper');
        setAppState('shopper-app');
        return;
      }
      setAppState('landing');
    });
    return unsub;
  }, []);

  if (appState === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream-50)' }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (appState === 'landing') {
    return <Landing onShopper={() => { localStorage.setItem('stylography_role', 'shopper'); setAppState('shopper-auth'); }} onStore={() => setAppState('store-auth')} />;
  }

  if (appState === 'shopper-auth') {
    return (
      <ShopperAuth
        onAuth={(firebaseUser) => {
          setUser(firebaseUser);
          setRole('shopper');
          setAppState('shopper-app');
        }}
        onSkip={() => {
          setRole('shopper');
          localStorage.setItem('stylography_role', 'shopper');
          setAppState('shopper-app');
        }}
      />
    );
  }

  if (appState === 'shopper-app') {
    return (
      <ShopperApp
        user={user}
        initialScreen="feed"
        stripeSuccess={stripeSuccess}
        onExit={() => { setUser(null); setRole(null); localStorage.removeItem('stylography_role'); setAppState('landing'); }}
      />
    );
  }

  if (appState === 'store-auth') {
    return (
      <StoreAuth
        onAuth={(firebaseUser, onboarded) => {
          setUser(firebaseUser);
          setRole('store');
          setAppState(onboarded ? 'dashboard' : 'onboarding');
        }}
      />
    );
  }

  if (appState === 'onboarding') {
    return (
      <StoreOnboarding
        user={user}
        onComplete={() => setAppState('dashboard')}
      />
    );
  }

  return <StoreOwnerApp user={user} />;
}

// ─── Landing page ──────────────────────────────────────────────────────────────

function Landing({ onShopper, onStore }) {
  return (
    <div style={{ height: '100vh', background: 'var(--cream-50)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* Decorative garments */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[
          { kind: 'dress',  color: '#5B4D7A', top: -10,  left: -30,  w: 160, rot: -10, opacity: 0.07 },
          { kind: 'jacket', color: '#B88468', top: 60,   right: -40, w: 140, rot: 14,  opacity: 0.06 },
          { kind: 'bag',    color: '#A8B79E', bottom: 160, left: 10, w: 130, rot: -5,  opacity: 0.07 },
          { kind: 'boots',  color: '#3A2E3A', bottom: 80, right: 0,  w: 130, rot: 8,   opacity: 0.06 },
        ].map((g, i) => (
          <div key={i} style={{ position: 'absolute', width: g.w, height: g.w * 1.3, top: g.top, bottom: g.bottom, left: g.left, right: g.right, transform: `rotate(${g.rot}deg)`, opacity: g.opacity }}>
            <GarmentSVG kind={g.kind} color={g.color} accent="#3A2E3A" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px 48px' }}>
        <Wordmark size={28} />

        <div style={{ marginTop: 32, marginBottom: 48 }}>
          <h1 className="display" style={{ fontSize: 38, lineHeight: 1.05, fontWeight: 500, margin: 0, color: 'var(--ink-900)' }}>
            Vintage finds,<br />curated for you.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-500)', marginTop: 12, lineHeight: 1.6, maxWidth: 280 }}>
            Discover unique pieces from local thrift and vintage stores — styled into outfits you'll love.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn variant="accent" size="lg" fullWidth onClick={onShopper}>
            I'm shopping
          </Btn>
          <Btn variant="soft" size="lg" fullWidth onClick={onStore}>
            I'm a store owner
          </Btn>
        </div>
      </div>

      {/* Footer tagline */}
      <div style={{ position: 'relative', textAlign: 'center', paddingBottom: 32, fontSize: 12, color: 'var(--ink-300)', letterSpacing: '0.04em' }}>
        STYLOGRAPHY · VINTAGE REIMAGINED
      </div>
    </div>
  );
}

/**
 * Seller / store dashboard is served on a dedicated host (e.g. stores.stylography.vercel.app).
 * Set VITE_STORE_PORTAL_HOSTNAME to override the default.
 */
export function isStorePortalHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  const override = import.meta.env.VITE_STORE_PORTAL_HOSTNAME;
  if (override && h === override) return true;
  return h === 'stores.stylography.vercel.app';
}

/** Main shopper app URL (without stores. subdomain), for links from the seller host */
export function getShopperAppOrigin() {
  const u = import.meta.env.VITE_PUBLIC_SHOPPER_ORIGIN;
  if (u) return u.replace(/\/$/, '');
  if (typeof window === 'undefined') return 'https://stylography.vercel.app';
  const { protocol, hostname } = window.location;
  if (hostname === 'stores.stylography.vercel.app') {
    return 'https://stylography.vercel.app';
  }
  if (hostname.startsWith('stores.')) {
    return `${protocol}//${hostname.replace(/^stores\./, '')}`;
  }
  return `${protocol}//${hostname}`;
}

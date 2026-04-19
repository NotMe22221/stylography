/**
 * TinyFish Search API integration for Stylography.
 * Searches for store website info to auto-fill onboarding fields.
 */

const API_KEY = import.meta.env.VITE_TINYFISH_API_KEY;
const SEARCH_URL = 'https://api.search.tinyfish.ai';

/**
 * Search TinyFish for information about a store's website.
 *
 * @param {string} websiteOrName — store website URL or name
 * @returns {Promise<{ results: Array<{ title, snippet, url, site_name }>, query: string }>}
 */
export async function searchStore(websiteOrName) {
  const query = websiteOrName.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const params = new URLSearchParams({
    query: `${query} vintage store resale shop about`,
    location: 'US',
    language: 'en',
  });

  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { 'X-API-Key': API_KEY },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    throw new Error(`TinyFish search failed (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Extract store info from TinyFish search results using Gemini.
 * Takes the raw search snippets and asks Gemini to extract structured store data.
 *
 * @param {string} website — the store's website
 * @param {Array} results — TinyFish search results
 * @param {Function} geminiExtract — function to call Gemini for extraction
 * @returns {Promise<object>} — extracted store info
 */
export async function extractStoreInfo(website, results) {
  // Build a context string from search results
  const context = results
    .slice(0, 5)
    .map(r => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.url}`)
    .join('\n\n');

  return { website, context, results: results.slice(0, 5) };
}

/**
 * Full pipeline: search for a store website and extract useful info.
 * Uses Gemini to parse the search results into structured store data.
 *
 * @param {string} website — store website URL or name
 * @returns {Promise<{ bio: string, city: string, storeType: string, instagram: string, phone: string } | null>}
 */
export async function enrichStoreFromWebsite(website) {
  try {
    const { results } = await searchStore(website);

    if (!results || results.length === 0) {
      return null;
    }

    // Build context from search results
    const context = results
      .slice(0, 5)
      .map(r => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.url}`)
      .join('\n\n');

    // Use Gemini to extract structured info
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are helping auto-fill a store profile for a vintage/resale clothing platform called Stylography.

Given these web search results about "${website}", extract the following information. If you can't find something, leave it as an empty string.

Search results:
${context}

Return ONLY valid JSON with these fields:
{
  "bio": "2-3 sentence description of the store's vibe, specialty, and what makes it unique. Write in first person as if the store owner is describing their shop.",
  "city": "City, State (e.g. 'Minneapolis, MN')",
  "storeType": "One of: vintage, resale, antique, thrift, consignment",
  "instagram": "Instagram handle if found (without @)",
  "phone": "Phone number if found",
  "address": "Street address if found",
  "storeName": "The store's name"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(clean);
  } catch (err) {
    console.warn('TinyFish enrichment failed:', err.message);
    return null;
  }
}

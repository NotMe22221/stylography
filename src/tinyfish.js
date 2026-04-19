/**
 * TinyFish Search API integration for Stylography.
 * Searches for store website info to auto-fill onboarding fields.
 */

const API_KEY = import.meta.env.VITE_TINYFISH_API_KEY;
const SEARCH_URL = 'https://api.search.tinyfish.ai';

/**
 * Run a TinyFish search query.
 */
async function tinyfishSearch(queryStr) {
  const params = new URLSearchParams({
    query: queryStr,
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
 * Full pipeline: search for a store website and extract useful info.
 * Runs two searches — one for general info, one specifically for address/contact.
 * Uses Gemini to parse the combined results into structured store data.
 *
 * @param {string} website — store website URL or name
 * @returns {Promise<object | null>}
 */
export async function enrichStoreFromWebsite(website) {
  try {
    const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

    // Run two targeted searches in parallel
    const [generalResults, contactResults] = await Promise.all([
      tinyfishSearch(`"${domain}" vintage store resale shop about`),
      tinyfishSearch(`"${domain}" address location hours phone contact`),
    ]);

    const allResults = [
      ...(generalResults.results || []),
      ...(contactResults.results || []),
    ];

    if (allResults.length === 0) {
      return null;
    }

    // Deduplicate by URL
    const seen = new Set();
    const unique = allResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    // Build context from search results
    const context = unique
      .slice(0, 8)
      .map(r => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.url}`)
      .join('\n\n');

    // Use Gemini to extract structured info
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are helping auto-fill a store profile for a vintage/resale clothing platform.

Given these web search results about "${website}", extract ONLY information that is EXPLICITLY stated in the search results. Do NOT guess or make up any information.

CRITICAL RULES:
- For "address": ONLY include a street address if you can see the actual street number and street name in the search results. If you only see a city name, put that in "city" instead and leave "address" empty.
- For "phone": ONLY include if you see an actual phone number in the results.
- For "instagram": ONLY include if you see an actual Instagram handle in the results.
- For any field where the information is not clearly stated, return an empty string "".
- Do NOT invent or hallucinate addresses, phone numbers, or other contact info.

Search results:
${context}

Return ONLY valid JSON:
{
  "storeName": "The store's actual name as found in results, or empty string",
  "bio": "2-3 sentence description of the store based on what the results say. Write in first person. If not enough info, return empty string.",
  "city": "City, State format (e.g. 'Minneapolis, MN') — only if clearly stated",
  "storeType": "One of: vintage, resale, antique, thrift, consignment — based on how the store describes itself, or empty string",
  "instagram": "Instagram handle without @ — only if explicitly found",
  "phone": "Phone number — only if explicitly found",
  "address": "Full street address — only if a real street address is explicitly stated (not just a city)"
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

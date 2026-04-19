   
**Stylography**

Personalized Outfit Curation from Secondhand Stores

Product Requirements Document  |  v2.0  |  April 2026

| One-liner: Stylography connects shoppers to personalized outfits curated from local vintage and resale stores near them. |
| :---- |

**Track:** Retail Tech Hackathon 2026

**Category:** Consumer Commerce / Sustainable Fashion / Community

**Version:** 2.0 (updated with primary research from store owner interview)

**Key Research Source:** Jessica Estevez-Ropes, Owner, Stitching Styles Vintage, Minneapolis MN

**Status:** Draft for Hackathon Submission

# **1\. Overview**

## **1.1 The Problem**

Independent vintage, resale, and antique stores have no good digital tool to showcase their inventory in a way that feels personal. They post on Instagram, but the same content goes to thousands of people with completely different tastes. The result is low conversion and no useful data about what customers actually want.

On the shopper side, finding a complete thrifted outfit requires manually searching multiple platforms with no style guidance. There is no tool that learns your taste and surfaces looks you will actually love from stores near you.

Stylography solves both sides of this problem at once.

## **1.2 The Solution**

Stylography is a two-sided platform. Vintage and resale store owners upload individual clothing pieces. Curators and AI combine those pieces into complete outfit boards. Shoppers get a personalized feed of complete looks, sourced from real local stores, matched to their taste profile. Everyone wins: shoppers find outfits they love, store owners learn exactly what their customers want, and the local vintage community grows together.

## **1.3 Key Insight from Primary Research**

| From Jessica Estevez-Ropes, Stitching Styles Vintage (Minneapolis, MN) *The data value proposition was the most compelling part. Knowing what customers are interested in helps store owners optimize their buying decisions. That insight sold her on the platform immediately.* Also critical: terminology matters. Many store owners identify as vintage, resale, or antique, not as a thrift store. Respect that distinction in all communications. On simplicity: it must be a quick daily-use tool. Not something that takes an hour. Cap uploads at 15-20 items, provide clear templates, and get out of the owner's way. |
| :---- |

# **2\. Users**

## **2.1 Shopper (Consumer Side)**

* Age 18-35, active on TikTok and Pinterest

* Fashion-conscious but budget-aware, wants on-trend looks without fast fashion guilt

* Frustrated by fragmented secondhand search across Depop, Poshmark, Instagram DMs

* Values sustainability and supporting local small businesses

* Likely to share finds on social media if the experience is delightful

## **2.2 Store Owner (Supply Side)**

* Owns a vintage, resale, antique, or curated secondhand shop

* Already selling on Instagram, Etsy, Depop, or in-store

* Wants more visibility without spending money on ads

* Values inventory data: knowing what customers want helps with buying decisions

* Time-constrained: needs a tool that fits into a busy store day, not a 2-hour task

* Sensitive to being called a thrift store if they consider themselves vintage or resale

## **2.3 Curator (Optional Role)**

A power-user who enjoys assembling outfit boards from available store inventory. Could be a stylist, fashion student, or enthusiast. Earns recognition or perks for high-engagement boards. Provides the human creative layer that makes AI curation feel personal.

# **3\. Features and Priorities**

| Feature | Who It Serves | Priority |
| :---- | :---- | :---- |
| Shopper onboarding (style quiz \+ image selection) | Shopper | P0 |
| Personalized outfit feed | Shopper | P0 |
| Store owner signup and Store profile | Store Owner | P0 |
| Item upload (15-20 photos, templates)  | Store Owner | P0 |
| Per Image tagging (with Ai suggested detail, if correct the owner can just click confirm confirm) \-Prize  \-Size |  |  |
| Outfit curation interface  | Curator / AI | P0 |
| Store profile page with curated looks | Shopper \+ Store Owner | P0 |
| In-store pickup reservation (72hr window) | Shopper \+ Store Owner | P1 |
| Shopper taste profile (behavioral data) | Shopper | P1 |
| Store owner analytics dashboard | Store Owner | P1 |
| Shipping / delivery option toggle | Store Owner | P1 |
| Vintage store directory and map | Shopper | P1 |
| Merchant checkout (native purchase flow) | Shopper \+ Store Owner | P2 |
| Curator leaderboard and rewards | Curator | P2 |
| Community network (Vintage Store Day style) | Store Owner | P2 |

# **4\. Shopper Onboarding Flow**

The goal of onboarding is to build an initial taste profile before the shopper sees their first feed. This makes the first experience feel personalized, not generic.

## **4.1 Step-by-Step Onboarding**

| Shopper onboarding (5 screens, under 3 minutes): Welcome screen. Brand intro: 'Your personal vintage stylist.' CTA: Get Started. Style image grid. Show 16 outfit images across 8 style clusters (Y2K, minimalist, cottagecore, streetwear, etc.). User taps all they love. No over-explaining the categories. Quick questionnaire. 5 questions max. Budget range. Sizing. Favorite colors. What occasions you shop for. Brands you already love. Location. City or zip code to surface nearby stores first. Optional: allow radius setting. Your feed is ready. Show first 6 personalized outfit boards immediately. No waiting screen. |
| :---- |

## **4.2 Long-Term Taste Profile**

After onboarding, the taste profile continues to evolve silently through behavior: which outfits a shopper taps, saves, shares, or skips. Over time this produces a richer signal than any quiz. Store owners can see aggregate versions of this data for their own inventory planning.

# **5\. Store Owner Onboarding Flow**

Store owner onboarding must feel respectful, fast, and like it sets them up to succeed, not like a tedious sign-up process. Based on Jessica's feedback, simplicity is the most important design principle on this side.

## **5.1 Step-by-Step Store Onboarding**

| Store owner onboarding (6 steps, under 10 minutes): Store type selection. First question: 'How do you describe your store?' Options: Vintage Store, Resale Shop, Antique Mall, Thrift Store, Consignment. This sets the right tone from the start and avoids the terminology issue Jessica flagged. Basic info. Store name, address, website or Instagram handle, phone number. Verify they are a real business (email or website check). Store profile photo and bio. Upload one hero image and write 2-3 sentences about the store's vibe and specialty. Keep the form short. Fulfillment preferences. Three toggle options: In-store pickup only / Pickup and local delivery / Pickup and ship. This is set once but can be changed anytime. No pressure to enable all options. First upload. Guided template for uploading 5 items to get started. Clear photo requirements. AI auto-tags item type, color, and style from the photo. Owner confirms or corrects tags. Cap at 20 items per batch. You are live. Store profile is now visible. Show a preview of how their items will appear in shopper outfit boards. Prompt to share their profile link. |
| :---- |

## **5.2 Ongoing Item Upload (Daily Use)**

* Max 20 items per upload batch, as recommended by Jessica

* AI auto-tags: category, color, style keywords, size, estimated era

* Owner can correct or add tags in under 30 seconds per item

* Template enforces consistent pricing structure (Price, Was, Condition)

* Mark item as sold in one tap to remove it from the active feed

* Total upload flow for 20 items should take under 15 minutes

# **6\. Outfit Curation Flow**

## **6.1 How Outfits Get Built**

Outfit boards are the core product unit. Each board is a complete look sourced entirely from items currently available in local stores. There are two ways boards get created:

**AI-generated boards:** The system automatically assembles outfit combinations from uploaded items, using style compatibility rules and shopper taste data. These run continuously in the background.

**Curator-built boards:** Human curators manually combine items from the store inventory into outfit boards. These tend to perform better creatively and get higher engagement.

## **6.2 Curation Interface**

* Browse all available items by store, style, color, or category

* Drag and drop items onto an outfit canvas (top, bottom, shoes, accessories)

* AI suggests compatible items as you build (same era, complementary color, similar style)

* Preview how the outfit will appear in a shopper's feed before publishing

* Tag the mood or occasion of the outfit (casual, date night, workwear, festival)

* Published boards show which store each item comes from

# **7\. Commerce and Fulfillment**

## **7.1 The Core Problem (from Jessica)**

Store owners who sell both in-store and online face a real anxiety: an item might sell on the floor and also get ordered online simultaneously. Stylography's approach to this is a reservation-first model, not instant purchase.

## **7.2 Reservation-First Model (Recommended for MVP)**

| How a shopper claims an item: Shopper taps 'Claim this item' on a listing card. They select: pick up in store (within 24/48/72 hours) or request shipping. Store owner gets a notification with a countdown timer. Store owner confirms or declines (e.g. item already sold on floor). If confirmed: item is marked reserved and hidden from other shoppers. If pickup window expires without collection: item goes back to active. |
| :---- |

## **7.3 Fulfillment Options by Store**

| Option | Description | Store Sets This? |
| :---- | :---- | :---- |
| In-store pickup only | Shopper comes to the store within the pickup window | Yes, on/off toggle |
| Local delivery | Store or third-party delivers within a set radius | Yes, optional |
| Ship anywhere | Store packages and ships via USPS/UPS. Buyer pays shipping. | Yes, optional |
| All three | Store offers full flexibility based on shopper preference | Yes |

## **7.4 Native Merchant Checkout (P2)**

Full in-app payment processing is a Phase 2 feature. For MVP, the claim/reservation flow is sufficient for the demo. When merchant checkout is added:

* Stylography takes a small platform fee per transaction (suggested 8-12%)

* Store owners sign a simple seller agreement covering pickup window obligations

* Shopper pays at time of claim, store confirms item availability before charge clears

* Payout to store within 48 hours of confirmed pickup or shipment

# **8\. Store Owner Analytics Dashboard**

This was the feature that most excited Jessica during the research interview. Knowing what shoppers are browsing and saving from their store gives owners actionable data for buying decisions. This is a genuine competitive advantage over Instagram.

## **8.1 Dashboard Metrics**

| Metric | What It Shows | Why It Matters |
| :---- | :---- | :---- |
| Top viewed items | Which of your items get the most shopper eyeballs | Shows what is catching attention even if not yet claimed |
| Top saved items | Items saved to shopper wishlists | Strongest signal of purchase intent |
| Style cluster demand | What styles your shoppers lean toward (e.g. 70% Y2K, 20% minimalist) | Tells you what aesthetic to buy more of |
| Dead inventory | Items with no views after 14 days | Prompts repricing, restyling, or removal |
| Outfit board performance | Which boards featuring your items get the most engagement | Shows which curators are driving traffic to your store |
| Pickup conversion rate | What percentage of claims result in completed pickups | Helps set realistic expectations and refine fulfillment policy |

# **9\. Community and Store Network**

Jessica referenced the Vintage Store Day model as an inspiration. They started with roughly 20 stores in Minnesota and within a year quadrupled their participating stores nationwide by keeping signup simple. Stylography should adopt a similar community-first growth model.

## **9.1 Store Directory**

* Public directory of all participating stores, searchable by city, state, and store type

* Each store gets a free profile page regardless of whether they actively upload items

* Stores can opt in to being listed as part of a regional vintage community group

* Directory becomes a standalone marketing asset: 'Find vintage stores near you'

## **9.2 Store Outreach Strategy (Pre-launch)**

Following Jessica's recommendation, reach out to stores before launch to build a committed network:

* Email vintage store associations and independent store owners with a simple one-page overview

* Offer: free listing on the directory just for signing up (no upload required)

* Use Vintage Store Day participant lists as a starting point for outreach

* Target 30 committed stores in one city before expanding

* Once 30 stores confirm, that becomes the proof point for the hackathon pitch

## **9.3 Community Angle**

The post-pandemic angle resonates with both store owners and shoppers. Stylography is not just a tool: it is a way to keep money circulating in local communities and help small vintage businesses survive and grow. Lean into this in all marketing language.

# **10\. Key User Flow Diagrams**

## **10.1 Shopper: Discovery to Claim**

| Full shopper flow: Lands on Stylography. Shown style quiz and image grid. Completes in under 3 minutes. Enters zip code. Or ask for location. Feed loads with personalized outfit boards from nearby stores. Taps an outfit board, with items curated from \[thirftstore 1\] \[Thriftstore 2\] etc. Sees each item with store name, price, and condition. Taps 'Claim this item'. Selects pickup window or shipping. Enters contact info. Store confirms within a few hours. Shopper gets notification with store address and map. Shopper picks up and pays in store (MVP). Native checkout in Phase 2\. |
| :---- |

## **10.2 Store Owner: Upload to Insight**

| Full store owner flow: Receives outreach email. Clicks link. Sees store type selector as first step. Completes 6-step onboarding in under 10 minutes. Profile is live. Each day: opens app, uploads up to 20 new items using guided template. AI tags auto-fill. Their items appear in outfit boards. They can see which boards feature their inventory. Gets claim notification. Confirms availability. Sets item aside with buyer name. Reviews weekly analytics: what styles are trending, what is sitting, what to buy more of. |
| :---- |

# **11\. Technical Architecture**

| Layer | Hackathon Choice | Notes |
| :---- | :---- | :---- |
| Frontend | React \+ Tailwind | Mobile-first. Single web app covers both shopper and store owner views. |
| Backend | Firebase | Fast to build, good AI library support |
| AI tagging | GPT-4o Vision or Claude | Auto-tag uploaded clothing items |
| Personalization | Cosine similarity on style embeddings | CLIP embeddings for visual taste matching |
| Database | Firebase | Free tier, real-time, auth included |
| Image storage | Firebase | CDN-backed image delivery |
| Hosting | Vercel | Free tier, fast deploy, shareable demo URL |
| Notifications | Email via Resend | Pickup confirmations and claim alerts |

# **12\. Risks and Mitigations**

| Risk | Likelihood | Mitigation |
| :---- | :---- | :---- |
| Store owners find upload flow too complex | Medium | Hard cap at 20 items. AI auto-tags. Template enforces consistency. Test with 1 real owner before launch. |
| Low shopper retention without enough inventory | High | Seed with 5-10 committed stores before launch. Quality over quantity. |
| Item sold in-store while still active on platform | High | Reservation model (not instant purchase) gives store time to confirm. Solved at MVP. |
| Terminology misstep with store owners | Low | Store type selector is first onboarding step. Never use 'thrift store' in outreach copy. |
| AI tags are inaccurate on unusual items | Medium | Always allow owner to correct. Show confidence score on auto-tags. |
| Demo not functional in 24 hours | Medium | Seed local DB with 50 real pre-tagged items and 10 pre-built outfit boards for demo. |

# **13\. Hackathon Build Timeline**

| Phase | Hours | Deliverable |
| :---- | :---- | :---- |
| Repo, deploy, auth setup | 0-2h | Working app shell live on Vercel with Supabase connected |
| Store owner upload \+ AI tagging | 2-6h | Upload flow working, GPT-4o auto-tagging items |
| Shopper onboarding \+ taste profile | 6-10h | Style quiz and image grid collecting preferences |
| Outfit board builder | 10-15h | Curator or AI assembling boards from available items |
| Personalized feed | 15-19h | Shoppers see relevant boards based on taste profile |
| Claim and reservation flow | 19-22h | Shopper can claim item, store gets notification |
| Analytics stub | 22-23h | Basic store dashboard showing view counts |
| Demo prep | 23-24h | 3 demo stores pre-loaded, 10 outfit boards ready, pitch rehearsed |

# **14\. Open Questions**

* Should the curator role be open to the public or invite-only at launch?

* How do we handle items that exist both on Etsy and on Stylography? Does the store manage this themselves?

* What is the platform fee model for merchant checkout in Phase 2?

* Do we launch in Minneapolis first given the existing relationship with Jessica, or go broader?

* Should we add a sustainability score per outfit (estimated CO2 saved vs buying new)?

* Is the style quiz mandatory for shoppers or can they skip straight to the feed?

# **15\. Appendix**

## **15.1 Terminology Guidelines for Store Outreach**

| Based on Jessica's feedback, use the following language rules in all communications: Ask first: 'How do you describe your store?' Do not assume. Use 'secondhand store' as the neutral umbrella term in public-facing copy. Never use 'thrift store' to describe a store that self-identifies as vintage or resale. Acceptable terms by segment: vintage store, resale shop, consignment boutique, antique mall, curated secondhand. |
| :---- |

## **15.2 Pitch One-Liners**

* 'Stylography is your personal stylist for secondhand shopping, powered by the stores in your neighborhood.'

* 'We turn any vintage store into a personalized styling service, and give store owners the data to buy smarter.'

* 'TikTok showed you the outfit. Stylography finds it secondhand, from a store three blocks away.'

## **15.3 Beta Partner**

Jessica Estevez-Ropes, owner of Stitching Styles Vintage (Minneapolis, MN) has expressed interest in participating in beta testing and helping with community outreach to other store owners. She is a strong candidate for the first pilot store and a potential reference for the hackathon pitch.
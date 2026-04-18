// Stylography data — fake stores, items, outfit boards, users

const STORES = [
  { id: 'stitch', name: 'Stitching Styles', type: 'Vintage', city: 'Minneapolis, MN', owner: 'Jessica E-R', emoji: '✂️', color: '#5B4D7A', established: 2019, follows: 1842 },
  { id: 'fern',   name: 'Fernwood Resale', type: 'Resale', city: 'Portland, OR', owner: 'Aya Tanaka', emoji: '🌿', color: '#A8B79E', established: 2021, follows: 974 },
  { id: 'moon',   name: 'Moondust Antiques', type: 'Antique', city: 'Asheville, NC', owner: 'Dee Walker', emoji: '🌙', color: '#3A2E3A', established: 2016, follows: 2310 },
  { id: 'rose',   name: 'Rose & Denim', type: 'Vintage', city: 'Brooklyn, NY', owner: 'Lena Costa', emoji: '🌹', color: '#D4A5A5', established: 2020, follows: 3120 },
  { id: 'clay',   name: 'Claybank Consign.', type: 'Consignment', city: 'Austin, TX', owner: 'Marcus Hale', emoji: '🏺', color: '#B88468', established: 2018, follows: 682 },
];

const ITEMS = [
  // Stitching Styles
  { id: 'i1', store: 'stitch', kind: 'dress', color: '#5B4D7A', bg: '#E2DCEB', accent: '#2A1F3A', name: 'Corduroy Midi Dress', price: 48, era: '90s', size: 'M', style: ['cottagecore','minimalist'] },
  { id: 'i2', store: 'stitch', kind: 'jeans', color: '#4B6E8E', bg: '#D8E3EC', accent: '#1E2A3A', name: 'Levis 501 High-Rise', price: 36, era: '80s', size: '28', style: ['streetwear','y2k'] },
  { id: 'i3', store: 'stitch', kind: 'jacket', color: '#8C6B4A', bg: '#E8DCC8', accent: '#3A2A1A', name: 'Suede Shearling Coat', price: 128, era: '70s', size: 'L', style: ['cottagecore','minimalist'] },
  { id: 'i4', store: 'stitch', kind: 'blouse', color: '#D4A5A5', bg: '#F8E8E5', accent: '#6B3A3A', name: 'Silk Floral Blouse', price: 32, era: '90s', size: 'S', style: ['cottagecore'] },

  // Fernwood
  { id: 'i5', store: 'fern', kind: 'top', color: '#A8B79E', bg: '#E8EEE2', accent: '#3A4A2E', name: 'Hand-Knit Wool Sweater', price: 54, era: '80s', size: 'M', style: ['cottagecore','minimalist'] },
  { id: 'i6', store: 'fern', kind: 'skirt', color: '#6B4A3A', bg: '#EFE5D8', accent: '#2A1A10', name: 'Plaid A-Line Skirt', price: 28, era: '70s', size: 'S', style: ['cottagecore','y2k'] },
  { id: 'i7', store: 'fern', kind: 'boots', color: '#3A2A1A', bg: '#EFE5D8', accent: '#1A0E08', name: 'Leather Riding Boots', price: 95, era: '90s', size: '8', style: ['cottagecore','streetwear'] },
  { id: 'i8', store: 'fern', kind: 'bag', color: '#C9A14A', bg: '#F4EDE0', accent: '#6B4A1A', name: 'Rattan Shoulder Bag', price: 42, era: '70s', size: 'OS', style: ['cottagecore'] },

  // Moondust
  { id: 'i9', store: 'moon', kind: 'coat', color: '#3A2E3A', bg: '#E0D8E0', accent: '#1A0E1A', name: 'Wool Overcoat', price: 145, era: '60s', size: 'L', style: ['minimalist','streetwear'] },
  { id: 'i10', store: 'moon', kind: 'jewelry', color: '#C9A14A', bg: '#F4EDE0', accent: '#6B4A1A', name: 'Brass Pendant Necklace', price: 18, era: '70s', size: 'OS', style: ['minimalist','cottagecore'] },
  { id: 'i11', store: 'moon', kind: 'sunglasses', color: '#3A2E3A', bg: '#F8E8E5', accent: '#1A0E1A', name: 'Cat-Eye Sunglasses', price: 24, era: '60s', size: 'OS', style: ['y2k','minimalist'] },
  { id: 'i12', store: 'moon', kind: 'hat', color: '#6B4A3A', bg: '#EFE5D8', accent: '#2A1A10', name: 'Wool Felt Beret', price: 22, era: '80s', size: 'OS', style: ['cottagecore','minimalist'] },

  // Rose & Denim
  { id: 'i13', store: 'rose', kind: 'dress', color: '#D4A5A5', bg: '#F8E8E5', accent: '#6B3A3A', name: 'Slip Dress in Rose', price: 62, era: '90s', size: 'S', style: ['y2k','minimalist'] },
  { id: 'i14', store: 'rose', kind: 'heels', color: '#3A2E3A', bg: '#F0D5D2', accent: '#1A0E1A', name: 'Kitten Heel Mules', price: 38, era: '90s', size: '7', style: ['y2k','minimalist'] },
  { id: 'i15', store: 'rose', kind: 'top', color: '#C9A14A', bg: '#F4EDE0', accent: '#6B4A1A', name: 'Ribbed Knit Tank', price: 22, era: '00s', size: 'S', style: ['y2k','streetwear'] },
  { id: 'i16', store: 'rose', kind: 'bag', color: '#5B4D7A', bg: '#E2DCEB', accent: '#2A1F3A', name: 'Beaded Evening Clutch', price: 48, era: '90s', size: 'OS', style: ['y2k'] },

  // Claybank
  { id: 'i17', store: 'clay', kind: 'pants', color: '#6B4A3A', bg: '#EFE5D8', accent: '#2A1A10', name: 'Corduroy Wide-Leg', price: 44, era: '70s', size: 'M', style: ['streetwear','cottagecore'] },
  { id: 'i18', store: 'clay', kind: 'sneakers', color: '#FFFFFF', bg: '#E8EEE2', accent: '#3A4A2E', name: 'Leather Lace-Up Sneakers', price: 58, era: '00s', size: '9', style: ['streetwear','minimalist'] },
  { id: 'i19', store: 'clay', kind: 'scarf', color: '#A8B79E', bg: '#E8EEE2', accent: '#3A4A2E', name: 'Block-Print Silk Scarf', price: 16, era: '80s', size: 'OS', style: ['cottagecore','minimalist'] },
  { id: 'i20', store: 'clay', kind: 'belt', color: '#B88468', bg: '#EFE5D8', accent: '#3A2A1A', name: 'Woven Leather Belt', price: 28, era: '90s', size: 'M', style: ['streetwear','cottagecore'] },
];

const byId = (id) => ITEMS.find(i => i.id === id);
const storeById = (id) => STORES.find(s => s.id === id);

const OUTFITS = [
  { id: 'o1', name: 'Sunday Market', mood: 'Casual', curator: 'Mira K.', items: ['i3','i2','i18','i8'], likes: 1820, saves: 412 },
  { id: 'o2', name: 'Gallery Opening', mood: 'Date Night', curator: 'Stylography AI', items: ['i13','i14','i16','i11'], likes: 2104, saves: 678 },
  { id: 'o3', name: 'Autumn in the Park', mood: 'Weekend', curator: 'Dee W.', items: ['i5','i6','i7','i12'], likes: 1356, saves: 289 },
  { id: 'o4', name: 'Studio Day', mood: 'Workwear', curator: 'Stylography AI', items: ['i4','i17','i18','i19'], likes: 944, saves: 201 },
  { id: 'o5', name: 'Late Night Out', mood: 'Date Night', curator: 'Lena C.', items: ['i15','i2','i14','i16'], likes: 2488, saves: 723 },
  { id: 'o6', name: 'Coffee & Crate-Digging', mood: 'Casual', curator: 'Mira K.', items: ['i5','i17','i7','i20'], likes: 1102, saves: 256 },
];

const STYLE_CLUSTERS = [
  { id: 'y2k', name: 'Y2K', color: '#D4A5A5', desc: 'playful, low-rise, butterfly-coded' },
  { id: 'minimalist', name: 'Minimalist', color: '#5B4D7A', desc: 'clean lines, neutrals, slip dresses' },
  { id: 'cottagecore', name: 'Cottagecore', color: '#A8B79E', desc: 'soft florals, linen, hand-knits' },
  { id: 'streetwear', name: 'Streetwear', color: '#3A2E3A', desc: 'denim, sneakers, oversized' },
  { id: 'vintage-classic', name: 'Vintage Classic', color: '#B88468', desc: 'wool coats, leather, timeless' },
  { id: 'preppy', name: 'Preppy', color: '#C9A14A', desc: 'blazers, loafers, stripes' },
];

Object.assign(window, { STORES, ITEMS, OUTFITS, STYLE_CLUSTERS, byId, storeById });

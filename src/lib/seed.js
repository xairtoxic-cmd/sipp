// Sipp seed data — realistic Dubai cafés.
// In production these come from Supabase (imported via the Google Places admin tools).

const img = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const DETAILED_CAFES = [
  {
    id: "kia",
    name: "Kiā",
    area: "Alserkal Avenue, Al Quoz",
    emirate: "Dubai",
    lat: 25.1418,
    lng: 55.2336,
    rating: 4.8,
    reviews: 214,
    sippScore: 9.2,
    price: 3,
    tags: ["Specialty Coffee", "Minimal", "Hidden Gems"],
    openNow: true,
    hours: "8:00 – 18:00",
    address: "Unit 23, Alserkal Avenue, Al Quoz 1, Dubai",
    phone: "+971 4 333 1234",
    website: "kia.cafe",
    loved: ["Minimal interior", "Great matcha", "Calm vibe", "Aesthetic seating"],
    blurb:
      "A serene concrete-and-oak coffee room tucked inside Alserkal. Single-origin pour-overs and a quiet crowd.",
    images: [img("1554118811-1e0d58224f24"), img("1521017432531-fbd92d768814"), img("1495474472287-4d71bcdd2085")],
    activity: "Saved by Sara and 12 others",
  },
  {
    id: "sum-of-us",
    name: "SUM of Us",
    area: "Al Wasl",
    emirate: "Dubai",
    lat: 25.1881,
    lng: 55.2522,
    rating: 4.8,
    reviews: 128,
    sippScore: 9.0,
    price: 3,
    tags: ["Specialty Coffee", "Brunch", "Laptop Friendly"],
    openNow: true,
    hours: "7:30 – 22:00",
    address: "Plot 264, Al Wasl Road, Dubai",
    phone: "+971 4 385 5462",
    website: "sumofus.ae",
    loved: ["In-house roastery", "Good for work", "Big tables", "Great matcha"],
    blurb:
      "Industrial-chic roastery and brunch hall. Famous matcha, generous plates and an all-day buzz.",
    images: [img("1559925393-8be0ec4767c8"), img("1453614512568-c4024d13c247"), img("1442512595331-e89e73853f31")],
    activity: "Yara ranked this · 9.0",
  },
  {
    id: "one-life",
    name: "One Life Kitchen & Café",
    area: "Jumeirah",
    emirate: "Dubai",
    lat: 25.2099,
    lng: 55.2585,
    rating: 4.7,
    reviews: 342,
    sippScore: 8.8,
    price: 2,
    tags: ["Brunch", "Outdoor Seating", "Study"],
    openNow: true,
    hours: "8:00 – 23:00",
    address: "Wasl 51, Jumeirah 1, Dubai",
    phone: "+971 4 344 5790",
    website: "onelife.ae",
    loved: ["Leafy terrace", "Healthy bowls", "Good for work", "Calm vibe"],
    blurb:
      "Plant-filled wellness café with a sun-dappled courtyard. A Jumeirah morning institution.",
    images: [img("1501339847302-ac426a4a7cbb"), img("1498804103079-a6351b050096"), img("1509042239860-f550ce710b93")],
    activity: "Omar is here now",
  },
  {
    id: "nightjar",
    name: "Nightjar Coffee Roasters",
    area: "Al Quoz",
    emirate: "Dubai",
    lat: 25.1389,
    lng: 55.2274,
    rating: 4.9,
    reviews: 196,
    sippScore: 9.4,
    price: 3,
    tags: ["Specialty Coffee", "Minimal", "Hidden Gems"],
    openNow: false,
    hours: "8:00 – 17:00",
    address: "17th Street, Al Quoz Industrial 1, Dubai",
    phone: "+971 50 123 8841",
    website: "nightjar.coffee",
    loved: ["Best filter in town", "Minimal interior", "Roastery on-site", "Quiet vibe"],
    blurb:
      "A purist's roastery hidden in the warehouses of Al Quoz. The flat white locals drive across town for.",
    images: [img("1559496417-e7f25cb247f3"), img("1497935586351-b67a49e012bf"), img("1495474472287-4d71bcdd2085")],
    activity: "Saved by Sara · trending",
  },
  {
    id: "arabica",
    name: "% Arabica",
    area: "Dubai Mall",
    emirate: "Dubai",
    lat: 25.1972,
    lng: 55.2796,
    rating: 4.6,
    reviews: 980,
    sippScore: 8.6,
    price: 3,
    tags: ["Specialty Coffee", "Minimal", "Late Night"],
    openNow: true,
    hours: "9:00 – 24:00",
    address: "Fountain Views, Downtown Dubai",
    phone: "+971 4 555 2210",
    website: "arabica.coffee",
    loved: ["Iconic latte", "Minimal interior", "Fountain view", "Aesthetic seating"],
    blurb:
      "The all-white Kyoto export with a fountain-side terrace. Spro and a skyline backdrop.",
    images: [img("1525610553991-2bede1a236e2"), img("1481833761820-0509d3217039"), img("1432107294469-414527cb5c65")],
    activity: "Trending in Downtown",
  },
  {
    id: "espresso-lab",
    name: "The Espresso Lab",
    area: "Al Quoz",
    emirate: "Dubai",
    lat: 25.1402,
    lng: 55.2301,
    rating: 4.7,
    reviews: 410,
    sippScore: 8.9,
    price: 3,
    tags: ["Specialty Coffee", "Laptop Friendly", "Study"],
    openNow: true,
    hours: "7:00 – 21:00",
    address: "Alserkal Avenue, Al Quoz, Dubai",
    phone: "+971 4 380 6776",
    website: "theespressolab.com",
    loved: ["Competition baristas", "Good for work", "Tasting flights", "Calm vibe"],
    blurb:
      "Award-winning baristas, a rotating single-origin menu and serious brew geekery.",
    images: [img("1442512595331-e89e73853f31"), img("1559925393-8be0ec4767c8"), img("1495474472287-4d71bcdd2085")],
    activity: "Ranked top 10 in Dubai",
  },
  {
    id: "orto",
    name: "Orto",
    area: "Jumeirah",
    emirate: "Dubai",
    lat: 25.2125,
    lng: 55.2602,
    rating: 4.6,
    reviews: 220,
    sippScore: 8.5,
    price: 2,
    tags: ["Brunch", "Outdoor Seating", "Date Night"],
    openNow: true,
    hours: "8:00 – 23:00",
    address: "Wasl 51, Jumeirah, Dubai",
    phone: "+971 4 343 9985",
    website: "orto.ae",
    loved: ["Garden seating", "Aesthetic seating", "Great brunch", "Calm vibe"],
    blurb:
      "A garden-to-table brunch spot with leafy nooks made for slow weekend mornings.",
    images: [img("1498804103079-a6351b050096"), img("1501339847302-ac426a4a7cbb"), img("1509042239860-f550ce710b93")],
    activity: "Leen saved this",
  },
  {
    id: "ldc",
    name: "LDC Kitchen + Coffee",
    area: "Jumeirah",
    emirate: "Dubai",
    lat: 25.2061,
    lng: 55.2541,
    rating: 4.7,
    reviews: 305,
    sippScore: 8.7,
    price: 2,
    tags: ["Brunch", "Laptop Friendly", "Specialty Coffee"],
    openNow: true,
    hours: "7:30 – 22:30",
    address: "Jumeirah 1, Dubai",
    phone: "+971 4 344 1120",
    website: "ldc.ae",
    loved: ["Pastry counter", "Good for work", "Friendly staff", "Aesthetic seating"],
    blurb:
      "Light, airy neighbourhood favourite with a glass-front pastry counter and a loyal laptop crowd.",
    images: [img("1432107294469-414527cb5c65"), img("1554118811-1e0d58224f24"), img("1442512595331-e89e73853f31")],
    activity: "Saved by 8 friends",
  },
  {
    id: "tanias",
    name: "Tania's Teahouse",
    area: "Umm Suqeim",
    emirate: "Dubai",
    lat: 25.1564,
    lng: 55.2099,
    rating: 4.5,
    reviews: 510,
    sippScore: 8.3,
    price: 2,
    tags: ["Matcha", "Dessert", "Date Night"],
    openNow: true,
    hours: "9:00 – 23:00",
    address: "Umm Suqeim 2, Dubai",
    phone: "+971 4 388 4477",
    website: "taniasteahouse.com",
    loved: ["Pastel interior", "Great matcha", "Instagrammable", "Sweet treats"],
    blurb:
      "A whimsical pastel teahouse — matcha lattes, layer cakes and the city's prettiest corners.",
    images: [img("1525610553991-2bede1a236e2"), img("1481833761820-0509d3217039"), img("1498804103079-a6351b050096")],
    activity: "Trending for matcha",
  },
  {
    id: "saya",
    name: "Saya Brasserie",
    area: "City Walk",
    emirate: "Dubai",
    lat: 25.2089,
    lng: 55.2622,
    rating: 4.6,
    reviews: 188,
    sippScore: 8.4,
    price: 3,
    tags: ["Brunch", "Date Night", "Outdoor Seating"],
    openNow: true,
    hours: "8:00 – 24:00",
    address: "City Walk, Al Wasl, Dubai",
    phone: "+971 4 252 3366",
    website: "saya.ae",
    loved: ["Chic terrace", "Date night", "Great coffee", "Aesthetic seating"],
    blurb:
      "An all-day Parisian-leaning brasserie on City Walk with a buzzing pavement terrace.",
    images: [img("1481833761820-0509d3217039"), img("1453614512568-c4024d13c247"), img("1501339847302-ac426a4a7cbb")],
    activity: "Leen saved this",
  },
  {
    id: "bkry",
    name: "Bkry",
    area: "Alserkal Avenue, Al Quoz",
    emirate: "Dubai",
    lat: 25.1425,
    lng: 55.2349,
    rating: 4.7,
    reviews: 260,
    sippScore: 8.6,
    price: 2,
    tags: ["Dessert", "Specialty Coffee", "Hidden Gems"],
    openNow: true,
    hours: "8:00 – 20:00",
    address: "Alserkal Avenue, Al Quoz, Dubai",
    phone: "+971 4 333 7788",
    website: "bkry.ae",
    loved: ["Cult pastries", "Sweet treats", "Minimal interior", "Hidden gem"],
    blurb:
      "Cult viennoiserie and a tight espresso menu inside the arts district. Get there early.",
    images: [img("1509042239860-f550ce710b93"), img("1432107294469-414527cb5c65"), img("1495474472287-4d71bcdd2085")],
    activity: "Saved by Sara",
  },
  {
    id: "koncrete",
    name: "Koncrete",
    area: "Jumeirah",
    emirate: "Dubai",
    lat: 25.2042,
    lng: 55.2509,
    rating: 4.5,
    reviews: 175,
    sippScore: 8.2,
    price: 2,
    tags: ["Minimal", "Specialty Coffee", "Study"],
    openNow: false,
    hours: "8:00 – 19:00",
    address: "Jumeirah 1, Dubai",
    phone: "+971 50 778 2210",
    website: "koncrete.ae",
    loved: ["Brutalist design", "Minimal interior", "Quiet vibe", "Good for work"],
    blurb:
      "Stripped-back concrete cube for purists. Beautiful light, beautiful crema.",
    images: [img("1497935586351-b67a49e012bf"), img("1554118811-1e0d58224f24"), img("1442512595331-e89e73853f31")],
    activity: "Hidden gem",
  },
  {
    id: "around-the-block",
    name: "Around the Block",
    area: "Jumeirah",
    emirate: "Dubai",
    lat: 25.2118,
    lng: 55.2566,
    rating: 4.6,
    reviews: 230,
    sippScore: 8.4,
    price: 2,
    tags: ["Brunch", "Outdoor Seating", "Late Night"],
    openNow: true,
    hours: "8:00 – 24:00",
    address: "Jumeirah 1, Dubai",
    phone: "+971 4 344 9090",
    website: "atb.ae",
    loved: ["Cosy corners", "Late night", "Great brunch", "Friendly staff"],
    blurb:
      "Neighbourhood all-rounder that does brunch, late coffees and everything between.",
    images: [img("1453614512568-c4024d13c247"), img("1501339847302-ac426a4a7cbb"), img("1498804103079-a6351b050096")],
    activity: "Popular near you",
  },
  {
    id: "friends-avenue",
    name: "Friends Avenue Café",
    area: "Dubai Marina",
    emirate: "Dubai",
    lat: 25.0805,
    lng: 55.1403,
    rating: 4.5,
    reviews: 640,
    sippScore: 8.1,
    price: 2,
    tags: ["Brunch", "Dessert", "Date Night"],
    openNow: true,
    hours: "8:00 – 24:00",
    address: "Marina Walk, Dubai Marina, Dubai",
    phone: "+971 4 432 1100",
    website: "friendsavenue.ae",
    loved: ["Marina views", "Sweet treats", "Date night", "Aesthetic seating"],
    blurb:
      "A pastel marina-side darling with showstopper desserts and waterfront tables.",
    images: [img("1481833761820-0509d3217039"), img("1525610553991-2bede1a236e2"), img("1509042239860-f550ce710b93")],
    activity: "Trending in Marina",
  },
  {
    id: "boston-lane",
    name: "Boston Lane",
    area: "Al Quoz",
    emirate: "Dubai",
    lat: 25.1376,
    lng: 55.2289,
    rating: 4.6,
    reviews: 280,
    sippScore: 8.3,
    price: 2,
    tags: ["Brunch", "Specialty Coffee", "Laptop Friendly"],
    openNow: true,
    hours: "7:30 – 18:00",
    address: "Al Joud Centre, Al Quoz 1, Dubai",
    phone: "+971 4 339 0660",
    website: "bostonlane.ae",
    loved: ["Aussie brunch", "Good for work", "Cosy vibe", "Great coffee"],
    blurb:
      "Melbourne-style brunch hideout in Al Quoz — smashed avo, big mugs, laptop friendly.",
    images: [img("1498804103079-a6351b050096"), img("1432107294469-414527cb5c65"), img("1554118811-1e0d58224f24")],
    activity: "Saved by Omar",
  },
  {
    id: "tom-serg",
    name: "Tom & Serg",
    area: "Al Quoz",
    emirate: "Dubai",
    lat: 25.1394,
    lng: 55.2312,
    rating: 4.6,
    reviews: 1200,
    sippScore: 8.5,
    price: 2,
    tags: ["Brunch", "Specialty Coffee", "Outdoor Seating"],
    openNow: true,
    hours: "8:00 – 17:00",
    address: "Al Joud Centre, Al Quoz, Dubai",
    phone: "+971 56 474 6812",
    website: "tomandserg.com",
    loved: ["The original warehouse café", "Great brunch", "Buzzy vibe", "Good coffee"],
    blurb:
      "The warehouse café that started Dubai's specialty scene. Still a brunch icon.",
    images: [img("1559925393-8be0ec4767c8"), img("1453614512568-c4024d13c247"), img("1442512595331-e89e73853f31")],
    activity: "A Dubai classic",
  },
];

// ---- Curated list of real, recognizable Dubai cafés ----
// Coordinates are approximate (snapped to area centres with a small spread).
// Swap to live, exhaustive data anytime via the Google Places import at /admin.
const AREA_COORD = {
  "Al Quoz": [25.1395, 55.2305],
  "Alserkal Avenue, Al Quoz": [25.1422, 55.234],
  "Jumeirah": [25.21, 55.2585],
  "Al Wasl": [25.188, 55.252],
  "Al Safa": [25.178, 55.243],
  "Downtown Dubai": [25.1955, 55.2745],
  "Dubai Mall": [25.1972, 55.2796],
  "DIFC": [25.213, 55.281],
  "Business Bay": [25.187, 55.262],
  "City Walk": [25.2085, 55.262],
  "Sheikh Zayed Road": [25.215, 55.27],
  "Dubai Marina": [25.08, 55.14],
  "JBR": [25.078, 55.134],
  "Bluewaters": [25.079, 55.122],
  "Palm Jumeirah": [25.112, 55.138],
  "Umm Suqeim": [25.156, 55.21],
  "Al Barsha": [25.107, 55.196],
  "JLT": [25.069, 55.143],
  "The Greens": [25.097, 55.171],
  "Dubai Hills": [25.103, 55.247],
  "Al Fahidi": [25.2635, 55.2985],
  "Deira": [25.271, 55.312],
};

const RAW_CAFES = [
  // Al Quoz / Alserkal
  { name: "RAW Coffee Company", area: "Al Quoz", tags: ["Specialty Coffee", "Hidden Gems", "Minimal"], rating: 4.7, reviews: 520, price: 2 },
  { name: "Café Rider Custom & Coffee", area: "Al Quoz", tags: ["Specialty Coffee", "Outdoor Seating", "Hidden Gems"], rating: 4.6, reviews: 880, price: 2 },
  { name: "Mattar Farm Kitchen", area: "Al Quoz", tags: ["Brunch", "Specialty Coffee", "Minimal"], rating: 4.7, reviews: 410, price: 3 },
  { name: "Encounter Specialty Coffee", area: "Al Quoz", tags: ["Specialty Coffee", "Minimal", "Study"], rating: 4.6, reviews: 190, price: 2 },
  { name: "Seven Fortunes Coffee Roasters", area: "Al Quoz", tags: ["Specialty Coffee", "Hidden Gems"], rating: 4.6, reviews: 230, price: 2 },
  { name: "Gold Box Specialty Coffee", area: "Al Quoz", tags: ["Specialty Coffee", "Minimal"], rating: 4.7, reviews: 150, price: 2 },
  { name: "Coffee Architecture", area: "Al Quoz", tags: ["Specialty Coffee", "Study", "Laptop Friendly"], rating: 4.5, reviews: 210, price: 2 },
  { name: "Wild & The Moon", area: "Alserkal Avenue, Al Quoz", tags: ["Brunch", "Dessert", "Minimal"], rating: 4.4, reviews: 760, price: 2 },

  // Jumeirah / Al Wasl / Umm Suqeim / Al Safa
  { name: "Comptoir 102", area: "Jumeirah", tags: ["Brunch", "Outdoor Seating", "Minimal"], rating: 4.5, reviews: 640, price: 3 },
  { name: "Stomping Grounds", area: "Jumeirah", tags: ["Brunch", "Specialty Coffee", "Laptop Friendly"], rating: 4.6, reviews: 980, price: 2 },
  { name: "Cassette", area: "Jumeirah", tags: ["Brunch", "Dessert", "Date Night"], rating: 4.5, reviews: 1100, price: 2 },
  { name: "The Hamptons Café", area: "Jumeirah", tags: ["Brunch", "Dessert", "Date Night"], rating: 4.4, reviews: 700, price: 3 },
  { name: "Surf Café", area: "Umm Suqeim", tags: ["Brunch", "Outdoor Seating", "Study"], rating: 4.5, reviews: 560, price: 2 },
  { name: "Lana Lusa", area: "Al Wasl", tags: ["Dessert", "Specialty Coffee", "Hidden Gems"], rating: 4.6, reviews: 320, price: 2 },
  { name: "Bookmunch Café", area: "Al Wasl", tags: ["Brunch", "Study", "Laptop Friendly"], rating: 4.5, reviews: 880, price: 2 },
  { name: "Cycle Bistro", area: "Al Wasl", tags: ["Brunch", "Outdoor Seating", "Study"], rating: 4.5, reviews: 540, price: 2 },

  // DIFC / Downtown / Business Bay / City Walk / SZR
  { name: "Boon Coffee", area: "DIFC", tags: ["Specialty Coffee", "Minimal", "Study"], rating: 4.5, reviews: 410, price: 2 },
  { name: "The Espresso Lab", area: "DIFC", tags: ["Specialty Coffee", "Study", "Minimal"], rating: 4.6, reviews: 300, price: 3 },
  { name: "Gia", area: "DIFC", tags: ["Brunch", "Date Night", "Outdoor Seating"], rating: 4.5, reviews: 760, price: 3 },
  { name: "Roseto", area: "DIFC", tags: ["Dessert", "Specialty Coffee", "Date Night"], rating: 4.6, reviews: 410, price: 3 },
  { name: "Project Chaiwala", area: "DIFC", tags: ["Specialty Coffee", "Hidden Gems", "Late Night"], rating: 4.5, reviews: 520, price: 1 },
  { name: "The Grey", area: "Business Bay", tags: ["Brunch", "Specialty Coffee", "Date Night"], rating: 4.5, reviews: 690, price: 3 },
  { name: "Drop Coffee", area: "Business Bay", tags: ["Specialty Coffee", "Minimal"], rating: 4.5, reviews: 240, price: 2 },
  { name: "Baker & Spice", area: "Downtown Dubai", tags: ["Brunch", "Dessert", "Outdoor Seating"], rating: 4.4, reviews: 900, price: 3 },
  { name: "Magnolia Bakery", area: "Downtown Dubai", tags: ["Dessert", "Late Night"], rating: 4.3, reviews: 1200, price: 2 },
  { name: "% Arabica", area: "City Walk", tags: ["Specialty Coffee", "Minimal"], rating: 4.6, reviews: 600, price: 3 },
  { name: "Bagatelle", area: "City Walk", tags: ["Brunch", "Date Night", "Outdoor Seating"], rating: 4.4, reviews: 980, price: 4 },
  { name: "EL&N", area: "Sheikh Zayed Road", tags: ["Dessert", "Brunch", "Date Night"], rating: 4.3, reviews: 2100, price: 3 },

  // Marina / JBR / JLT / Bluewaters / Palm / Greens / Barsha / Hills
  { name: "Brew Café", area: "JLT", tags: ["Brunch", "Specialty Coffee", "Laptop Friendly"], rating: 4.5, reviews: 1500, price: 2 },
  { name: "Kava & Chai", area: "JLT", tags: ["Specialty Coffee", "Study", "Laptop Friendly"], rating: 4.6, reviews: 740, price: 2 },
  { name: "Common Grounds", area: "Al Barsha", tags: ["Brunch", "Dessert", "Specialty Coffee"], rating: 4.5, reviews: 1300, price: 2 },
  { name: "Brunch & Cake", area: "JBR", tags: ["Brunch", "Dessert", "Outdoor Seating"], rating: 4.4, reviews: 1600, price: 3 },
  { name: "Roasters Specialty Coffee House", area: "Dubai Hills", tags: ["Specialty Coffee", "Brunch", "Study"], rating: 4.6, reviews: 900, price: 2 },
  { name: "Home Bakery", area: "Dubai Hills", tags: ["Dessert", "Specialty Coffee"], rating: 4.6, reviews: 1100, price: 2 },

  // Heritage / Deira
  { name: "Arabian Tea House", area: "Al Fahidi", tags: ["Brunch", "Outdoor Seating", "Hidden Gems"], rating: 4.4, reviews: 5000, price: 2 },
  { name: "The Coffee Museum", area: "Al Fahidi", tags: ["Specialty Coffee", "Hidden Gems"], rating: 4.5, reviews: 400, price: 1 },
  { name: "Filli Café", area: "Jumeirah", tags: ["Late Night", "Hidden Gems", "Casual"], rating: 4.4, reviews: 3000, price: 1 },
];

const IMG_POOL = [
  "1554118811-1e0d58224f24", "1521017432531-fbd92d768814", "1495474472287-4d71bcdd2085",
  "1559925393-8be0ec4767c8", "1453614512568-c4024d13c247", "1442512595331-e89e73853f31",
  "1501339847302-ac426a4a7cbb", "1498804103079-a6351b050096", "1509042239860-f550ce710b93",
  "1559496417-e7f25cb247f3", "1497935586351-b67a49e012bf", "1525610553991-2bede1a236e2",
  "1481833761820-0509d3217039", "1432107294469-414527cb5c65",
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function expandCafes(list) {
  return list.map((c, i) => {
    const [blat, blng] = AREA_COORD[c.area] || [25.18, 55.26];
    const lat = +(blat + ((((i * 37) % 11) - 5) * 0.0015)).toFixed(4);
    const lng = +(blng + ((((i * 53) % 11) - 5) * 0.0015)).toFixed(4);
    const sippScore = Math.min(9.6, Math.round((c.rating * 1.9 + 0.2) * 10) / 10);
    const images = [IMG_POOL[i % IMG_POOL.length], IMG_POOL[(i + 4) % IMG_POOL.length], IMG_POOL[(i + 8) % IMG_POOL.length]].map(img);
    const shortArea = c.area.split(",")[0];
    return {
      id: `${slug(c.name)}-${slug(c.area)}`,
      name: c.name,
      area: c.area,
      emirate: "Dubai",
      lat,
      lng,
      rating: c.rating,
      reviews: c.reviews,
      sippScore,
      price: c.price,
      tags: c.tags,
      openNow: true,
      hours: "8:00 – 22:00",
      address: `${c.area}, Dubai`,
      phone: "",
      website: slug(c.name).replace(/-/g, "") + ".ae",
      loved: c.tags.slice(0, 3).map((t) => `Great ${t.toLowerCase()}`),
      blurb: `${c.name} — a ${c.tags[0].toLowerCase()} favourite in ${shortArea}.`,
      images,
      activity: `Loved in ${shortArea}`,
    };
  });
}

// Amenity / "what's it got" features. Deterministically attached so the
// category filter always returns real results (no backend needed yet).
const AMENITY_POOL = [
  "Outdoor Seating", "Laptop Friendly", "Chess", "Board Games", "Pet Friendly",
  "Shisha", "Live Music", "Books", "Rooftop", "Power Outlets", "Quiet", "Free WiFi",
];

function featuresFor(c) {
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const n = 2 + (h % 3); // 2–4 amenities
  const amenities = [];
  for (let k = 0; k < n; k++) amenities.push(AMENITY_POOL[(h + k * 5) % AMENITY_POOL.length]);
  return Array.from(new Set([...c.tags, ...amenities]));
}

export const CAFES = [...DETAILED_CAFES, ...expandCafes(RAW_CAFES)].map((c) => ({
  ...c,
  features: featuresFor(c),
}));

// Categories shown in the Discover filter (vibes + café type/amenities).
export const CATEGORIES = [
  "All", "Specialty Coffee", "Matcha", "Brunch", "Dessert", "Study", "Date Night",
  "Hidden Gems", "Minimal", "Late Night", "Outdoor Seating", "Laptop Friendly",
  "Chess", "Board Games", "Pet Friendly", "Shisha", "Live Music", "Books", "Rooftop", "Quiet",
];

export const cafeInCategory = (c, cat) =>
  cat === "All" || (c.features || c.tags).some((t) => t.toLowerCase() === cat.toLowerCase());

const hashNum = (s = "") => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

// Vibe tags used across the app (review flow, filters, profiles).
export const VIBE_TAGS = [
  "Aesthetic", "Quiet", "Cozy", "Minimal", "Hidden Gem", "Good Lighting", "Laptop Friendly",
  "Date Spot", "Work Meeting", "Outdoor Seating", "Luxury", "Study Friendly", "Calm", "Matcha",
  "Specialty Coffee", "Brunch", "Dessert", "Late Night", "Group Friendly", "Solo Coffee", "Good Vibes",
];

export const BEST_TIMES = [
  "Weekday mornings", "Quiet before noon", "Weekday afternoons", "Sunset", "After 7 PM", "Weekend brunch", "Avoid peak hours",
];

export const CROWD_LEVELS = ["Quiet", "Moderate", "Busy", "Very busy"];

// Taste chips for onboarding + taste profile.
export const TASTE_CHIPS = [
  "Coffee", "Matcha", "Brunch", "Dessert", "Quiet Cafés", "Aesthetic Spots", "Laptop Friendly",
  "Date Night", "Hidden Gems", "Luxury", "Outdoor Seating", "Study Cafés", "Late Night", "Specialty Coffee",
];

// Café "personality score" — category breakdown, derived deterministically from the Sipp Score.
export function personalityFor(c) {
  const h = hashNum(c.id);
  const j = (n) => Math.max(7.6, Math.min(9.8, +(c.sippScore + (((h >> (n * 3)) % 7) - 3) * 0.18).toFixed(1)));
  return { Coffee: j(0), Vibe: j(1), Service: j(2), Food: j(3), "Work-friendly": j(4), Aesthetic: j(5) };
}

// Sample menu with AED prices, scaled by the café's price level.
const MENU_TEMPLATE = [
  {
    category: "Coffee",
    items: [
      ["Espresso", 15], ["Cortado", 19], ["Flat White", 22], ["Cappuccino", 22],
      ["Spanish Latte", 26], ["Cold Brew", 28], ["V60 Pour Over", 32],
    ],
  },
  {
    category: "Matcha & Tea",
    items: [
      ["Hot Matcha", 27], ["Iced Matcha Latte", 30], ["Strawberry Matcha", 34], ["Chai Latte", 26],
    ],
  },
  {
    category: "Brunch & Bites",
    items: [
      ["Butter Croissant", 16], ["Avocado Toast", 45], ["Eggs & Sourdough", 48],
      ["Açaí Bowl", 42], ["Buttermilk Pancakes", 52], ["Shakshuka", 46],
    ],
  },
  {
    category: "Sweets",
    items: [
      ["Basque Cheesecake", 38], ["Pistachio Cake", 36], ["Cinnamon Roll", 28], ["Banana Bread", 24],
    ],
  },
];

export function menuFor(c) {
  const mult = { 1: 0.8, 2: 1, 3: 1.2, 4: 1.5 }[c.price] || 1;
  return MENU_TEMPLATE.map((sec) => ({
    category: sec.category,
    items: sec.items.map(([name, price]) => ({ name, price: Math.round(price * mult) })),
  }));
}

export const bestTimeFor = (c) => BEST_TIMES[hashNum(c.id) % BEST_TIMES.length];
export const crowdFor = (c) => CROWD_LEVELS[hashNum(c.id + "crowd") % CROWD_LEVELS.length];

// Friend taste match (deterministic demo value).
export const tasteMatchFor = (userId) => 71 + (hashNum(userId) % 28); // 71–98%

// Featured drops — premium lifestyle updates.
export const DROPS = [
  { id: "d1", cafeId: "kia", title: "New oat matcha drop", when: "This weekend", desc: "A limited oat-milk ceremonial matcha — only while it lasts." },
  { id: "d2", cafeId: "sum-of-us", title: "Weekend brunch special", when: "Sat & Sun", desc: "A new seasonal brunch menu lands this weekend." },
  { id: "d3", cafeId: "bkry", title: "Pistachio basque, fresh daily", when: "From Friday", desc: "A new dessert launch — baked every morning until sold out." },
  { id: "d4", cafeId: "nightjar", title: "Limited Ethiopian roast", when: "Now pouring", desc: "A single-origin micro-lot. Thirty bags, then it's gone." },
];

export const USERS = {
  sara: { id: "sara", name: "Sara", username: "@saraeats", avatar: "#B9935A", bio: "Matcha, brunch, hidden gems.", instagram: "@saraeats", taste: "Matcha, brunch, hidden gems", sparkle: true },
  leen: { id: "leen", name: "Leen", username: "@leensips", avatar: "#9C7A52", bio: "Always one more flat white.", instagram: "@leensips", taste: "Jumeirah cafés, aesthetic spots" },
  omar: { id: "omar", name: "Omar", username: "@omar.brews", avatar: "#5A4635", bio: "Filter coffee snob.", instagram: "@omar.brews", taste: "Al Quoz coffee, late-night spots" },
  yara: { id: "yara", name: "Yara", username: "@yara.dxb", avatar: "#C7A06A", bio: "Brunch is a personality.", instagram: "@yara.dxb", taste: "Study cafés, calm spaces" },
  ahmed: { id: "ahmed", name: "Ahmed", username: "@ahmed.pours", avatar: "#7D6244", bio: "If it's not single-origin, why bother.", instagram: "@ahmed.pours", taste: "Specialty coffee nerd" },
  mariam: { id: "mariam", name: "Mariam", username: "@mariam.slow", avatar: "#A9855A", bio: "Evening coffee person.", instagram: "@mariam.slow", taste: "Calm evening coffee" },
  noor: { id: "noor", name: "Noor", username: "@noor.sweet", avatar: "#C0A072", bio: "Here for the dessert.", instagram: "@noor.sweet", taste: "Desserts & aesthetics" },
};

// Social review feed. scope: "friend" (people you follow / you) or "public".
export const REVIEWS = [
  {
    id: "r1", user: "sara", cafeId: "kia", scope: "friend", time: "2h",
    text: "Finally tried Kiā in Alserkal. The vibe is calm, the interior is beautiful, and the Spanish latte was actually worth it.",
    overall: 9.2, sub: { Vibe: 9.5, Coffee: 9.0, Service: 8.8 },
    tags: ["Specialty Coffee", "Minimal", "Hidden Gem"],
  },
  {
    id: "r2", user: "leen", cafeId: "sum-of-us", scope: "friend", time: "4h",
    text: "SUM of Us is still one of the best brunch cafés in Dubai when you want something easy but good. Busy, but still worth saving.",
    overall: 8.8, sub: { Vibe: 8.7, Coffee: 9.0, Service: 8.5 },
    tags: ["Brunch", "Coffee", "Casual"],
  },
  {
    id: "r3", user: "omar", cafeId: "nightjar", scope: "friend", time: "6h",
    text: "Best coffee energy in Al Quoz. Not too fancy, just real coffee and a good crowd.",
    overall: 9.0, sub: { Vibe: 8.8, Coffee: 9.4, Service: 8.6 },
    tags: ["Specialty Coffee", "Al Quoz", "Cool Crowd"],
  },
  {
    id: "r4", user: "yara", cafeId: "one-life", scope: "friend", time: "8h",
    text: "Good for working, meeting friends, or grabbing a quick lunch. Very reliable spot.",
    overall: 8.6, sub: { Vibe: 8.5, Coffee: 8.4, Service: 8.8 },
    tags: ["Laptop Friendly", "Lunch", "Casual"],
  },
  {
    id: "r5", user: "ahmed", cafeId: "espresso-lab", scope: "public", time: "3h",
    text: "The coffee is serious here. Great for people who actually care about beans.",
    overall: 9.1, sub: { Vibe: 8.9, Coffee: 9.4, Service: 8.7 },
    tags: ["Specialty Coffee", "Study"],
  },
  {
    id: "r6", user: "mariam", cafeId: "orto", scope: "public", time: "5h",
    text: "Beautiful Jumeirah spot, especially for a calm evening coffee.",
    overall: 8.9, sub: { Vibe: 9.1, Coffee: 8.6, Service: 8.8 },
    tags: ["Outdoor Seating", "Date Night"],
  },
  {
    id: "r7", user: "noor", cafeId: "bkry", scope: "public", time: "7h",
    text: "Desserts are the reason to go. The interior is also very Sipp-worthy.",
    overall: 9.0, sub: { Vibe: 9.0, Coffee: 8.5, Service: 8.6 },
    tags: ["Dessert", "Hidden Gems"],
  },
  {
    id: "r8", user: "ahmed", cafeId: "tom-serg", scope: "public", time: "9h",
    text: "The warehouse classic. Still pulls a great shot and the brunch holds up.",
    overall: 8.5, sub: { Vibe: 8.6, Coffee: 8.7, Service: 8.3 },
    tags: ["Brunch", "Specialty Coffee"],
  },
];

export const HOME_FILTERS = [
  "All", "Friends", "Public", "Specialty Coffee", "Matcha", "Brunch", "Dessert", "Study", "Date Night", "Hidden Gems",
];

export const FEED_TABS = ["Following", "Dubai", "Trending", "Near You"];

export const reviewsByScope = (scope) => REVIEWS.filter((r) => r.scope === scope);

export const ME = {
  id: "me",
  name: "Sara",
  username: "@saraeats",
  avatar: "#B9935A",
  bio: "Matcha, brunch, hidden gems.",
  instagram: "@saraeats",
  favoriteAreas: ["Jumeirah", "DIFC", "Al Quoz"],
  tasteTags: ["Minimal", "Matcha", "Brunch", "Study Cafés"],
  followers: 312,
  following: 184,
};

export const FRIEND_ACTIVITY = [
  { id: "a1", user: "leen", action: "saved", cafeId: "saya", time: "12m" },
  { id: "a2", user: "omar", action: "is at", cafeId: "one-life", time: "38m" },
  { id: "a3", user: "sara", action: "saved", cafeId: "nightjar", time: "1h" },
  { id: "a4", user: "yara", action: "ranked", cafeId: "sum-of-us", time: "2h", score: 9.0 },
  { id: "a5", user: "leen", action: "saved", cafeId: "orto", time: "3h" },
  { id: "a6", user: "omar", action: "saved", cafeId: "boston-lane", time: "5h" },
];

export const SEED_LISTS = [
  { id: "l1", title: "Best Matcha in Dubai", desc: "The creamiest, greenest lattes in town.", cafeIds: ["tanias", "sum-of-us", "friends-avenue"], cover: "tanias", public: true, owner: "me" },
  { id: "l2", title: "Coffee Dates", desc: "Quiet corners for two.", cafeIds: ["kia", "saya", "orto"], cover: "saya", public: true, owner: "me" },
  { id: "l3", title: "Study Cafés", desc: "Laptop friendly, plenty of plugs.", cafeIds: ["espresso-lab", "boston-lane", "ldc", "one-life"], cover: "espresso-lab", public: true, owner: "me" },
  { id: "l4", title: "Hidden Gems", desc: "Worth the detour.", cafeIds: ["nightjar", "bkry", "koncrete"], cover: "nightjar", public: false, owner: "me" },
  { id: "l5", title: "Jumeirah Favourites", desc: "My neighbourhood rotation.", cafeIds: ["orto", "ldc", "around-the-block", "koncrete"], cover: "orto", public: true, owner: "leen" },
  { id: "l6", title: "Places I Want to Try", desc: "The list keeps growing.", cafeIds: ["arabica", "friends-avenue", "tom-serg"], cover: "arabica", public: false, owner: "me" },
];

export const FILTERS = [
  "All", "Specialty Coffee", "Matcha", "Brunch", "Dessert", "Study",
  "Date Night", "Hidden Gems", "Outdoor Seating", "Minimal", "Laptop Friendly", "Late Night",
];

export const MAP_FILTERS = [
  "All", "Cafés", "Matcha", "Brunch", "Dessert", "Study", "Outdoor", "Open Now", "High Rated",
];

export const cafeById = (id) => CAFES.find((c) => c.id === id);

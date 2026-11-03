/* Preserves original ALUSORA Python prices and recipes. */
export const PRODUCTS = [
  {
    "id": "cozy-hello",
    "name": "Cozy Hello",
    "subtitle": "A little flower. A big smile.",
    "category": "Everyday",
    "price": 1499,
    "artwork": "blush",
    "tag": "Under $20",
    "recipe": {
      "carnation": 3,
      "alstro": 1,
      "foliage": 1,
      "wrap": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "Soft blooms, kraft wrapping and a little note — ready to make someone smile."
  },
  {
    "id": "autumn-everyday",
    "name": "Everyday Bouquet",
    "subtitle": "Beautiful everyday flowers.",
    "category": "Everyday",
    "price": 2999,
    "artwork": "apricot",
    "tag": "Bestseller",
    "recipe": {
      "carnation": 5,
      "alstro": 3,
      "chrys": 1,
      "foliage": 1,
      "wrap": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "A generous, hand-tied bouquet in a fresh seasonal palette."
  },
  {
    "id": "thank-you-jar",
    "name": "Thank You Jar",
    "subtitle": "A thoughtful thank you.",
    "category": "Everyday",
    "price": 3999,
    "artwork": "berry",
    "tag": "Vase included",
    "recipe": {
      "carnation": 5,
      "alstro": 2,
      "chrys": 2,
      "foliage": 1,
      "vase": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "Fresh-cut stems presented in a reusable glass vase."
  },
  {
    "id": "warm-moments",
    "name": "Warm Moments",
    "subtitle": "For the extra-special days.",
    "category": "Everyday",
    "price": 4999,
    "artwork": "peach",
    "tag": "Signature",
    "recipe": {
      "rose": 3,
      "carnation": 4,
      "alstro": 2,
      "chrys": 2,
      "foliage": 1,
      "wrap": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "Romantic roses and seasonal blooms, wrapped with care."
  },
  {
    "id": "little-christmas",
    "name": "Little Christmas Joy",
    "subtitle": "A festive little surprise.",
    "category": "Holiday",
    "price": 1499,
    "artwork": "holiday",
    "tag": "Under $20",
    "recipe": {
      "carnation": 3,
      "pine": 1,
      "wrap": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "A petite festive bundle with a touch of winter greenery."
  },
  {
    "id": "christmas-poinsettia",
    "name": "Christmas Poinsettia",
    "subtitle": "A little holiday classic.",
    "category": "Holiday",
    "price": 1999,
    "artwork": "poinsettia",
    "tag": "Limited",
    "recipe": {
      "poinsettia": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "A potted seasonal favourite, ribbon-tied and ready for gifting."
  },
  {
    "id": "winter-glow",
    "name": "Winter Glow",
    "subtitle": "Winter blooms, beautifully wrapped.",
    "category": "Holiday",
    "price": 2999,
    "artwork": "winter",
    "tag": "Bestseller",
    "recipe": {
      "carnation": 4,
      "alstro": 2,
      "chrys": 1,
      "foliage": 1,
      "pine": 1,
      "wrap": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "Winter whites, gentle greens and a golden finishing touch."
  },
  {
    "id": "christmas-table",
    "name": "Christmas Table",
    "subtitle": "Something lovely for the table.",
    "category": "Holiday",
    "price": 4999,
    "artwork": "holiday",
    "tag": "Centrepiece",
    "recipe": {
      "carnation": 7,
      "chrys": 3,
      "pine": 2,
      "pinecone": 2,
      "vase": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "An inviting centrepiece for festive gatherings, vessel included."
  },
  {
    "id": "holiday-signature",
    "name": "Holiday Signature",
    "subtitle": "A gift worth gathering around.",
    "category": "Holiday",
    "price": 6999,
    "artwork": "berry",
    "tag": "Premium",
    "recipe": {
      "rose": 4,
      "carnation": 6,
      "alstro": 3,
      "chrys": 2,
      "foliage": 2,
      "pine": 2,
      "vase": 1,
      "ribbon": 1,
      "card": 1
    },
    "description": "Our fullest seasonal arrangement, made to order with a keepsake vase."
  }
];
export const FLOWERS = [
  {
    "id": "carnation",
    "name": "Carnations",
    "note": "Soft, long-lasting petals",
    "price": 325,
    "colour": "pink"
  },
  {
    "id": "alstro",
    "name": "Alstroemeria",
    "note": "Delicate, playful blooms",
    "price": 350,
    "colour": "peach"
  },
  {
    "id": "chrys",
    "name": "Chrysanthemums",
    "note": "Full, beautiful texture",
    "price": 450,
    "colour": "cream"
  },
  {
    "id": "rose",
    "name": "Roses",
    "note": "A timeless romantic touch",
    "price": 625,
    "colour": "burgundy"
  }
];
export const SEED_STOCK = [
  [
    "carnation",
    "Carnations / Claveles",
    180,
    "stem"
  ],
  [
    "alstro",
    "Alstroemeria",
    110,
    "stem"
  ],
  [
    "chrys",
    "Chrysanthemums / Crisantemos",
    75,
    "stem"
  ],
  [
    "rose",
    "Roses / Rosas",
    52,
    "stem"
  ],
  [
    "foliage",
    "Greenery / Follaje",
    90,
    "bunch"
  ],
  [
    "pine",
    "Winter greens / Pino",
    65,
    "sprig"
  ],
  [
    "wrap",
    "Gift wrapping / Envoltura",
    100,
    "unit"
  ],
  [
    "ribbon",
    "Ribbon / Listón",
    120,
    "unit"
  ],
  [
    "card",
    "Message card / Tarjeta",
    120,
    "unit"
  ],
  [
    "vase",
    "Small vase / Florero",
    24,
    "unit"
  ],
  [
    "pinecone",
    "Pine cones / Piñas",
    45,
    "unit"
  ],
  [
    "poinsettia",
    "Potted poinsettia",
    18,
    "plant"
  ]
];

/**
 * Indian retail product catalog for demo seeding.
 * Each entry: [sku, name, category, stock, priceInr]
 */
const groceryBase = [
  ["GRO-001", "India Gate Basmati Rice 5kg", 3, 760],
  ["GRO-002", "Aashirvaad Atta 5kg", 8, 315],
  ["GRO-003", "Fortune Sunflower Oil 1L", 42, 165],
  ["GRO-004", "Tata Salt 1kg", 64, 28],
  ["GRO-005", "Toor Dal 1kg", 18, 155],
  ["GRO-006", "Maggi Noodles 12-pack", 25, 180],
  ["GRO-007", "Sugar 1kg", 30, 52],
  ["GRO-008", "Rajma 500g", 14, 95],
  ["GRO-009", "Poha 500g", 18, 42],
  ["GRO-010", "Rava 1kg", 16, 58],
  ["GRO-011", "Moong Dal 1kg", 22, 140],
  ["GRO-012", "Chana Dal 1kg", 19, 125],
  ["GRO-013", "Urad Dal 500g", 15, 95],
  ["GRO-014", "Mustard Seeds 200g", 28, 45],
  ["GRO-015", "Jeera 100g", 35, 85],
  ["GRO-016", "Turmeric Powder 200g", 40, 55],
  ["GRO-017", "Red Chilli Powder 200g", 32, 65],
  ["GRO-018", "Coriander Powder 200g", 30, 48],
  ["GRO-019", "Garam Masala 100g", 26, 72],
  ["GRO-020", "Basmati Rice 1kg", 45, 165],
];

const dairyBase = [
  ["DAI-001", "Amul Taaza Milk 1L", 6, 68],
  ["DAI-002", "Amul Butter 500g", 14, 285],
  ["DAI-003", "Heritage Curd 500g", 22, 55],
  ["DAI-004", "Mother Dairy Paneer 200g", 8, 95],
  ["DAI-005", "Ghee 500ml", 10, 340],
  ["DAI-006", "Amul Cheese Slices", 18, 125],
  ["DAI-007", "Nestle Milkmaid 400g", 12, 145],
  ["DAI-008", "Yakult Probiotic 5-pack", 24, 85],
  ["DAI-009", "Britannia Cheese Cubes", 16, 110],
  ["DAI-010", "Amul Lassi 200ml", 30, 25],
];

const snacksBase = [
  ["SNK-001", "Haldiram's Namkeen 400g", 31, 145],
  ["SNK-002", "Britannia Good Day 600g", 27, 130],
  ["SNK-003", "Lays Classic Salted 90g", 36, 40],
  ["SNK-004", "Kurkure Masala Munch 90g", 22, 20],
  ["SNK-005", "Oreo Biscuits 120g", 32, 35],
  ["SNK-006", "Parle-G Gold 1kg", 28, 95],
  ["SNK-007", "Bingo Mad Angles 66g", 40, 20],
  ["SNK-008", "Uncle Chips Spicy 50g", 35, 20],
  ["SNK-009", "Britannia Marie Gold", 26, 35],
  ["SNK-010", "Haldiram's Bhujia 400g", 20, 120],
];

const beveragesBase = [
  ["BEV-001", "Coca Cola 750ml", 4, 45],
  ["BEV-002", "Thums Up 750ml", 11, 45],
  ["BEV-003", "Tata Tea Premium 1kg", 19, 520],
  ["BEV-004", "Nescafe Classic 200g", 15, 610],
  ["BEV-005", "Real Fruit Juice 1L", 16, 110],
  ["BEV-006", "Bisleri Water 1L", 45, 20],
  ["BEV-007", "Sprite 750ml", 14, 45],
  ["BEV-008", "Maaza Mango 1.2L", 18, 95],
  ["BEV-009", "Red Label Tea 500g", 22, 280],
  ["BEV-010", "Bru Instant Coffee 200g", 17, 420],
];

const cleaningBase = [
  ["CLN-001", "Surf Excel Detergent 2kg", 17, 430],
  ["CLN-002", "Vim Dishwash Gel 750ml", 21, 185],
  ["CLN-003", "Harpic Toilet Cleaner 1L", 13, 195],
  ["CLN-004", "Lizol Floor Cleaner 1L", 15, 220],
  ["CLN-005", "Colin Glass Cleaner 500ml", 19, 145],
  ["CLN-006", "Rin Bar Soap 4-pack", 28, 55],
  ["CLN-007", "Tide Plus Detergent 1kg", 20, 185],
  ["CLN-008", "Pril Dishwash Liquid 750ml", 16, 165],
  ["CLN-009", "Domex Toilet Cleaner 500ml", 14, 95],
  ["CLN-010", "HIT Mosquito Spray", 12, 185],
];

const personalCareBase = [
  ["PC-001", "Dove Soap Pack of 4", 20, 220],
  ["PC-002", "Clinic Plus Shampoo 650ml", 16, 335],
  ["PC-003", "Colgate Toothpaste 200g", 29, 115],
  ["PC-004", "Dettol Antiseptic Liquid 500ml", 19, 290],
  ["PC-005", "Ponds Face Cream 100g", 17, 165],
  ["PC-006", "Gillette Razor Pack", 14, 185],
  ["PC-007", "Nivea Body Lotion 400ml", 18, 320],
  ["PC-008", "Head & Shoulders 340ml", 15, 285],
  ["PC-009", "Lux Soap 4-pack", 25, 145],
  ["PC-010", "Sensodyne Toothpaste 100g", 12, 195],
];

const householdBase = [
  ["HH-001", "Comfort Fabric Conditioner 860ml", 12, 245],
  ["HH-002", "Mortein Mosquito Coil", 24, 75],
  ["HH-003", "Scotch Brite Scrub Pad", 35, 35],
  ["HH-004", "Godrej Aer Spray 220ml", 18, 245],
  ["HH-005", "Plastic Bucket 15L", 10, 185],
  ["HH-006", "Steel Scrubber 3-pack", 30, 45],
  ["HH-007", "Cloth Drying Stand Foldable", 6, 650],
  ["HH-008", "Kitchen Foil Roll", 22, 125],
  ["HH-009", "Garbage Bags Large 30pc", 28, 95],
  ["HH-010", "Matchbox 10-pack", 50, 25],
];

const stationeryBase = [
  ["STA-001", "Classmate Notebook 172 Pages", 40, 65],
  ["STA-002", "Cello Pen Pack", 35, 50],
  ["STA-003", "Apsara Pencil 10-pack", 45, 40],
  ["STA-004", "Camel Oil Pastels 12 Shades", 15, 85],
  ["STA-005", "Sticky Notes 100 Sheets", 30, 55],
  ["STA-006", "Geometry Box", 20, 75],
  ["STA-007", "Register 200 Pages", 25, 95],
  ["STA-008", "Highlighter Set 4 Colors", 18, 120],
  ["STA-009", "File Folder A4", 32, 35],
  ["STA-010", "Whiteboard Marker 4-pack", 14, 145],
];

function withCategory(items, category) {
  return items.map(([sku, name, stock, price]) => [sku, name, category, stock, price]);
}

const productNames = [
  ...withCategory(groceryBase, "Grocery"),
  ...withCategory(dairyBase, "Dairy"),
  ...withCategory(snacksBase, "Snacks"),
  ...withCategory(beveragesBase, "Beverages"),
  ...withCategory(cleaningBase, "Cleaning"),
  ...withCategory(personalCareBase, "Personal Care"),
  ...withCategory(householdBase, "Household"),
  ...withCategory(stationeryBase, "Stationery"),
];

// Deduplicate SKUs and pad to 105+ with generated variants
const seen = new Set();
const uniqueProducts = productNames.filter(([sku]) => {
  if (seen.has(sku)) return false;
  seen.add(sku);
  return true;
});

const categories = ["Grocery", "Dairy", "Snacks", "Beverages", "Cleaning", "Personal Care", "Household", "Stationery"];
const extras = [
  "Premium", "Family Pack", "Economy", "Organic", "Value Pack", "Classic", "Deluxe", "Fresh",
];
let counter = 1;
while (uniqueProducts.length < 110) {
  const category = categories[counter % categories.length];
  const prefix = category.slice(0, 3).toUpperCase().replace(" ", "");
  const sku = `GEN-${String(counter).padStart(3, "0")}`;
  const name = `${category} Item ${extras[counter % extras.length]} ${counter}`;
  const stock = 5 + (counter % 40);
  const price = 25 + (counter % 20) * 15;
  uniqueProducts.push([sku, name, category, stock, price]);
  counter += 1;
}

function productCreatedAt(index, total) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  const rangeMs = end.getTime() - start.getTime();
  const offset = (index / total) * rangeMs;
  return new Date(start.getTime() + offset);
}

module.exports = { productCatalog: uniqueProducts, productCreatedAt };

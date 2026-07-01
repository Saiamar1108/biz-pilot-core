export type Product = {
  sku: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  sold: number;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: number;
  due: number;
  status: "vip" | "regular" | "new";
  lastOrder: string;
};

export type Invoice = {
  id: string;
  customer: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  date: string;
  items: number;
};

export type Order = {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: "completed" | "processing" | "cancelled";
  items: string[];
};

export const products: Product[] = [
  { sku: "GRO-001", name: "Basmati Rice 5kg", category: "Grocery", stock: 3, price: 12.5, sold: 128 },
  { sku: "DAI-014", name: "Almond Milk 1L", category: "Dairy", stock: 42, price: 4.2, sold: 84 },
  { sku: "SNK-091", name: "Dark Chocolate 100g", category: "Snacks", stock: 8, price: 3.8, sold: 210 },
  { sku: "BEV-030", name: "Cold Brew Bottle", category: "Drinks", stock: 65, price: 5.5, sold: 320 },
  { sku: "GRO-018", name: "Organic Eggs (12)", category: "Grocery", stock: 2, price: 6.9, sold: 190 },
  { sku: "HH-224", name: "Dish Soap 500ml", category: "Household", stock: 27, price: 2.9, sold: 62 },
  { sku: "SNK-102", name: "Trail Mix 250g", category: "Snacks", stock: 0, price: 7.4, sold: 55 },
  { sku: "BEV-041", name: "Sparkling Water 6pk", category: "Drinks", stock: 5, price: 8.99, sold: 145 },
];

export const customers: Customer[] = [
  { id: "c1", name: "Priya Sharma", email: "priya@mail.com", phone: "+1 555 0101", orders: 24, spent: 1840, due: 0, status: "vip", lastOrder: "Jun 28, 2026" },
  { id: "c2", name: "Marcus Chen", email: "marcus@brew.co", phone: "+1 555 0102", orders: 18, spent: 1210, due: 90, status: "regular", lastOrder: "Jun 27, 2026" },
  { id: "c3", name: "Aisha Okoye", email: "aisha@lagos.co", phone: "+1 555 0103", orders: 32, spent: 2890, due: 0, status: "vip", lastOrder: "Jun 29, 2026" },
  { id: "c4", name: "James Patel", email: "jamesp@mail.com", phone: "+1 555 0104", orders: 6, spent: 420, due: 65, status: "new", lastOrder: "Jun 25, 2026" },
  { id: "c5", name: "Sofia Rossi", email: "sofia@rossi.it", phone: "+1 555 0105", orders: 14, spent: 940, due: 0, status: "regular", lastOrder: "Jun 26, 2026" },
  { id: "c6", name: "Kenji Tanaka", email: "kenji@tk.jp", phone: "+1 555 0106", orders: 21, spent: 1560, due: 210, status: "regular", lastOrder: "Jun 24, 2026" },
];

export const invoices: Invoice[] = [
  { id: "INV-10284", customer: "Priya Sharma", amount: 890.0, status: "paid", date: "Jun 29, 2026", items: 12 },
  { id: "INV-10283", customer: "Marcus Chen", amount: 124.5, status: "pending", date: "Jun 29, 2026", items: 4 },
  { id: "INV-10282", customer: "Aisha Okoye", amount: 456.0, status: "paid", date: "Jun 28, 2026", items: 8 },
  { id: "INV-10281", customer: "Kenji Tanaka", amount: 210.0, status: "overdue", date: "Jun 20, 2026", items: 5 },
  { id: "INV-10280", customer: "James Patel", amount: 65.0, status: "pending", date: "Jun 27, 2026", items: 3 },
  { id: "INV-10279", customer: "Sofia Rossi", amount: 178.25, status: "paid", date: "Jun 26, 2026", items: 6 },
];

export const recentOrders: Order[] = [
  { id: "#10238", customer: "Priya Sharma", date: "Jun 29, 2026", total: 124.5, status: "completed", items: ["Basmati Rice 5kg", "Almond Milk 1L"] },
  { id: "#10237", customer: "Marcus Chen", date: "Jun 29, 2026", total: 89.0, status: "processing", items: ["Cold Brew Bottle", "Dark Chocolate 100g"] },
  { id: "#10236", customer: "Aisha Okoye", date: "Jun 28, 2026", total: 312.0, status: "completed", items: ["Organic Eggs (12)", "Trail Mix 250g", "Dish Soap 500ml"] },
  { id: "#10235", customer: "Kenji Tanaka", date: "Jun 28, 2026", total: 45.5, status: "completed", items: ["Sparkling Water 6pk"] },
  { id: "#10234", customer: "James Patel", date: "Jun 27, 2026", total: 65.0, status: "cancelled", items: ["Basmati Rice 5kg"] },
];

export const salesData = [
  { m: "Mon", v: 3200 },
  { m: "Tue", v: 4100 },
  { m: "Wed", v: 3800 },
  { m: "Thu", v: 5200 },
  { m: "Fri", v: 6100 },
  { m: "Sat", v: 7400 },
  { m: "Sun", v: 5900 },
];

export const revenueData = [
  { m: "Jan", v: 12000 },
  { m: "Feb", v: 15800 },
  { m: "Mar", v: 14200 },
  { m: "Apr", v: 19400 },
  { m: "May", v: 22100 },
  { m: "Jun", v: 25800 },
  { m: "Jul", v: 28900 },
  { m: "Aug", v: 31200 },
  { m: "Sep", v: 34500 },
];

export const productOptions = products.map((p) => p.name);
export const customerNames = customers.map((c) => c.name);

export function getLowStockProducts(threshold = 10) {
  return products.filter((p) => p.stock < threshold);
}

export function getPendingPayments() {
  return customers.filter((c) => c.due > 0);
}

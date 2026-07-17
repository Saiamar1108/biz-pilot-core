const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const PurchaseOrder = require("../models/PurchaseOrder");
const Setting = require("../models/Setting");
const Notification = require("../models/Notification");

async function seedDemoAccount() {
  try {
    // 1. Check if demo user already exists
    const demoUser = await User.findOne({ email: "demo@shoppilot.ai" });
    if (demoUser) {
      console.log("[Seeder] Demo account demo@shoppilot.ai already exists. Skipping seed.");
      return;
    }

    console.log("[Seeder] Seeding dedicated demo account data...");

    // 2. Create Shop
    const shop = await Shop.create({
      shopName: "FreshMart Grocery",
      name: "FreshMart Grocery",
      slug: "freshmart-grocery",
      businessType: "Grocery & Supermarket",
      phone: "+91 98765 43210",
      email: "support@freshmart.ai",
      address: "123 Metro Plaza, Benz Circle, Vijayawada, Andhra Pradesh",
      gstNumber: "37AAAAA1111A1Z1",
      upiId: "freshmart@okaxis",
      currency: "INR",
      timezone: "Asia/Kolkata",
      invoicePrefix: "FM",
      logoDataUrl: "", // blank or placeholder
    });

    // 3. Create User
    const passwordHash = await User.hashPassword("Demo@123");
    const user = await User.create({
      name: "Demo Store Owner",
      email: "demo@shoppilot.ai",
      passwordHash,
      phone: "+91 98765 43210",
      role: "owner",
      shopId: shop._id,
      isVerified: true,
    });

    // Link shop owner
    shop.ownerId = user._id;
    await shop.save();

    // 4. Create Setting
    await Setting.create({
      key: "default",
      shopId: shop._id,
      notifications: {
        email: true,
        whatsapp: true,
        desktop: true,
        push: false,
        lowStock: true,
        invoicePaid: true,
        purchaseOrders: true,
        aiAlerts: true,
      },
      preferences: {
        theme: "system",
        language: "en",
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        numberFormat: "en-IN",
        startPage: "/dashboard",
      },
    });

    // 5. Seed Suppliers (12+)
    const supplierConfigs = [
      { name: "Lakshmi Rice Traders", person: "Ramanuja Rao", phone: "+91 94401 23456", email: "sales@lakshmirice.in", address: "Grains Market Road, Nellore" },
      { name: "Fresh Farms Orchard", person: "Kiran Kumar", phone: "+91 98480 12345", email: "fresh@farmsorchard.com", address: "Apple Valley Road, Madanapalle" },
      { name: "Royal Vegetables & Greens", person: "Siva Prasad", phone: "+91 77022 98765", email: "royal@greens.in", address: "Sabzi Mandi Yard 4, Vijayawada" },
      { name: "Dairy Fresh Co.", person: "Anil Milkwala", phone: "+91 99887 76655", email: "orders@dairyfreshco.com", address: "Industrial Estate, Chittoor" },
      { name: "Metro Foods Packaging", person: "Rajesh Jain", phone: "+91 80081 23456", email: "distribution@metrofoods.in", address: "Auto Nagar Lane 3, Guntur" },
      { name: "Sunlight Soap Distributors", person: "Prakash Gupta", phone: "+91 91234 56789", email: "prakash@sunlightsoap.com", address: "Main Bazaar Road, Tenali" },
      { name: "Greenfield Tea Estates", person: "Meenakshi Iyer", phone: "+91 94940 98765", email: "meenakshi@greenfieldtea.in", address: "Assam Row Gardens, Visakhapatnam" },
      { name: "Masala Spices Ltd", person: "Venkat Reddy", phone: "+91 85000 12345", email: "spices@masalasltd.co.in", address: "Chilli Yard Gate, Warangal" },
      { name: "Organic Harvest", person: "Siddharth Sen", phone: "+91 96660 54321", email: "harvest@organics.org", address: "Eco Park Road, Hyderabad" },
      { name: "Quality Flour Mills", person: "Guru Singh", phone: "+91 95551 67890", email: "orders@qualityflour.com", address: "Kurnool Mill Hub, Kurnool" },
      { name: "Everest Beverage Corp", person: "Sandeep Nair", phone: "+91 97771 23456", email: "sandeep@everestbeverages.com", address: "SIPCOT Industrial Complex, Tirupati" },
      { name: "Ocean Harvest Seafoods", person: "Devi Prasad", phone: "+91 90001 98765", email: "delivery@oceanharvest.in", address: "Fishing Harbour Block B, Kakinada" }
    ];

    const supplierDocs = [];
    for (const c of supplierConfigs) {
      const s = await Supplier.create({
        shopId: shop._id,
        supplierName: c.name,
        contactPerson: c.person,
        mobileNumber: c.phone,
        whatsAppNumber: c.phone,
        email: c.email,
        address: c.address,
        city: c.address.split(",").pop().trim(),
        state: "Andhra Pradesh",
        pincode: "520008",
        isActive: true,
      });
      supplierDocs.push(s);
    }

    const supplierMap = {};
    supplierDocs.forEach(s => {
      supplierMap[s.supplierName] = s._id;
    });

    // 6. Seed Products (55 products)
    const productSpecs = [
      // Groceries
      { sku: "GRO-RICE-10", name: "Sona Masoori Rice Bag 10kg", price: 820, costPrice: 615, category: "Groceries", supplier: "Lakshmi Rice Traders", minStock: 25 },
      { sku: "GRO-RICE-ORGANIC", name: "Organic Basmati Rice 5kg", price: 650, costPrice: 490, category: "Groceries", supplier: "Lakshmi Rice Traders", minStock: 15 },
      { sku: "GRO-DAL-TOOR", name: "Premium Toor Dal 1kg", price: 170, costPrice: 125, category: "Groceries", supplier: "Lakshmi Rice Traders", minStock: 30 },
      { sku: "GRO-DAL-MOONG", name: "Organic Moong Dal 1kg", price: 155, costPrice: 115, category: "Groceries", supplier: "Lakshmi Rice Traders", minStock: 20 },
      { sku: "GRO-ATTA-5", name: "Aashirvaad Shudh Atta 5kg", price: 320, costPrice: 245, category: "Groceries", supplier: "Quality Flour Mills", minStock: 25 },
      { sku: "GRO-MAIDA-1", name: "Quality Maida Flour 1kg", price: 65, costPrice: 48, category: "Groceries", supplier: "Quality Flour Mills", minStock: 15 },
      { sku: "GRO-OIL-SUN", name: "Fortune Sunflower Oil 1L", price: 165, costPrice: 128, category: "Groceries", supplier: "Metro Foods Packaging", minStock: 40 },
      { sku: "GRO-SALT-1", name: "Tata Iodized Salt 1kg", price: 28, costPrice: 20, category: "Groceries", supplier: "Metro Foods Packaging", minStock: 50 },
      { sku: "GRO-SUGAR-1", name: "Fine Sugar Crystals 1kg", price: 52, costPrice: 38, category: "Groceries", supplier: "Metro Foods Packaging", minStock: 40 },
      { sku: "GRO-SUJI-1", name: "Suji Semolina 1kg", price: 60, costPrice: 45, category: "Groceries", supplier: "Quality Flour Mills", minStock: 20 },
      // Dairy & Eggs
      { sku: "DAI-MILK-1", name: "Amul Gold Milk Pasteurized 1L", price: 74, costPrice: 58, category: "Dairy & Eggs", supplier: "Dairy Fresh Co.", minStock: 60 },
      { sku: "DAI-BUTTER-500", name: "Amul Butter Salted 500g", price: 275, costPrice: 215, category: "Dairy & Eggs", supplier: "Dairy Fresh Co.", minStock: 15 },
      { sku: "DAI-CHEESE-200", name: "Britannia Cheese Slices 200g", price: 150, costPrice: 118, category: "Dairy & Eggs", supplier: "Dairy Fresh Co.", minStock: 15 },
      { sku: "DAI-EGGS-30", name: "Farm Fresh Large Eggs 30pcs", price: 190, costPrice: 145, category: "Dairy & Eggs", supplier: "Dairy Fresh Co.", minStock: 20 },
      { sku: "DAI-PANEER-200", name: "Amul Fresh Paneer 200g", price: 92, costPrice: 70, category: "Dairy & Eggs", supplier: "Dairy Fresh Co.", minStock: 25 },
      { sku: "DAI-CURD-500", name: "Thick Curd Pouch 500g", price: 38, costPrice: 28, category: "Dairy & Eggs", supplier: "Dairy Fresh Co.", minStock: 40 },
      // Snacks & Confectionery
      { sku: "SNA-PARLEG-800", name: "Parle-G Glucose Biscuit 800g", price: 95, costPrice: 74, category: "Snacks", supplier: "Metro Foods Packaging", minStock: 30 },
      { sku: "SNA-MAGGI-560", name: "Maggi 2-Min Noodles 560g", price: 120, costPrice: 90, category: "Snacks", supplier: "Metro Foods Packaging", minStock: 45 },
      { sku: "SNA-LAYS-CLASSIC", name: "Lays Potato Chips Salted 50g", price: 30, costPrice: 22, category: "Snacks", supplier: "Everest Beverage Corp", minStock: 50 },
      { sku: "SNA-KURKURE-MUNCH", name: "Kurkure Masala Munch 90g", price: 30, costPrice: 22, category: "Snacks", supplier: "Everest Beverage Corp", minStock: 50 },
      { sku: "SNA-MILK-150", name: "Cadbury Dairy Milk Silk 150g", price: 125, costPrice: 95, category: "Snacks", supplier: "Dairy Fresh Co.", minStock: 20 },
      { sku: "SNA-BRITANNIA-CAKE", name: "Britannia Fruit Cake 120g", price: 40, costPrice: 30, category: "Snacks", supplier: "Metro Foods Packaging", minStock: 25 },
      { sku: "SNA-MIX-MIX", name: "Haldirams Bhujia Sev 350g", price: 110, costPrice: 84, category: "Snacks", supplier: "Metro Foods Packaging", minStock: 20 },
      // Home Care
      { sku: "HOM-DET-SURF", name: "Surf Excel Easy Wash 1kg", price: 240, costPrice: 185, category: "Home Care", supplier: "Sunlight Soap Distributors", minStock: 15 },
      { sku: "HOM-VIM-GEL", name: "Vim Liquid Lemon Gel 500ml", price: 115, costPrice: 88, category: "Home Care", supplier: "Sunlight Soap Distributors", minStock: 20 },
      { sku: "HOM-HARPIC-500", name: "Harpic Toilet Cleaner 500ml", price: 105, costPrice: 80, category: "Home Care", supplier: "Sunlight Soap Distributors", minStock: 15 },
      { sku: "HOM-PHENYL-1", name: "Lizol Floor Cleaner Citrus 1L", price: 215, costPrice: 165, category: "Home Care", supplier: "Sunlight Soap Distributors", minStock: 15 },
      { sku: "HOM-ODONIL-50", name: "Odonil Air Freshener 50g", price: 65, costPrice: 48, category: "Home Care", supplier: "Sunlight Soap Distributors", minStock: 30 },
      // Personal Care
      { sku: "PER-DETTOL-HW", name: "Dettol Liquid Handwash 250ml", price: 99, costPrice: 75, category: "Personal Care", supplier: "Sunlight Soap Distributors", minStock: 25 },
      { sku: "PER-COLGATE-150", name: "Colgate MaxFresh Gel 150g", price: 112, costPrice: 84, category: "Personal Care", supplier: "Sunlight Soap Distributors", minStock: 30 },
      { sku: "PER-LIFEBUOY-125", name: "Lifebuoy Total Soap 125g", price: 42, costPrice: 31, category: "Personal Care", supplier: "Sunlight Soap Distributors", minStock: 40 },
      { sku: "PER-PEARS-125", name: "Pears Pure & Gentle Soap 125g", price: 88, costPrice: 66, category: "Personal Care", supplier: "Sunlight Soap Distributors", minStock: 25 },
      { sku: "PER-PEPSODENT-150", name: "Pepsodent Germi Check 150g", price: 95, costPrice: 70, category: "Personal Care", supplier: "Sunlight Soap Distributors", minStock: 25 },
      { sku: "PER-CLINIC-PLUS", name: "Clinic Plus Shampoo 340ml", price: 185, costPrice: 142, category: "Personal Care", supplier: "Sunlight Soap Distributors", minStock: 20 },
      // Beverages
      { sku: "BEV-TEA-RED", name: "Brooke Bond Red Label Tea 1kg", price: 410, costPrice: 315, category: "Beverages", supplier: "Greenfield Tea Estates", minStock: 15 },
      { sku: "BEV-COFFEE-NES", name: "Nescafe Classic Coffee Jar 100g", price: 325, costPrice: 248, category: "Beverages", supplier: "Greenfield Tea Estates", minStock: 15 },
      { sku: "BEV-COKE-2", name: "Coca Cola Soft Drink 2L", price: 95, costPrice: 70, category: "Beverages", supplier: "Everest Beverage Corp", minStock: 30 },
      { sku: "BEV-JUICE-ORANGE", name: "Tropicana 100% Orange Juice 1L", price: 120, costPrice: 90, category: "Beverages", supplier: "Everest Beverage Corp", minStock: 20 },
      { sku: "BEV-SODA-7UP", name: "7Up Fizzy Can 330ml", price: 40, costPrice: 28, category: "Beverages", supplier: "Everest Beverage Corp", minStock: 40 },
      { sku: "BEV-WATER-20", name: "Kinley Mineral Water Jar 20L", price: 90, costPrice: 50, category: "Beverages", supplier: "Everest Beverage Corp", minStock: 30 },
      // Spices & Condiments
      { sku: "SPI-GARAM-100", name: "MTR Garam Masala Powder 100g", price: 110, costPrice: 82, category: "Spices", supplier: "Masala Spices Ltd", minStock: 20 },
      { sku: "SPI-TURMERIC-500", name: "Organic Turmeric Powder 500g", price: 135, costPrice: 100, category: "Spices", supplier: "Masala Spices Ltd", minStock: 25 },
      { sku: "SPI-CHILLI-500", name: "Everest Guntur Chilli 500g", price: 210, costPrice: 155, category: "Spices", supplier: "Masala Spices Ltd", minStock: 25 },
      { sku: "SPI-CORIANDER-500", name: "Coriander Dhania Powder 500g", price: 120, costPrice: 88, category: "Spices", supplier: "Masala Spices Ltd", minStock: 20 },
      // Organic & Healthy
      { sku: "ORG-QUINOA-500", name: "Organic Quinoa Grain 500g", price: 290, costPrice: 215, category: "Organic Harvest", supplier: "Organic Harvest", minStock: 10 },
      { sku: "ORG-CHIA-250", name: "Organic Chia Seeds 250g", price: 180, costPrice: 130, category: "Organic Harvest", supplier: "Organic Harvest", minStock: 10 },
      { sku: "ORG-OATS-1", name: "Quaker Rolled Oats Tub 1kg", price: 220, costPrice: 165, category: "Organic Harvest", supplier: "Organic Harvest", minStock: 20 },
      // Fresh Greens & Veggies
      { sku: "VEG-TOMATO-1", name: "Fresh Red Tomato 1kg", price: 45, costPrice: 28, category: "Groceries", supplier: "Royal Vegetables & Greens", minStock: 30, expiryOffset: -3 },
      { sku: "VEG-POTATO-1", name: "Premium Fresh Potato 1kg", price: 35, costPrice: 20, category: "Groceries", supplier: "Royal Vegetables & Greens", minStock: 35, expiryOffset: 25 },
      { sku: "VEG-ONION-1", name: "Fresh Red Onion 1kg", price: 60, costPrice: 38, category: "Groceries", supplier: "Royal Vegetables & Greens", minStock: 40, expiryOffset: 45 },
      { sku: "VEG-APPLE-1", name: "Fresh Shimla Apple 1kg", price: 220, costPrice: 150, category: "Groceries", supplier: "Fresh Farms Orchard", minStock: 15, expiryOffset: 15 },
      { sku: "VEG-MANGO-1", name: "Sweet Alphonso Mangoes 1kg", price: 350, costPrice: 235, category: "Groceries", supplier: "Fresh Farms Orchard", minStock: 15, expiryOffset: -1 },
      { sku: "VEG-SPINACH-250", name: "Fresh Green Palak Bunch 250g", price: 20, costPrice: 10, category: "Groceries", supplier: "Royal Vegetables & Greens", minStock: 15, expiryOffset: 2 },
      { sku: "VEG-CARROT-500", name: "Ooty Orange Carrot 500g", price: 40, costPrice: 24, category: "Groceries", supplier: "Royal Vegetables & Greens", minStock: 20, expiryOffset: 12 },
      { sku: "SEA-FISH-CAN", name: "Canned Tuna in Olive Oil 180g", price: 195, costPrice: 145, category: "Groceries", supplier: "Ocean Harvest Seafoods", minStock: 15 }
    ];

    const products = [];
    for (const spec of productSpecs) {
      let expiryDate = null;
      if (spec.expiryOffset !== undefined) {
        const d = new Date();
        d.setDate(d.getDate() + spec.expiryOffset);
        expiryDate = d;
      }

      const p = new Product({
        sku: spec.sku,
        name: spec.name,
        category: spec.category,
        stock: 500,
        price: spec.price,
        costPrice: spec.costPrice,
        minStock: spec.minStock,
        targetStock: spec.minStock * 4,
        defaultSupplier: supplierMap[spec.supplier] || null,
        expiryDate,
        shopId: shop._id,
        stockMovements: [
          {
            type: "added",
            quantity: 500,
            note: "Opening Stock initialization",
            createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
          }
        ]
      });
      products.push(p);
    }

    // 7. Seed Customers (105 customers)
    const customerNames = [
      "Aarav Sharma", "Aditya Reddy", "Aishwarya Roy", "Amit Patel", "Ananya Iyer", "Anil Kumar", "Anjali Deshmukh", "Arjun Nair", "Arvind Rao", "Bhavana Prasad",
      "Chaitanya Raju", "Deepak Verma", "Deepika Padukone", "Divya Teja", "Eshwar Murthy", "Ganesh Hegde", "Gautam Gambhir", "Gayatri Devi", "Girish Karnad", "Hari Prasad",
      "Indira Gandhi", "Ishaan Kishan", "Jagadish Chandra", "Janaki Ram", "Jasmine Kaur", "Kalyan Ram", "Karthik Raja", "Kavita Krishnamurthy", "Kiran Bedi", "Krishna Mohan",
      "Lakshmi Narayana", "Lalitha Kumari", "Madhavan R", "Mahesh Babu", "Manoj Bajpayee", "Meera Jasmine", "Mohan Lal", "Muralitharan M", "Nagarjuna Akkineni", "Nandini Rao",
      "Naveen Patnaik", "Neelam Sanjiva", "Nisha Agarwal", "Nitin Gadkari", "Padma Rao", "Pavan Kalyan", "Pooja Hegde", "Prakash Raj", "Pranab Mukherjee", "Prasad V",
      "Priya Anand", "Rahul Gandhi", "Rajesh Khanna", "Rajini Kanth", "Raju Sundaram", "Ram Charan", "Ramesh Kumar", "Rashmika Mandanna", "Ravi Shankar", "Renu Desai",
      "Sachi Devi", "Sai Pallavi", "Sandeep Reddy", "Sanjay Dutt", "Sarath Kumar", "Satya Nadella", "Seetha Ram", "Shalini Pandey", "Shiva Shankar", "Shruti Haasan",
      "Siddharth Roy", "Sita Kalyani", "Soma Sekhar", "Sreenivas Rao", "Subhash Chandra", "Sujatha R", "Sundar Pichai", "Suresh Raina", "Surya Kumar", "Trisha Krishnan",
      "Uma Devi", "Upendra K", "Vani Sri", "Varun Tej", "Veera Swamy", "Venkat Rao", "Vidyut Jamwal", "Vijay Deverakonda", "Vikram Kennedy", "Vineet Kumar",
      "Yash Gowda", "Yuvraj Singh", "Kishore Kumar", "Lata Mangeshkar", "Asha Bhosle", "Mukesh Chand", "Sonu Nigam", "Shreya Ghoshal", "Sunidhi Chauhan", "Arijit Singh",
      "Badshah Ram", "Honey Singh", "Diljit Dosanjh", "Guru Randhawa", "Sidhu Moosewala"
    ];

    const customers = [];
    for (let i = 0; i < customerNames.length; i++) {
      const name = customerNames[i];
      const email = name.toLowerCase().replace(/ /g, ".") + "@gmail.com";
      const phone = "+91 98" + String(76543210 + i);
      const address = `Street No ${i + 1}, Benz Circle Area, Vijayawada`;

      const c = new Customer({
        name,
        email,
        phone,
        address,
        shopId: shop._id,
        totalPurchases: 0,
        totalBilled: 0,
        totalSpent: 0,
        orders: 0,
        spent: 0,
        due: 0,
        pendingPayments: 0,
      });
      customers.push(c);
    }

    // 8. Generate Invoices distributed over 180 days (Jan 1, 2026 to July 17, 2026)
    // Target is 260+ Invoices
    const invoices = [];
    const totalDays = 180;
    const invoiceCount = 265;

    const customerStats = {};
    customers.forEach(c => {
      customerStats[c._id.toString()] = {
        orders: 0,
        spent: 0,
        due: 0,
        totalBilled: 0,
        lastPurchaseDate: null,
      };
    });

    for (let i = 0; i < invoiceCount; i++) {
      const invoiceNumVal = i + 1;
      const invoiceNumber = `FM-2026-${String(invoiceNumVal).padStart(4, "0")}`;
      const randCust = customers[Math.floor(Math.random() * customers.length)];
      
      const daysBack = totalDays - Math.floor((i / invoiceCount) * totalDays);
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - daysBack);
      invoiceDate.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0);

      const lineItemCount = 1 + Math.floor(Math.random() * 4);
      const selectedProducts = [];
      const usedProdIndexes = new Set();

      while (selectedProducts.length < lineItemCount) {
        const prodIndex = Math.floor(Math.random() * products.length);
        if (!usedProdIndexes.has(prodIndex)) {
          usedProdIndexes.add(prodIndex);
          selectedProducts.push(products[prodIndex]);
        }
      }

      const lineItems = [];
      let subtotal = 0;

      selectedProducts.forEach(p => {
        const quantity = 1 + Math.floor(Math.random() * 3);
        const unitPrice = p.price;
        const costPrice = p.costPrice;
        const lineTotal = quantity * unitPrice;
        
        lineItems.push({
          product: p._id,
          productName: p.name,
          sku: p.sku,
          quantity,
          unitPrice,
          costPrice,
          sellingPrice: unitPrice,
          lineTotal
        });

        subtotal += lineTotal;

        p.stock = Math.max(0, p.stock - quantity);
        p.sold += quantity;

        p.stockMovements.push({
          type: "sold",
          quantity,
          note: `Sold on invoice ${invoiceNumber}`,
          createdAt: invoiceDate
        });
      });

      const taxRate = 0.08;
      const tax = parseFloat((subtotal * taxRate).toFixed(2));
      const total = parseFloat((subtotal + tax).toFixed(2));

      const r = Math.random();
      let status = "paid";
      let paidAmount = total;
      let pendingAmount = 0;
      let paidAt = invoiceDate;
      let paymentMethod = ["UPI", "Cash", "Card"][Math.floor(Math.random() * 3)];
      let paymentHistory = [];

      if (r < 0.15 && daysBack < 45) {
        if (r < 0.10) {
          status = "pending";
          paidAmount = 0;
          pendingAmount = total;
          paidAt = undefined;
          paymentMethod = "";
        } else {
          status = "partial";
          paidAmount = parseFloat((total * 0.4).toFixed(2));
          pendingAmount = parseFloat((total - paidAmount).toFixed(2));
          paymentHistory = [{ amount: paidAmount, method: paymentMethod, paidAt: invoiceDate, note: "Initial partial payment" }];
        }
      } else {
        paymentHistory = [{ amount: total, method: paymentMethod, paidAt: invoiceDate, note: "Paid in full" }];
      }

      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 14);

      const invoice = new Invoice({
        invoiceNumber,
        customer: randCust._id,
        customerName: randCust.name,
        lineItems,
        subtotal,
        taxRate,
        tax,
        total,
        status,
        paidAmount,
        pendingAmount,
        paidAt,
        paymentMethod,
        paymentHistory,
        dueDate,
        shopId: shop._id,
        createdAt: invoiceDate,
        updatedAt: invoiceDate
      });

      invoices.push(invoice);

      const stats = customerStats[randCust._id.toString()];
      stats.orders += 1;
      stats.spent += paidAmount;
      stats.due += pendingAmount;
      stats.totalBilled += total;
      if (!stats.lastPurchaseDate || invoiceDate > stats.lastPurchaseDate) {
        stats.lastPurchaseDate = invoiceDate;
      }
    }

    for (const c of customers) {
      const stats = customerStats[c._id.toString()] || { orders: 0, spent: 0, due: 0, totalBilled: 0, lastPurchaseDate: null };
      c.orders = stats.orders;
      c.totalPurchases = stats.orders;
      c.spent = parseFloat(stats.spent.toFixed(2));
      c.totalSpent = parseFloat(stats.spent.toFixed(2));
      c.due = parseFloat(stats.due.toFixed(2));
      c.pendingAmount = parseFloat(stats.due.toFixed(2));
      c.pendingPayments = stats.due > 0 ? 1 : 0;
      c.totalBilled = parseFloat(stats.totalBilled.toFixed(2));
      if (stats.lastPurchaseDate) {
        c.lastPurchaseDate = stats.lastPurchaseDate;
        c.lastOrder = stats.lastPurchaseDate;
      }

      if (c.spent > 8000) {
        c.status = "vip";
        c.customerType = "VIP";
      } else if (c.spent > 2500) {
        c.status = "regular";
        c.customerType = "Regular";
      } else {
        c.status = "new";
        c.customerType = "New";
      }
    }

    // 9. Seed Purchase Orders (22 POs)
    const purchaseOrders = [];
    const poCount = 22;

    for (let i = 0; i < poCount; i++) {
      const poNumVal = i + 1;
      const purchaseOrderNumber = `PO-2026-${String(poNumVal).padStart(4, "0")}`;
      const randSupplier = supplierDocs[Math.floor(Math.random() * supplierDocs.length)];

      const daysBack = totalDays - Math.floor((i / poCount) * totalDays);
      const poDate = new Date();
      poDate.setDate(poDate.getDate() - daysBack);
      poDate.setHours(10, 0, 0, 0);

      const supplierProducts = products.filter(p => p.defaultSupplier && p.defaultSupplier.toString() === randSupplier._id.toString());
      if (supplierProducts.length === 0) continue;

      const itemsCount = Math.min(supplierProducts.length, 2 + Math.floor(Math.random() * 4));
      const poItems = [];
      let totalAmount = 0;

      const selectedSupplierProds = supplierProducts.slice(0, itemsCount);

      selectedSupplierProds.forEach(p => {
        const quantity = 50 + Math.floor(Math.random() * 150);
        const purchasePrice = p.costPrice;
        
        poItems.push({
          product: p._id,
          productName: p.name,
          sku: p.sku,
          quantity,
          purchasePrice,
          receivedQuantity: 0,
        });

        totalAmount += quantity * purchasePrice;
      });

      let status = "Received";
      let receivedDate = undefined;
      const r = Math.random();

      if (daysBack < 25) {
        if (r < 0.3) {
          status = "Draft";
        } else if (r < 0.7) {
          status = "Sent";
        } else if (r < 0.85) {
          status = "Cancelled";
        }
      }

      if (status === "Received") {
        receivedDate = new Date(poDate);
        receivedDate.setDate(receivedDate.getDate() + 5);

        poItems.forEach(item => {
          item.receivedQuantity = item.quantity;
          
          const p = products.find(prod => prod._id.toString() === item.product.toString());
          if (p) {
            p.stock += item.quantity;
            p.stockMovements.push({
              type: "added",
              quantity: item.quantity,
              note: `PO Goods Receipt: ${purchaseOrderNumber}`,
              createdAt: receivedDate
            });
            p.purchaseHistory.push({
              supplier: randSupplier._id,
              supplierName: randSupplier.supplierName,
              price: item.purchasePrice,
              quantity: item.quantity,
              purchaseDate: receivedDate
            });
          }
        });
      }

      const expectedDeliveryDate = new Date(poDate);
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 7);

      const po = new PurchaseOrder({
        shopId: shop._id,
        purchaseOrderNumber,
        supplier: randSupplier._id,
        supplierName: randSupplier.supplierName,
        items: poItems,
        status,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        notes: `Replenishment of inventory for store category.`,
        expectedDeliveryDate,
        receivedDate,
        createdAt: poDate,
        updatedAt: poDate
      });

      purchaseOrders.push(po);
    }

    const lowStockProducts = products.slice(0, 5);
    lowStockProducts.forEach((p, idx) => {
      p.stock = Math.max(1, p.minStock - 3 - idx);
      p.stockMovements.push({
        type: "adjusted",
        quantity: -p.stock,
        note: "Audited stock correction (low inventory)",
        createdAt: new Date()
      });
    });

    // 10. Seed Notifications
    const notifications = [
      { type: "stock", message: `Stock level critical for ${products[0].name}. Only ${products[0].stock} remaining.`, relatedId: products[0].sku, key: `stock-${products[0].sku}` },
      { type: "stock", message: `Stock level critical for ${products[1].name}. Only ${products[1].stock} remaining.`, relatedId: products[1].sku, key: `stock-${products[1].sku}` },
      { type: "stock", message: `Stock level critical for ${products[2].name}. Only ${products[2].stock} remaining.`, relatedId: products[2].sku, key: `stock-${products[2].sku}` },
      { type: "payment", message: `Invoice ${invoices[0].invoiceNumber} for ${invoices[0].customerName} is past due date.`, relatedId: invoices[0].invoiceNumber, key: `payment-${invoices[0].invoiceNumber}` }
    ].map(n => ({
      ...n,
      shopId: shop._id,
      read: false,
      createdAt: new Date()
    }));

    console.log(`[Seeder] Inserting ${products.length} products...`);
    await Product.insertMany(products);

    console.log(`[Seeder] Inserting ${customers.length} customers...`);
    await Customer.insertMany(customers);

    console.log(`[Seeder] Inserting ${invoices.length} invoices...`);
    await Invoice.insertMany(invoices);

    console.log(`[Seeder] Inserting ${purchaseOrders.length} purchase orders...`);
    await PurchaseOrder.insertMany(purchaseOrders);

    console.log(`[Seeder] Inserting ${notifications.length} notifications...`);
    await Notification.insertMany(notifications);

    console.log("[Seeder] Demo account successfully seeded!");
  } catch (error) {
    console.error("[Seeder] Failed to seed demo account:", error);
  }
}

module.exports = { seedDemoAccount };

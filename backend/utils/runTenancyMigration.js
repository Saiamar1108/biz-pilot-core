require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const connectDB = require("../config/db");
const { migrateExistingDataToDefaultShop } = require("./migrateTenancy");

async function main() {
  await connectDB();
  const result = await migrateExistingDataToDefaultShop();
  console.log("Tenancy migration complete:", result);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

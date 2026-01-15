import "dotenv/config";
const app = require("./app");
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;
connectDB();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

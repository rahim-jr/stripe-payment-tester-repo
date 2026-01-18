import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import {stripeWebhook} from "./webhooks/stripe.webhook.js";

const app = express();

// CORS configuration - allow all origins in development, specific origin in production
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.post("/api/webhooks/stripe", express.raw({type: "application/json"}), stripeWebhook);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

export default app;

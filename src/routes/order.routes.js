import express from "express";
import { createOrder , createCheckoutSession, getMyOrders} from "../controllers/order.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createOrder);
router.post("/checkout-session", authMiddleware, createCheckoutSession);
router.get("/", authMiddleware, getMyOrders);

export default router;

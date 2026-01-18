import Order from "../models/order.js";
import Product from "../models/product.js";

export const createOrder = async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const order = await Order.create({
    user: req.user._id,
    product: product._id,
    amount: product.price,
  });

  res.status(201).json(order);
};

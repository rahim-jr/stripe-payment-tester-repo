import Order from "../models/order.js";
import Product from "../models/product.js";
import stripe from "../config/stripe.js" ;

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

export const createCheckoutSession = async (req , res) =>{
  const {orderId} = req.body ;

  const order = await Order.findById(orderId).populate("product"); 

  if(!order){
    return res.status(404).json({message: "Order not found"});
  }

  if(!order.product){
    return res.status(404).json({message: "Product not found for this order"});
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: order.product.name,
          },
          unit_amount: Math.round(order.amount * 100), //cents
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    mode: "payment",
    metadata: {
      orderId: order._id.toString(),
    },
  });

  res.status(200).json({ session });
}

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
};

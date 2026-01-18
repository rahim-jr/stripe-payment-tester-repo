import Product from "../models/product.js";

export const createProduct = async (req, res) => {
  const { name, price } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: "Name and price required" });
  }

  const product = await Product.create({ name, price });
  res.status(201).json(product);
};

export const getProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

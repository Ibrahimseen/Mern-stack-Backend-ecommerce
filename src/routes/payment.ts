import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import {
  AllCoupon,
  applyDiscount,
  createPaymentIntent,
  deleteCoupon,
  newcoupon,
} from "../controllers/payment.js";

const app = express.Router();


// route - /api/v1/payment/create
app.post("/create", createPaymentIntent);


// route - /api/v1/payment/coupon/new
app.post("/coupon/new", adminOnly, newcoupon);

// route - /api/v1/payment/coupon/discount
app.get("/discount", applyDiscount);

// route - /api/v1/payment/all/coupon
app.get("/all/coupon", adminOnly, AllCoupon);

// route - /api/v1/payment/coupon/:id
app.delete("/coupon/:id", adminOnly, deleteCoupon);
export default app;

import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount) return next(new ErrorHandler("Please Enter Amount ", 400));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "inr",
  });

  return res.status(201).json({
    sucess: true,
    clientSecret: paymentIntent.client_secret,
  });
});

export const newcoupon = TryCatch(async (req, res, next) => {
  const { coupon, amount } = req.body;

  if (!amount || !coupon)
    return next(new ErrorHandler("Please Enter Coupon Code or Amount ", 400));

  await Coupon.create({ code: coupon, amount });

  return res.status(201).json({
    sucess: true,
    message: `Coupon Created (${coupon})  Successfuly`,
  });
});

export const applyDiscount = TryCatch(async (req, res, next) => {
  const { coupon } = req.query;

  const discount = await Coupon.findOne({ code: coupon });

  if (!discount) {
    return next(new ErrorHandler("Please Enter a Valid Coupon Code", 400));
  }

  if (discount.used) {
    return next(new ErrorHandler("This coupon has already been used", 400));
  }

  discount.used = true;
  await discount.save();

  return res.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

export const AllCoupon = TryCatch(async (req, res, next) => {
  const coupon = await Coupon.find();

  if (!coupon) {
    return next(new ErrorHandler("Coupon does't Exist", 400));
  }

  return res.status(200).json({
    success: true,
    coupon,
  });
});

export const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const coupon = await Coupon.findByIdAndDelete(id);

  if (!coupon) return next(new ErrorHandler("Coupon does't Exist", 404));

  return res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} Deleted Succesfully`,
  });
});

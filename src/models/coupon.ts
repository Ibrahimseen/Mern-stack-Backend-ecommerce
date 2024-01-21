import mongoose from "mongoose";

const schema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, "please Enter Coupon code"],
    unique: true,
  },
  amount: {
    type: Number,
    required: [true, "please Enter The Discount Amount"],
  },
  used:{
  },
});

export const Coupon = mongoose.model("Coupon", schema);

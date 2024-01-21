import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import {
  calculatePercentage,
  getChartData,
  getInventaries,
} from "../utils/features.js";

export const getDashboardstats = TryCatch(async (req, res, next) => {
  let stats = {};
  const key = "admin-stats";

  if (myCache.has(key)) stats = JSON.parse(myCache.get(key) as string);
  else {
    const today = new Date();

    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthProductsPromise = await Product.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const LastMonthProductsPromise = await Product.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    //for User

    const thisMonthUsersPromise = await User.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const LastMonthUsersPromise = await User.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });
    // fro Orders

    const thisMonthOrdersPromise = await Order.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const LastMonthOrdersPromise = await Order.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const LastSixMonthOrdersPromise = await Order.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    });
    const latestTransactionPromise = Order.find({})
      .select(["orderItems", "discount", "total", "status"])
      .limit(4);

    const [
      thisMonthProducts,
      LastMonthProducts,
      thisMonthUsers,
      LastMonthUsers,
      thisMonthOrders,
      LastMonthOrders,
      ProductsCount,
      userCount,
      allOrders,
      LastSixMonthOrders,
      categories,
      FemaleUsersCount,
      latestTransaction,
    ] = await Promise.all([
      thisMonthProductsPromise,
      LastMonthProductsPromise,
      thisMonthUsersPromise,
      LastMonthUsersPromise,
      thisMonthOrdersPromise,
      LastMonthOrdersPromise,
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({}).select("total"),
      LastSixMonthOrdersPromise,
      Product.distinct("category"),
      User.countDocuments({ gender: "female" }),
      latestTransactionPromise,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );
    const lastMonthRevenue = LastMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const changePercent = {
      revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
      Product: calculatePercentage(
        thisMonthProducts.length,
        LastMonthProducts.length
      ),
      User: calculatePercentage(thisMonthUsers.length, LastMonthUsers.length),

      Order: calculatePercentage(
        thisMonthOrders.length,
        LastMonthOrders.length
      ),
    };

    const revenue = allOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );
    const count = {
      revenue,
      user: userCount,
      product: ProductsCount,
      Order: allOrders.length,
    };

    const orderMonthCounts = getChartData({
      length: 6,
      today,
      docArr: LastSixMonthOrders,
    });
    const orderMonthlyRevenue = getChartData({
      length: 6,
      today,
      docArr: LastSixMonthOrders,
      property: "total",
    });

    const categoryCount = await getInventaries({ categories, ProductsCount });

    const genderRatio = {
      male: userCount - FemaleUsersCount,
      female: FemaleUsersCount,
    };

    const modifiedLatestTransaction = latestTransaction.map((i) => ({
      _id: i._id,
      discount: i.discount,
      amount: i.total,
      quantity: i.orderItems.length,
      status: i.status,
    }));
    stats = {
      categoryCount,
      changePercent,
      count,
      chart: {
        order: orderMonthCounts,
        revenue: orderMonthlyRevenue,
      },
      genderRatio,
      latestTransaction: modifiedLatestTransaction,
    };
    myCache.set(key, JSON.stringify(stats));
  }

  return res.status(200).json({
    success: true,
    stats,
  });
});

export const getPieCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-pie-chart";
  if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
  else {
    const allOrdersPromise = Order.find({}).select([
      "total",
      "discount",
      "subtotal",
      "tax",
      "shippingCharges ",
    ]);
    const [
      ProcessingOrder,
      shippedOrder,
      deliverdOrder,
      categories,
      ProductsCount,
      outOfStock,
      allOrders,
      allUser,
      adminUser,
      customerUsers,
    ] = await Promise.all([
      Order.countDocuments({ status: "Processing" }),
      Order.countDocuments({ status: "shipped" }),
      Order.countDocuments({ status: "deliverd" }),
      Product.distinct("category"),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      allOrdersPromise,
      User.find({}).select(["dob"]),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
    ]);

    const orderFullFilment = {
      processing: ProcessingOrder,
      shipped: shippedOrder,
      deliverd: deliverdOrder,
    };

    const productCategories = await getInventaries({
      categories,
      ProductsCount,
    });

    const stockAvalibity = {
      InStock: ProductsCount - outOfStock,
      outOfStock,
    };

    const grossIncome = allOrders.reduce(
      (prev, order) => prev + (order.total || 0),
      0
    );

    const discount = allOrders.reduce(
      (prev, order) => prev + (order.discount || 0),
      0
    );

    const productionCost = allOrders.reduce(
      (prev, order) => prev + (order.shippingCharges || 0),
      0
    );

    const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);

    const MarketingCoast = Math.round(grossIncome * (30 / 100));

    const netMargin =
      grossIncome - discount - productionCost - burnt - MarketingCoast;

    const RevenueDistributions = {
      netMargin,
      discount,
      productionCost,
      burnt,
      MarketingCoast,
    };

    const adminCustomer = {
      admin: adminUser,
      customer: customerUsers,
    };
    const usersAgeGroup = {
      teen: allUser.filter((i) => i.age < 20).length,
      adult: allUser.filter((i) => i.age >= 20 && i.age < 40).length,
      old: allUser.filter((i) => i.age >= 40).length,
    };

    charts = {
      orderFullFilment,
      productCategories,
      stockAvalibity,
      RevenueDistributions,
      adminCustomer,
      usersAgeGroup,
    };
    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getBarCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-bar-charts";

  if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
  else {
    const today = new Date();

    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);

    const twelveMonthAgo = new Date();
    twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12);

    const SixMonthProductsPromise = await Product.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const SixMonthUserPromise = await User.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const twelveMonthOrderPromise = await Order.find({
      createdAt: {
        $gte: twelveMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const [products, users, orders] = await Promise.all([
      SixMonthProductsPromise,
      SixMonthUserPromise,
      twelveMonthOrderPromise,
    ]);

    const productCount = getChartData({ length: 6, today, docArr: products });
    const userCount = getChartData({ length: 6, today, docArr: users });
    const OrderCount = getChartData({ length: 12, today, docArr: orders });

    charts = {
      users: userCount,
      product: productCount,
      order: OrderCount,
    };

    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getLineCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-line-charts";

  if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
  else {
    const today = new Date();

    const twelveMonthAgo = new Date();
    twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12);

    const baseQuery = {
      createdAt: {
        $gte: twelveMonthAgo,
        $lte: today,
      },
    };
    const [products, users, orders] = await Promise.all([
      Product.find(baseQuery).select("createdAt"),
      User.find(baseQuery).select("createdAt"),
      Order.find(baseQuery).select(["createdAt", "discount", "total"]),
    ]);

    const productCount = getChartData({ length: 12, today, docArr: products });
    const userCount = getChartData({ length: 12, today, docArr: users });
    const discount = getChartData({
      length: 12,
      today,
      docArr: orders,
      property: "discount",
    });

    const revenue = getChartData({
      length: 12,
      today,
      docArr: orders,
      property: "total",
    });

    charts = {
      users: userCount,
      product: productCount,
      discount,
      revenue,
    };

    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});

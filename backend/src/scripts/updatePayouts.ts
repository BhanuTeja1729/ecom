import '../config/env';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Order } from '../models/Order';
import { getSettingValue } from '../models/Setting';

async function run() {
  try {
    await connectDB();
    const flatPayout = await getSettingValue('flatDeliveryPayout', 50);
    console.log(`Using active flat delivery payout: ₹${flatPayout}`);

    const orders = await Order.find({});
    console.log(`Found ${orders.length} orders to inspect.`);

    let updatedCount = 0;
    for (const order of orders) {
      let changed = false;

      if (order.deliveryDistanceKm === undefined || order.deliveryDistanceKm === null) {
        order.deliveryDistanceKm = 5.0;
        changed = true;
      }

      if (order.deliveryPayout === undefined || order.deliveryPayout === null || order.deliveryPayout !== flatPayout) {
        order.deliveryPayout = flatPayout;
        changed = true;
      }

      if (changed) {
        await order.save();
        updatedCount++;
        console.log(`Updated Order #${order.orderNumber}: distance = ${order.deliveryDistanceKm} km, payout = ₹${order.deliveryPayout}`);
      }
    }

    console.log(`Successfully updated ${updatedCount} orders.`);
  } catch (err) {
    console.error('Error updating order payouts:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

run();

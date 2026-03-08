import bot from '../bot.js';
import express from 'express';
import bodyParser from 'body-parser';
import db from '../db/index.js';
import { markBookingPaid, getBookingWithDetails } from './bookingService.js';

const router = express.Router();
router.use(bodyParser.json());

// POST /payment/webhook
// Тело: { bookingId: number, paymentId: string, amount: number }
router.post('/webhook', async (req, res) => {
  try {
    const { bookingId, paymentId, amount } = req.body;
    if (!bookingId || !paymentId) return res.status(400).send({ ok: false, error: 'Missing fields' });

    // получаем детали брони
    const details = await getBookingWithDetails(bookingId);

    // уведомление админу
    const adminMsg = `Оплата получена\nИмя: ${details.first_name}\nTG: @${details.username || 'нет'}\nДата: ${details.date}\nВремя: ${details.time}\nСумма: ${amount || 'не указана'}`;

    await markBookingPaid(bookingId, paymentId);
    await bot.telegram.sendMessage(process.env.ADMIN_ID, adminMsg);

  

    // сохраняем уведомление в БД не нужно, отправим через bot в index.js

    res.send({ ok: true, adminMsg, bookingId });
  } catch (e) {
    console.error('webhook error', e);
    res.status(500).send({ ok: false, error: e.message });
  }
});

export default router;

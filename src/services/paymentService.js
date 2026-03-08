import { LESSON_PRICE_TRIAL } from '../config.js';

export default {
  async createPaymentUrl({ bookingId, amount = LESSON_PRICE_TRIAL, description = 'Пробное занятие' }) {
    // тестовый режим: генерируем фиктивный paymentId и ссылку
    const paymentId = `test_${Date.now()}_${bookingId}`;
    const payUrl = `https://example.com/pay?paymentId=${paymentId}&amount=${amount}`;
    return { paymentId, payUrl };
  }
};

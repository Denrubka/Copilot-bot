// src/scenes/bookingScene.js
import { Scenes, Markup } from 'telegraf';
import { getAvailableDates, getAvailableTimesForDate } from '../services/slotsService.js';
import { createBooking } from '../services/bookingService.js';
import paymentService from '../services/paymentService.js'; // <- прямой импорт
import { LESSON_PRICE_TRIAL } from '../config.js';
import db from '../db/index.js';
import { getBookingWithDetails } from '../services/bookingService.js';

const Booking = new Scenes.WizardScene(
  'BOOKING',

  async (ctx) => {
    const dates = await getAvailableDates();
    if (!dates.length) {
      await ctx.reply('Свободных дат пока нет.');
      return ctx.scene.leave();
    }
    const buttons = dates.map(d => [Markup.button.callback(`${d.date} (${d.count})`, `book_date_${d.date}`)]);
    const msg = await ctx.reply('Выберите дату для пробного занятия:', Markup.inlineKeyboard(buttons));
    ctx.wizard.state.messageId = msg.message_id;
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery) return ctx.answerCbQuery('Нажмите кнопку с датой.');
    await ctx.answerCbQuery();
    const date = ctx.callbackQuery.data.replace('book_date_', '');
    ctx.wizard.state.date = date;

    const times = await getAvailableTimesForDate(date);
    if (!times.length) {
      await ctx.editMessageText('На эту дату нет свободных слотов.');
      return ctx.scene.leave();
    }

    const buttons = times.map(t => [Markup.button.callback(t.time, `book_time_${t.id}`)]);
    await ctx.editMessageText(`Дата: ${date}\nВыберите время:`, Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery) return ctx.answerCbQuery('Нажмите кнопку с временем.');
    await ctx.answerCbQuery();
    const slotId = Number(ctx.callbackQuery.data.replace('book_time_', ''));
    ctx.wizard.state.slotId = slotId;

    // после выбора слота
    try {
      // createBooking теперь возвращает { id, type }
      const booking = await createBooking(ctx.from.id, slotId);

      // создаём платёжную ссылку
      const { paymentId, payUrl } = await paymentService.createPaymentUrl({
        bookingId: booking.id,
        amount: LESSON_PRICE_TRIAL,
        description: 'Пробное занятие 30 минут'
      });

      // сохраняем paymentId в booking
      const db = await import('../db/index.js').then(m => m.default);
      db.run('UPDATE bookings SET payment_id = ? WHERE id = ?', [paymentId, booking.id]);

      // получаем полные детали брони из БД (включая type)
      const details = await getBookingWithDetails(booking.id);

      // уведомляем пользователя
      await ctx.editMessageText(`Слот забронирован. Оплатите в течение 15 минут:\n${payUrl}`);

      // уведомляем админа — используем данные из details и явно указываем type
      const adminText = `Новая запись:\nИмя: ${details.first_name}\nTG: @${details.username || 'нет'}\nДата: ${details.date}\nВремя: ${details.time}\nТип: ${details.type}\nBookingId: ${booking.id}\nСтатус: pending_payment`;
      await ctx.telegram.sendMessage(ctx.config.ADMIN_ID, adminText);

      return ctx.scene.leave();
    } catch (e) {
      await ctx.reply(`Не удалось создать бронь: ${e.message}`);
      return ctx.scene.leave();
    }
  }
);

export default Booking;

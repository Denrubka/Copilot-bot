import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { BOT_TOKEN, ADMIN_ID, CANCELLATION_DEADLINE_HOURS } from './config.js';

import { getUserBookings, cancelBooking, getBookingById } from './services/bookingService.js';

import {mainMenuKeyboard} from './keyboards/mainMenu.js';

import Onboarding from './scenes/onboardingScene.js';
import BookingScene from './scenes/bookingScene.js';

import paymentService from './services/paymentService.js';
import * as rateLimitService from './services/rateLimitService.js';
import adminService from './services/adminService.js';

import {formatDateTime} from './utils/dateUtils.js';

const bot = new Telegraf(BOT_TOKEN);

const stage = new Scenes.Stage([Onboarding, BookingScene]);

bot.use(session());

// добавляем сервисы в контекст
bot.use((ctx, next) => {
  ctx.config = { ADMIN_ID };
  ctx.paymentService = paymentService;
  ctx.rateLimitService = rateLimitService;
  ctx.adminService = adminService;
  return next();
});

bot.use(stage.middleware());

// Кнопка "Мои записи"
bot.hears('Мои записи', async (ctx) => {
  const bookings = await getUserBookings(ctx.from.id);
  if (!bookings.length) {
    return ctx.reply('У вас пока нет записей.');
  }

  for (const b of bookings) {
    const pretty = formatDateTime(b.date, b.time);
    const text = `Запись #${b.id}\nДата и время: ${pretty}\nТип: ${b.type}\nСтатус: ${b.status}`;
    const canCancel = (b.status === 'paid' || b.status === 'pending_payment') && b.type !== 'trial';
    const buttons = [];
    if (canCancel) buttons.push(Markup.button.callback('Отменить', `cancel_${b.id}`));
    // если нет кнопок — отправляем просто текст
    if (buttons.length) {
      await ctx.reply(text, Markup.inlineKeyboard([buttons]));
    } else {
      await ctx.reply(text);
    }
  }
});

// Обработчик отмены по callback
bot.action(/cancel_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const bookingId = Number(ctx.match[1]);

  const booking = await getBookingById(bookingId);
  if (!booking) return ctx.reply('Бронь не найдена.');

  // проверяем, что пользователь — владелец
  if (booking.telegram_id !== ctx.from.id) return ctx.reply('Вы не можете отменить эту запись.');

  // нельзя отменять пробное занятие
  if (booking.type === 'trial') return ctx.reply('Пробное занятие отменить нельзя.');

  // проверяем дедлайн отмены
  const start = new Date(`${booking.date}T${booking.time}:00`);
  const now = new Date();
  const hoursLeft = (start - now) / (1000 * 60 * 60);
  if (hoursLeft < CANCELLATION_DEADLINE_HOURS) {
    return ctx.reply(`Отмена возможна не позднее чем за ${CANCELLATION_DEADLINE_HOURS} часов до занятия.`);
  }

  const ok = await cancelBooking(bookingId);
  if (!ok) return ctx.reply('Не удалось отменить бронь. Попробуйте позже.');

  // обновляем сообщение в чате пользователя (если это callback от inline)
  try {
    await ctx.editMessageText(`Запись #${bookingId} отменена.`);
  } catch {}

  // уведомляем админа
  await ctx.telegram.sendMessage(
    ctx.config.ADMIN_ID,
    `Пользователь отменил запись:\nИмя: ${booking.first_name}\nTG: @${booking.username || 'нет'}\nДата: ${booking.date}\nВремя: ${booking.time}\nBookingId: ${bookingId}`
  );
});

// старт
bot.start((ctx) => ctx.scene.enter('ONBOARDING'));

// кнопки
bot.hears('Записаться на занятие', (ctx) => ctx.scene.enter('BOOKING'));
bot.hears('Главное меню', (ctx) => ctx.reply('Главное меню:', mainMenuKeyboard));

export default bot;

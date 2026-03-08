// src/config.js
import 'dotenv/config';

export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const ADMIN_ID = Number(process.env.ADMIN_ID || 0);

// рабочие дни и часы для генерации слотов
// getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
export const WORK_DAYS = [1, 2, 3, 4, 5]; // понедельник-пятница

// рабочие часы: start включительно, end не включительно
export const WORK_HOURS = { start: 10, end: 14 }; // 10:00 - 13:59

// цена пробного занятия
export const LESSON_PRICE_TRIAL = Number(process.env.LESSON_PRICE_TRIAL || 500);

// таймауты и другие настройки
export const BOOKING_HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 1);
export const CANCELLATION_DEADLINE_HOURS = Number(process.env.CANCELLATION_DEADLINE_HOURS || 24);

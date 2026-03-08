import { Telegraf } from 'telegraf';
import db from './src/db/index.js';
import { startNotifications, startExpirationWatcher } from './src/services/notificationService.js';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// -------------------------------
// 1. ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
// -------------------------------

function initDatabase(callback) {
  console.log('Initializing database...');

  db.serialize(() => {
    // Создание таблиц, если их нет
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        first_name TEXT,
        username TEXT
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        time TEXT
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        slot_id INTEGER,
        type TEXT,
        status TEXT,
        expires_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(slot_id) REFERENCES slots(id)
      )`,
      (err) => {
        if (err) {
          console.error('DB init error:', err);
          return;
        }

        console.log('Database initialized successfully');
        callback(); // запускаем бота и cron только после создания таблиц
      }
    );
  });
}

// -------------------------------
// 2. ЗАПУСК БОТА И CRON ПОСЛЕ ИНИЦИАЛИЗАЦИИ БД
// -------------------------------

initDatabase(() => {
  console.log('Starting services...');

  // Cron-сервисы
  startNotifications(bot);
  startExpirationWatcher(bot);

  // Запуск бота
  bot.launch()
    .then(() => console.log('Bot started'))
    .catch(err => console.error('Bot launch error:', err));
});

// -------------------------------
// 3. ГРАЦИОЗНОЕ ЗАВЕРШЕНИЕ
// -------------------------------

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

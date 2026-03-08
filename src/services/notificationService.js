import cron from 'node-cron';
import db from '../db/index.js';

// Проверка существования таблицы
function tableExists(tableName, callback) {
  db.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName],
    (err, row) => {
      if (err) return callback(false);
      callback(!!row);
    }
  );
}

export const startNotifications = (bot) => {
  // запускаем cron каждую минуту
  cron.schedule('* * * * *', async () => {

    tableExists('bookings', (exists) => {
      if (!exists) {
        console.warn('Bookings table not ready yet, skipping notifications tick');
        return;
      }

      // ищем оплаченные брони, у которых ещё не отправлены уведомления
    db.all(
      `SELECT b.id, b.notify_24h, b.notify_1h, b.notify_15m, s.date, s.time, u.telegram_id
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.user_id
       WHERE b.status = 'paid'`,
      [],
      async (err, rows) => {
        if (err || !rows) return;
        const now = new Date();
        for (const r of rows) {
          const start = new Date(`${r.date}T${r.time}:00`);
          const diff = (start - now) / 1000; // seconds

          // 24h
          if (diff <= 24 * 3600 && diff > 23 * 3600 && !r.notify_24h) {
            await bot.telegram.sendMessage(r.telegram_id, `Напоминание: занятие через 24 часа. Ссылка: ${await getLessonLink()}`);
            db.run('UPDATE bookings SET notify_24h = 1 WHERE id = ?', [r.id]);
          }

          // 1h
          if (diff <= 3600 && diff > 3500 && !r.notify_1h) {
            await bot.telegram.sendMessage(r.telegram_id, `Напоминание: занятие через 1 час. Ссылка: ${await getLessonLink()}`);
            db.run('UPDATE bookings SET notify_1h = 1 WHERE id = ?', [r.id]);
          }

          // 15m
          if (diff <= 15 * 60 && diff > 14 * 60 && !r.notify_15m) {
            await bot.telegram.sendMessage(r.telegram_id, `Напоминание: занятие через 15 минут. Ссылка: ${await getLessonLink()}`);
            db.run('UPDATE bookings SET notify_15m = 1 WHERE id = ?', [r.id]);
          }
        }
      }
    );

    })
  });
};

export const startExpirationWatcher = (bot) => {
  console.log('Expiration watcher started');

  //
  // 🔥 1. Проверка истёкших броней (каждую минуту)
  //
  cron.schedule('* * * * *', () => {
    console.log('Cron tick', new Date().toISOString());
    console.log('Running SQL check for expired bookings...');

    tableExists('bookings', (exists) => {
      if (!exists) {
        console.warn('Bookings table not ready yet, skipping expiration tick');
        return;
      }

      db.all(
        `SELECT 
            b.id, 
            b.user_id, 
            b.slot_id, 
            b.type,
            b.expires_at, 
            s.date, 
            s.time, 
            u.telegram_id, 
            u.first_name, 
            u.username
         FROM bookings b
         JOIN slots s ON s.id = b.slot_id
         JOIN users u ON u.id = b.user_id
         WHERE b.status = 'pending_payment'
           AND b.expires_at <= datetime('now')`,
        [],
        async (err, rows) => {
          if (err) {
            console.error('SQL ERROR:', err);
            return;
          }

          console.log('SQL rows:', rows);

          if (!rows.length) return;

          for (const r of rows) {
            const isTrial = r.type === 'trial';
            const icon = isTrial ? '🔵🎓' : '🟢📘';
            const typeLabel = isTrial ? 'Пробный урок' : 'Обычный урок';

            // Обновляем статус
            db.run(`UPDATE bookings SET status = 'expired' WHERE id = ?`, [r.id]);

            //
            // 🔔 Уведомление пользователю
            //
            try {
              await bot.telegram.sendMessage(
                r.telegram_id,
                `${icon} *Время на оплату истекло*\n\n` +
                `Ваша бронь:\n` +
                `📅 *${r.date}*\n` +
                `⏰ *${r.time}*\n` +
                `📘 Тип: *${typeLabel}*\n\n` +
                `была отменена, так как оплата не поступила вовремя.`,
                { parse_mode: 'Markdown' }
              );
            } catch (e) {
              console.error('User notify error:', e);
            }

            //
            // 🔔 Уведомление админу
            //
            try {
              await bot.telegram.sendMessage(
                process.env.ADMIN_ID,
                `❌ *Бронь истекла (не оплачена)*\n\n` +
                `${icon} *${typeLabel}*\n\n` +
                `👤 Пользователь: *${r.first_name}* (@${r.username || 'нет'})\n` +
                `📅 Дата: *${r.date}*\n` +
                `⏰ Время: *${r.time}*\n` +
                `🆔 Booking ID: *${r.id}*\n\n` +
                `⏳ Причина: время на оплату истекло`,
                { parse_mode: 'Markdown' }
              );
            } catch (e) {
              console.error('Admin notify error:', e);
            }
          }
        }
      );
    });
  });

  //
  // 🧹 2. Автоматическая очистка старых expired броней (каждый день в 03:00)
  //
  cron.schedule('0 3 * * *', () => {
    console.log('Running cleanup of old expired bookings...');

    tableExists('bookings', (exists) => {
      if (!exists) {
        console.warn('Bookings table not ready yet, skipping cleanup');
        return;
      }

      db.run(
        `DELETE FROM bookings 
         WHERE status = 'expired'
           AND expires_at <= datetime('now', '-7 days')`,
        function (err) {
          if (err) {
            console.error('Cleanup ERROR:', err);
            return;
          }

          console.log(`Cleanup complete. Removed rows: ${this.changes}`);
        }
      );
    });
  });
};

async function getLessonLink() {
  return new Promise((res) => {
    db.get('SELECT value FROM settings WHERE key = "lesson_link"', (_, row) => res(row?.value || 'https://example.com/lesson'));
  });
}

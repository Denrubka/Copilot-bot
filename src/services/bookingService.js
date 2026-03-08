import db from '../db/index.js';
import {BOOKING_HOLD_MINUTES} from '../config.js';

// helper: проверяет, был ли у пользователя пробный урок (любая запись type='trial')
const userHadTrial = (userId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT 1 FROM bookings WHERE user_id = ? AND type = 'trial' LIMIT 1`,
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });

export const createBooking = (telegramId, slotId) =>
  new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE telegram_id = ?', [telegramId], async (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('User not found'));

      // проверка, что слот свободен
      db.get(
        `SELECT b.id FROM bookings b WHERE b.slot_id = ? AND b.status IN ('pending_payment','paid')`,
        [slotId],
        async (err2, row) => {
          if (err2) return reject(err2);
          if (row) return reject(new Error('Slot already booked'));

          try {
            const hadTrial = await userHadTrial(user.id);
            const type = hadTrial ? 'regular' : 'trial';

            // вычисляем expires_at
            const expiresAt = new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000)
              .toISOString()
              .replace('T', ' ')
              .slice(0, 19); // 'YYYY-MM-DD HH:MM:SS' — sqlite совместимый

            db.run(
              `INSERT INTO bookings (user_id, slot_id, type, status, expires_at)
              VALUES (?, ?, ?, 'pending_payment', datetime('now', '+${BOOKING_HOLD_MINUTES} minutes'))`,
              [user.id, slotId, type],
              function (err3) {
                if (err3) return reject(err3);
                const bookingId = this.lastID;
                
                resolve({ id: bookingId, type, expires_at: expiresAt });
              }
            );
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  });

export const markBookingPaid = (bookingId, paymentId) =>
  new Promise((resolve, reject) => {
    db.run(
      `UPDATE bookings SET status='paid', payment_id=? WHERE id=?`,
      [paymentId, bookingId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

export const getBookingWithDetails = (bookingId) =>
new Promise((resolve, reject) => {
  db.get(
    `SELECT b.*, s.date, s.time, u.telegram_id, u.first_name, u.username
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      JOIN users u ON u.id = b.user_id
      WHERE b.id = ?`,
    [bookingId],
    (err, row) => {
      if (err) return reject(err);
      resolve(row);
    }
  );
});

// Возвращает массив броней пользователя
export const getUserBookings = (telegramId) =>
  new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE telegram_id = ?', [telegramId], (err, user) => {
      if (err) return reject(err);
      if (!user) return resolve([]);
      db.all(
        `SELECT b.id, b.type, b.status, s.date, s.time, b.created_at
         FROM bookings b
         JOIN slots s ON s.id = b.slot_id
         WHERE b.user_id = ?
         ORDER BY s.date, s.time`,
        [user.id],
        (err2, rows) => {
          if (err2) return reject(err2);
          resolve(rows || []);
        }
      );
    });
});

// Отмена брони (статус -> cancelled), возвращает true/false
export const cancelBooking = (bookingId) =>
  new Promise((resolve, reject) => {
    db.run(
      `UPDATE bookings SET status='cancelled' WHERE id = ? AND status != 'cancelled'`,
      [bookingId],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      }
    );
  });

// Получить бронь с деталями (включая user и slot)
export const getBookingById = (bookingId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT b.*, s.date, s.time, u.telegram_id, u.first_name, u.username
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
      [bookingId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
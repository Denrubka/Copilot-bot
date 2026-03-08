import db from '../db/index.js';
import { WORK_DAYS, WORK_HOURS } from '../config.js';
import { addDays, formatISODate, formatTime } from '../utils/dateUtils.js';

export const generateSlotsForTwoWeeks = async () => {
  const today = new Date();
  const days = 14;

  db.serialize(() => {
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i);
      const weekday = d.getDay(); // 0-6
      if (!WORK_DAYS.includes(weekday)) continue;

      for (let hour = WORK_HOURS.start; hour < WORK_HOURS.end; hour++) {
        const date = formatISODate(d);
        const time = formatTime(hour, 0);
        db.run(
          `INSERT OR IGNORE INTO slots (date, time, is_active) VALUES (?, ?, 1)`,
          [date, time]
        );
      }
    }
  });
};

export const getAvailableDates = () =>
  new Promise((resolve, reject) => {
    db.all(
      `SELECT date, COUNT(*) as count
       FROM slots s
       LEFT JOIN bookings b ON b.slot_id = s.id AND b.status IN ('pending_payment','paid')
       WHERE s.is_active = 1
         AND date(s.date) > date('now')
         AND b.id IS NULL
       GROUP BY date
       ORDER BY date`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });

export const getAvailableTimesForDate = (date) =>
  new Promise((resolve, reject) => {
    db.all(
      `SELECT s.id, s.time
       FROM slots s
       LEFT JOIN bookings b ON b.slot_id = s.id AND b.status IN ('pending_payment','paid')
       WHERE s.date = ?
         AND s.is_active = 1
         AND b.id IS NULL
       ORDER BY s.time`,
      [date],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
  generateSlotsForTwoWeeks()
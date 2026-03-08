// src/db/repositories/usersRepo.js
import db from '../index.js';

export const findOrCreateUser = (tgUser) =>
  new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE telegram_id = ?',
      [tgUser.id],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row);

        db.run(
          `INSERT INTO users (telegram_id, username, first_name)
           VALUES (?, ?, ?)`,
          [tgUser.id, tgUser.username || null, tgUser.first_name || null],
          function (err2) {
            if (err2) return reject(err2);
            db.get(
              'SELECT * FROM users WHERE id = ?',
              [this.lastID],
              (err3, newRow) => {
                if (err3) return reject(err3);
                resolve(newRow);
              }
            );
          }
        );
      }
    );
  });

export const updateUserProfile = (telegramId, data) =>
  new Promise((resolve, reject) => {
    const { age_group, goal, level } = data;
    db.run(
      `UPDATE users
       SET age_group = ?, goal = ?, level = ?
       WHERE telegram_id = ?`,
      [age_group, goal, level, telegramId],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });

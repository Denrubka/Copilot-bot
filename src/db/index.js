// src/db/index.js
import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

const dbFile = path.join(process.cwd(), 'data.sqlite');
const db = new sqlite3.Database(dbFile);

db.all("PRAGMA table_info(bookings)", (err, columns) => {
  const hasExpires = columns.some(c => c.name === 'expires_at');
  if (!hasExpires) {
    db.run("ALTER TABLE bookings ADD COLUMN expires_at DATETIME");
  }
});

const migrations = readFileSync(
  path.join(process.cwd(), 'src/db/migrations.sql'),
  'utf8'
);

db.serialize(() => {
  db.exec(migrations);
});

export default db;

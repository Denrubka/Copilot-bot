import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

const dbFile = path.join(process.cwd(), 'data.sqlite');
const db = new sqlite3.Database(dbFile);

export function runMigrations() {
  const migrations = readFileSync(
    path.join(process.cwd(), 'src/db/migrations.sql'),
    'utf8'
  );

  db.serialize(() => {
    db.exec(migrations, (err) => {
      if (err) console.error('Migration error:', err);
      else console.log('Migrations applied');
    });
  });
}

export default db;

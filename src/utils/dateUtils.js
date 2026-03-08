export const addDays = (d, days) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
};

export const formatISODate = (d) => d.toISOString().slice(0, 10);

export const formatTime = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

export const formatDateTime = (dateStr, timeStr) => {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
  try {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    return dt.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return `${dateStr} ${timeStr}`;
  }
};
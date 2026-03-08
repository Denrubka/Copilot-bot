import { Markup } from 'telegraf';

export const ageKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('До 18', 'age_under18')],
  [Markup.button.callback('18+', 'age_18plus')],
]);

export const goalKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Для себя', 'goal_self')],
  [Markup.button.callback('Для учебы', 'goal_study')],
]);

export const levelKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('C0', 'level_C0')],
  [Markup.button.callback('B1', 'level_B1')],
  [Markup.button.callback('B2', 'level_B2')],
]);
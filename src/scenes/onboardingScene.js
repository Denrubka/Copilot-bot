// src/scenes/onboardingScene.js
import { Scenes, Markup } from 'telegraf';
import { findOrCreateUser, updateUserProfile } from '../db/repositories/usersRepo.js';
import db from '../db/index.js';

const ageKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('До 18', 'age_under18')],
  [Markup.button.callback('18+', 'age_18plus')],
]);

const goalKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Для себя', 'goal_self')],
  [Markup.button.callback('Для учебы', 'goal_study')],
  [Markup.button.callback('Для путешествий', 'goal_travel')],
  [Markup.button.callback('Для экзамена', 'goal_exam')],
]);

const levelKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('C0', 'level_C0')],
  [Markup.button.callback('B1', 'level_B1')],
  [Markup.button.callback('B2', 'level_B2')],
]);

// Безопасная попытка редактирования сообщения; если не получится — отправляем новое
async function safeEdit(ctx, text, keyboard) {
  try {
    // если это callbackQuery — редактируем сообщение, на которое нажали кнопку
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      await ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
      return;
    }
    // если есть сохранённый messageId в состоянии — редактируем его
    if (ctx.wizard.state.messageId) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.wizard.state.messageId,
        undefined,
        text,
        { reply_markup: keyboard.reply_markup }
      );
      return;
    }
  } catch (e) {
    // игнорируем ошибку и отправляем новое сообщение ниже
  }

  // fallback: отправляем новое сообщение и сохраняем id
  const msg = await ctx.reply(text, keyboard);
  ctx.wizard.state.messageId = msg.message_id;
}

const onboarding = new Scenes.WizardScene(
  'ONBOARDING',

  // Шаг 1 — приветствие и первый вопрос
  async (ctx) => {
    await findOrCreateUser(ctx.from);

    const row = await new Promise((res) =>
      db.get('SELECT value FROM settings WHERE key="welcome_text"', (_, r) => res(r))
    );

    // отправляем приветствие как обычное сообщение (не редактируем)
    if (row?.value) await ctx.reply(row.value);

    // отправляем первый вопрос и сохраняем messageId
    const msg = await ctx.reply('Выбери возраст:', ageKeyboard);
    ctx.wizard.state.messageId = msg.message_id;

    return ctx.wizard.next();
  },

  // Шаг 2 — возраст -> цель
  async (ctx) => {
    // ожидаем callbackQuery
    if (!ctx.callbackQuery) {
      // если пользователь отправил текст — игнорируем и остаёмся на шаге
      return ctx.answerCbQuery?.('Пожалуйста, выберите вариант кнопкой.');
    }

    // подтверждаем callback, чтобы убрать "крутилку"
    await ctx.answerCbQuery();

    ctx.wizard.state.age_group = ctx.callbackQuery.data.replace('age_', '');

    // аккуратно редактируем то же сообщение
    await safeEdit(ctx, 'Какая цель обучения?', goalKeyboard);

    return ctx.wizard.next();
  },

  // Шаг 3 — цель -> уровень
  async (ctx) => {
    if (!ctx.callbackQuery) {
      return ctx.answerCbQuery?.('Пожалуйста, выберите вариант кнопкой.');
    }

    await ctx.answerCbQuery();

    ctx.wizard.state.goal = ctx.callbackQuery.data.replace('goal_', '');

    await safeEdit(ctx, 'Какой уровень английского?', levelKeyboard);

    return ctx.wizard.next();
  },

  // Шаг 4 — уровень -> завершение
  async (ctx) => {
    if (!ctx.callbackQuery) {
      return ctx.answerCbQuery?.('Пожалуйста, выберите вариант кнопкой.');
    }

    await ctx.answerCbQuery();

    ctx.wizard.state.level = ctx.callbackQuery.data.replace('level_', '');

    const { age_group, goal, level } = ctx.wizard.state;

    await updateUserProfile(ctx.from.id, { age_group, goal, level });

    // финально редактируем сообщение с благодарностью
    try {
      if (ctx.callbackQuery && ctx.callbackQuery.message) {
        await ctx.editMessageText('Готово! Профиль заполнен.');
      } else if (ctx.wizard.state.messageId) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          ctx.wizard.state.messageId,
          undefined,
          'Готово! Профиль заполнен.'
        );
      } else {
        await ctx.reply('Готово! Профиль заполнен.');
      }
    } catch (e) {
      await ctx.reply('Готово! Профиль заполнен.');
    }

    // отправляем главное меню как отдельное сообщение
    await ctx.reply('Главное меню:', Markup.keyboard([['Записаться на занятие'], ['Главное меню']]).resize());

    return ctx.scene.leave();
  }
);

export default onboarding;

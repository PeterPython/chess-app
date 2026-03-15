const express = require("express");
const { requireAuth } = require("../auth");
const { query } = require("../db");

const progressRouter = express.Router();

progressRouter.use(requireAuth);

progressRouter.get("/", async (req, res, next) => {
  try {
    const progressResult = await query(
      `
        select opening_id, side, strength, lessons, opening_attempts, opening_correct,
               off_book_events, completions, games_finished, wins, losses, draws
        from opening_progress
        where user_id = $1
      `,
      [req.user.sub],
    );

    const repetitionResult = await query(
      `
        select opening_id, side, due_at, interval_days, ease, streak, reviews, last_outcome
        from repetition_cards
        where user_id = $1
      `,
      [req.user.sub],
    );

    return res.json({
      progress: progressResult.rows,
      repetition: repetitionResult.rows,
    });
  } catch (error) {
    return next(error);
  }
});

progressRouter.put("/", async (req, res, next) => {
  try {
    const progress = Array.isArray(req.body.progress) ? req.body.progress : [];
    const repetition = Array.isArray(req.body.repetition) ? req.body.repetition : [];

    await query("begin");
    await query("delete from opening_progress where user_id = $1", [req.user.sub]);
    await query("delete from repetition_cards where user_id = $1", [req.user.sub]);

    for (const item of progress) {
      await query(
        `
          insert into opening_progress (
            user_id, opening_id, side, strength, lessons, opening_attempts, opening_correct,
            off_book_events, completions, games_finished, wins, losses, draws
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          req.user.sub,
          item.opening_id,
          item.side,
          item.strength,
          item.lessons || 0,
          item.opening_attempts || 0,
          item.opening_correct || 0,
          item.off_book_events || 0,
          item.completions || 0,
          item.games_finished || 0,
          item.wins || 0,
          item.losses || 0,
          item.draws || 0,
        ],
      );
    }

    for (const card of repetition) {
      await query(
        `
          insert into repetition_cards (
            user_id, opening_id, side, due_at, interval_days, ease, streak, reviews, last_outcome
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          req.user.sub,
          card.opening_id,
          card.side,
          card.due_at,
          card.interval_days || 0,
          card.ease || 2.5,
          card.streak || 0,
          card.reviews || 0,
          card.last_outcome || null,
        ],
      );
    }

    await query("commit");
    return res.json({ ok: true });
  } catch (error) {
    await query("rollback");
    return next(error);
  }
});

module.exports = { progressRouter };

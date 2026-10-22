import { z } from 'zod';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const lessonId = z.string().regex(/^l\d{1,3}$/);
const count = z.number().int().min(0).max(10_000_000);

/**
 * Схема прогресса, который присылает клиент. Известные поля проверяются строго,
 * неизвестные пропускаются: так старые и новые версии клиента совместимы.
 * Опыт и серия здесь — только для отображения; лига считается по xp_events.
 */
export const ProgressSchema = z
  .object({
    xp: count.optional(),
    streak: z.number().int().min(0).max(100_000).optional(),
    best: z.number().int().min(0).max(100_000).optional(),
    lastDay: day.nullable().optional(),
    days: z.array(day).max(400).optional(),
    done: z.record(lessonId, z.boolean()).refine((o) => Object.keys(o).length <= 500).optional(),
    hearts: z.number().int().min(0).max(5).optional(),
    heartsAt: z.number().int().min(0).optional(),
    goal: z.number().int().min(1).max(500).optional(),
    goalAt: z.number().int().min(0).optional(),
    onboarded: z.boolean().optional(),
    code: z.string().max(50_000).nullable().optional(),
    review: z.array(z.object({ l: lessonId, i: z.number().int().min(0).max(100) })).max(100).optional(),
    daily: z
      .object({
        date: day,
        xp: count,
        cmds: count,
        perfect: z.boolean(),
        claimed: z.record(z.string().max(32), z.boolean()),
      })
      .optional(),
    proj: z.record(z.string().max(32), z.record(z.string().max(4), z.boolean())).optional(),
  })
  .passthrough();

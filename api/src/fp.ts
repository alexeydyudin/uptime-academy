import type { FastifyInstance } from 'fastify';

/**
 * Минимальная замена fastify-plugin: помечает плагин как «не инкапсулированный»,
 * чтобы декораторы (requireUser, jwt) были видны во всех роутах.
 */
export default function fp<T extends (app: FastifyInstance) => Promise<void>>(fn: T): T {
  (fn as unknown as Record<symbol, boolean>)[Symbol.for('skip-override')] = true;
  return fn;
}

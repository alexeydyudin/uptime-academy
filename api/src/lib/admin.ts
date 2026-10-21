import { config } from '../config.js';
import { pool } from '../db.js';

/** Админ определяется по почте из ADMIN_EMAILS. */
export async function isAdmin(uid: number): Promise<boolean> {
  if (!config.adminEmails.length) return false;
  const r = await pool.query<{ email: string }>('select email from users where id = $1', [uid]);
  return !!r.rows[0] && config.adminEmails.includes(r.rows[0].email.toLowerCase());
}

// ============================================================================
//  Neon Postgres — підключення + прості хелпери під users/conversations/messages
// ============================================================================
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

// ─── users ────────────────────────────────────────────────────────────────
export async function findOrCreateUser(phone) {
  const admins = (process.env.ADMIN_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const isAdmin = admins.includes(phone);

  const existing = await sql`SELECT * FROM users WHERE phone = ${phone}`;
  if (existing.length) {
    // якщо номер згодом додали в ADMIN_PHONES — підтягуємо статус
    if (isAdmin && !existing[0].is_admin) {
      const updated = await sql`UPDATE users SET is_admin = TRUE WHERE id = ${existing[0].id} RETURNING *`;
      return updated[0];
    }
    return existing[0];
  }
  const created = await sql`
    INSERT INTO users (phone, is_admin) VALUES (${phone}, ${isAdmin}) RETURNING *
  `;
  return created[0];
}

export async function getUserById(id) {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] || null;
}

export async function listAllUsers() {
  return sql`
    SELECT u.*, COUNT(c.id)::int AS conversation_count
    FROM users u
    LEFT JOIN conversations c ON c.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;
}

// ─── conversations ───────────────────────────────────────────────────────
export async function listConversations(userId) {
  return sql`
    SELECT * FROM conversations WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
}

export async function createConversation(userId, title = "Нова розмова") {
  const rows = await sql`
    INSERT INTO conversations (user_id, title) VALUES (${userId}, ${title}) RETURNING *
  `;
  return rows[0];
}

export async function getConversation(id) {
  const rows = await sql`SELECT * FROM conversations WHERE id = ${id}`;
  return rows[0] || null;
}

export async function renameConversation(id, title) {
  await sql`UPDATE conversations SET title = ${title} WHERE id = ${id}`;
}

// ─── messages ────────────────────────────────────────────────────────────
export async function listMessages(conversationId) {
  return sql`
    SELECT * FROM messages WHERE conversation_id = ${conversationId} ORDER BY created_at ASC
  `;
}

export async function addMessage(conversationId, role, content) {
  const rows = await sql`
    INSERT INTO messages (conversation_id, role, content) VALUES (${conversationId}, ${role}, ${content}) RETURNING *
  `;
  return rows[0];
}

import { getUserIdFromReq } from "../../../../lib/auth";
import { getConversation, listMessages, addMessage, renameConversation, getUserById } from "../../../../lib/db";
import { runAgent } from "../../../../lib/agent";

// Дозволяємо доступ власнику розмови АБО адміну (read-only перегляд чужих чатів).
async function authorize(req, convId) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return { ok: false, status: 401, error: "Не авторизовано" };
  const conv = await getConversation(convId);
  if (!conv) return { ok: false, status: 404, error: "Розмову не знайдено" };
  if (conv.user_id === userId) return { ok: true, conv, isOwner: true };
  const me = await getUserById(userId);
  if (me?.is_admin) return { ok: true, conv, isOwner: false };
  return { ok: false, status: 403, error: "Нема доступу" };
}

export default async function handler(req, res) {
  try {
    const convId = Number(req.query.id);
    if (!convId) return res.status(400).json({ error: "Невірний ID розмови" });

    const auth = await authorize(req, convId);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    if (req.method === "GET") {
      const rows = await listMessages(convId);
      return res.status(200).json({ messages: rows });
    }

    if (req.method === "POST") {
      if (!auth.isOwner) return res.status(403).json({ error: "Тільки власник може писати в цю розмову" });
      const { content } = req.body || {};
      if (!content?.trim()) return res.status(400).json({ error: "Порожнє повідомлення" });

      // 1. зберігаємо user-повідомлення
      await addMessage(convId, "user", content.trim());

      // якщо це перше повідомлення — робимо заголовок з нього
      const existing = await listMessages(convId);
      if (existing.length === 1) {
        await renameConversation(convId, content.trim().slice(0, 60));
      }

      // 2. будуємо історію САМЕ ЦІЄЇ розмови для агента (ізоляція по conversation_id)
      const history = existing.map((m) => ({ role: m.role, content: m.content }));

      // 3. з цього моменту переходимо в режим SSE — живий трейс кроків агента.
      // ⚠️ Це НЕ знімає жорсткий ліміт Vercel (60 сек на Hobby) — функцію все
      // одно вб'ють на позначці 60с якщо агент не встигне. Але тепер юзер
      // бачить прогрес замість сліпого спінера, і якщо обірветься — видно на
      // якому кроці, а не просто "нічого не сталось".
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      const sseSend = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      let reply;
      try {
        reply = await runAgent(history, async (label) => sseSend("step", { label }));
      } catch (e) {
        sseSend("error", { error: `Агент впав: ${e.message}` });
        return res.end();
      }

      // 4. зберігаємо відповідь
      const saved = await addMessage(convId, "assistant", reply);
      sseSend("done", { message: saved });
      return res.end();
    }

    return res.status(405).json({ error: "Метод не підтримується" });
  } catch (e) {
    // Якщо SSE-заголовки вже пішли — нормальний res.json() тут неможливий,
    // шлемо помилку тим самим SSE-каналом. Інакше — звичайний JSON 500.
    console.error("messages.js handler crashed:", e);
    if (res.headersSent) {
      try { res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`); } catch {}
      return res.end();
    }
    return res.status(500).json({ error: `Внутрішня помилка: ${e.message}` });
  }
}

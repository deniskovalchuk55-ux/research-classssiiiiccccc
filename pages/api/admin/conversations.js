import { getUserIdFromReq } from "../../../lib/auth";
import { getUserById, listConversations } from "../../../lib/db";

export default async function handler(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: "Не авторизовано" });
  const me = await getUserById(userId);
  if (!me?.is_admin) return res.status(403).json({ error: "Тільки для адміна" });

  const targetUserId = Number(req.query.userId);
  if (!targetUserId) return res.status(400).json({ error: "Потрібен userId" });

  const conversations = await listConversations(targetUserId);
  return res.status(200).json({ conversations });
}

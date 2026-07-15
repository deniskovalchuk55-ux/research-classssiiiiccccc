import { getUserIdFromReq } from "../../../lib/auth";
import { listConversations, createConversation } from "../../../lib/db";

export default async function handler(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: "Не авторизовано" });

  if (req.method === "GET") {
    const rows = await listConversations(userId);
    return res.status(200).json({ conversations: rows });
  }

  if (req.method === "POST") {
    const conv = await createConversation(userId);
    return res.status(200).json({ conversation: conv });
  }

  return res.status(405).end();
}

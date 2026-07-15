import { getUserIdFromReq } from "../../../lib/auth";
import { getUserById } from "../../../lib/db";

export default async function handler(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ user: null });
  const user = await getUserById(userId);
  if (!user) return res.status(401).json({ user: null });
  return res.status(200).json({ user: { id: user.id, phone: user.phone, isAdmin: user.is_admin } });
}

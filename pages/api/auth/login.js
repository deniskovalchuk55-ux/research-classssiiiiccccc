import { findOrCreateUser } from "../../../lib/db";
import { createSessionCookie } from "../../../lib/auth";

// ⚠️ БЕЗ ПЕРЕВІРКИ — вхід просто по номеру телефону, без пароля/PIN.
// Це означає: будь-хто, хто знає адресу сайту, може ввести БУДЬ-ЯКИЙ номер
// (включно з чужим) і побачити розмови під ним. Немає жодного механізму,
// що підтверджує, що номер телефону справді належить людині, яка його ввела.
// Прийнятно для внутрішнього тесту з довіреною командою. НЕ для публічного
// доступу з чужими персональними даними — там потрібна реальна SMS-верифікація.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { phone } = req.body || {};

  if (!phone || !/^\+\d{8,15}$/.test(phone)) {
    return res.status(400).json({ error: "Введи номер у форматі +380XXXXXXXXX" });
  }

  try {
    const user = await findOrCreateUser(phone);
    const cookie = await createSessionCookie(user.id);
    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true, user: { id: user.id, phone: user.phone, isAdmin: user.is_admin } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

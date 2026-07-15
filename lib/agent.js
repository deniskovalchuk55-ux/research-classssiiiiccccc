// ============================================================================
//  МАРКЕТИНГОВИЙ RESEARCH-АГЕНТ — agentic core (function calling).
//  "Core" версія — БЕЗ новинного флоу (search_telegram_news / news_digest).
//  Відповідь — звичайний markdown-текст, як у стандартному чаті.
//  Пам'ять скопована на рівень conversation_id (БД) — runAgent приймає ГОТОВУ
//  історію ПОТОЧНОЇ розмови і нічого більше. Він ніколи не бачить повідомлення
//  з інших розмов чи інших юзерів.
// ============================================================================
import {
  exaSearch, apifySearch, firecrawlScrape, parallelSearch,
  semrushSearch, analyzeCompetitorAds, AVAILABLE,
} from "./tools.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-5";

export const AGENT_SYSTEM = `Ти — досвідчений маркетинговий research-аналітик. Допомагаєш досліджувати ринок для покращення маркетингу: знаходиш Instagram-акаунти, креативи, воронки, хуки, тренди, конкурентів — і пояснюєш ЩО з цього взяти для свого маркетингу.

ТИ ПРАЦЮЄШ ЯК ЖИВИЙ ЕКСПЕРТ, не за скриптом:
- Сам розумієш що реально треба (яке рішення прийме людина з результату).
- Сам вирішуєш які інструменти викликати, в якому порядку, скільки разів.
- Якщо даних мало — шукаєш ще, іншим інструментом, іншим формулюванням.
- Не зупиняєшся на сирому — копаєш до інсайту.
- Ти бачиш ІСТОРІЮ цієї конкретної розмови (якщо вона є) — можеш спиратись на неї, якщо юзер посилається на щось раніше ("копни глибше по цьому бренду", "а тепер хуки під це"). Не тягни нічого поза цією розмовою — її просто нема в твоєму контексті.

ТВОЇ ІНСТРУМЕНТИ (обирай сам під ситуацію):
- search_instagram — Instagram-акаунти, профілі, контент (Apify). Для: лідерів думок, референсів, форматів, акаунтів ніші.
- search_web — семантичний веб-пошук (Exa). Для: трендів, ідей, гравців ринку, загального ресерчу. Глибина по одній темі/питанню.
- scrape_site — повний контент сайту/лендингу (Firecrawl). Для: розбору воронки, оферів, копірайту бренду. Потребує конкретний URL (спершу знайди його через search_web/broad_search).
- broad_search — широкий збір джерел (Parallel). Для: огляду БАГАТЬОХ гравців одразу, коли треба охопити ринок широко, а не заглибитись в одну тему.
- search_ads_intel — organic+paid огляд домену, оцінка трафіку/ключових слів (SEMrush, опційно платний). Для: "які запити шукають у ніші", загальна оцінка присутності конкурента в пошуку й рекламі. Потребує domain.
- analyze_competitor_ads — реальні активні рекламні оголошення бренду (Meta Ad Library + Google Ads Transparency Center, безкоштовно). Для: точкового запиту "розбери рекламу [бренд]", коли вже відомий бренд/домен. Приймає назву бренду або domain.

Різниця search_ads_intel vs analyze_competitor_ads: перший — ширший скан (потребує SEMrush), другий — конкретні активні оголошення напряму з публічних бібліотек, безкоштовно. Якщо SEMrush недоступний — просто не клич search_ads_intel.

ТИПИ ЗАДАЧ (розпізнавай сам, це орієнтир):
карта гравців · тренди+креативи · хуки · візуальні референси · teardown бренду · розбір воронки · розбір копірайту · оффери й ціни · просто відповідь · формати й рубрики · лідери думок/акаунти.

ЯК АНАЛІЗУВАТИ (сигнал сили ✓ vs шум ✗) — фокус на креативи:
ЦА (✓впізнаєш себе за 3 сек / ✗усі підряд) · Хуки (✓неможливо проскролити / ✗нудний) · Візуал (✓впізнаєш без лого / ✗сток) · Оффер (✓важко відмовитись / ✗слабкий) · Формати (✓системно тестує / ✗один) · Позиціонування (✓одна сильна асоціація / ✗бути всім).

ЛІНЗИ (через що грає бренд): JTBD · Category design · Hype · Contrarian · Status · Community-led · Education-led · Founder/personal · Direct-response.

ПРАВИЛА:
- Релевантність > популярність. Не тягни відоме-але-марне. Тільки практично застосовне для маркетингу.
- Завжди "що взяти для себе" — конкретно.
- Тільки реальні дані з інструментів. НЕ вигадуй акаунти/цифри/посилання.
- Фінальна відповідь — звичайний markdown-текст (не JSON, не HTML). Українською. Структуровано під тип задачі: список / розбір по блоках / приклади+патерн — залежно від того, що доречно.
- Коли достатньо даних для якісної відповіді — давай фінал, не клич інструменти без потреби.`;

function buildTools() {
  const tools = [];
  if (AVAILABLE.apify) tools.push({
    name: "search_instagram",
    description: "Пошук Instagram-акаунтів і контенту за ключовими словами/нішою. Повертає профілі: хендл, опис, підписники. Використовуй для лідерів думок, референсів, акаунтів ніші.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "пошуковий запит (ніша/тема, англійською краще)" } }, required: ["query"] },
  });
  if (AVAILABLE.exa) tools.push({
    name: "search_web",
    description: "Семантичний веб-пошук. Повертає сторінки з текстом. Для трендів, ідей, гравців ринку, статей, загального ресерчу.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "пошуковий запит" } }, required: ["query"] },
  });
  if (AVAILABLE.firecrawl) tools.push({
    name: "scrape_site",
    description: "Витягує повний контент сторінки (оффер, копірайт, ціни, структуру). Для глибокого розбору воронки/лендингу/бренду. Передай конкретний URL.",
    input_schema: { type: "object", properties: { url: { type: "string", description: "повний URL сторінки" } }, required: ["url"] },
  });
  if (AVAILABLE.parallel) tools.push({
    name: "broad_search",
    description: "Широкий збір багатьох джерел за запитом. Коли треба охопити багато гравців/прикладів одразу.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "пошуковий запит" } }, required: ["query"] },
  });
  if (AVAILABLE.semrush) tools.push({
    name: "search_ads_intel",
    description: "Organic+paid огляд домену: скільки ключових слів, оцінка трафіку, баланс organic/paid (SEMrush). НЕ дає текстів оголошень — для цього analyze_competitor_ads.",
    input_schema: { type: "object", properties: { domain: { type: "string", description: "домен без https://, напр. example.com" } }, required: ["domain"] },
  });
  if (AVAILABLE.competitor_ads) tools.push({
    name: "analyze_competitor_ads",
    description: "Реальні активні рекламні оголошення бренду — з Meta Ad Library та Google Ads Transparency Center (безкоштовно). Клич коли вже відомий бренд/домен і треба саме розбір реклами.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "назва бренду або домен, напр. example.com" } }, required: ["query"] },
  });
  return tools;
}

async function execTool(name, input) {
  try {
    if (name === "search_instagram") {
      const r = await apifySearch(input.query, 10);
      return r.length ? r.map(x => `${x.title} — ${x.url}\n  ${x.text}`).join("\n") : "Нічого не знайдено в Instagram.";
    }
    if (name === "search_web") {
      const r = await exaSearch(input.query, 6);
      return r.length ? r.map(x => `${x.title}\n  ${x.url}\n  ${x.text.slice(0, 500)}`).join("\n\n") : "Веб-пошук нічого не дав.";
    }
    if (name === "scrape_site") {
      const r = await firecrawlScrape(input.url);
      return r[0]?.text ? r[0].text.slice(0, 5000) : "Не вдалось витягти контент сайту.";
    }
    if (name === "broad_search") {
      const r = await parallelSearch(input.query, 8);
      return r.length ? r.map(x => `${x.title}\n  ${x.url}\n  ${x.text.slice(0, 400)}`).join("\n\n") : "Широкий пошук нічого не дав.";
    }
    if (name === "search_ads_intel") {
      const r = await semrushSearch(input.domain, 5);
      return r.length ? r.map(x => `${x.title}\n  ${x.text}`).join("\n\n") : "SEMrush не дав даних по цьому домену.";
    }
    if (name === "analyze_competitor_ads") {
      const r = await analyzeCompetitorAds(input.query);
      return r.length ? r.map(x => `${x.title}\n  ${x.text}`).join("\n\n") : "Активних оголошень не знайдено (можливо бренд не рекламується зараз, або спробуй іншу форму назви).";
    }
    return "Невідомий інструмент.";
  } catch (e) {
    return `Помилка інструмента ${name}: ${e.message}`;
  }
}

// Людське формулювання дії для живого трейсу в UI ("зверху" над відповіддю).
function stepLabel(name, input) {
  if (name === "search_instagram") return `🔍 Шукаю в Instagram: «${input.query}»`;
  if (name === "search_web") return `🌐 Шукаю у вебі: «${input.query}»`;
  if (name === "scrape_site") return `📄 Розбираю сайт: ${input.url}`;
  if (name === "broad_search") return `📡 Широкий пошук: «${input.query}»`;
  if (name === "search_ads_intel") return `📊 Перевіряю трафік домену: ${input.domain}`;
  if (name === "analyze_competitor_ads") return `🎯 Шукаю рекламу: «${input.query}»`;
  return `⚙️ Виконую: ${name}`;
}

// ─── ГОЛОВНИЙ АГЕНТНИЙ ЦИКЛ ──────────────────────────────────────────────────
// history — масив {role, content} З ПОТОЧНОЇ РОЗМОВИ (вже включно з новим user-
// повідомленням). onStep(label) — опційний колбек для живого трейсу в UI,
// викликається людською фразою "яку дію виконує зараз". Повертає markdown-текст.
export async function runAgent(history, onStep) {
  const tools = buildTools();
  const messages = [...history];

  // Зменшено з 8 до 5 — на Vercel Hobby жорсткий ліміт 60 сек на функцію,
  // менше кроків підвищує шанс встигнути. Якщо є Vercel Pro — можна повернути
  // назад до 8 для глибшого ресерчу.
  const MAX_STEPS = 5;
  for (let step = 0; step < MAX_STEPS; step++) {
    if (onStep) await onStep(step === 0 ? "🧠 Аналізую задачу…" : "🧠 Обдумую наступний крок…");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 3500, system: AGENT_SYSTEM, tools, messages }),
    });
    if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 150)}`);
    const data = await res.json();

    const textParts = data.content.filter(c => c.type === "text").map(c => c.text).join("");
    const toolUses = data.content.filter(c => c.type === "tool_use");

    if (data.stop_reason !== "tool_use" || !toolUses.length) {
      return textParts.trim() || "Готово.";
    }

    messages.push({ role: "assistant", content: data.content });

    const results = [];
    for (const tu of toolUses) {
      if (onStep) await onStep(stepLabel(tu.name, tu.input));
      const out = await execTool(tu.name, tu.input);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out.slice(0, 6000) });
    }
    messages.push({ role: "user", content: results });
  }

  if (onStep) await onStep("✍️ Формую фінальну відповідь…");
  messages.push({ role: "user", content: "Дай фінальну відповідь українською (markdown) на основі зібраного. Не клич більше інструментів." });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 3500, system: AGENT_SYSTEM, messages }),
  });
  const data = await res.json();
  return data.content.map(c => c.text || "").join("").trim() || "Не вдалось завершити.";
}

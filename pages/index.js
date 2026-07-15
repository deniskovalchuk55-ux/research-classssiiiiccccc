import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.user) return router.push("/login");
      setUser(data.user);
      const cres = await fetch("/api/conversations");
      const cdata = await cres.json();
      setConversations(cdata.conversations || []);
      if (cdata.conversations?.length) setActiveId(cdata.conversations[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      const res = await fetch(`/api/conversations/${activeId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    })();
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function newConversation() {
    const res = await fetch("/api/conversations", { method: "POST" });
    const data = await res.json();
    setConversations([data.conversation, ...conversations]);
    setActiveId(data.conversation.id);
    setMessages([]);
  }

  async function send() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: text, id: `tmp-${Date.now()}` }]);

    let convId = activeId;
    if (!convId) {
      const res = await fetch("/api/conversations", { method: "POST" });
      const data = await res.json();
      convId = data.conversation.id;
      setConversations((c) => [data.conversation, ...c]);
      setActiveId(convId);
    }

    const res = await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: `❌ ${data.error}`, id: `err-${Date.now()}` }]);
      return;
    }
    setMessages((m) => [...m, data.message]);
    // оновити заголовок в сайдбарі, якщо це було перше повідомлення
    const cres = await fetch("/api/conversations");
    const cdata = await cres.json();
    setConversations(cdata.conversations || []);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <button style={styles.newBtn} onClick={newConversation}>+ Нова розмова</button>
        <div style={styles.convList}>
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              style={{ ...styles.convItem, background: c.id === activeId ? "#24243040" : "transparent" }}
            >
              {c.title}
            </div>
          ))}
        </div>
        <div style={styles.sidebarFooter}>
          {user.isAdmin && <Link href="/admin" style={styles.adminLink}>Адмінка →</Link>}
          <button style={styles.logoutBtn} onClick={logout}>Вийти ({user.phone})</button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.messages}>
          {messages.length === 0 && (
            <p style={styles.emptyHint}>Дай задачу про маркетинг — знайду акаунти, креативи, воронки, тренди, конкурентів.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} style={{ ...styles.bubble, ...(m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant) }}>
              <div style={styles.bubbleText}>{m.content}</div>
            </div>
          ))}
          {sending && <div style={{ ...styles.bubble, ...styles.bubbleAssistant }}>🧠 Думаю над задачею…</div>}
          <div ref={bottomRef} />
        </div>

        <div style={styles.inputBar}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Знайди топ Instagram-акаунти бізнес-івентів в Україні…"
          />
          <button style={styles.sendBtn} onClick={send} disabled={sending}>➤</button>
        </div>
      </main>
    </div>
  );
}

const styles = {
  app: { display: "flex", height: "100vh", background: "#0b0b0f", fontFamily: "system-ui, sans-serif" },
  sidebar: { width: 260, background: "#111118", borderRight: "1px solid #24243040", display: "flex", flexDirection: "column", padding: 16 },
  newBtn: { padding: 10, borderRadius: 10, border: "1px solid #2a2a35", background: "#1a1a24", color: "#fff", cursor: "pointer", marginBottom: 16 },
  convList: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 },
  convItem: { padding: "10px 12px", borderRadius: 8, color: "#c8c8d4", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sidebarFooter: { display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid #24243040" },
  adminLink: { color: "#5b5bf0", fontSize: 13, textDecoration: "none" },
  logoutBtn: { background: "none", border: "none", color: "#8a8a99", fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  messages: { flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 12 },
  emptyHint: { color: "#5a5a68", fontSize: 14, margin: "auto" },
  bubble: { maxWidth: "75%", padding: "12px 16px", borderRadius: 14, fontSize: 14, lineHeight: 1.5 },
  bubbleUser: { alignSelf: "flex-end", background: "#5b5bf0", color: "#fff" },
  bubbleAssistant: { alignSelf: "flex-start", background: "#1a1a24", color: "#e4e4ec", whiteSpace: "pre-wrap" },
  bubbleDigest: { maxWidth: "100%", width: "100%", background: "transparent", padding: 0 },
  bubbleText: { whiteSpace: "pre-wrap" },
  inputBar: { display: "flex", gap: 8, padding: 16, borderTop: "1px solid #24243040" },
  textarea: { flex: 1, resize: "none", height: 48, padding: 12, borderRadius: 10, border: "1px solid #2a2a35", background: "#0f0f14", color: "#fff", fontSize: 14, fontFamily: "inherit" },
  sendBtn: { width: 48, borderRadius: 10, border: "none", background: "#5b5bf0", color: "#fff", fontSize: 18, cursor: "pointer" },
};

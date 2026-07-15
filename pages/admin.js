import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.user) return router.push("/login");
      if (!me.user.isAdmin) return router.push("/");

      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setUsers(data.users || []);
    })();
  }, []);

  async function openUser(u) {
    setSelectedUser(u);
    setSelectedConv(null);
    setMessages([]);
    const res = await fetch(`/api/admin/conversations?userId=${u.id}`);
    const data = await res.json();
    setConversations(data.conversations || []);
  }

  async function openConv(c) {
    setSelectedConv(c);
    const res = await fetch(`/api/conversations/${c.id}/messages`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: "#fff" }}>Адмінка — усі юзери</h2>
        <Link href="/" style={styles.backLink}>← До чату</Link>
      </div>
      {error && <p style={{ color: "#f06565", padding: 16 }}>{error}</p>}

      <div style={styles.columns}>
        <div style={styles.col}>
          <h4 style={styles.colTitle}>Юзери ({users.length})</h4>
          {users.map((u) => (
            <div key={u.id} onClick={() => openUser(u)} style={{ ...styles.item, background: selectedUser?.id === u.id ? "#24243040" : "transparent" }}>
              <div>{u.phone}{u.is_admin ? " 👑" : ""}</div>
              <div style={styles.muted}>{u.conversation_count} розмов</div>
            </div>
          ))}
        </div>

        <div style={styles.col}>
          <h4 style={styles.colTitle}>Розмови {selectedUser ? `— ${selectedUser.phone}` : ""}</h4>
          {conversations.map((c) => (
            <div key={c.id} onClick={() => openConv(c)} style={{ ...styles.item, background: selectedConv?.id === c.id ? "#24243040" : "transparent" }}>
              {c.title}
            </div>
          ))}
        </div>

        <div style={styles.colWide}>
          <h4 style={styles.colTitle}>Повідомлення {selectedConv ? `— ${selectedConv.title}` : ""}</h4>
          <div style={styles.messages}>
            {messages.map((m) => (
              <div key={m.id} style={{ ...styles.bubble, ...(m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant) }}>
                {m.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#0b0b0f", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottom: "1px solid #24243040" },
  backLink: { color: "#5b5bf0", fontSize: 13, textDecoration: "none" },
  columns: { display: "flex", height: "calc(100vh - 73px)" },
  col: { width: 260, borderRight: "1px solid #24243040", padding: 12, overflowY: "auto" },
  colWide: { flex: 1, padding: 12, overflowY: "auto" },
  colTitle: { color: "#8a8a99", fontSize: 12, textTransform: "uppercase", margin: "4px 8px 12px" },
  item: { padding: "10px 12px", borderRadius: 8, color: "#c8c8d4", fontSize: 13, cursor: "pointer" },
  muted: { color: "#5a5a68", fontSize: 11, marginTop: 2 },
  messages: { display: "flex", flexDirection: "column", gap: 10 },
  bubble: { maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, whiteSpace: "pre-wrap" },
  bubbleUser: { alignSelf: "flex-end", background: "#5b5bf0", color: "#fff" },
  bubbleAssistant: { alignSelf: "flex-start", background: "#1a1a24", color: "#e4e4ec" },
};

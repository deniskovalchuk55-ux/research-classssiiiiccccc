import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState("+380");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Помилка");
    router.push("/");
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Research-агент</h1>
        <p style={styles.subtitle}>Вхід по номеру телефону</p>

        <form onSubmit={submit} style={styles.form}>
          <input
            style={styles.input}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+380XXXXXXXXX"
            autoFocus
          />
          <button style={styles.button} disabled={loading}>
            {loading ? "Заходжу…" : "Увійти"}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0f", fontFamily: "system-ui, sans-serif" },
  card: { width: 340, padding: 32, background: "#16161d", borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" },
  title: { color: "#fff", fontSize: 22, margin: 0 },
  subtitle: { color: "#8a8a99", fontSize: 14, marginTop: 4, marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: "12px 14px", borderRadius: 10, border: "1px solid #2a2a35", background: "#0f0f14", color: "#fff", fontSize: 15 },
  button: { padding: "12px 14px", borderRadius: 10, border: "none", background: "#5b5bf0", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  error: { color: "#f06565", fontSize: 13, marginTop: 16 },
};

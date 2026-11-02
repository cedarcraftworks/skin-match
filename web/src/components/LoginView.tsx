import { useState } from "react";
import type { HttpApi } from "../lib/api.ts";

export function LoginView({ api, onToken }: { api: HttpApi; onToken: (token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card narrow"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          const res = mode === "login" ? await api.login(email, password) : await api.register(email, password);
          onToken(res.token);
        } catch (err) {
          setError(err instanceof Error ? err.message : "ログインできませんでした");
        }
      }}
    >
      <h2>{mode === "login" ? "ログイン" : "新規登録"}</h2>
      <p className="muted small">肌の記録は、ログインした本人だけが見られます。</p>
      <label className="field">
        <span>メールアドレス</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label className="field">
        <span>パスワード（8文字以上）</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="primary">
        {mode === "login" ? "ログイン" : "登録する"}
      </button>
      <button type="button" className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "はじめての方は新規登録" : "登録済みの方はログイン"}
      </button>
    </form>
  );
}

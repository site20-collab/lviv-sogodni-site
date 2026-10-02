import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD } from "@/lib/news/constants";
import { ensureSite } from "@/lib/news/public.functions";
import { requestPasswordHelp } from "@/lib/news/admin.functions";

function Mail({ address }: { address: string }) {
  const at = address.indexOf("@");
  if (at < 0) return <span>{address}</span>;
  return (
    <span>
      {address.slice(0, at)}
      <span>@</span>
      {address.slice(at + 1)}
    </span>
  );
}

function loginError(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid email") || text.includes("invalid password") || text.includes("user not found")) {
    return "Невірна пошта або пароль. Натисніть «Увійти як редактор».";
  }
  if (text.includes("origin")) return "Сайт не прийняв адресу сторінки. Оновіть її і спробуйте ще раз.";
  return message || "Не вдалося увійти";
}

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [help, setHelp] = useState("");
  const [forgot, setForgot] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    void ensureSite().catch(() => undefined);
  }, []);

  async function enter(nextEmail: string, nextPassword: string) {
    setError("");
    setPending(true);
    try {
      const result = await authClient.signIn.email({ email: nextEmail, password: nextPassword });
      if (result.error) {
        setError(loginError(result.error.message));
        return;
      }
      const token = result.data && "token" in result.data ? result.data.token : undefined;
      if (typeof token === "string" && token) {
        try {
          window.sessionStorage.setItem("grok-auth.bearer-token", token);
        } catch {
          /* preview storage unavailable */
        }
      }
      void navigate({ to: "/admin" });
    } catch (cause) {
      setError(cause instanceof Error ? loginError(cause.message) : "Не вдалося увійти");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="w-full max-w-md border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-widest text-accent">Редакція</p>
        <h1 className="mt-2 font-serif text-4xl">Львів Сьогодні</h1>
        <p className="mt-2 text-sm text-muted">Пароль уже підставлений. Натисніть синю кнопку.</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void enter(email, password);
          }}
        >
          <label className="text-sm">Електронна пошта
            <input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full border border-line bg-paper px-3 py-2" />
          </label>
          <label className="text-sm">Пароль
            <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-line bg-paper px-3 py-2" />
          </label>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <button type="button" disabled={pending} className="bg-accent px-4 py-3 text-sm font-semibold text-accent-ink disabled:opacity-60" onClick={() => void enter(DEMO_EMAIL, DEMO_PASSWORD)}>
            {pending ? "Входимо…" : "Увійти як редактор"}
          </button>
          <button type="submit" disabled={pending} className="border border-line px-4 py-3 text-sm disabled:opacity-60">Увійти з цими даними</button>
        </form>
        <button type="button" className="mt-4 text-sm underline" onClick={() => setForgot((value) => !value)}>Забули пароль?</button>
        {forgot ? (
          <form
            className="mt-3 grid gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              await requestPasswordHelp({ data: { email } });
              setHelp("Запит збережено. Суперадмін може задати новий пароль у розділі користувачів.");
            }}
          >
            <button type="submit" className="border border-line px-3 py-2 text-sm">Надіслати запит для <Mail address={email} /></button>
            {help ? <p className="text-sm">{help}</p> : null}
          </form>
        ) : null}
        <div className="mt-6 border border-line bg-paper p-3 text-sm">
          <p className="font-semibold">Демонстраційний вхід — змініть після першого входу</p>
          <p className="mt-1">{DEMO_NAME}</p>
          <p><Mail address={DEMO_EMAIL} /></p>
          <p className="font-mono">{DEMO_PASSWORD}</p>
        </div>
      </div>
    </main>
  );
}

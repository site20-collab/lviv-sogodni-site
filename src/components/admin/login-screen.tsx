import { useEffect, useState } from "react";
import { ensureSite } from "@/lib/news/public.functions";
import { requestPasswordHelp } from "@/lib/news/admin.functions";

const OWNER_EMAIL = "denys20smm@gmail.com";

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

export function LoginScreen() {
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [help, setHelp] = useState("");
  const [forgot, setForgot] = useState(false);
  useEffect(() => {
    void ensureSite().catch(() => undefined);
    if (new URLSearchParams(window.location.search).get("error")) setError("Невірна пошта або пароль.");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="w-full max-w-md border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-widest text-accent">Редакція</p>
        <h1 className="mt-2 font-serif text-4xl">Львів Сьогодні</h1>
        <p className="mt-2 text-sm text-muted">Вхід для редакції.</p>
        <form method="post" action="/api/login" className="mt-6 grid gap-3">
          <label className="text-sm">Електронна пошта
            <input name="email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full border border-line bg-paper px-3 py-2" />
          </label>
          <label className="text-sm">Пароль
            <input name="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-line bg-paper px-3 py-2" />
          </label>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <button type="submit" className="bg-accent px-4 py-3 text-sm font-semibold text-accent-ink">Увійти</button>
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
      </div>
    </main>
  );
}

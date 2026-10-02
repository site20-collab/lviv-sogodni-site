import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFrame } from "@/components/site/frame";
import { getChrome } from "@/lib/news/public.functions";
import { postContact } from "@/lib/news/public.functions";

export const Route = createFileRoute("/contact")({
  loader: () => getChrome(),
  head: () => ({ meta: [{ title: "Контакти — Львів Сьогодні" }, { name: "description", content: "Напишіть редакції «Львів Сьогодні»." }] }),
  component: Contact,
});

function Contact() {
  const chrome = Route.useLoaderData();
  const [note, setNote] = useState("");
  return (
    <SiteFrame chrome={chrome}>
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-serif text-4xl">Контакти</h1>
        <p className="mt-2 text-muted">Редакція: {chrome.settings.contactEmail}</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            try {
              await postContact({
                data: {
                  name: String(form.get("name") ?? ""),
                  email: String(form.get("email") ?? ""),
                  message: String(form.get("message") ?? ""),
                  company: String(form.get("company") ?? ""),
                },
              });
              setNote("Повідомлення збережено. Редакція побачить його в панелі.");
              event.currentTarget.reset();
            } catch (error) {
              setNote(error instanceof Error ? error.message : "Не вдалося надіслати");
            }
          }}
        >
          <input className="hidden" name="company" tabIndex={-1} autoComplete="off" />
          <input name="name" required placeholder="Ім'я" className="border border-line bg-card px-3 py-2" />
          <input name="email" type="email" required placeholder="Електронна пошта" className="border border-line bg-card px-3 py-2" />
          <textarea name="message" required minLength={8} rows={6} placeholder="Повідомлення" className="border border-line bg-card px-3 py-2" />
          <button type="submit" className="w-fit bg-accent px-4 py-2 text-sm text-accent-ink">Надіслати</button>
          {note ? <p className="text-sm">{note}</p> : null}
        </form>
      </div>
    </SiteFrame>
  );
}

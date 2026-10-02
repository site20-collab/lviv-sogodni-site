const dateFmt = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Kyiv",
});

const timeFmt = new Intl.DateTimeFormat("uk-UA", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Kyiv",
});

const dayKey = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Kyiv",
});

export function formatDateUk(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateFmt.format(d).replace(/\s?р\.$/, "");
}

export function formatTimeUk(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return timeFmt.format(d);
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = formatTimeUk(d);
  if (dayKey.format(d) === dayKey.format(new Date())) return `сьогодні, ${time}`;
  return `${formatDateUk(d)}, ${time}`;
}

export function isoOf(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function asJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function weatherLabel(code: number): string {
  if (code === 0) return "ясно";
  if (code <= 3) return "хмарно";
  if (code <= 48) return "туман";
  if (code <= 57) return "мряка";
  if (code <= 67) return "дощ";
  if (code <= 77) return "сніг";
  if (code <= 82) return "злива";
  if (code <= 86) return "сніг";
  return "гроза";
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Чернетка",
  PENDING: "На модерації",
  SCHEDULED: "Заплановано",
  PUBLISHED: "Опубліковано",
  ARCHIVED: "Архів",
};

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Суперадмін",
  ADMIN: "Адмін",
  EDITOR: "Редактор",
  AUTHOR: "Автор",
  MODERATOR: "Модератор",
  ANALYST: "Аналітик",
};

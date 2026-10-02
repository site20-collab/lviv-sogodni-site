export const DEMO_EMAIL = "redaktor@lviv-sogodni.media";
export const DEMO_PASSWORD = "Lviv-Demo-2026!";
export const DEMO_NAME = "Головний редактор";

export const COVER_LIBRARY = [
  { url: "/covers/rynok.jpg", alt: "Площа Ринок у Львові вранці" },
  { url: "/covers/tram.jpg", alt: "Трамвай на вулиці Львова" },
  { url: "/covers/park.jpg", alt: "Осіння алея міського парку" },
  { url: "/covers/works.jpg", alt: "Ремонт дорожнього покриття на вулиці" },
  { url: "/covers/university.jpg", alt: "Історична будівля університету" },
  { url: "/covers/night.jpg", alt: "Вечірня бруківка в центрі Львова" },
  { url: "/covers/market.jpg", alt: "Осінній ярмарок локальних виробників" },
  { url: "/covers/stadium.jpg", alt: "Стадіон перед матчем" },
] as const;

export const PLACEMENTS = [
  { id: "header", label: "Шапка" },
  { id: "homepage", label: "Головна" },
  { id: "article_top", label: "Стаття зверху" },
  { id: "article_middle", label: "Стаття всередині" },
  { id: "article_bottom", label: "Стаття знизу" },
  { id: "sidebar", label: "Бічна колонка" },
  { id: "mobile", label: "Мобільний" },
] as const;

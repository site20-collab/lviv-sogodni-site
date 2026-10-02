export const STATUSES = ["DRAFT", "PENDING", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export type ArticleStatus = (typeof STATUSES)[number];

export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "AUTHOR",
  "MODERATOR",
  "ANALYST",
] as const;
export type StaffRole = (typeof ROLES)[number];

export type Block =
  | { id: string; type: "p"; text: string }
  | { id: string; type: "h2"; text: string }
  | { id: string; type: "h3"; text: string }
  | { id: string; type: "quote"; text: string; cite: string }
  | { id: string; type: "ul"; items: string[] }
  | { id: string; type: "ol"; items: string[] }
  | { id: string; type: "image"; url: string; alt: string; caption: string }
  | { id: string; type: "video"; url: string; caption: string }
  | { id: string; type: "table"; rows: string[][] }
  | { id: string; type: "hr" };

export type GalleryItem = { url: string; alt: string; caption: string };

export type ArticleCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: ArticleStatus;
  featured: boolean;
  breaking: boolean;
  pinned: boolean;
  coverUrl: string | null;
  coverAlt: string | null;
  authorName: string | null;
  authorSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  viewCount: number;
};

export type ArticleDetail = ArticleCard & {
  content: Block[];
  gallery: GalleryItem[];
  coverCaption: string | null;
  source: string | null;
  sourceUrl: string | null;
  location: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImageUrl: string | null;
  scheduledAt: string | null;
  authorBio: string | null;
  tags: { name: string; slug: string }[];
  related: ArticleCard[];
  popular: ArticleCard[];
  comments: { id: string; authorName: string; body: string; createdAt: string }[];
};

export type Socials = {
  telegram: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  x: string;
};

export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  commentsEnabled: boolean;
  socials: Socials;
  seoTitle: string;
  seoDescription: string;
  cronSecret: string;
  pages: { about: string; privacy: string; terms: string; cookies: string };
};

export type MenuItem = {
  id: string;
  label: string;
  url: string;
  target: string;
  active: boolean;
  sortOrder: number;
};

export type Chrome = {
  settings: SiteSettings;
  menu: MenuItem[];
  breaking: ArticleCard[];
  weather: { temp: number; label: string } | null;
};

export type HomeSection = {
  id: string;
  title: string;
  href: string;
  items: ArticleCard[];
};

export type StaffInfo = {
  userId: string;
  role: StaffRole;
  name: string;
  email: string;
};

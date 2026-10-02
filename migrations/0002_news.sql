-- Львів Сьогодні: редакційна схема.

create table if not exists authors (
  id text primary key,
  slug text not null unique,
  name text not null,
  email text,
  bio text not null default '',
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  seo_title text,
  seo_description text,
  sort_order int not null default 0,
  active boolean not null default true,
  show_in_nav boolean not null default false
);

create table if not exists tags (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default ''
);

create table if not exists articles (
  id text primary key,
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT',
  featured boolean not null default false,
  breaking boolean not null default false,
  pinned boolean not null default false,
  cover_url text,
  cover_alt text,
  cover_caption text,
  gallery jsonb not null default '[]'::jsonb,
  author_id text references authors(id) on delete set null,
  category_id text references categories(id) on delete set null,
  source text,
  source_url text,
  location text,
  seo_title text,
  seo_description text,
  og_image_url text,
  canonical_url text,
  no_index boolean not null default false,
  published_at timestamptz,
  scheduled_at timestamptz,
  view_count int not null default 0,
  preview_token text,
  autosave jsonb,
  autosave_at timestamptz,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_status_chk check (status in ('DRAFT','PENDING','SCHEDULED','PUBLISHED','ARCHIVED'))
);

create index if not exists articles_status_pub_idx on articles (status, published_at desc);
create index if not exists articles_category_idx on articles (category_id);
create index if not exists articles_author_idx on articles (author_id);
create index if not exists articles_slug_idx on articles (slug);

create table if not exists article_tags (
  article_id text not null references articles(id) on delete cascade,
  tag_id text not null references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

create table if not exists article_versions (
  id text primary key,
  article_id text not null references articles(id) on delete cascade,
  version int not null,
  title text not null,
  snapshot jsonb not null,
  editor_id text,
  editor_name text,
  created_at timestamptz not null default now()
);
create index if not exists article_versions_article_idx on article_versions (article_id, version desc);

create table if not exists media (
  id text primary key,
  filename text not null,
  original_name text not null,
  mime text not null,
  size int not null,
  width int,
  height int,
  alt text not null default '',
  caption text not null default '',
  data_base64 text not null,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id text primary key,
  article_id text not null references articles(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  body text not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  constraint comments_status_chk check (status in ('PENDING','APPROVED','REJECTED','SPAM'))
);
create index if not exists comments_status_idx on comments (status, created_at desc);
create index if not exists comments_article_idx on comments (article_id, status);

create table if not exists page_views (
  id text primary key,
  path text not null,
  article_id text,
  session_id text not null,
  referrer text,
  device text,
  browser text,
  os text,
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on page_views (created_at desc);
create index if not exists page_views_article_idx on page_views (article_id, created_at desc);

create table if not exists ads (
  id text primary key,
  name text not null,
  code text not null default '',
  placement text not null,
  active boolean not null default true,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id text primary key,
  label text not null,
  url text not null,
  target text not null default '_self',
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null
);

create table if not exists homepage_sections (
  id text primary key,
  section_key text not null unique,
  title text not null,
  category_slug text,
  sort_order int not null default 0,
  article_count int not null default 4,
  active boolean not null default true
);

create table if not exists contact_messages (
  id text primary key,
  name text not null,
  email text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists subscribers (
  id text primary key,
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists staff (
  user_id text primary key,
  role text not null,
  display_name text,
  created_at timestamptz not null default now(),
  constraint staff_role_chk check (role in ('SUPER_ADMIN','ADMIN','EDITOR','AUTHOR','MODERATOR','ANALYST'))
);

create table if not exists password_resets (
  id text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

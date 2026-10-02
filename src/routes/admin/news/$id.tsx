import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArticleForm } from "@/components/admin/article-form";
import { PageTitle, errText } from "@/components/admin/shell";
import { adminGetArticle } from "@/lib/news/admin.functions";

export const Route = createFileRoute("/admin/news/$id")({
  component: EditNews,
});

function EditNews() {
  const { id } = Route.useParams();
  const [article, setArticle] = useState<Awaited<ReturnType<typeof adminGetArticle>> | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    adminGetArticle({ data: { id } }).then(setArticle).catch((err) => setError(errText(err)));
  }, [id]);
  if (error) return <p className="text-accent">{error}</p>;
  if (article === undefined) return <p className="text-muted">Завантаження матеріалу…</p>;
  if (!article) return <p>Матеріал не знайдено</p>;
  return (
    <div>
      <PageTitle title="Редагування" />
      <ArticleForm initial={article} />
    </div>
  );
}

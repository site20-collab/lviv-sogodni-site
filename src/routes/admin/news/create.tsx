import { createFileRoute } from "@tanstack/react-router";
import { ArticleForm } from "@/components/admin/article-form";
import { PageTitle } from "@/components/admin/shell";

export const Route = createFileRoute("/admin/news/create")({
  component: () => (
    <div>
      <PageTitle title="Нова новина" />
      <ArticleForm />
    </div>
  ),
});

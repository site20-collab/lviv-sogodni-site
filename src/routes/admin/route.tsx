import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/shell";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminGate>
      <Outlet />
    </AdminGate>
  ),
});

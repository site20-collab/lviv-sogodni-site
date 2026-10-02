import { createFileRoute } from "@tanstack/react-router";
import { LoginScreen } from "@/components/admin/login-screen";

export const Route = createFileRoute("/admin/login")({
  component: LoginScreen,
});

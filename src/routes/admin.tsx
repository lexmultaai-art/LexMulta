import { createFileRoute } from "@tanstack/react-router";
import { MultasAI } from "./index";

export const Route = createFileRoute("/admin")({
  component: MultasAI,
});

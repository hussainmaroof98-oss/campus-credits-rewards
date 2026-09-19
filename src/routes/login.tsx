import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Log in — CampCredit" },
      {
        name: "description",
        content:
          "Sign in to CampCredit with your university enrollment number to track campus credits and rewards.",
      },
      { property: "og:title", content: "Log in — CampCredit" },
      {
        property: "og:description",
        content: "Sign in with your enrollment number to see your campus credits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/", replace: true }); }, [navigate]);
  return null;
}

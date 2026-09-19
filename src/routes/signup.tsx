import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: "Create your account — CampCredit" },
      {
        name: "description",
        content:
          "Create a CampCredit account with your enrollment number to start earning campus credits, climbing class leaderboards and redeeming rewards.",
      },
      { property: "og:title", content: "Create your account — CampCredit" },
      {
        property: "og:description",
        content: "Sign up with your enrollment number and start earning campus credits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SignUpPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/", replace: true }); }, [navigate]);
  return null;
}

import type { AuthCfg } from "@/components/AuthScreen";
export const authCfg: AuthCfg = { layout: "center", accent: "#625df5", ctaBg: "#625df5", radius: 6, ink: "#1a1a2e", muted: "#6b6b7e",
  top: { right: undefined, cta: "Sign up for free" }, title: "Log in to Loom", signupTitle: "Sign up for Loom", emailLabel: "Work email", providersAfter: false,
  providers: [{ id: "google", label: "Log in with Google", signupLabel: "Sign up with Google" }, { id: "slack", label: "Log in with Slack", signupLabel: "Sign up with Slack" }, { id: "apple", label: "Log in with Apple", signupLabel: "Sign up with Apple" }, { id: "outlook", label: "Log in with Outlook", signupLabel: "Sign up with Outlook" }, { id: "sso", label: "Log in with SSO", signupLabel: "Sign up with SSO" }],
  ctaNext: "Continue", cta: "Log in", emailFirst: true, footerNote: "By signing up you agree to the Terms and Privacy Policy of this open-source project.", switchText: ["Don't have an account?", "Sign up"] };

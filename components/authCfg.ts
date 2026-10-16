import type { AuthCfg } from "@/components/AuthScreen";
export const authCfg: AuthCfg = { layout: "center", accent: "#625df5", ctaBg: "#625df5", radius: 6, ink: "#1a1a2e", muted: "#6b6b7e",
  top: { right: undefined, cta: "Sign up for free" }, title: "Log in to Loom", signupTitle: "Record your first Loom video in seconds", emailLabel: "Work email", providersAfter: false,
  providers: [{ id: "google", label: "Log in with Google", signupLabel: "Sign up with Google" }],
  ctaNext: "Continue", cta: "Log in", emailFirst: true, footerNote: "By signing up, you acknowledge that you have read and understood, and agree to the Terms and Privacy Policy of this open-source project.", switchText: ["Don't have an account?", "Sign up"], signupSwitchText: ["Already have an account?", "Log in"] };

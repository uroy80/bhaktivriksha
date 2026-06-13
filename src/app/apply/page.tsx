import { redirect } from "next/navigation";

// The public join flow is now open self-registration.
export default function ApplyRedirect() {
  redirect("/register");
}

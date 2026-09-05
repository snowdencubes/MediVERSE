import { redirect } from "next/navigation";

export default function Home() {
  // Cold start redirects immediately to the language selection (kiosk mode)
  redirect("/patient");
}

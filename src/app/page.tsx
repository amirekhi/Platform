import { AppShell } from "@/components/shell/AppShell";
import { CoachToast } from "@/components/help/CoachToast";
import { Tour } from "@/components/help/Tour";

export default function Home() {
  return (
    <>
      <AppShell />
      <Tour />
      <CoachToast />
    </>
  );
}

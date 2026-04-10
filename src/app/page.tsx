import { createClient } from "@/lib/supabase-server";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HomeClient userEmail={user?.email ?? null} />;
}

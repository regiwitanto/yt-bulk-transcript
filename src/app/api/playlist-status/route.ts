import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_STATUSES = ["pending", "processing", "completed"] as const;
type PlaylistStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  // getSession() validates the JWT locally from the cookie — no network RTT.
  // Ownership is enforced by the .eq("user_id") filter on the update below.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body as { id?: string; status?: string };

  if (!id || !status) {
    return NextResponse.json(
      { error: "Missing required fields: id, status" },
      { status: 400 },
    );
  }

  if (!ALLOWED_STATUSES.includes(status as PlaylistStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Scoped to user_id — prevents IDOR (another user changing this playlist's status)
  const { error } = await supabaseAdmin
    .from("playlists")
    .update({ status: status as PlaylistStatus })
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

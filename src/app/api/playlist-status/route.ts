import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/lib/database.types";

type PlaylistStatus = Database["public"]["Enums"]["playlist_status"];

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body as { id?: string; status?: PlaylistStatus };

  if (!id || !status) {
    return NextResponse.json(
      { error: "Missing required fields: id, status" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("playlists")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

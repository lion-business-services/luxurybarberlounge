import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const BUCKET = "barber-portfolio";

async function resolveBarberProfile(
  admin: NonNullable<ReturnType<typeof createUntypedAdminSupabase>>,
  userId: string,
) {
  const { data } = await admin
    .from("barber_profiles")
    .select("id,business_id,display_name")
    .eq("staff_user_id", userId)
    .maybeSingle();
  return data;
}

/** List the signed-in barber's portfolio items with short-lived signed URLs. */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.includes("barber")) {
    return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403 });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: true, items: [] });

  const profile = await resolveBarberProfile(admin, session.user.id);
  if (!profile?.id) return NextResponse.json({ ok: true, items: [] });

  const { data: rows } = await admin
    .from("barber_portfolio_items")
    .select("id,storage_path,caption,alt_text,status,review_note,client_consent,sort_order,created_at")
    .eq("barber_profile_id", profile.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const items = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(String(row.storage_path), 3600);
      return { ...row, url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ ok: true, items });
}

/** Upload a new portfolio image. Stored private; requires admin approval. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "barber";
  if (!checkRateLimit(`portfolio-upload:${ip}`, 30, 60_000).allowed) {
    return NextResponse.json({ ok: false, message: "Please wait before uploading again." }, { status: 429 });
  }

  const session = await getServerAuthSession();
  if (!session.user || !session.roles.includes("barber")) {
    return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403 });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Storage is unavailable." }, { status: 503 });

  const profile = await resolveBarberProfile(admin, session.user.id);
  if (!profile?.id) {
    return NextResponse.json({ ok: false, message: "No barber profile is linked to this account." }, { status: 409 });
  }

  const form = await request.formData();
  const file = form.get("image");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 280);
  const altText = String(form.get("altText") ?? "").trim().slice(0, 200);
  const clientConsent = form.get("clientConsent") === "true";
  const showsClient = form.get("showsClient") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Please choose an image." }, { status: 422 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, message: "Only JPEG, PNG, WEBP or HEIC images are accepted." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "Images must be 8 MB or smaller." }, { status: 413 });
  }
  // A photo showing a client cannot be uploaded without recorded consent.
  if (showsClient && !clientConsent) {
    return NextResponse.json(
      { ok: false, message: "You must confirm the client agreed to their photo being used." },
      { status: 422 },
    );
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/heic" ? "heic" : "jpg";
  const storagePath = `${profile.id}/${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ ok: false, message: "The image could not be stored." }, { status: 500 });
  }

  const { data: inserted, error } = await admin
    .from("barber_portfolio_items")
    .insert({
      business_id: profile.business_id,
      barber_profile_id: profile.id,
      uploaded_by: session.user.id,
      storage_path: storagePath,
      caption: caption || null,
      alt_text: altText || null,
      mime_type: file.type,
      size_bytes: file.size,
      client_consent: clientConsent,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ ok: false, message: "The portfolio entry could not be saved." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, id: inserted.id, message: "Uploaded. It will appear publicly once approved." },
    { status: 201 },
  );
}

/** Delete one of the signed-in barber's own images. */
export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.includes("barber")) {
    return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403 });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ ok: false, message: "Missing image." }, { status: 400 });

  const profile = await resolveBarberProfile(admin, session.user.id);
  if (!profile?.id) return NextResponse.json({ ok: false }, { status: 409 });

  const { data: row } = await admin
    .from("barber_portfolio_items")
    .select("id,storage_path,barber_profile_id")
    .eq("id", id)
    .maybeSingle();

  if (!row || String(row.barber_profile_id) !== String(profile.id)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  await admin.storage.from(BUCKET).remove([String(row.storage_path)]);
  await admin.from("barber_portfolio_items").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}

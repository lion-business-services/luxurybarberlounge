import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getManagedAppointment } from "@/lib/booking/manage";

const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

export async function POST(request: Request) {
  const form = await request.formData();
  const reference = String(form.get("reference") ?? "");
  const token = String(form.get("token") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "Choose an image." }, { status: 422 });
  const extension = allowedTypes.get(file.type);
  if (!extension || file.size > 10 * 1024 * 1024) return NextResponse.json({ ok: false, message: "Use one JPG, PNG, or WebP image under 10 MB." }, { status: 422 });
  const managed = await getManagedAppointment(reference, token);
  if (!managed) return NextResponse.json({ ok: false }, { status: 404 });
  const path = `appointments/${managed.appointment.id}/${randomUUID()}.${extension}`;
  const { error } = await managed.admin.storage.from("client-references").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ ok: false, message: "The appointment is saved, but the image could not be uploaded." }, { status: 503 });
  await managed.admin.from("appointment_reference_images").insert({ booking_metadata_id: null, appointment_id: managed.appointment.id, uploaded_by: null, storage_path: path, alt_text: "Client-provided haircut reference", status: "active" });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rate = checkRateLimit(`concierge:${ip}`, 20, 60_000);
  if (!rate.allowed) return NextResponse.json({ message: "Please wait before sending another question." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 800) : "";
  const language = body?.language === "es" ? "es" : "en";
  if (question.length < 2) return NextResponse.json({ message: "Enter a question." }, { status: 422 });
  const answer = await getAiProvider().answerPublicQuestion(question, language);
  return NextResponse.json(answer);
}

import { NextResponse } from "next/server";
import { squareIsConfigured } from "@/lib/square/config";
export async function GET(){return NextResponse.json({status:"ok",timestamp:new Date().toISOString(),integrations:{square:squareIsConfigured?"configured":"awaiting_credentials",supabase:process.env.NEXT_PUBLIC_SUPABASE_URL?"configured":"awaiting_credentials"}})}

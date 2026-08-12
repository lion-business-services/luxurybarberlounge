import "server-only";

import { createHash } from "node:crypto";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { squareRequest } from "@/lib/square/client";
import { squareConfig } from "@/lib/square/config";

type SquareTeamMember = {
  id?: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  status?: string;
};

function normalize(value: unknown) {
  return typeof value === "string"
    ? value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";
}

function fullName(member: SquareTeamMember) {
  return [member.given_name, member.family_name].filter(Boolean).join(" ").trim();
}

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      givenName: parts[0],
      familyName: parts.slice(1).join(" "),
    };
  }

  return {
    givenName: displayName.trim(),
    // Square requires family_name. This is only the internal Team profile;
    // the website continues to use the approved public display name.
    familyName: "Barber",
  };
}

function idempotencyKey(barberId: string) {
  return createHash("sha256")
    .update(`lbl-team-${squareConfig.environment}-${barberId}`)
    .digest("hex")
    .slice(0, 40);
}

/**
 * Creates missing Square Team members for active website barbers, without
 * modifying or deleting any existing Square Team member.
 */
export async function bootstrapSquareTeam() {
  const admin = createUntypedAdminSupabase();
  if (!admin) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  if (!squareConfig.accessToken || !squareConfig.locationId) {
    throw new Error("SQUARE_NOT_CONFIGURED");
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", "luxury-barber-lounge")
    .maybeSingle();
  if (businessError || !business?.id) throw new Error("BUSINESS_NOT_CONFIGURED");

  const businessId = String(business.id);

  const [{ data: barbers, error: barberError }, teamResponse] = await Promise.all([
    admin
      .from("barber_profiles")
      .select("id,display_name,portal_email,square_team_member_id")
      .eq("business_id", businessId)
      .eq("active", true),
    squareRequest<{ team_members?: SquareTeamMember[] }>("/v2/team-members/search", {
      method: "POST",
      body: {
        query: {
          filter: {
            location_ids: [squareConfig.locationId],
            status: "ACTIVE",
          },
        },
        limit: 200,
      },
    }),
  ]);

  if (barberError) throw barberError;

  const existing = (teamResponse.team_members ?? []).filter((member) => member.id);
  const existingIds = new Set(existing.map((member) => String(member.id)));
  const existingEmails = new Map(
    existing
      .filter((member) => member.email_address)
      .map((member) => [normalize(member.email_address), member]),
  );
  const existingNames = new Map(
    existing.map((member) => [normalize(fullName(member)), member]),
  );

  let mappedExisting = 0;
  let created = 0;
  const failures: Array<{ barber: string; message: string }> = [];

  for (const barber of barbers ?? []) {
    const currentId = String(barber.square_team_member_id ?? "");
    if (currentId && existingIds.has(currentId)) {
      mappedExisting += 1;
      continue;
    }

    const displayName = String(barber.display_name ?? "").trim();
    const email = String(barber.portal_email ?? "").trim().toLowerCase();

    const existingMatch =
      (email ? existingEmails.get(normalize(email)) : undefined) ??
      existingNames.get(normalize(displayName));

    if (existingMatch?.id) {
      const { error } = await admin
        .from("barber_profiles")
        .update({ square_team_member_id: existingMatch.id })
        .eq("business_id", businessId)
        .eq("id", barber.id);
      if (error) throw error;
      mappedExisting += 1;
      continue;
    }

    const { givenName, familyName } = splitName(displayName);

    try {
      const response = await squareRequest<{ team_member?: SquareTeamMember }>(
        "/v2/team-members",
        {
          method: "POST",
          idempotencyKey: idempotencyKey(String(barber.id)),
          body: {
            team_member: {
              reference_id: String(barber.id),
              status: "ACTIVE",
              given_name: givenName,
              family_name: familyName,
              ...(email ? { email_address: email } : {}),
              assigned_locations: {
                assignment_type: "EXPLICIT_LOCATIONS",
                location_ids: [squareConfig.locationId],
              },
            },
          },
        },
      );

      if (!response.team_member?.id) {
        failures.push({ barber: displayName, message: "Square did not return a team member ID." });
        continue;
      }

      const { error } = await admin
        .from("barber_profiles")
        .update({ square_team_member_id: response.team_member.id })
        .eq("business_id", businessId)
        .eq("id", barber.id);
      if (error) throw error;
      created += 1;
    } catch (error) {
      failures.push({
        barber: displayName,
        message: error instanceof Error ? error.message : "Square team member creation failed.",
      });
    }
  }

  return {
    ok: failures.length === 0,
    created,
    mappedExisting,
    failures,
  };
}

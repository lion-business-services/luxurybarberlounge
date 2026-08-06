"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ServiceOption = { id: string; slug: string; name: string };

type BarberEditorValue = {
  id: string;
  staffUserId: string | null;
  name: string;
  title: string;
  intro: string;
  biography: string;
  specialties: string[];
  languages: string[];
  squareTeamMemberId: string | null;
  active: boolean;
  featured: boolean;
  status: string;
  acceptingWalkIns: boolean;
  availabilityStatus: string;
  serviceIds: string[];
  availableServices: ServiceOption[];
};

export function AdminBarberEditor({ barber, owner }: { barber: BarberEditorValue; owner: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(barber.name);
  const [title, setTitle] = useState(barber.title);
  const [intro, setIntro] = useState(barber.intro);
  const [bio, setBio] = useState(barber.biography);
  const [specialties, setSpecialties] = useState(barber.specialties.join("\n"));
  const [languages, setLanguages] = useState(barber.languages.join(", "));
  const [squareId, setSquareId] = useState(barber.squareTeamMemberId ?? "");
  const [active, setActive] = useState(barber.active);
  const [featured, setFeatured] = useState(barber.featured);
  const [profileStatus, setProfileStatus] = useState(barber.status);
  const [acceptingWalkIns, setAcceptingWalkIns] = useState(barber.acceptingWalkIns);
  const [availabilityStatus, setAvailabilityStatus] = useState(barber.availabilityStatus);
  const [serviceIds, setServiceIds] = useState<string[]>(barber.serviceIds);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleService(id: string) {
    setServiceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save() {
    setBusy(true);
    setStatus("Saving barber profile...");
    const response = await fetch(`/api/admin/barbers/${barber.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: name,
        professionalTitle: title,
        shortIntro: intro,
        biography: bio,
        specialties: specialties.split("\n").map((value) => value.trim()).filter(Boolean),
        languages: languages.split(",").map((value) => value.trim()).filter(Boolean),
        active,
        featured,
        status: profileStatus,
        acceptingWalkIns,
        availabilityStatus,
        ...(barber.staffUserId ? { serviceIds } : {}),
        ...(owner ? { squareTeamMemberId: squareId || null } : {}),
      }),
    });
    const body = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setStatus(response.ok && body?.ok ? "Barber profile and service eligibility updated." : body?.message || "The barber profile could not be updated.");
    if (response.ok) router.refresh();
    setBusy(false);
  }

  return (
    <section className="portal-card">
      <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">Barber setup</p>
      <h2 className="font-display mt-2 text-2xl">Profile, availability, and services</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="form-label">Display name</span>
          <input className="form-control" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span className="form-label">Professional title</span>
          <input className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="form-label">Short introduction</span>
          <textarea className="form-control min-h-24" value={intro} onChange={(event) => setIntro(event.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="form-label">Biography</span>
          <textarea className="form-control min-h-36" value={bio} onChange={(event) => setBio(event.target.value)} />
        </label>
        <label>
          <span className="form-label">Specialties, one per line</span>
          <textarea className="form-control min-h-28" value={specialties} onChange={(event) => setSpecialties(event.target.value)} />
        </label>
        <label>
          <span className="form-label">Languages, comma separated</span>
          <textarea className="form-control min-h-28" value={languages} onChange={(event) => setLanguages(event.target.value)} />
        </label>
        <label>
          <span className="form-label">Profile status</span>
          <select className="form-control" value={profileStatus} onChange={(event) => setProfileStatus(event.target.value)}>
            <option value="draft">Draft</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <span className="form-label">Today’s availability</span>
          <select className="form-control" value={availabilityStatus} onChange={(event) => setAvailabilityStatus(event.target.value)}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="break">On break</option>
            <option value="off_duty">Off duty</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={acceptingWalkIns} onChange={(event) => setAcceptingWalkIns(event.target.checked)} />
          Accepting walk-ins
        </label>
        {owner ? (
          <label>
            <span className="form-label">Square team member ID</span>
            <input className="form-control" value={squareId} onChange={(event) => setSquareId(event.target.value)} />
          </label>
        ) : null}
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={!owner && !active} />
          Active account
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
          Featured publicly
        </label>

        <fieldset className="md:col-span-2 rounded-xl border border-white/[.07] p-4" disabled={!barber.staffUserId}>
          <legend className="px-2 text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Services this barber can perform</legend>
          {barber.staffUserId ? (
            barber.availableServices.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {barber.availableServices.map((service) => (
                  <label key={service.id} className="flex items-center gap-3 rounded-lg border border-white/[.06] p-3 text-sm">
                    <input type="checkbox" checked={serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} />
                    <span>{service.name}</span>
                  </label>
                ))}
              </div>
            ) : <p className="mt-2 text-xs text-[var(--color-bone-muted)]">Add active services first, then return here to make the barber eligible for queue assignments.</p>
          ) : <p className="mt-2 text-xs text-[var(--color-bone-muted)]">This profile is not linked to a signed-in barber account yet. Send the barber invitation first.</p>}
        </fieldset>

        <button type="button" disabled={busy} onClick={() => void save()} className="w-fit rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-50">
          {busy ? "Saving" : "Save barber"}
        </button>
      </div>
      {status ? <p className="mt-4 text-xs text-[var(--color-bone-muted)]" role="status">{status}</p> : null}
    </section>
  );
}

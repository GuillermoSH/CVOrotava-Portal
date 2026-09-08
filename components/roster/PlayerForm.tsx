"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { FormDate, FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import { Label } from "@/components/club/Label";
import { SegmentedControl } from "@/components/club/SegmentedControl";
import { SizePicker } from "@/components/clothing/SizePicker";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { TeamCreateSheet } from "@/components/roster/TeamCreateSheet";
import { createPlayerAction, updatePlayerAction } from "@/lib/actions/roster/players";
import { contactsForPlayerAge, isLegalAdult } from "@/lib/roster/age";
import {
  formatTeamCategory,
  GUARDIAN_RELATIONSHIP_LABELS,
  GUARDIAN_RELATIONSHIPS,
  type ContactRelationship,
  type GuardianRelationship,
} from "@/lib/roster/constants";
import { appRoutes } from "@/lib/constants";
import { getCurrentSeason } from "@/lib/season";
import type { ClothingSize, PlayerContact, PlayerWithDetails, Team } from "@/lib/types/db";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ContactDraft = {
  full_name: string;
  relationship: GuardianRelationship;
  phone: string;
  email: string;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  teamId?: string;
};

const emptyContact = (): ContactDraft => ({
  full_name: "",
  relationship: "madre",
  phone: "",
  email: "",
});

function toFamilyDrafts(contacts: PlayerContact[]): ContactDraft[] {
  const family = contacts.filter((contact) => contact.relationship !== "jugador");
  if (!family.length) return [emptyContact()];
  return family.map((contact) => ({
    full_name: contact.full_name,
    relationship: GUARDIAN_RELATIONSHIPS.includes(contact.relationship as GuardianRelationship)
      ? (contact.relationship as GuardianRelationship)
      : "madre",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
  }));
}

function selfContactFrom(contacts: PlayerContact[], birthDate: string | null) {
  const self = contacts.find((contact) => contact.relationship === "jugador");
  const source = self ?? (isLegalAdult(birthDate) ? contacts[0] : undefined);
  return { phone: source?.phone ?? "", email: source?.email ?? "" };
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--club-border)] px-4 py-3">
      <span>
        <span id={`${id}-label`} className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {hint ? (
          <span id={hintId} className="mt-0.5 block text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-checked={checked}
        aria-describedby={hintId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand" : "bg-[var(--club-surface-2)] ring-1 ring-inset ring-[var(--club-border)]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-[var(--club-drawer-bg)] shadow-[0_1px_3px_rgba(16,16,24,0.28)] transition-transform duration-200 ease-out",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

export function PlayerForm({
  teams,
  player,
  canWrite,
}: {
  teams: Team[];
  player?: PlayerWithDetails;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const season = player?.season ?? getCurrentSeason();

  const [firstName, setFirstName] = useState(player?.first_name ?? "");
  const [lastName, setLastName] = useState(player?.last_name ?? "");
  const [birthDate, setBirthDate] = useState(player?.birth_date ?? "");
  const [dni, setDni] = useState(player?.dni ?? "");
  const [teamId, setTeamId] = useState(player?.team_id ?? teams[0]?.id ?? "");
  const [size, setSize] = useState<ClothingSize | "">(player?.clothing_size ?? "");
  const [address, setAddress] = useState(player?.address ?? "");
  const [licenseCompleted, setLicenseCompleted] = useState(player?.license_completed ?? false);
  const [papersReceived, setPapersReceived] = useState(player?.registration_papers_received ?? false);
  const [medicalNotes, setMedicalNotes] = useState(player?.medical_notes ?? "");
  const [contacts, setContacts] = useState<ContactDraft[]>(() => toFamilyDrafts(player?.contacts ?? []));
  const [selfPhone, setSelfPhone] = useState(
    () => selfContactFrom(player?.contacts ?? [], player?.birth_date ?? null).phone,
  );
  const [selfEmail, setSelfEmail] = useState(
    () => selfContactFrom(player?.contacts ?? [], player?.birth_date ?? null).email,
  );

  const isAdult = useMemo(() => isLegalAdult(birthDate || null), [birthDate]);
  const readOnly = !canWrite;
  const saveLabel = pending ? "Guardando…" : player ? "Guardar ficha" : "Dar de alta";
  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: `${team.name} · ${formatTeamCategory(team.category)}`,
  }));

  function updateContact(index: number, patch: Partial<ContactDraft>) {
    setContacts((prev) => prev.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));
  }

  function handleBirthDateChange(value: string) {
    const wasAdult = isLegalAdult(birthDate || null);
    const nextAdult = isLegalAdult(value || null);
    setBirthDate(value);

    if (nextAdult && !wasAdult) {
      setSelfPhone((prev) => prev.trim() || contacts[0]?.phone || "");
      setSelfEmail((prev) => prev.trim() || contacts[0]?.email || "");
    }

    if (!nextAdult && wasAdult) {
      setContacts((prev) => {
        const list = prev.length ? prev : [emptyContact()];
        const first = list[0] ?? emptyContact();
        return [
          {
            ...first,
            phone: first.phone.trim() || selfPhone,
            email: first.email.trim() || selfEmail,
          },
          ...list.slice(1),
        ];
      });
    }
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canWrite) return;

    const nextErrors: FieldErrors = {};
    if (!firstName.trim()) nextErrors.firstName = "Indica el nombre";
    if (!lastName.trim()) nextErrors.lastName = "Indica los apellidos";
    if (!teamId) nextErrors.teamId = "Selecciona un equipo";
    setFieldErrors(nextErrors);
    if (nextErrors.firstName || nextErrors.lastName || nextErrors.teamId) {
      appToast.error("Faltan datos para guardar la ficha");
      return;
    }

    if (!isAdult) {
      const incomplete = contacts.some(
        (contact) => !contact.full_name.trim() && (contact.phone.trim() || contact.email.trim()),
      );
      if (incomplete) {
        appToast.error("Pon el nombre del tutor si indicas teléfono o email");
        return;
      }
    }

    const draftContacts: {
      full_name: string;
      relationship: ContactRelationship;
      phone: string;
      email: string;
      is_primary: boolean;
    }[] = isAdult
      ? [
          {
            full_name: `${firstName} ${lastName}`.trim(),
            relationship: "jugador",
            phone: selfPhone,
            email: selfEmail,
            is_primary: true,
          },
        ]
      : contacts
          .filter((contact) => contact.full_name.trim())
          .map((contact, index) => ({
            ...contact,
            is_primary: index === 0,
          }));

    const payload = {
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate || null,
      dni: dni || undefined,
      team_id: teamId,
      season,
      license_completed: licenseCompleted,
      registration_papers_received: papersReceived,
      medical_notes: medicalNotes || undefined,
      clothing_size: size || null,
      address: address || undefined,
      is_active: player?.is_active ?? true,
      contacts: contactsForPlayerAge({
        birthDate: birthDate || null,
        firstName,
        lastName,
        contacts: draftContacts,
      }),
      ...(player ? { id: player.id } : {}),
    };

    startTransition(async () => {
      const result = player ? await updatePlayerAction(payload) : await createPlayerAction(payload);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(player ? "Ficha guardada" : "Jugador dado de alta");
      if (player) {
        router.refresh();
      } else {
        router.push(appRoutes.players.list);
        router.refresh();
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="section-title">Identidad</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Nombre"
              name="first_name"
              className="min-h-11"
              autoComplete="given-name"
              value={firstName}
              disabled={readOnly}
              error={fieldErrors.firstName ? { type: "manual", message: fieldErrors.firstName } : undefined}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
              }}
              required
            />
            <FormInput
              label="Apellidos"
              name="last_name"
              className="min-h-11"
              autoComplete="family-name"
              value={lastName}
              disabled={readOnly}
              error={fieldErrors.lastName ? { type: "manual", message: fieldErrors.lastName } : undefined}
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
              }}
              required
            />
            <div className="flex flex-col gap-1.5">
              <FormDate
                label="Fecha de nacimiento"
                name="birth_date"
                className="min-h-11"
                value={birthDate}
                disabled={readOnly}
                onChange={(e) => handleBirthDateChange(e.target.value)}
              />
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {birthDate ? (
                  <>
                    <Badge variant={isAdult ? "info" : "secondary"} className="text-[11px]">
                      {isAdult ? "Mayor de edad" : "Menor"}
                    </Badge>
                    <span>
                      {isAdult
                        ? "El teléfono y el email son los del jugador."
                        : "El contacto es de madre, padre o tutor."}
                    </span>
                  </>
                ) : (
                  "Si no hay fecha, la ficha se trata como menor."
                )}
              </p>
            </div>
            <FormInput
              label="DNI / NIE"
              name="dni"
              className="min-h-11 uppercase"
              autoComplete="off"
              value={dni}
              disabled={readOnly}
              onChange={(e) => setDni(e.target.value.toUpperCase())}
            />
          </div>
          <FormTextarea
            label="Dirección"
            name="address"
            rows={2}
            maxLength={300}
            className="min-h-[4.5rem] resize-none"
            placeholder="Calle, número, código postal, municipio"
            value={address}
            disabled={readOnly}
            onChange={(e) => setAddress(e.target.value)}
          />
        </section>

        <section className="flex flex-col gap-4 border-t border-[var(--club-border)] pt-8">
          <h2 className="section-title">Equipo y talla</h2>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Crea un equipo para asignar el equipo principal.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <FormSelect
                  label="Equipo principal"
                  name="team_id"
                  value={teamId}
                  disabled={readOnly}
                  error={fieldErrors.teamId ? { type: "manual", message: fieldErrors.teamId } : undefined}
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    if (fieldErrors.teamId) setFieldErrors((prev) => ({ ...prev, teamId: undefined }));
                  }}
                  options={teamOptions}
                  placeholder="Selecciona equipo…"
                />
              </div>
              {canWrite ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-fit shrink-0"
                  onClick={() => setTeamSheetOpen(true)}
                >
                  <Plus className="size-4" aria-hidden />
                  Nuevo equipo
                </Button>
              ) : null}
            </div>
          )}
          {teams.length === 0 && canWrite ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-fit"
              onClick={() => setTeamSheetOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Nuevo equipo
            </Button>
          ) : null}
          <SizePicker
            value={size}
            onChange={setSize}
            id="player-size"
            clearable={canWrite}
            disabled={readOnly}
          />
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--club-border)] pt-8">
          <h2 className="section-title">Trámites</h2>
          <ToggleRow
            id="license"
            label="Licencia realizada"
            hint="Federativa de la temporada"
            checked={licenseCompleted}
            disabled={readOnly}
            onChange={setLicenseCompleted}
          />
          <ToggleRow
            id="papers"
            label="Papeles de inscripción entregados"
            checked={papersReceived}
            disabled={readOnly}
            onChange={setPapersReceived}
          />
        </section>

        <section className="flex flex-col gap-4 border-t border-[var(--club-border)] pt-8">
          <h2 className="section-title">Salud</h2>
          <FormTextarea
            label="Enfermedades o patologías detectadas"
            name="medical_notes"
            rows={3}
            maxLength={2000}
            className="min-h-[6rem] resize-none"
            placeholder="Alergias, asma, lesiones… Lo ve dirección y cuerpo técnico."
            value={medicalNotes}
            disabled={readOnly}
            onChange={(e) => setMedicalNotes(e.target.value)}
          />
        </section>

        <section className="flex flex-col gap-4 border-t border-[var(--club-border)] pt-8">
          {isAdult ? (
            <>
              <div>
                <h2 className="section-title">Contacto del jugador</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Al ser mayor de edad, el teléfono y el email son los suyos, no los de un tutor.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Teléfono"
                  name="player-phone"
                  className="min-h-11"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={selfPhone}
                  disabled={readOnly}
                  onChange={(e) => setSelfPhone(e.target.value)}
                />
                <FormInput
                  label="Email"
                  name="player-email"
                  className="min-h-11"
                  type="email"
                  autoComplete="email"
                  value={selfEmail}
                  disabled={readOnly}
                  onChange={(e) => setSelfEmail(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">Contacto familiar</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Madre, padre o tutor. No hace falta que tengan cuenta en el portal.
                  </p>
                </div>
                {canWrite && contacts.length < 2 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-11 shrink-0"
                    onClick={() =>
                      setContacts((prev) => [
                        ...prev,
                        { ...emptyContact(), relationship: prev[0]?.relationship === "madre" ? "padre" : "madre" },
                      ])
                    }
                  >
                    <Plus className="size-4" aria-hidden />
                    Añadir
                  </Button>
                ) : null}
              </div>

              {contacts.map((contact, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-4 rounded-xl border border-[var(--club-border)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {index === 0 ? "Contacto principal" : "Segundo contacto"}
                    </p>
                    {canWrite && contacts.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-muted-foreground hover:text-destructive"
                        onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))}
                        aria-label="Quitar contacto"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                  <FormInput
                    label="Nombre"
                    name={`contact-name-${index}`}
                    className="min-h-11"
                    value={contact.full_name}
                    disabled={readOnly}
                    onChange={(e) => updateContact(index, { full_name: e.target.value })}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label>Parentesco</Label>
                    {readOnly ? (
                      <p className="flex min-h-11 items-center text-sm text-foreground">
                        {GUARDIAN_RELATIONSHIP_LABELS[contact.relationship]}
                      </p>
                    ) : (
                      <SegmentedControl
                        aria-label={`Parentesco del contacto ${index + 1}`}
                        value={contact.relationship}
                        onChange={(value) => updateContact(index, { relationship: value })}
                        options={GUARDIAN_RELATIONSHIPS.map((item) => ({
                          value: item,
                          label: GUARDIAN_RELATIONSHIP_LABELS[item],
                        }))}
                      />
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      label="Teléfono"
                      name={`contact-phone-${index}`}
                      className="min-h-11"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={contact.phone}
                      disabled={readOnly}
                      onChange={(e) => updateContact(index, { phone: e.target.value })}
                    />
                    <FormInput
                      label="Email"
                      name={`contact-email-${index}`}
                      className="min-h-11"
                      type="email"
                      autoComplete="email"
                      value={contact.email}
                      disabled={readOnly}
                      onChange={(e) => updateContact(index, { email: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        {canWrite ? (
          <div className="clothing-toolbar hidden border-t border-[var(--club-border)] pt-6 md:flex">
            <Button type="submit" disabled={pending}>
              {saveLabel}
            </Button>
          </div>
        ) : null}
      </form>

      <TeamCreateSheet
        open={teamSheetOpen}
        onClose={() => setTeamSheetOpen(false)}
        season={season}
        onCreated={setTeamId}
      />

      {canWrite ? (
        <ClothingStickyActionBar
          actions={[
            {
              type: "button",
              label: saveLabel,
              pending,
              onClick: () => handleSubmit(),
            },
          ]}
        />
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Shirt,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import type { FieldError } from "react-hook-form";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { FormDate, FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { SegmentedControl } from "@/components/club/SegmentedControl";
import { SizePicker } from "@/components/clothing/SizePicker";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { TeamCreateSheet } from "@/components/roster/TeamCreateSheet";
import { PlayerPhotoSection } from "@/components/roster/PlayerPhotoSection";
import { PlayerStatusActions } from "@/components/roster/PlayerStatusActions";
import {
  createPlayerAction,
  deletePlayersAction,
  setPlayerActiveAction,
  updatePlayerAction,
} from "@/lib/actions/roster/players";
import { contactsForPlayerAge, isLegalAdult } from "@/lib/roster/age";
import {
  formatPlayerAddress,
  hasStructuredAddress,
  provinceSelectOptions,
  streetTypeSelectOptions,
} from "@/lib/roster/address";
import {
  DEFAULT_PLAYER_PROVINCE,
  formatTeamCategory,
  GUARDIAN_RELATIONSHIP_LABELS,
  GUARDIAN_RELATIONSHIPS,
  type ContactRelationship,
  type GuardianRelationship,
} from "@/lib/roster/constants";
import { isNieDocument, isSpanishNationality } from "@/lib/roster/document";
import {
  docsDeliveredAtToInput,
  formatDocsDeliveredShort,
  getPlayerOnboardingStatus,
  isDocsDeliveryDateRelevant,
} from "@/lib/roster/onboarding";
import { getPlayerProfileCompleteness } from "@/lib/roster/profile-completeness";
import { createPlayerSchema, updatePlayerSchema } from "@/lib/roster/schemas";
import {
  firstPlayerErrorField,
  focusPlayerField,
  mapPlayerSchemaIssues,
} from "@/lib/roster/validators";
import { appRoutes } from "@/lib/constants";
import { getCurrentSeason } from "@/lib/season";
import type { ClothingSize, PlayerContact, PlayerWithDetails, Team } from "@/lib/types/db";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const stickyActionClass = "min-h-9 h-9 px-3 text-sm";

function todayIsoDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function toFieldError(errors: Record<string, string>, name: string): FieldError | undefined {
  const message = errors[name];
  return message ? { type: "manual", message } : undefined;
}

type ContactDraft = {
  full_name: string;
  relationship: GuardianRelationship;
  phone: string;
  email: string;
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

type PlayerFormSnapshot = {
  firstName: string;
  lastName: string;
  birthDate: string;
  dni: string;
  birthCountry: string;
  nationality: string;
  teamId: string;
  size: ClothingSize | "";
  streetType: string;
  street: string;
  streetNumber: string;
  door: string;
  postalCode: string;
  municipality: string;
  province: string;
  licenseCompleted: boolean;
  papersReceived: boolean;
  docsDelivered: boolean;
  docsDeliveredAt: string;
  photoTaken: boolean;
  photoConsent: boolean;
  inWhatsappGroup: boolean;
  paysExtendedMonthly: boolean;
  medicalNotes: string;
  contacts: ContactDraft[];
  selfPhone: string;
  selfEmail: string;
};

function snapshotKey(snapshot: PlayerFormSnapshot): string {
  return JSON.stringify(snapshot);
}

function buildFormSnapshot(input: PlayerFormSnapshot): PlayerFormSnapshot {
  return {
    ...input,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: input.birthDate.trim(),
    dni: input.dni.trim(),
    birthCountry: input.birthCountry.trim(),
    nationality: input.nationality.trim(),
    teamId: input.teamId,
    size: input.size,
    streetType: input.streetType.trim(),
    street: input.street.trim(),
    streetNumber: input.streetNumber.trim(),
    door: input.door.trim(),
    postalCode: input.postalCode.trim(),
    municipality: input.municipality.trim(),
    province: input.province.trim(),
    medicalNotes: input.medicalNotes.trim(),
    selfPhone: input.selfPhone.trim(),
    selfEmail: input.selfEmail.trim(),
    contacts: input.contacts.map((c) => ({
      full_name: c.full_name.trim(),
      relationship: c.relationship,
      phone: c.phone.trim(),
      email: c.email.trim(),
    })),
  };
}

function selfContactFrom(contacts: PlayerContact[], birthDate: string | null) {
  const self = contacts.find((contact) => contact.relationship === "jugador");
  const source = self ?? (isLegalAdult(birthDate) ? contacts[0] : undefined);
  return { phone: source?.phone ?? "", email: source?.email ?? "" };
}

function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof UserRound;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--club-surface-2)] text-muted-foreground"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <h2 className="section-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  step,
  compact,
  trailing,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  step?: number;
  compact?: boolean;
  /** Contenido a la derecha del título/subtítulo (antes del switch). */
  trailing?: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-xl border border-[var(--club-border)]",
        compact ? "min-h-10 px-3 py-2" : "min-h-11 px-3 py-2.5 md:px-4",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        {step != null ? (
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
              checked
                ? "bg-success/15 text-success"
                : "bg-[var(--club-surface-2)] text-muted-foreground",
            )}
          >
            {step}
          </span>
        ) : null}
        <span className="min-w-0">
          <span id={`${id}-label`} className="block text-sm font-medium text-foreground">
            {label}
          </span>
          {hint ? (
            <span id={hintId} className="mt-0.5 block text-xs text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>
      </span>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
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
  canDelete = false,
}: {
  teams: Team[];
  player?: PlayerWithDetails;
  canWrite: boolean;
  /** Hard delete — solo admin. */
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const season = player?.season ?? getCurrentSeason();

  const [firstName, setFirstName] = useState(player?.first_name ?? "");
  const [lastName, setLastName] = useState(player?.last_name ?? "");
  const [birthDate, setBirthDate] = useState(player?.birth_date ?? "");
  const [dni, setDni] = useState(player?.dni ?? "");
  const [birthCountry, setBirthCountry] = useState(player?.birth_country ?? "");
  const [nationality, setNationality] = useState(player?.nationality ?? "");
  const [teamId, setTeamId] = useState(player?.team_id ?? teams[0]?.id ?? "");
  const [size, setSize] = useState<ClothingSize | "">(player?.clothing_size ?? "");
  const [streetType, setStreetType] = useState(player?.address_street_type ?? "");
  const [street, setStreet] = useState(player?.address_street ?? "");
  const [streetNumber, setStreetNumber] = useState(player?.address_number ?? "");
  const [door, setDoor] = useState(player?.address_door ?? "");
  const [postalCode, setPostalCode] = useState(player?.address_postal_code ?? "");
  const [municipality, setMunicipality] = useState(player?.address_municipality ?? "");
  const [province, setProvince] = useState(player?.address_province ?? DEFAULT_PLAYER_PROVINCE);
  const [licenseCompleted, setLicenseCompleted] = useState(player?.license_completed ?? false);
  const [papersReceived, setPapersReceived] = useState(player?.registration_papers_received ?? false);
  const [docsDelivered, setDocsDelivered] = useState(player?.docs_delivered_to_family ?? false);
  const [docsDeliveredAt, setDocsDeliveredAt] = useState(
    () => docsDeliveredAtToInput(player?.docs_delivered_at),
  );
  const [photoTaken, setPhotoTaken] = useState(player?.photo_taken ?? false);
  const [photoConsent, setPhotoConsent] = useState(player?.photo_consent ?? false);
  const [inWhatsappGroup, setInWhatsappGroup] = useState(player?.in_whatsapp_group ?? false);
  const [paysExtendedMonthly, setPaysExtendedMonthly] = useState(
    player?.pays_extended_monthly ?? false,
  );
  const [medicalNotes, setMedicalNotes] = useState(player?.medical_notes ?? "");
  const [contacts, setContacts] = useState<ContactDraft[]>(() => toFamilyDrafts(player?.contacts ?? []));
  const [selfPhone, setSelfPhone] = useState(
    () => selfContactFrom(player?.contacts ?? [], player?.birth_date ?? null).phone,
  );
  const [selfEmail, setSelfEmail] = useState(
    () => selfContactFrom(player?.contacts ?? [], player?.birth_date ?? null).email,
  );
  const [altaExpanded, setAltaExpanded] = useState(() => {
    if (!player) return true;
    return !getPlayerOnboardingStatus(player).isComplete;
  });

  const currentSnapshot = useMemo(
    () =>
      buildFormSnapshot({
        firstName,
        lastName,
        birthDate,
        dni,
        birthCountry,
        nationality,
        teamId,
        size,
        streetType,
        street,
        streetNumber,
        door,
        postalCode,
        municipality,
        province,
        licenseCompleted,
        papersReceived,
        docsDelivered,
        docsDeliveredAt,
        photoTaken,
        photoConsent,
        inWhatsappGroup,
        paysExtendedMonthly,
        medicalNotes,
        contacts,
        selfPhone,
        selfEmail,
      }),
    [
      firstName,
      lastName,
      birthDate,
      dni,
      birthCountry,
      nationality,
      teamId,
      size,
      streetType,
      street,
      streetNumber,
      door,
      postalCode,
      municipality,
      province,
      licenseCompleted,
      papersReceived,
      docsDelivered,
      docsDeliveredAt,
      photoTaken,
      photoConsent,
      inWhatsappGroup,
      paysExtendedMonthly,
      medicalNotes,
      contacts,
      selfPhone,
      selfEmail,
    ],
  );

  const [savedSnapshotKey, setSavedSnapshotKey] = useState(() =>
    player ? snapshotKey(currentSnapshot) : "",
  );

  // Nuevo: siempre se puede guardar. Edición: solo con cambios pendientes.
  const isDirty = !player || snapshotKey(currentSnapshot) !== savedSnapshotKey;

  const isAdult = useMemo(() => isLegalAdult(birthDate || null), [birthDate]);
  const isNie = useMemo(() => isNieDocument(dni), [dni]);
  const showNieExtras =
    isNie || Boolean(birthCountry.trim()) || Boolean(nationality.trim() && !isSpanishNationality(nationality));
  const addressDraft = {
    street_type: streetType,
    street,
    number: streetNumber,
    door,
    postal_code: postalCode,
    municipality,
    province,
    fallback: player?.address ?? "",
  };
  const structuredAddress = hasStructuredAddress(addressDraft);
  const legacyAddress =
    !structuredAddress && player?.address?.trim() ? player.address.trim() : "";
  const onboarding = useMemo(
    () =>
      getPlayerOnboardingStatus({
        registration_papers_received: papersReceived,
        docs_delivered_to_family: docsDelivered,
        photo_taken: photoTaken,
        license_completed: licenseCompleted,
        docs_delivered_at: docsDeliveredAt || null,
      }),
    [papersReceived, docsDelivered, photoTaken, licenseCompleted, docsDeliveredAt],
  );
  const profileCompleteness = useMemo(() => {
    const draftContacts = isAdult
      ? [
          {
            full_name: `${firstName} ${lastName}`.trim(),
            relationship: "jugador",
            phone: selfPhone,
            email: selfEmail,
          },
        ]
      : contacts.map((contact) => ({
          full_name: contact.full_name,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email,
        }));

    return getPlayerProfileCompleteness({
      first_name: firstName,
      last_name: lastName,
      dni,
      birth_date: birthDate || null,
      birth_country: birthCountry,
      address_street_type: streetType,
      address_street: street,
      address_number: streetNumber,
      address_postal_code: postalCode,
      address_municipality: municipality,
      address_province: province,
      contacts: draftContacts,
    });
  }, [
    isAdult,
    firstName,
    lastName,
    selfPhone,
    selfEmail,
    contacts,
    dni,
    birthDate,
    birthCountry,
    streetType,
    street,
    streetNumber,
    postalCode,
    municipality,
    province,
  ]);
  const showDocsDate = isDocsDeliveryDateRelevant({
    docs_delivered_to_family: docsDelivered,
    registration_papers_received: papersReceived,
  });
  const docsDateLabel = formatDocsDeliveredShort(
    showDocsDate && docsDeliveredAt ? `${docsDeliveredAt}T12:00:00` : null,
  );
  const readOnly = !canWrite;
  const canSave = canWrite && !pending && (!player || isDirty);
  const saveLabel = pending ? "Guardando…" : player ? "Guardar ficha" : "Dar de alta";
  const saveDisabledReason =
    player && !isDirty && !pending ? "Sin cambios pendientes" : undefined;
  const teamOptions = [
    { value: "", label: "Sin equipo" },
    ...teams.map((team) => ({
      value: team.id,
      label: `${team.name} · ${formatTeamCategory(team.category)}`,
    })),
  ];
  const altaCollapsible = onboarding.isComplete;
  const showAltaSteps = !altaCollapsible || altaExpanded;

  useEffect(() => {
    if (!onboarding.isComplete) setAltaExpanded(true);
  }, [onboarding.isComplete]);

  function clearError(name: string) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleDocsDeliveredChange(value: boolean) {
    setDocsDelivered(value);
    if (value) {
      setDocsDeliveredAt((prev) => prev || docsDeliveredAtToInput(new Date().toISOString()));
    } else {
      setDocsDeliveredAt("");
    }
  }

  function updateContact(index: number, patch: Partial<ContactDraft>) {
    setContacts((prev) => prev.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));
    if (patch.full_name != null) clearError(`contact-name-${index}`);
    if (patch.relationship != null) clearError(`contact-relationship-${index}`);
    if (patch.phone != null) clearError(`contact-phone-${index}`);
    if (patch.email != null) clearError(`contact-email-${index}`);
  }

  function handleBirthDateChange(value: string) {
    const wasAdult = isLegalAdult(birthDate || null);
    const nextAdult = isLegalAdult(value || null);
    setBirthDate(value);
    clearError("birth_date");

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
    if (player && !isDirty) return;

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
      : contacts.map((contact, index) => ({
          ...contact,
          is_primary: index === 0,
        }));

    const payload = {
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      dni,
      team_id: teamId || null,
      season,
      license_completed: licenseCompleted,
      registration_papers_received: papersReceived,
      docs_delivered_to_family: docsDelivered,
      docs_delivered_at: docsDelivered ? docsDeliveredAt || null : null,
      photo_taken: photoTaken,
      photo_consent: photoConsent,
      in_whatsapp_group: inWhatsappGroup,
      pays_extended_monthly: paysExtendedMonthly,
      medical_notes: medicalNotes || undefined,
      clothing_size: size || null,
      address: formatPlayerAddress(addressDraft) || undefined,
      address_street_type: streetType,
      address_street: street,
      address_number: streetNumber,
      address_door: door || undefined,
      address_postal_code: postalCode,
      address_municipality: municipality,
      address_province: province,
      birth_country: birthCountry || undefined,
      nationality: nationality || undefined,
      is_active: player?.is_active ?? true,
      contacts: contactsForPlayerAge({
        birthDate: birthDate || null,
        firstName,
        lastName,
        contacts: draftContacts,
      }),
      ...(player ? { id: player.id } : {}),
    };

    const parsed = player ? updatePlayerSchema.safeParse(payload) : createPlayerSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = mapPlayerSchemaIssues(parsed.error.issues, isAdult);
      setFieldErrors(errors);
      const count = Object.keys(errors).length;
      appToast.error(count === 1 ? "Revisa el campo marcado" : `Revisa los ${count} campos marcados`);
      const first = firstPlayerErrorField(errors);
      if (first) requestAnimationFrame(() => focusPlayerField(first));
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = player ? await updatePlayerAction(payload) : await createPlayerAction(payload);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(player ? "Ficha guardada" : "Jugador dado de alta");
      if (player) {
        setSavedSnapshotKey(snapshotKey(currentSnapshot));
        router.refresh();
      } else {
        router.push(appRoutes.players.list);
        router.refresh();
      }
    });
  }

  return (
    <div className="clothing-page-with-sticky clothing-page-with-sticky--tall flex min-h-full flex-col md:-mt-4">
      {/* Desktop: sticky flush con el borde del main (compensa py-4 / lg:py-6) */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 hidden border-b border-[var(--club-border)] bg-[var(--club-bg)]/95 px-4 py-2 backdrop-blur-sm md:-mx-6 md:top-[-1rem] md:flex md:items-center md:justify-between md:gap-3 md:px-6 lg:top-[-1.5rem]">
        <div className="min-w-0 flex-1">
          {!profileCompleteness.isComplete ? (
            <div
              role="status"
              className="flex min-w-0 items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--club-warning)_45%,var(--club-border))] bg-[var(--club-warning-muted)] px-2.5 py-1.5"
            >
              <AlertTriangle
                className="size-3.5 shrink-0 text-[var(--club-warning-strong)]"
                aria-hidden
              />
              <p className="min-w-0 truncate text-xs text-foreground">
                <span className="font-semibold">Ficha incompleta</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {profileCompleteness.missingFields.join(", ")}
                </span>
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={appRoutes.players.list} className={cn("btn-secondary", stickyActionClass)}>
            Volver
          </Link>
          {canWrite && player ? <PlayerStatusActions player={player} /> : null}
          {canWrite ? (
            <Button
              type="button"
              className={stickyActionClass}
              disabled={!canSave}
              title={saveDisabledReason}
              onClick={() => handleSubmit()}
            >
              {saveLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <form
        noValidate
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-6 md:gap-5"
      >
        {!profileCompleteness.isComplete ? (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--club-warning)_45%,var(--club-border))] bg-[var(--club-warning-muted)] px-3 py-2.5 md:hidden"
          >
            <p className="text-sm font-semibold text-foreground">Ficha incompleta</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Faltan datos de la ficha web (aparte del alta federativa):{" "}
              {profileCompleteness.missingFields.join(", ")}.
            </p>
          </div>
        ) : null}

        <section className="flex flex-col gap-3 md:gap-2.5">
          <SectionHeading icon={UserRound} title="Identidad" />
          <div className="grid gap-3 sm:grid-cols-2 md:gap-2.5">
            <FormInput
              label="Nombre"
              name="first_name"
              className="min-h-11 md:min-h-10"
              value={firstName}
              disabled={readOnly}
              required
              error={toFieldError(fieldErrors, "first_name")}
              onChange={(e) => {
                setFirstName(e.target.value);
                clearError("first_name");
              }}
            />
            <FormInput
              label="Apellidos"
              name="last_name"
              className="min-h-11 md:min-h-10"
              value={lastName}
              disabled={readOnly}
              required
              error={toFieldError(fieldErrors, "last_name")}
              onChange={(e) => {
                setLastName(e.target.value);
                clearError("last_name");
              }}
            />
            <div className="flex flex-col gap-1.5">
              <FormDate
                label="Fecha de nacimiento"
                name="birth_date"
                className="min-h-11 md:min-h-10"
                value={birthDate}
                disabled={readOnly}
                required
                max={todayIsoDate()}
                error={toFieldError(fieldErrors, "birth_date")}
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
            <div className="flex flex-col gap-1.5">
              <FormInput
                label="DNI / NIE"
                name="dni"
                className="min-h-11 uppercase md:min-h-10"
                value={dni}
                disabled={readOnly}
                required
                error={toFieldError(fieldErrors, "dni")}
                onChange={(e) => {
                  setDni(e.target.value.toUpperCase());
                  clearError("dni");
                }}
              />
              {isNie ? (
                <p className="text-xs text-muted-foreground">
                  NIE: indica país de nacimiento
                  {nationality.trim() ? "" : " y la nacionalidad si no es española"}.
                </p>
              ) : null}
            </div>
            {showNieExtras ? (
              <>
                <FormInput
                  label="País de nacimiento"
                  name="birth_country"
                  className="min-h-11 md:min-h-10"
                  value={birthCountry}
                  disabled={readOnly}
                  required={isNie}
                  error={toFieldError(fieldErrors, "birth_country")}
                  onChange={(e) => {
                    setBirthCountry(e.target.value);
                    clearError("birth_country");
                  }}
                />
                <div className="flex flex-col gap-1.5">
                  <FormInput
                    label="Nacionalidad"
                    name="nationality"
                    className="min-h-11 md:min-h-10"
                    placeholder="Si no es española"
                    value={nationality}
                    disabled={readOnly}
                    error={toFieldError(fieldErrors, "nationality")}
                    onChange={(e) => {
                      setNationality(e.target.value);
                      clearError("nationality");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Déjalo vacío si es española.</p>
                </div>
              </>
            ) : null}
          </div>
        </section>

        {canWrite && player ? (
          <PlayerPhotoSection
            playerId={player.id}
            hasPhoto={Boolean(player.photo_path)}
            playerName={`${firstName} ${lastName}`.trim() || player.full_name}
            onPhotoConfirmed={(marked) => {
              // La foto ya está en Storage + photo_path (y photo_taken si procedía).
              // Solo sincronizamos el checklist local sin marcar la ficha como sucia.
              if (!marked) return;
              setPhotoTaken(true);
              setSavedSnapshotKey(
                snapshotKey(
                  buildFormSnapshot({
                    ...currentSnapshot,
                    photoTaken: true,
                  }),
                ),
              );
            }}
          />
        ) : null}

        <section className="flex flex-col gap-3 border-t border-[var(--club-border)] pt-5 md:gap-2.5 md:pt-4">
          <SectionHeading icon={MapPin} title="Domicilio" />
          <div className="grid gap-3 sm:grid-cols-2 md:gap-2.5">
            <FormSelect
              label="Tipo de vía"
              name="address_street_type"
              value={streetType}
              disabled={readOnly}
              required
              placeholder="Calle, avenida…"
              options={streetTypeSelectOptions()}
              error={toFieldError(fieldErrors, "address_street_type")}
              onChange={(e) => {
                setStreetType(e.target.value);
                clearError("address_street_type");
              }}
            />
            <FormInput
              label="Vía"
              name="address_street"
              className="min-h-11 md:min-h-10"
              placeholder="Nombre de la calle"
              value={street}
              disabled={readOnly}
              required
              error={toFieldError(fieldErrors, "address_street")}
              onChange={(e) => {
                setStreet(e.target.value);
                clearError("address_street");
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-2.5">
            <FormInput
              label="Número"
              name="address_number"
              className="min-h-11 md:min-h-10"
              placeholder="s/n"
              value={streetNumber}
              disabled={readOnly}
              required
              error={toFieldError(fieldErrors, "address_number")}
              onChange={(e) => {
                setStreetNumber(e.target.value);
                clearError("address_number");
              }}
            />
            <FormInput
              label="Piso / puerta"
              name="address_door"
              className="min-h-11 md:min-h-10"
              value={door}
              disabled={readOnly}
              onChange={(e) => setDoor(e.target.value)}
            />
            <FormInput
              label="Código postal"
              name="address_postal_code"
              className="col-span-2 min-h-11 md:col-span-1 md:min-h-10"
              inputMode="numeric"
              maxLength={5}
              value={postalCode}
              disabled={readOnly}
              required
              error={toFieldError(fieldErrors, "address_postal_code")}
              onChange={(e) => {
                setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5));
                clearError("address_postal_code");
              }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:gap-2.5">
            <FormInput
              label="Municipio"
              name="address_municipality"
              className="min-h-11 md:min-h-10"
              value={municipality}
              disabled={readOnly}
              required
              error={toFieldError(fieldErrors, "address_municipality")}
              onChange={(e) => {
                setMunicipality(e.target.value);
                clearError("address_municipality");
              }}
            />
            <FormSelect
              label="Provincia"
              name="address_province"
              value={province}
              disabled={readOnly}
              required
              placeholder="Provincia"
              options={provinceSelectOptions(province)}
              error={toFieldError(fieldErrors, "address_province")}
              onChange={(e) => {
                setProvince(e.target.value);
                clearError("address_province");
              }}
            />
          </div>
          {legacyAddress ? (
            <p className="text-xs text-muted-foreground">
              Dirección anterior: {legacyAddress}. Se actualiza al rellenar los campos.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--club-border)] pt-5 md:gap-2.5 md:pt-4">
          <SectionHeading icon={Shirt} title="Equipo y talla" />
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Crea un equipo para asignar el equipo principal.</p>
          ) : (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <FormSelect
                  label="Equipo principal"
                  name="team_id"
                  value={teamId}
                  disabled={readOnly}
                  onChange={(e) => setTeamId(e.target.value)}
                  options={teamOptions}
                  placeholder="Selecciona equipo…"
                />
              </div>
              {canWrite ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 min-h-11 w-fit shrink-0"
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
              className="h-11 min-h-11 w-fit"
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

        <section className="flex flex-col gap-3 border-t border-[var(--club-border)] pt-5 md:gap-2.5 md:pt-4">
          {isAdult ? (
            <>
              <SectionHeading icon={Phone} title="Contacto del jugador" />
              <div className="grid gap-3 sm:grid-cols-2 md:gap-2.5">
                <FormInput
                  label="Teléfono"
                  name="player-phone"
                  className="min-h-11 md:min-h-10"
                  type="tel"
                  inputMode="tel"
                  value={selfPhone}
                  disabled={readOnly}
                  required
                  error={toFieldError(fieldErrors, "player-phone")}
                  onChange={(e) => {
                    setSelfPhone(e.target.value);
                    clearError("player-phone");
                  }}
                />
                <FormInput
                  label="Email"
                  name="player-email"
                  className="min-h-11 md:min-h-10"
                  type="email"
                  value={selfEmail}
                  disabled={readOnly}
                  required
                  error={toFieldError(fieldErrors, "player-email")}
                  onChange={(e) => {
                    setSelfEmail(e.target.value);
                    clearError("player-email");
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <SectionHeading
                icon={Phone}
                title="Contacto familiar"
                action={
                  canWrite && contacts.length < 2 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-10 shrink-0"
                      onClick={() =>
                        setContacts((prev) => [
                          ...prev,
                          {
                            ...emptyContact(),
                            relationship: prev[0]?.relationship === "madre" ? "padre" : "madre",
                          },
                        ])
                      }
                    >
                      <Plus className="size-4" aria-hidden />
                      Añadir
                    </Button>
                  ) : null
                }
              />

              {contacts.map((contact, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border px-3 py-3 md:gap-2.5 md:px-3.5 md:py-3",
                    toFieldError(fieldErrors, `contact-name-${index}`) ||
                      toFieldError(fieldErrors, `contact-phone-${index}`) ||
                      toFieldError(fieldErrors, `contact-email-${index}`)
                      ? "border-destructive/40"
                      : "border-[var(--club-border)]",
                  )}
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
                        className="min-h-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))}
                        aria-label="Quitar contacto"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 md:gap-2.5">
                    <FormInput
                      label="Nombre"
                      name={`contact-name-${index}`}
                      className="min-h-11 md:min-h-10"
                      value={contact.full_name}
                      disabled={readOnly}
                      required
                      error={toFieldError(fieldErrors, `contact-name-${index}`)}
                      onChange={(e) => updateContact(index, { full_name: e.target.value })}
                    />
                    <div className="flex flex-col gap-1.5">
                      <Label required>Parentesco</Label>
                      {readOnly ? (
                        <p className="flex min-h-10 items-center text-sm text-foreground">
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
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 md:gap-2.5">
                    <FormInput
                      label="Teléfono"
                      name={`contact-phone-${index}`}
                      className="min-h-11 md:min-h-10"
                      type="tel"
                      inputMode="tel"
                      value={contact.phone}
                      disabled={readOnly}
                      required
                      error={toFieldError(fieldErrors, `contact-phone-${index}`)}
                      onChange={(e) => updateContact(index, { phone: e.target.value })}
                    />
                    <FormInput
                      label="Email"
                      name={`contact-email-${index}`}
                      className="min-h-11 md:min-h-10"
                      type="email"
                      value={contact.email}
                      disabled={readOnly}
                      required
                      error={toFieldError(fieldErrors, `contact-email-${index}`)}
                      onChange={(e) => updateContact(index, { email: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--club-border)] pt-5 md:gap-2.5 md:pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionHeading icon={ClipboardCheck} title="Alta federativa" />
            <div className="flex items-center gap-2">
              <Badge variant={onboarding.isComplete ? "success" : "warning"} className="text-[11px]">
                {onboarding.summary}
                {showDocsDate && docsDateLabel ? ` · Docs ${docsDateLabel}` : null}
              </Badge>
              {altaCollapsible ? (
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--club-surface-2)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={showAltaSteps}
                  onClick={() => setAltaExpanded((open) => !open)}
                >
                  {showAltaSteps ? "Ocultar" : "Ver pasos"}
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", showAltaSteps && "rotate-180")}
                    aria-hidden
                  />
                </button>
              ) : null}
            </div>
          </div>

          {showAltaSteps ? (
            <ol className="flex flex-col gap-2 md:gap-1.5">
              <li>
                <ToggleRow
                  id="docs"
                  step={1}
                  compact
                  label="Docs entregados"
                  hint="Se los damos al jugador / familia"
                  checked={docsDelivered}
                  disabled={readOnly}
                  onChange={handleDocsDeliveredChange}
                  trailing={
                    showDocsDate ? (
                      <Input
                        id="docs_delivered_at"
                        name="docs_delivered_at"
                        type="date"
                        aria-label="Fecha de entrega de docs"
                        className="min-h-9 w-[9.75rem] px-2 text-xs md:min-h-8 md:w-[10.5rem]"
                        value={docsDeliveredAt}
                        disabled={readOnly}
                        onChange={(e) => setDocsDeliveredAt(e.target.value)}
                      />
                    ) : null
                  }
                />
              </li>
              <li>
                <ToggleRow
                  id="papers"
                  step={2}
                  compact
                  label="Papeles recibidos"
                  hint="Vuelven rellenos al club"
                  checked={papersReceived}
                  disabled={readOnly}
                  onChange={setPapersReceived}
                />
              </li>
              <li>
                <ToggleRow
                  id="photo"
                  step={3}
                  compact
                  label="Foto hecha"
                  hint="Para la ficha / licencia"
                  checked={photoTaken}
                  disabled={readOnly}
                  onChange={setPhotoTaken}
                />
              </li>
              <li>
                <ToggleRow
                  id="license"
                  step={4}
                  compact
                  label="Licencia realizada"
                  hint="Federativa de la temporada"
                  checked={licenseCompleted}
                  disabled={readOnly}
                  onChange={setLicenseCompleted}
                />
              </li>
            </ol>
          ) : null}
        </section>

        <section className="flex flex-col gap-2 border-t border-[var(--club-border)] pt-5 md:pt-4">
          <SectionHeading icon={Wallet} title="Cuotas" />
          <ToggleRow
            id="pays-extended-monthly"
            compact
            label="Cuota mensual ampliada (30 €)"
            hint="Por defecto 25 €. Solo aplica en categorías base (minivoley–júnior) al generar cuotas; en sénior/aficionados se ignora."
            checked={paysExtendedMonthly}
            disabled={readOnly}
            onChange={setPaysExtendedMonthly}
          />
        </section>

        <section className="flex flex-col gap-2 border-t border-[var(--club-border)] pt-5 md:pt-4">
          <SectionHeading icon={MessageCircle} title="Grupo y fotos" />
          <div className="grid gap-2 md:grid-cols-2 md:gap-2.5">
            <ToggleRow
              id="whatsapp"
              compact
              label="En grupo WhatsApp"
              checked={inWhatsappGroup}
              disabled={readOnly}
              onChange={setInWhatsappGroup}
            />
            <ToggleRow
              id="photo-consent"
              compact
              label="Autoriza fotos"
              hint="Redes, cartel, material del club"
              checked={photoConsent}
              disabled={readOnly}
              onChange={setPhotoConsent}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--club-border)] pt-5 md:gap-2.5 md:pt-4">
          <SectionHeading icon={HeartPulse} title="Salud" />
          <FormTextarea
            label="Enfermedades o patologías detectadas"
            name="medical_notes"
            rows={3}
            maxLength={2000}
            className="min-h-[5.5rem] resize-none md:min-h-[5rem]"
            placeholder="Alergias, asma, lesiones… Lo ve dirección y cuerpo técnico."
            value={medicalNotes}
            disabled={readOnly}
            onChange={(e) => setMedicalNotes(e.target.value)}
          />
        </section>

      </form>

      <TeamCreateSheet
        open={teamSheetOpen}
        onClose={() => setTeamSheetOpen(false)}
        season={season}
        onCreated={setTeamId}
      />

      {canDelete && player ? (
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => {
            if (!pending) setDeleteOpen(false);
          }}
          title={`Eliminar a ${firstName} ${lastName}`.trim() || "Eliminar jugador"}
          description="Borrado definitivo: se eliminan ficha, contactos y foto. Los pagos anotados se conservan sin jugador. No se puede deshacer."
          confirmLabel="Eliminar definitivamente"
          destructive
          pending={pending}
          onConfirm={() => {
            startTransition(async () => {
              const result = await deletePlayersAction({ player_ids: [player.id] });
              if (!result.ok) {
                appToast.error(result.error);
                return;
              }
              appToast.success("Jugador eliminado");
              setDeleteOpen(false);
              router.push(appRoutes.players.list);
              router.refresh();
            });
          }}
        />
      ) : null}

      <ClothingStickyActionBar
        layout="row"
        actions={[
          {
            type: "link",
            label: "Volver",
            href: appRoutes.players.list,
            variant: "secondary",
          },
          ...(canDelete && player
            ? [
                {
                  type: "button" as const,
                  label: "Eliminar",
                  variant: "secondary" as const,
                  onClick: () => setDeleteOpen(true),
                },
              ]
            : []),
          ...(canWrite && player
            ? [
                {
                  type: "button" as const,
                  label: player.is_active ? "Dar de baja" : "Reactivar",
                  variant: (player.is_active ? "secondary" : "primary") as "secondary" | "primary",
                  onClick: () => {
                    void (async () => {
                      const result = await setPlayerActiveAction({
                        id: player.id,
                        is_active: !player.is_active,
                      });
                      if (!result.ok) {
                        appToast.error(result.error);
                        return;
                      }
                      appToast.success(
                        player.is_active ? "Jugador dado de baja" : "Jugador reactivado",
                      );
                      router.refresh();
                    })();
                  },
                },
              ]
            : []),
          ...(canWrite
            ? [
                {
                  type: "button" as const,
                  label: saveLabel,
                  pending,
                  disabled: !canSave,
                  onClick: () => handleSubmit(),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

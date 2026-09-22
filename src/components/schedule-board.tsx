"use client";

import { useMemo, useState } from "react";
import { Lock, Pin } from "lucide-react";
import { boardHeader, todayIso, weekDates } from "@/shared/dates";
import { canPic, canRightSeat, occupiedIds } from "@/shared/validate";
import type { DayAircraftAssignment, DayPlan, DayStatus, Pilot } from "@/shared/types";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useOps } from "@/lib/ops-context";
import { pilotForEmail } from "@/lib/pilot-access";
import { PilotChip } from "./pilot-chip";

type Editor =
  | { kind: "aircraft"; date: string; aircraftId: string }
  | { kind: "duty"; date: string }
  | { kind: "offsite"; date: string }
  | { kind: "notes"; date: string }
  | null;

const STATUS_OPTIONS: { value: DayStatus; label: string }[] = [
  { value: "flying", label: "Flying" },
  { value: "mx", label: "MX" },
  { value: "deployed", label: "Deployed / off-site" },
  { value: "none", label: "No flights" },
];

export function ScheduleBoard() {
  const { week, aircraft, pilots, timeOff, updateAssignment, updateDay, setDutyOfficer } = useOps();
  const { email, isAdmin } = useAuth();
  const viewerId = pilotForEmail(pilots, email)?.id ?? null;
  const dates = weekDates(week.startDate);
  const [editor, setEditor] = useState<Editor>(null);
  const today = todayIso();
  const open = (next: Editor) => {
    if (isAdmin) setEditor(next);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#9aafc7] bg-white shadow-sm">
      <div className="bg-navy-800 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-red-200">
        All events and schedules are subject to change due to mission demand
      </div>
      <p className="no-print border-b border-[#9aafc7] bg-paper px-3 py-1.5 text-[11px] font-semibold text-muted md:hidden">
        Swipe sideways for the rest of the week. The assignment column stays put.
      </p>
      <div className="board-scroll">
        <table className="board-table">
          <thead>
            <tr>
              <th>Assignment</th>
              {dates.map((date) => (
                <th key={date} className={date === today ? "bg-[#25487a]" : undefined}>
                  {boardHeader(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aircraft
              .filter((item) => item.active)
              .map((item) => (
                <tr key={item.id}>
                  <th className="bg-navy-700 px-2.5 py-2 text-left text-xs font-bold text-white">
                    <div>{item.name}</div>
                    <div className="font-mono text-[10px] font-medium text-white/70">
                      {item.tailNumber}
                    </div>
                  </th>
                  {dates.map((date) => {
                    const assignment = week.days[date]?.aircraft[item.id];
                    const mine =
                      Boolean(viewerId) &&
                      (assignment?.picId === viewerId || assignment?.sicId === viewerId);
                    return (
                      <td key={date} className={cn(cellTone(assignment), mine && "ring-2 ring-inset ring-[#c45c26]")}>
                        <button
                          type="button"
                          className="block min-h-[72px] w-full p-1.5 text-left"
                          onClick={() => open({ kind: "aircraft", date, aircraftId: item.id })}
                        >
                          <AircraftCell
                            assignment={assignment}
                            pilots={pilots}
                            locked={assignment?.locked}
                            viewerId={viewerId}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            <tr>
              <th className="bg-[#ead1d6] px-2.5 py-2 text-left text-xs font-bold text-navy-900">
                Duty officer
              </th>
              {dates.map((date) => {
                const day = week.days[date];
                const officer = pilots.find((pilot) => pilot.id === day?.dutyOfficerId);
                const mine = Boolean(viewerId) && day?.dutyOfficerId === viewerId;
                return (
                  <td key={date} className={cn("bg-duty", mine && "ring-2 ring-inset ring-[#c45c26]")}>
                    <button
                      type="button"
                      className="block min-h-[52px] w-full p-1.5 text-left"
                      onClick={() => open({ kind: "duty", date })}
                    >
                      <div className="flex items-center justify-between">
                        <PilotChip pilot={officer} mine={mine} />
                        {day?.dutyOfficerLocked ? <Lock size={11} /> : null}
                      </div>
                    </button>
                  </td>
                );
              })}
            </tr>
            <tr>
              <th className="bg-[#f4d6d8] px-2.5 py-2 text-left text-xs font-bold text-navy-900">
                Off-site crew
              </th>
              {dates.map((date) => {
                const day = week.days[date];
                const names = (day?.offSiteCrewIds ?? [])
                  .map((id) => pilots.find((pilot) => pilot.id === id)?.name ?? id)
                  .join(" / ");
                const mine = Boolean(viewerId && (day?.offSiteCrewIds ?? []).includes(viewerId));
                return (
                  <td key={date} className={cn("bg-[#f8e4e6]", mine && "ring-2 ring-inset ring-[#c45c26]")}>
                    <button
                      type="button"
                      className="block min-h-[48px] w-full p-1.5 text-left text-[12px] font-semibold"
                      onClick={() => open({ kind: "offsite", date })}
                    >
                      {names || "—"}
                    </button>
                  </td>
                );
              })}
            </tr>
            <tr>
              <th className="bg-[#f3c6d3] px-2.5 py-2 text-left text-xs font-bold text-navy-900">
                Notes / PTO
              </th>
              {dates.map((date) => {
                const day = week.days[date];
                const pto = timeOff.filter((item) => item.date === date);
                return (
                  <td key={date} className="bg-note">
                    <button
                      type="button"
                      className="block min-h-[56px] w-full p-1.5 text-left text-[12px] leading-snug"
                      onClick={() => open({ kind: "notes", date })}
                    >
                      {pto.length > 0 ? (
                        <div className="font-semibold text-rose-900">
                          {pto
                            .map((item) => {
                              const name = pilots.find((pilot) => pilot.id === item.pilotId)?.name;
                              return `${name ?? item.pilotId} ${item.type.toUpperCase()}`;
                            })
                            .join(" · ")}
                        </div>
                      ) : null}
                      <div className="text-ink/80">{day?.notes || (pto.length ? "" : "—")}</div>
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {editor ? (
        <EditorModal
          editor={editor}
          onClose={() => setEditor(null)}
          onAssignment={updateAssignment}
          onDuty={setDutyOfficer}
          onDay={updateDay}
        />
      ) : null}
    </div>
  );
}

function cellTone(assignment?: DayAircraftAssignment): string {
  if (!assignment || assignment.status === "none") return "bg-off";
  if (assignment.status === "mx") return "bg-mx";
  if (assignment.status === "deployed") return "bg-deployed";
  if (!assignment.picId || !assignment.sicId) return "bg-amber-50";
  return "bg-white";
}

function AircraftCell({
  assignment,
  pilots,
  locked,
  viewerId,
}: {
  assignment?: DayAircraftAssignment;
  pilots: Pilot[];
  locked?: boolean;
  viewerId?: string | null;
}) {
  if (!assignment || assignment.status === "none") {
    return <StatusLabel text="No flights" />;
  }
  if (assignment.status === "mx") {
    return <StatusLabel text={assignment.note || "MX"} strong />;
  }
  if (assignment.status === "deployed" && !assignment.picId && !assignment.sicId) {
    return <StatusLabel text={assignment.note || "Deployed"} />;
  }
  const pic = pilots.find((pilot) => pilot.id === assignment.picId);
  const sic = pilots.find((pilot) => pilot.id === assignment.sicId);
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-1">
        <PilotChip pilot={pic} role="PIC" compact mine={Boolean(viewerId) && pic?.id === viewerId} />
        {locked ? <Pin size={11} className="mt-0.5 text-muted" /> : null}
      </div>
      <PilotChip pilot={sic} role="SIC" compact mine={Boolean(viewerId) && sic?.id === viewerId} />
      {assignment.note ? (
        <div className="text-[11px] text-muted">{assignment.note}</div>
      ) : null}
    </div>
  );
}

function StatusLabel({ text, strong = false }: { text: string; strong?: boolean }) {
  return (
    <div className={cn("text-[12px] font-semibold", strong ? "text-red-800" : "text-muted")}>
      {text}
    </div>
  );
}

function EditorModal({
  editor,
  onClose,
  onAssignment,
  onDuty,
  onDay,
}: {
  editor: Exclude<Editor, null>;
  onClose: () => void;
  onAssignment: (
    date: string,
    aircraftId: string,
    patch: Partial<DayAircraftAssignment>,
  ) => void;
  onDuty: (date: string, pilotId: string | null) => void;
  onDay: (date: string, patch: Partial<DayPlan>) => void;
}) {
  const { week, pilots, aircraft, timeOff, addTimeOff, removeTimeOff } = useOps();
  const day = week.days[editor.date];
  const used = day ? occupiedIds(day) : new Set<string>();

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black text-navy-900">
            {editor.kind === "aircraft"
              ? aircraft.find((item) => item.id === editor.aircraftId)?.name
              : editor.kind === "duty"
                ? "Duty officer"
                : editor.kind === "offsite"
                  ? "Off-site crew"
                  : "Notes / PTO"}{" "}
            · {boardHeader(editor.date)}
          </h3>
          <button onClick={onClose} className="text-sm font-semibold text-muted">
            Close
          </button>
        </div>

        {editor.kind === "aircraft" && day ? (
          <AircraftEditor
            assignment={day.aircraft[editor.aircraftId]}
            date={editor.date}
            aircraftId={editor.aircraftId}
            pilots={pilots}
            used={used}
            timeOff={timeOff}
            onChange={(patch) => onAssignment(editor.date, editor.aircraftId, patch)}
          />
        ) : null}

        {editor.kind === "duty" && day ? (
          <div className="space-y-3">
            <PilotSelect
              label="Duty officer"
              value={day.dutyOfficerId}
              pilots={pilots}
              used={used}
              date={editor.date}
              allowAny
              onChange={(pilotId) => onDuty(editor.date, pilotId)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(day.dutyOfficerLocked)}
                onChange={(event) => onDay(editor.date, { dutyOfficerLocked: event.target.checked })}
              />
              Lock this cell
            </label>
          </div>
        ) : null}

        {editor.kind === "offsite" && day ? (
          <div className="space-y-2">
            <p className="text-[12px] text-muted">
              People deployed with an off-station jet, same as the Off Site Crew row.
            </p>
            {pilots.map((pilot) => {
              const checked = day.offSiteCrewIds.includes(pilot.id);
              return (
                <label key={pilot.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...day.offSiteCrewIds, pilot.id]
                        : day.offSiteCrewIds.filter((id) => id !== pilot.id);
                      onDay(editor.date, { offSiteCrewIds: next });
                    }}
                  />
                  {pilot.name}
                </label>
              );
            })}
          </div>
        ) : null}

        {editor.kind === "notes" && day ? (
          <NotesEditor
            date={editor.date}
            notes={day.notes}
            onNotes={(notes) => onDay(editor.date, { notes })}
            addTimeOff={addTimeOff}
            removeTimeOff={removeTimeOff}
          />
        ) : null}
      </div>
    </div>
  );
}

function AircraftEditor({
  assignment,
  date,
  aircraftId,
  pilots,
  used,
  timeOff,
  onChange,
}: {
  assignment?: DayAircraftAssignment;
  date: string;
  aircraftId: string;
  pilots: Pilot[];
  used: Set<string>;
  timeOff: { pilotId: string; date: string }[];
  onChange: (patch: Partial<DayAircraftAssignment>) => void;
}) {
  if (!assignment) return null;
  const needsCrew = assignment.status === "flying" || assignment.status === "deployed";
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wide text-muted">
        Line status
        <select
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-semibold"
          value={assignment.status}
          onChange={(event) => onChange({ status: event.target.value as DayStatus })}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {needsCrew ? (
        <>
          <PilotSelect
            label="PIC · left seat"
            value={assignment.picId}
            pilots={pilots}
            used={used}
            date={date}
            seat="PIC"
            aircraftId={aircraftId}
            timeOff={timeOff}
            onChange={(pilotId) => onChange({ picId: pilotId })}
          />
          <PilotSelect
            label="SIC · right seat"
            value={assignment.sicId}
            pilots={pilots}
            used={used}
            date={date}
            seat="SIC"
            aircraftId={aircraftId}
            timeOff={timeOff}
            onChange={(pilotId) => onChange({ sicId: pilotId })}
          />
        </>
      ) : null}
      <label className="block text-xs font-bold uppercase tracking-wide text-muted">
        Note
        <input
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
          value={assignment.note}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(assignment.locked)}
          onChange={(event) => onChange({ locked: event.target.checked })}
        />
        Lock this cell
      </label>
    </div>
  );
}

function PilotSelect({
  label,
  value,
  pilots,
  used,
  date,
  onChange,
  seat,
  aircraftId,
  allowAny = false,
  timeOff = [],
}: {
  label: string;
  value: string | null;
  pilots: Pilot[];
  used: Set<string>;
  date: string;
  onChange: (pilotId: string | null) => void;
  seat?: "PIC" | "SIC";
  aircraftId?: string;
  allowAny?: boolean;
  timeOff?: { pilotId: string; date: string }[];
}) {
  const options = useMemo(() => {
    return pilots.map((pilot) => {
      let reason = "";
      if (!pilot.active) reason = "Inactive";
      else if (timeOff.some((item) => item.pilotId === pilot.id && item.date === date)) reason = "Leave";
      else if (used.has(pilot.id) && pilot.id !== value) reason = "Already assigned";
      else if (!allowAny && aircraftId && seat === "PIC" && !canPic(pilot, aircraftId))
        reason = "Not PIC on type";
      else if (!allowAny && aircraftId && seat === "SIC" && !canRightSeat(pilot, aircraftId))
        reason = "Not qualified";
      return { pilot, reason };
    });
  }, [pilots, used, value, allowAny, aircraftId, seat, timeOff, date]);

  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-muted">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-semibold"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Unassigned</option>
        {options.map(({ pilot, reason }) => (
          <option key={pilot.id} value={pilot.id} disabled={Boolean(reason)}>
            {pilot.name}
            {reason ? ` (${reason})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function NotesEditor({
  date,
  notes,
  onNotes,
  addTimeOff,
  removeTimeOff,
}: {
  date: string;
  notes: string;
  onNotes: (notes: string) => void;
  addTimeOff: (item: { id: string; pilotId: string; date: string; type: "pto"; note: string }) => void;
  removeTimeOff: (id: string) => void;
}) {
  const { pilots, timeOff } = useOps();
  const [pilotId, setPilotId] = useState(pilots[0]?.id ?? "");
  const onDate = timeOff.filter((item) => item.date === date);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wide text-muted">
        Board note
        <textarea
          className="mt-1 min-h-[80px] w-full rounded-md border border-line px-3 py-2 text-sm"
          value={notes}
          onChange={(event) => onNotes(event.target.value)}
        />
      </label>
      <div className="text-xs font-bold uppercase tracking-wide text-muted">Mark leave</div>
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-md border border-line px-2 py-2 text-sm"
          value={pilotId}
          onChange={(event) => setPilotId(event.target.value)}
        >
          {pilots.map((pilot) => (
            <option key={pilot.id} value={pilot.id}>
              {pilot.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-md bg-navy-800 px-3 py-2 text-sm font-bold text-white"
          onClick={() =>
            addTimeOff({
              id: `${pilotId}-${date}`,
              pilotId,
              date,
              type: "pto",
              note: "PTO",
            })
          }
        >
          PTO
        </button>
      </div>
      <div className="space-y-1">
        {onDate.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-md bg-note px-2 py-1 text-sm">
            <span>
              {pilots.find((pilot) => pilot.id === item.pilotId)?.name} {item.type.toUpperCase()}
            </span>
            <button className="text-xs font-bold text-rose-800" onClick={() => removeTimeOff(item.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

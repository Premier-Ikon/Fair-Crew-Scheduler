"use client";

import { CrewMatrix } from "@/components/crew-matrix";
import { FairnessPanel } from "@/components/fairness-panel";

export default function CrewPage() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <CrewMatrix />
      <FairnessPanel />
    </div>
  );
}

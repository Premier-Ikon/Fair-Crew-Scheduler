import { NextResponse } from "next/server";
import { generateSchedule } from "@/shared/scheduler";
import type { GenerateInput } from "@/shared/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateInput;
    if (!body?.weekStart || !Array.isArray(body.pilots) || !Array.isArray(body.aircraft)) {
      return NextResponse.json(
        { error: "weekStart, pilots, and aircraft are required." },
        { status: 400 },
      );
    }
    const result = generateSchedule({
      ...body,
      weeks: body.weeks ?? {},
      timeOff: body.timeOff ?? [],
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generate failed" },
      { status: 500 },
    );
  }
}

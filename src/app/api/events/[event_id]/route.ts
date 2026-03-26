import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ event_id: string }> }
) {
  try {
    requireAuth(request, "admin");
    const { event_id } = await params;
    const body = await request.json();
    const { capacity } = body;

    if (capacity !== null && capacity !== undefined && Number(capacity) < 1) {
      return NextResponse.json(
        { detail: "Capacity must be a positive number when provided" },
        { status: 400 }
      );
    }

    const { rows } = await db.query(
      `UPDATE events
       SET capacity = $1
       WHERE id = $2
       RETURNING id, capacity`,
      [capacity, event_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ detail: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event_id: rows[0].id, capacity: rows[0].capacity });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

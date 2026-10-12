import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthErrorStatus, requireAuth } from "@/lib/auth";

// Personal events are student-authored, so keep them tightly bounded.
// They are worth 0 points and always need admin review (see photo-verification).
const ALLOWED_CATEGORIES = ["technical", "cultural", "sports", "professional", "community service", "national initiative"];
const MAX_PENDING_PERSONAL_EVENTS = 5;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const authData = requireAuth(request, "student");
    const studentId = authData.user_id;

    const body = await request.json();
    const {
      name,
      description,
      category,
      start_time,
      end_time,
      latitude,
      longitude,
      location_name,
      location_radius_meters = 100,
    } = body;

    if (!name || !category || !start_time || !end_time || !location_name || latitude == null || longitude == null) {
      return NextResponse.json(
        { detail: "Missing required fields: name, category, start_time, end_time, location" },
        { status: 400 }
      );
    }

    if (!ALLOWED_CATEGORIES.includes(String(category).toLowerCase())) {
      return NextResponse.json({ detail: "Invalid category" }, { status: 400 });
    }

    if (String(name).length > 120 || String(location_name).length > 200 || String(description || "").length > 1000) {
      return NextResponse.json(
        { detail: "Name, location or description is too long" },
        { status: 400 }
      );
    }

    if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ detail: "Latitude and longitude must be numbers" }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { detail: "Latitude must be between -90 and 90" },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { detail: "Longitude must be between -180 and 180" },
        { status: 400 }
      );
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ detail: "Invalid start or end time" }, { status: 400 });
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { detail: "Start time must be before end time" },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (endDate.getTime() - startDate.getTime() > MAX_DURATION_MS) {
      return NextResponse.json({ detail: "Personal events can last at most 7 days" }, { status: 400 });
    }
    if (endDate.getTime() < now - MAX_WINDOW_MS || startDate.getTime() > now + MAX_WINDOW_MS) {
      return NextResponse.json(
        { detail: "Personal events must be within 30 days of today" },
        { status: 400 }
      );
    }

    const pendingQuery = await db.query(
      `SELECT COUNT(*) FROM events e
       JOIN event_submissions es ON es.event_id = e.id AND es.student_id = e.personal_owner_id
       WHERE e.is_personal = true AND e.personal_owner_id = $1 AND es.status = 'pending_review'`,
      [studentId]
    );
    if (Number(pendingQuery.rows[0].count) >= MAX_PENDING_PERSONAL_EVENTS) {
      return NextResponse.json(
        { detail: `You can have at most ${MAX_PENDING_PERSONAL_EVENTS} personal events awaiting review` },
        { status: 429 }
      );
    }

    const { rows } = await db.query(
      `INSERT INTO events
       (name, description, category, points, latitude, longitude, location_name,
        location_radius_meters, capacity, start_time, end_time, time_tolerance_minutes,
        status, is_personal, personal_owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        name,
        description || null,
        String(category).toLowerCase(),
        0,
        latitude,
        longitude,
        location_name,
        Math.min(Math.max(Number(location_radius_meters) || 100, 50), 500),
        1,
        start_time,
        end_time,
        0,
        "active",
        true,
        studentId,
      ]
    );

    const eventId = rows[0].id;

    await db.query(
      `INSERT INTO event_submissions (student_id, event_id, status)
       VALUES ($1, $2, 'pending_review')`,
      [studentId, eventId]
    );

    return NextResponse.json({ event_id: eventId });
  } catch (error: any) {
    const authStatus = getAuthErrorStatus(error);
    return NextResponse.json(
      { detail: error.message || "Internal server error" },
      { status: authStatus ?? 500 }
    );
  }
}

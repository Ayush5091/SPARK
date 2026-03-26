import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

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

    if (startDate >= endDate) {
      return NextResponse.json(
        { detail: "Start time must be before end time" },
        { status: 400 }
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
        category,
        0,
        latitude,
        longitude,
        location_name,
        location_radius_meters,
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
    return NextResponse.json(
      { detail: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthErrorStatus, requireAuth } from "@/lib/auth";
import { deleteEvidence, DOCUMENT_TYPES, EvidenceError, putEvidence, readEvidence } from "@/lib/storage";

// Personal events are student-authored, so keep them tightly bounded.
// They are worth 0 points until an admin reviews them and sets the points (see admin review).
const ALLOWED_CATEGORIES = ["technical", "cultural", "sports", "professional", "community service", "national initiative"];
const MAX_OPEN_PERSONAL_EVENTS = 5;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const bad = (detail: string, status = 400) => NextResponse.json({ detail }, { status });

// Accepts multipart/form-data (web form with an optional document) or JSON (older clients).
async function readBody(request: NextRequest) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const text = (key: string) => {
      const v = form.get(key);
      return typeof v === "string" ? v.trim() : "";
    };
    const num = (key: string) => (text(key) === "" ? null : Number(text(key)));
    const file = form.get("evidence");
    return {
      name: text("name"),
      description: text("description"),
      category: text("category"),
      start_time: text("start_time"),
      end_time: text("end_time"),
      location_name: text("location_name"),
      latitude: num("latitude"),
      longitude: num("longitude"),
      location_radius_meters: num("location_radius_meters"),
      evidence: file instanceof File && file.size > 0 ? file : null,
    };
  }
  const body = await request.json();
  return { ...body, evidence: null as File | null };
}

export async function POST(request: NextRequest) {
  let uploadedKey: string | null = null;
  try {
    const authData = requireAuth(request, "student");
    const studentId = authData.user_id;

    const body = await readBody(request);
    const { name, description, category, start_time, end_time, location_name, evidence } = body;
    const latitude = body.latitude ?? null;
    const longitude = body.longitude ?? null;

    if (!name || !category || !start_time || !end_time || !location_name) {
      return bad("Missing required fields: name, category, start_time, end_time, location");
    }

    if (!ALLOWED_CATEGORIES.includes(String(category).toLowerCase())) {
      return bad("Invalid category");
    }

    if (String(name).length > 120 || String(location_name).length > 200 || String(description || "").length > 1000) {
      return bad("Name, location or description is too long");
    }

    // The venue pin is optional, but if one is given it must be a real coordinate pair
    if ((latitude == null) !== (longitude == null)) {
      return bad("Provide both latitude and longitude, or neither");
    }
    if (latitude != null) {
      if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return bad("Latitude and longitude must be numbers");
      }
      if (latitude < -90 || latitude > 90) return bad("Latitude must be between -90 and 90");
      if (longitude < -180 || longitude > 180) return bad("Longitude must be between -180 and 180");
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return bad("Invalid start or end time");
    }
    if (startDate >= endDate) {
      return bad("Start time must be before end time");
    }

    const now = Date.now();
    if (endDate.getTime() - startDate.getTime() > MAX_DURATION_MS) {
      return bad("Personal events can last at most 7 days");
    }
    if (endDate.getTime() < now - MAX_WINDOW_MS || startDate.getTime() > now + MAX_WINDOW_MS) {
      return bad("Personal events must be within 30 days of today");
    }

    // An activity that has already ended can't be checked in with the camera, so it
    // must come with a report, certificate or photo instead.
    const isPast = endDate.getTime() < now;
    if (isPast && !evidence) {
      return bad("Upload a report, certificate or photo as proof for an activity that has already happened");
    }

    // Count personal events that are still open: not yet submitted, or awaiting review
    const openQuery = await db.query(
      `SELECT COUNT(*) FROM events e
       LEFT JOIN event_submissions es ON es.event_id = e.id AND es.student_id = e.personal_owner_id
       WHERE e.is_personal = true AND e.personal_owner_id = $1
         AND (es.id IS NULL OR es.status = 'pending_review')`,
      [studentId]
    );
    if (Number(openQuery.rows[0].count) >= MAX_OPEN_PERSONAL_EVENTS) {
      return bad(`You can have at most ${MAX_OPEN_PERSONAL_EVENTS} personal events awaiting proof or review`, 429);
    }

    let stored: Awaited<ReturnType<typeof readEvidence>> | null = null;
    if (evidence) {
      try {
        stored = await readEvidence(evidence, DOCUMENT_TYPES);
      } catch (error) {
        if (error instanceof EvidenceError) return bad(error.message);
        throw error;
      }
      uploadedKey = await putEvidence(`personal/${studentId}`, stored, evidence.name);
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
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
          Math.min(Math.max(Number(body.location_radius_meters) || 100, 50), 500),
          1,
          startDate,
          endDate,
          0,
          "active",
          true,
          studentId,
        ]
      );
      const eventId = rows[0].id;

      // Only proof enters the review queue: without a document the student checks in
      // later with the camera, which creates the submission then.
      if (stored && uploadedKey && evidence) {
        await client.query(
          `INSERT INTO event_submissions
           (student_id, event_id, status, submitted_at, verification_result,
            evidence_key, evidence_content_type, evidence_filename)
           VALUES ($1, $2, 'pending_review', NOW(), $3, $4, $5, $6)`,
          [
            studentId,
            eventId,
            JSON.stringify({ isValid: false, reason: "Personal activity with uploaded proof requires admin review" }),
            uploadedKey,
            stored.contentType,
            evidence.name.slice(0, 255),
          ]
        );
        await client.query(
          `INSERT INTO notifications (student_id, message, is_read, created_at)
           VALUES ($1, $2, false, NOW())`,
          [studentId, `Your proof for "${name}" has been submitted for review.`]
        );
      }
      await client.query("COMMIT");
      uploadedKey = null;
      return NextResponse.json({ event_id: eventId, submitted: Boolean(stored) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Create personal event error:", error);
    if (uploadedKey) await deleteEvidence(uploadedKey);
    const authStatus = getAuthErrorStatus(error);
    return NextResponse.json(
      { detail: authStatus ? error.message : "Could not create the event" },
      { status: authStatus ?? 500 }
    );
  }
}

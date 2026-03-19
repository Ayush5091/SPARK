import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Students and admins can view available events
export async function GET(request: NextRequest) {
  try {
    requireAuth(request); // Allow both student and admin roles

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active_only = searchParams.get('active_only') !== 'false'; // default to true

    let queryStr = `
      SELECT e.id, e.name, e.description, e.category, e.points,
             e.latitude, e.longitude, e.location_name,
             e.location_radius_meters, e.start_time, e.end_time,
             e.time_tolerance_minutes, e.status,
             COUNT(es.id) as total_submissions,
             COUNT(CASE WHEN es.status = 'verified' THEN 1 END) as verified_submissions
      FROM events e
      LEFT JOIN event_submissions es ON e.id = es.event_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (active_only) {
      queryStr += ` AND e.status = 'active'`;
    }

    if (category) {
      params.push(category);
      queryStr += ` AND e.category = $${params.length}`;
    }

    queryStr += `
      GROUP BY e.id, e.name, e.description, e.category, e.points,
               e.latitude, e.longitude, e.location_name,
               e.location_radius_meters, e.start_time, e.end_time,
               e.time_tolerance_minutes, e.status
      ORDER BY e.start_time ASC
    `;

    const { rows } = await db.query(queryStr, params);

    // Add computed fields for frontend
    const events = rows.map(event => ({
      ...event,
      is_ongoing: new Date() >= new Date(event.start_time) && new Date() <= new Date(event.end_time),
      is_upcoming: new Date() < new Date(event.start_time),
      is_past: new Date() > new Date(event.end_time),
      participation_rate: event.total_submissions > 0 ? (event.verified_submissions / event.total_submissions * 100).toFixed(1) : '0'
    }));

    return NextResponse.json(events);

  } catch (error: any) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Admins can create new events
export async function POST(request: NextRequest) {
  try {
    const authData = requireAuth(request, 'admin');
    const adminId = authData.user_id;

    const body = await request.json();
    const {
      name,
      description,
      category,
      points,
      latitude,
      longitude,
      location_name,
      location_radius_meters = 100,
      start_time,
      end_time,
      time_tolerance_minutes = 30
    } = body;

    // Validate required fields
    if (!name || !category || !points || !latitude || !longitude || !location_name || !start_time || !end_time) {
      return NextResponse.json(
        { detail: 'Missing required fields: name, category, points, latitude, longitude, location_name, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { detail: 'Latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { detail: 'Longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Validate time range
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (startDate >= endDate) {
      return NextResponse.json(
        { detail: 'Start time must be before end time' },
        { status: 400 }
      );
    }


    // Insert event
    const { rows } = await db.query(
      `INSERT INTO events
       (name, description, category, points, latitude, longitude, location_name,
        location_radius_meters, start_time, end_time, time_tolerance_minutes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        name, description, category, points, latitude, longitude, location_name,
        location_radius_meters, start_time, end_time, time_tolerance_minutes, adminId
      ]
    );

    const eventId = rows[0].id;

    // Notify all students about the new event
    const studentsQuery = await db.query('SELECT id FROM students');
    const notificationPromises = studentsQuery.rows.map(student =>
      db.query(
        `INSERT INTO notifications (student_id, message, is_read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [
          student.id,
          `New event "${name}" is now available! Join by taking a photo at the event location.`
        ]
      )
    );

    await Promise.all(notificationPromises);

    return NextResponse.json({
      event_id: eventId,
      message: 'Event created successfully and all students have been notified'
    });

  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
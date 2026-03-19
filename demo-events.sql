-- Demo Events for Testing
-- Run these in your database client to add test events

-- Event 1: Currently Ongoing - Tech Meetup (for photo testing)
INSERT INTO events (
    name,
    description,
    category,
    points,
    latitude,
    longitude,
    location_name,
    location_radius_meters,
    start_time,
    end_time,
    time_tolerance_minutes,
    status,
    created_by
) VALUES (
    'AI & Machine Learning Meetup 2026',
    'Join fellow developers and AI enthusiasts for an exciting meetup featuring talks on the latest ML trends, hands-on workshops with cutting-edge tools, and networking with industry experts. Learn about GPT-4, computer vision breakthroughs, and career opportunities in AI.',
    'technical',
    45,
    12.971598,
    77.594566,
    'Bangalore International Convention Centre',
    150,
    '2026-03-18 14:00:00',  -- Started 2 hours ago (assuming current time is 4PM)
    '2026-03-18 20:00:00',  -- Ends in 4 hours
    45,
    'active',
    1
);

-- Event 2: Upcoming - Community Service (for upcoming status testing)
INSERT INTO events (
    name,
    description,
    category,
    points,
    latitude,
    longitude,
    location_name,
    location_radius_meters,
    start_time,
    end_time,
    time_tolerance_minutes,
    status,
    created_by
) VALUES (
    'Green Bangalore Clean-up Drive',
    'Help make Bangalore cleaner and greener! Join this community initiative to clean up Cubbon Park. We will provide all cleaning supplies, gloves, and refreshments. Certificate of participation will be given to all volunteers. Together we can make a difference!',
    'community service',
    35,
    12.975413,
    77.592834,
    'Cubbon Park Main Entrance',
    200,
    '2026-03-19 07:00:00',  -- Tomorrow morning
    '2026-03-19 11:00:00',  -- 4 hour duration
    30,
    'active',
    1
);

-- Verify the events were created
SELECT
    id,
    name,
    category,
    points,
    location_name,
    start_time,
    end_time,
    CASE
        WHEN NOW() BETWEEN start_time - INTERVAL time_tolerance_minutes MINUTE
                       AND end_time + INTERVAL time_tolerance_minutes MINUTE THEN 'ONGOING'
        WHEN NOW() < start_time - INTERVAL time_tolerance_minutes MINUTE THEN 'UPCOMING'
        ELSE 'ENDED'
    END as current_status
FROM events
WHERE name IN ('AI & Machine Learning Meetup 2026', 'Green Bangalore Clean-up Drive')
ORDER BY start_time;
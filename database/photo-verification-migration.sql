-- New tables for photo-verified events

-- Events table - for location-based activities posted by admins
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_radius_meters INTEGER DEFAULT 100,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    time_tolerance_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Event submissions table - for tracking photo-based submissions
CREATE TABLE event_submissions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) NOT NULL,
    event_id INTEGER REFERENCES events(id) NOT NULL,
    photo_metadata JSONB, -- Stores extracted EXIF data
    verification_result JSONB, -- Stores verification results
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'verified', 'rejected')),
    auto_verified BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES admins(id),
    review_notes TEXT,
    points_awarded INTEGER DEFAULT 0,

    -- Ensure one submission per student per event
    UNIQUE(student_id, event_id)
);

-- Indexes for performance
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_time_range ON events(start_time, end_time);
CREATE INDEX idx_events_location ON events(latitude, longitude);
CREATE INDEX idx_event_submissions_student ON event_submissions(student_id);
CREATE INDEX idx_event_submissions_event ON event_submissions(event_id);
CREATE INDEX idx_event_submissions_status ON event_submissions(status);

-- Add trigger to update updated_at timestamp on events
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing - Events for next few days for demo
INSERT INTO events (name, description, category, points, latitude, longitude, location_name, start_time, end_time, created_by) VALUES
('Tech Conference 2026', 'Annual technology conference featuring latest innovations in AI, blockchain, and cloud computing. Network with industry experts and attend workshops.', 'technical', 50, 12.971598, 77.594566, 'Bangalore International Convention Centre', '2026-03-20 09:00:00', '2026-03-20 18:00:00', 1),
('Community Cleanup Drive', 'Join us in making Bangalore greener! Environmental cleanup activity at Cubbon Park. Gloves and bags will be provided.', 'community service', 30, 12.975413, 77.592834, 'Cubbon Park', '2026-03-22 07:00:00', '2026-03-22 12:00:00', 1),
('Startup Pitch Competition', 'Present your innovative business ideas to industry leaders and investors. Cash prizes for winners!', 'professional', 40, 12.972442, 77.580643, 'IISc Bangalore', '2026-03-25 10:00:00', '2026-03-25 17:00:00', 1),
('Cultural Festival - Rangoli Competition', 'Showcase your artistic skills in this traditional rangoli competition. All materials provided.', 'cultural', 25, 12.934533, 77.610166, 'Lalbagh Botanical Garden', '2026-03-21 14:00:00', '2026-03-21 18:00:00', 1),
('Inter-College Cricket Tournament', 'Annual cricket tournament. Team registrations open. Represent your college and win exciting prizes!', 'sports', 35, 12.966847, 77.580811, 'Chinnaswamy Stadium', '2026-03-23 08:00:00', '2026-03-23 18:00:00', 1),
('Blood Donation Camp', 'Donate blood and save lives. Health checkup included. Certificate provided to all donors.', 'community service', 40, 12.958423, 77.636619, 'Koramangala Community Center', '2026-03-24 09:00:00', '2026-03-24 16:00:00', 1),
('Hackathon 48hrs', 'Build innovative solutions to real-world problems. Form teams or join existing ones. Exciting prizes await!', 'technical', 60, 12.971902, 77.640636, 'Microsoft Office Bangalore', '2026-03-26 18:00:00', '2026-03-28 18:00:00', 1),
('Tree Plantation Drive', 'Be part of the green revolution. Plant trees and contribute to environmental conservation.', 'national initiative', 20, 12.847178, 77.663011, 'Bannerghatta National Park', '2026-03-29 06:00:00', '2026-03-29 11:00:00', 1);
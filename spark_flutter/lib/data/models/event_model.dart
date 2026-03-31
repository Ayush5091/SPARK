class EventModel {
  final String id;
  final String name;
  final String? description;
  final String category;
  final DateTime startDate;
  final DateTime endDate;
  final String locationName;
  final double latitude;
  final double longitude;
  final int points;
  final int? capacity;
  final int attendeeCount;
  final String? bannerUrl;
  final bool isFeatured;
  final String status; // 'live', 'upcoming', 'ended'
  final bool? hasSubmitted;

  final int totalSubmissions;
  final int verifiedSubmissions;
  final int pendingSubmissions;
  final int? locationRadiusMeters;
  final int? timeToleranceMinutes;

  EventModel({
    required this.id,
    required this.name,
    this.description,
    required this.category,
    required this.startDate,
    required this.endDate,
    required this.locationName,
    required this.latitude,
    required this.longitude,
    required this.points,
    this.capacity,
    required this.attendeeCount,
    required this.totalSubmissions,
    required this.verifiedSubmissions,
    required this.pendingSubmissions,
    this.locationRadiusMeters,
    this.timeToleranceMinutes,
    this.bannerUrl,
    this.isFeatured = false,
    required this.status,
    this.hasSubmitted,
  });

  bool get isLive {
    final now = DateTime.now();
    return !now.isBefore(startDate) && !now.isAfter(endDate);
  }

  bool get isUpcoming => DateTime.now().isBefore(startDate);

  bool get isEnded => DateTime.now().isAfter(endDate);

  factory EventModel.fromJson(Map<String, dynamic> json) {
    // Helper to safely parse dates
    DateTime parseDate(dynamic date) {
      if (date == null) return DateTime.now();
      try {
        return DateTime.parse(date.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    // Helper to safely parse numbers
    double parseDouble(dynamic value) {
      if (value == null) return 0.0;
      if (value is num) return value.toDouble();
      return double.tryParse(value.toString()) ?? 0.0;
    }

    int? parseInt(dynamic value) {
      if (value == null) return null;
      if (value is int) return value;
      if (value is String) return int.tryParse(value);
      return null;
    }

    final startDate = parseDate(json['start_time']);
    final endDate = parseDate(json['end_time']);
    final now = DateTime.now();
    final derivedStatus =
        now.isAfter(endDate)
            ? 'ended'
            : now.isBefore(startDate)
            ? 'upcoming'
            : 'live';

    return EventModel(
      id: (json['id'] ?? '').toString(),
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      category: json['category']?.toString() ?? 'General',
      startDate: startDate,
      endDate: endDate,
      locationName: json['location_name']?.toString() ?? '',
      latitude: parseDouble(json['latitude']),
      longitude: parseDouble(json['longitude']),
      points: parseInt(json['points']) ?? 0,
      capacity: parseInt(json['capacity']),
      attendeeCount:
          parseInt(json['attendee_count'] ?? json['total_submissions']) ?? 0,
      totalSubmissions: parseInt(json['total_submissions']) ?? 0,
      verifiedSubmissions: parseInt(json['verified_submissions']) ?? 0,
      pendingSubmissions: parseInt(json['pending_submissions']) ?? 0,
      locationRadiusMeters: parseInt(json['location_radius_meters']),
      timeToleranceMinutes: parseInt(json['time_tolerance_minutes']),
      bannerUrl: json['banner_url']?.toString(),
      isFeatured: json['is_featured'] ?? false,
      status: derivedStatus,
      hasSubmitted: json['has_submitted'],
    );
  }
}

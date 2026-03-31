import 'event_model.dart';

class EventSubmissionModel {
  final int id;
  final int studentId;
  final int eventId;
  final String photoUrl;
  final String locationLat;
  final String locationLng;
  final String status;
  final int manualPoints;
  final DateTime createdAt;
  final EventModel? event;
  final String? studentName;
  final String? studentUsn;
  final String? studentEmail;
  final String? reviewedAt;
  final String? reviewNotes;
  final Map<String, dynamic>? verificationResult;
  final Map<String, dynamic>? photoMetadata;

  EventSubmissionModel({
    required this.id,
    required this.studentId,
    required this.eventId,
    required this.photoUrl,
    required this.locationLat,
    required this.locationLng,
    required this.status,
    required this.manualPoints,
    required this.createdAt,
    this.event,
    this.studentName,
    this.studentUsn,
    this.studentEmail,
    this.reviewedAt,
    this.reviewNotes,
    this.verificationResult,
    this.photoMetadata,
  });

  factory EventSubmissionModel.fromJson(Map<String, dynamic> json) {
    return EventSubmissionModel(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      studentId: int.tryParse(json['student_id']?.toString() ?? '') ?? 0,
      eventId: int.tryParse(json['event_id']?.toString() ?? '') ?? 0,
      photoUrl: json['photo_url']?.toString() ?? '',
      locationLat: json['location_lat']?.toString() ?? '',
      locationLng: json['location_lng']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      manualPoints: int.tryParse(json['manual_points']?.toString() ?? '') ?? 0,
      createdAt: json['created_at'] != null 
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() 
          : DateTime.now(),
      event: (json['event'] is Map<String, dynamic>) 
          ? EventModel.fromJson(json['event'] as Map<String, dynamic>) 
          : null,
      studentName: json['student_name']?.toString() ?? json['student']?['name']?.toString(),
      studentUsn: json['student_usn']?.toString() ?? json['student']?['usn']?.toString(),
      studentEmail: json['student_email']?.toString() ?? json['student']?['email']?.toString(),
      reviewedAt: json['reviewed_at']?.toString(),
      reviewNotes: json['review_notes']?.toString(),
      verificationResult: json['verification_result'] as Map<String, dynamic>?,
      photoMetadata: json['photo_metadata'] as Map<String, dynamic>?,
    );
  }
}

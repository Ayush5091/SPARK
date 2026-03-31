import 'activity_request_model.dart';

class SubmissionModel {
  final int id;
  final int requestId;
  final String proof;
  final String description;
  final double hoursSpent;
  final DateTime activityDate;
  final String status;
  final ActivityRequestModel? request;
  final String? studentName;
  final String? studentUsn;
  final String? activityName;
  final String? category;

  SubmissionModel({
    required this.id,
    required this.requestId,
    required this.proof,
    required this.description,
    required this.hoursSpent,
    required this.activityDate,
    required this.status,
    this.request,
    this.studentName,
    this.studentUsn,
    this.activityName,
    this.category,
  });

  factory SubmissionModel.fromJson(Map<String, dynamic> json) {
    return SubmissionModel(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      requestId: int.tryParse(json['request_id']?.toString() ?? '') ?? 0,
      proof: json['proof']?.toString() ?? 'N/A',
      description: json['description']?.toString() ?? '',
      hoursSpent: double.tryParse(json['hours_spent']?.toString() ?? '') ?? 0.0,
      activityDate: json['activity_date'] != null 
          ? DateTime.tryParse(json['activity_date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      status: json['status']?.toString() ?? 'pending',
      request: (json['request'] is Map<String, dynamic>) 
          ? ActivityRequestModel.fromJson(json['request'] as Map<String, dynamic>) 
          : null,
      studentName: json['student_name']?.toString() ?? json['student']?['name']?.toString() ?? json['request']?['student']?['name']?.toString(),
      studentUsn: json['student_usn']?.toString() ?? json['student']?['usn']?.toString() ?? json['request']?['student']?['usn']?.toString(),
      activityName: json['activity_name']?.toString() ?? json['request']?['activity']?['name']?.toString(),
      category: json['category']?.toString() ?? json['request']?['activity']?['category']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'request_id': requestId,
      'proof': proof,
      'description': description,
      'hours_spent': hoursSpent,
      'activity_date': activityDate.toIso8601String(),
      'status': status,
      'request': request?.toJson(),
      'student_name': studentName,
      'student_usn': studentUsn,
      'activity_name': activityName,
      'category': category,
    };
  }
}

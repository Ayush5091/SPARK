import 'activity_model.dart';

class ActivityRequestModel {
  final int id;
  final int activityId;
  final String description;
  final String status;
  final DateTime? createdAt;
  final ActivityModel? activity;

  ActivityRequestModel({
    required this.id,
    required this.activityId,
    required this.description,
    required this.status,
    this.createdAt,
    this.activity,
  });

  factory ActivityRequestModel.fromJson(Map<String, dynamic> json) {
    return ActivityRequestModel(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      activityId: int.tryParse(json['activity_id']?.toString() ?? '') ?? 0,
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
      activity: (json['activity'] is Map<String, dynamic>) 
          ? ActivityModel.fromJson(json['activity'] as Map<String, dynamic>) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'activity_id': activityId,
      'description': description,
      'status': status,
      'created_at': createdAt?.toIso8601String(),
      'activity': activity?.toJson(),
    };
  }
}

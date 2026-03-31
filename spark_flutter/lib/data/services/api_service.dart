import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../../core/constants/api_constants.dart';
import '../repositories/auth_repository.dart';
import '../models/event_model.dart';
import '../models/notification_model.dart';
import '../models/activity_model.dart';
import '../models/activity_request_model.dart';
import '../models/submission_model.dart';
import '../models/event_submission_model.dart';
import '../models/student_model.dart';

class UnauthorizedException implements Exception {
  final String message;

  UnauthorizedException([this.message = 'Unauthorized']);

  @override
  String toString() => message;
}

class ApiService {
  late Dio _dio;
  final AuthRepository _authRepository = AuthRepository();

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _authRepository.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );

    if (kDebugMode) {
      _dio.interceptors.add(
        PrettyDioLogger(
          requestHeader: true,
          requestBody: true,
          responseBody: true,
          error: true,
          compact: true,
        ),
      );
    }
  }

  // Events
  Future<List<EventModel>> getEvents({bool activeOnly = false}) async {
    try {
      final response = await _dio.get(
        ApiConstants.events,
        queryParameters: activeOnly ? {'active_only': true} : null,
      );
      final List data = response.data;
      return data.map((e) => EventModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Notifications
  Future<List<NotificationModel>> getNotifications() async {
    try {
      final response = await _dio.get(ApiConstants.notifications);
      final List data = response.data;
      return data.map((e) => NotificationModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> markNotificationsRead() async {
    try {
      await _dio.put(ApiConstants.notifications);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Photo Verification (Check-In)
  Future<Map<String, dynamic>> verifyPresence({
    required String eventId,
    required String imagePath,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final formData = FormData.fromMap({
        'event_id': eventId,
        'user_location':
            '{"latitude": $latitude, "longitude": $longitude, "timestamp": "${DateTime.now().toIso8601String()}"}',
        'photo': await MultipartFile.fromFile(imagePath),
      });

      final response = await _dio.post(
        ApiConstants.photoVerification,
        data: formData,
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<EventSubmissionModel>> getMyEventSubmissions() async {
    try {
      final response = await _dio.get(ApiConstants.eventSubmissions);
      final List data = response.data;
      return data.map((e) => EventSubmissionModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Student
  Future<StudentModel> getStudentMe() async {
    try {
      final response = await _dio.get(ApiConstants.studentMe);
      return StudentModel.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getAdminMe() async {
    try {
      final response = await _dio.get(ApiConstants.adminMe);
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> updateStudentProfile({
    required String phoneNumber,
    required String department,
  }) async {
    try {
      await _dio.put(
        ApiConstants.studentMe,
        data: {
          'phone_number': phoneNumber,
          'department': department,
        },
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Activities
  Future<List<ActivityModel>> getActivities() async {
    try {
      final response = await _dio.get(ApiConstants.activities);
      final List data = response.data;
      return data.map((e) => ActivityModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> requestActivity({
    required int activityId,
    required String description,
  }) async {
    try {
      await _dio.post(
        ApiConstants.activityRequests,
        data: {
          'activity_id': activityId,
          'description': description,
        },
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<ActivityRequestModel>> getMyActivityRequests() async {
    try {
      final response = await _dio.get(ApiConstants.myActivityRequests);
      final List data = response.data;
      return data.map((e) => ActivityRequestModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Direct Claims (new flow - replaces old activity_request + submission steps)
  Future<Map<String, dynamic>> submitDirectClaim({
    required int activityId,
    required String proof,
    required String description,
    double? hoursSpent,
    required DateTime activityDate,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.directClaims,
        data: {
          'activity_id': activityId,
          'proof': proof,
          'description': description,
          if (hoursSpent != null) 'hours_spent': hoursSpent,
          'activity_date': activityDate.toIso8601String(),
        },
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getMyDirectClaims() async {
    try {
      final response = await _dio.get(ApiConstants.myDirectClaims);
      final List data = response.data;
      return data.cast<Map<String, dynamic>>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Submissions (legacy — kept for old-flow records)
  Future<List<SubmissionModel>> getMySubmissions() async {
    try {
      final response = await _dio.get(ApiConstants.mySubmissions);
      final List data = response.data;
      return data.map((e) => SubmissionModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> submitProof({
    required int requestId,
    required String proof,
    required String description,
    required double hoursSpent,
    required DateTime activityDate,
  }) async {
    try {
      await _dio.post(
        ApiConstants.submissions,
        data: {
          'request_id': requestId,
          'proof': proof,
          'description': description,
          'hours_spent': hoursSpent,
          'activity_date': activityDate.toIso8601String(),
        },
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Admin Submissions (Old flow / legacy / claims)
  Future<List<SubmissionModel>> getAdminSubmissions({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConstants.submissions,
        queryParameters: status != null ? {'status': status} : null,
      );
      final List data = response.data;
      return data.map((e) => SubmissionModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Admin Event Submissions (Live photo flow)
  Future<List<EventSubmissionModel>> getAdminEventSubmissions({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConstants.adminEventSubmissions,
        queryParameters: status != null ? {'status': status} : null,
      );
      final List data = response.data;
      return data.map((e) => EventSubmissionModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Admin Event Management
  Future<EventModel> createEvent(Map<String, dynamic> eventData) async {
    try {
      final response = await _dio.post(
        ApiConstants.events,
        data: eventData,
      );
      return EventModel.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<EventModel> updateEvent(String eventId, Map<String, dynamic> eventData) async {
    try {
      final response = await _dio.patch(
        '${ApiConstants.events}/$eventId',
        data: eventData,
      );
      return EventModel.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Activity Requests (Admin)
  Future<List<ActivityRequestModel>> getAdminActivityRequests({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConstants.activityRequests,
        queryParameters: status != null ? {'status': status} : null,
      );
      final List data = response.data;
      return data.map((e) => ActivityRequestModel.fromJson(e)).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Admin Submissions & Reviews
  Future<void> reviewEventSubmission({
    required int submissionId,
    required String action,
    String? reviewNotes,
    int? pointsAwarded,
  }) async {
    try {
      await _dio.put(
        ApiConstants.adminEventSubmissions,
        data: {
          'submission_id': submissionId,
          'action': action,
          if (reviewNotes != null) 'review_notes': reviewNotes,
          if (pointsAwarded != null) 'points_awarded': pointsAwarded,
        },
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> verifySubmission(int id) async {
    try {
      // TODO: Replace with PUT /api/direct-claims/{id}/review once backend is ready
      await _dio.put('${ApiConstants.submissions}/$id/verify');
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Admin Management
  Future<void> updateAdminName(String name) async {
    try {
      await _dio.put(
        ApiConstants.adminMe,
        data: {'name': name},
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<ActivityModel> createActivity({
    required String name,
    required String category,
    required int points,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.activities,
        data: {
          'name': name,
          'category': category,
          'points': points,
        },
      );
      return ActivityModel.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Exception _handleError(dynamic e) {
    if (e is DioException) {
      if (e.response?.statusCode == 401) {
        return UnauthorizedException('Unauthorized');
      }
      final message =
          e.response?.data?['detail'] ?? e.message ?? 'Server error';
      return Exception(message);
    }
    return Exception(e.toString());
  }
}

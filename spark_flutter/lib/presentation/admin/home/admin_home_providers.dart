import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/api_provider.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/submission_model.dart';
import '../../../data/models/event_submission_model.dart';
import '../../../data/models/activity_request_model.dart';

// Admin Info
final adminMeProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getAdminMe();
});

// All Events
final adminEventsProvider = FutureProvider<List<EventModel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getEvents(); // Getting all events
});

// Pending Photo Submissions (Action Required)
final pendingPhotoSubmissionsProvider = FutureProvider<List<EventSubmissionModel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getAdminEventSubmissions(status: 'pending_review');
});

// Pending Activity Requests (Old flow - used for dashboard stats/actions)
final pendingRequestsProvider = FutureProvider<List<ActivityRequestModel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getAdminActivityRequests(status: 'pending');
});

// Pending Claims/Submissions (Old flow / legacy)
final pendingClaimsProvider = FutureProvider<List<SubmissionModel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getAdminSubmissions(status: 'pending');
});

// All Submissions (for charts)
final allClaimsProvider = FutureProvider<List<SubmissionModel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getAdminSubmissions();
});

final allPhotoSubmissionsProvider = FutureProvider<List<EventSubmissionModel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getAdminEventSubmissions();
});

// Helper for combined dashboard data loading
final adminDashboardDataProvider = FutureProvider<void>((ref) async {
  await Future.wait([
    ref.watch(adminMeProvider.future),
    ref.watch(adminEventsProvider.future),
    ref.watch(pendingPhotoSubmissionsProvider.future),
    ref.watch(pendingRequestsProvider.future),
    ref.watch(pendingClaimsProvider.future),
    ref.watch(allClaimsProvider.future),
    ref.watch(allPhotoSubmissionsProvider.future),
  ]);
});

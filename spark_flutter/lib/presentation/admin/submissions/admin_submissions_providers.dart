import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/event_submission_model.dart';
import '../../../data/models/submission_model.dart';
import '../../../core/providers/api_provider.dart';

// Photo Check-ins
final eventSubmissionsProvider = FutureProvider.family<List<EventSubmissionModel>, String>((ref, status) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.getAdminEventSubmissions(status: status);
});

// Direct Claims (Placeholder using submissions API)
final directClaimsProvider = FutureProvider.family<List<SubmissionModel>, String>((ref, status) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.getAdminSubmissions(status: status);
});

// Pending counts for badges
final pendingEventSubmissionsCountProvider = FutureProvider<int>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final submissions = await apiService.getAdminEventSubmissions(status: 'pending_review');
  return submissions.length;
});

final pendingDirectClaimsCountProvider = FutureProvider<int>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final submissions = await apiService.getAdminSubmissions(status: 'pending');
  return submissions.length;
});

// Total pending count for the bottom nav
final totalPendingSubmissionsCountProvider = Provider<int>((ref) {
  final eventCount = ref.watch(pendingEventSubmissionsCountProvider).value ?? 0;
  final claimCount = ref.watch(pendingDirectClaimsCountProvider).value ?? 0;
  return eventCount + claimCount;
});

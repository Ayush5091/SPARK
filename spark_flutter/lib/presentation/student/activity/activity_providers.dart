import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/activity_model.dart';
import '../../../data/models/activity_request_model.dart';
import '../../../data/models/submission_model.dart';
import '../../../data/models/event_submission_model.dart';
import '../../../data/services/api_service.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/api_provider.dart';

final activitiesProvider = FutureProvider<List<ActivityModel>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  try {
    return await apiService.getActivities();
  } on UnauthorizedException {
    await ref.read(authProvider.notifier).handleUnauthorized();
    return [];
  }
});

final myActivityRequestsProvider = FutureProvider<List<ActivityRequestModel>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  try {
    return await apiService.getMyActivityRequests();
  } on UnauthorizedException {
    await ref.read(authProvider.notifier).handleUnauthorized();
    return [];
  }
});

final mySubmissionsProvider = FutureProvider<List<SubmissionModel>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  try {
    return await apiService.getMySubmissions();
  } on UnauthorizedException {
    await ref.read(authProvider.notifier).handleUnauthorized();
    return [];
  }
});

final myEventSubmissionsProvider = FutureProvider<List<EventSubmissionModel>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  try {
    return await apiService.getMyEventSubmissions();
  } on UnauthorizedException {
    await ref.read(authProvider.notifier).handleUnauthorized();
    return [];
  }
});

final categoryFilterProvider = StateProvider<String>((ref) => 'All');

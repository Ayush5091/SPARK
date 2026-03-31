import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../data/services/api_service.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/notification_model.dart';

/// Current student location provider
final locationStateProvider = FutureProvider<Position?>((ref) async {
  bool serviceEnabled;
  LocationPermission permission;

  serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) return null;

  permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) return null;
  }

  if (permission == LocationPermission.deniedForever) return null;

  return await Geolocator.getCurrentPosition();
});

/// Search query provider
final searchQueryProvider = StateProvider<String>((ref) => '');

/// Events data fetching provider
final eventsProvider = FutureProvider<List<EventModel>>((ref) async {
  final searchQuery = ref.watch(searchQueryProvider).toLowerCase();
  final apiService = ApiService();

  List<EventModel> allEvents;
  try {
    // We fetch all events and filter on the client.
    allEvents = await apiService.getEvents(activeOnly: false);
  } on UnauthorizedException {
    await ref.read(authProvider.notifier).handleUnauthorized();
    return [];
  }

  return allEvents.where((e) {
    // Always hide completed events on student home.
    final bool statusMatch = !e.isEnded;

    // 2. Filter by search query
    final bool matchesSearch =
        searchQuery.isEmpty ||
        e.name.toLowerCase().contains(searchQuery) ||
        (e.description?.toLowerCase().contains(searchQuery) ?? false) ||
        e.category.toLowerCase().contains(searchQuery);

    return statusMatch && matchesSearch;
  }).toList();
});

/// Notifications provider
final notificationsProvider = FutureProvider<List<NotificationModel>>((
  ref,
) async {
  final apiService = ApiService();
  try {
    return await apiService.getNotifications();
  } on UnauthorizedException {
    await ref.read(authProvider.notifier).handleUnauthorized();
    return [];
  }
});

/// Map view toggle provider
final isMapViewProvider = StateProvider<bool>((ref) => false);

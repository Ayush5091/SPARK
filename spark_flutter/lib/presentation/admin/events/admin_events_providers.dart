import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/event_model.dart';
import '../../../core/providers/api_provider.dart';

final adminEventsProvider = FutureProvider<List<EventModel>>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.getEvents(activeOnly: false);
});

enum AdminEventFilter { all, active, upcoming, completed }

final adminEventFilterProvider = StateProvider<AdminEventFilter>((ref) => AdminEventFilter.all);

final filteredAdminEventsProvider = Provider<AsyncValue<List<EventModel>>>((ref) {
  final eventsAsync = ref.watch(adminEventsProvider);
  final filter = ref.watch(adminEventFilterProvider);

  return eventsAsync.whenData((events) {
    if (filter == AdminEventFilter.all) return events;
    
    return events.where((event) {
      switch (filter) {
        case AdminEventFilter.active:
          return event.status == 'live';
        case AdminEventFilter.upcoming:
          return event.status == 'upcoming';
        case AdminEventFilter.completed:
          return event.status == 'ended';
        default:
          return true;
      }
    }).toList();
  });
});

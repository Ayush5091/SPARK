import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../data/models/notification_model.dart';
import 'student_home_providers.dart';
import 'widgets/event_map_view.dart';
import 'widgets/event_card.dart';
import 'widgets/notification_drawer.dart';

class StudentHomeScreen extends ConsumerStatefulWidget {
  const StudentHomeScreen({super.key});

  @override
  ConsumerState<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends ConsumerState<StudentHomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _notificationController;
  bool _isNotificationOpen = false;

  @override
  void initState() {
    super.initState();
    _notificationController = AnimationController(
      vsync: this,
      duration: 400.ms,
    );
  }

  @override
  void dispose() {
    _notificationController.dispose();
    super.dispose();
  }

  void _toggleNotifications() {
    setState(() {
      _isNotificationOpen = !_isNotificationOpen;
      if (_isNotificationOpen) {
        _notificationController.forward();
      } else {
        _notificationController.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final eventsAsync = ref.watch(eventsProvider);
    final locationAsync = ref.watch(locationStateProvider);
    final notificationAsync = ref.watch(notificationsProvider);
    final isMapView = ref.watch(isMapViewProvider);

    final String name = authState.user?.name ?? "there";
    final String greeting = _getGreeting();

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "$greeting, $name",
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            "Find Events",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                      _buildNotificationBell(notificationAsync),
                    ],
                  ),
                ),

                // Search & Filter removed
                // _buildSearchBar(),

                // Mode Toggle & Status Filters
                _buildViewToggle(isMapView),

                // Main Content (Map or List)
                Expanded(
                  child: eventsAsync.when(
                    data: (events) {
                      if (isMapView) {
                        return locationAsync.when(
                          data: (pos) => pos != null
                              ? EventMapView(
                                  events: events,
                                  userLocation: LatLng(
                                    pos.latitude,
                                    pos.longitude,
                                  ),
                                )
                              : _buildLocationPrompt(),
                          loading: () => const Center(
                            child: CircularProgressIndicator(
                              color: AppColors.primary,
                            ),
                          ),
                          error: (err, _) => _buildLocationPrompt(),
                        );
                      } else {
                        if (events.isEmpty) return _buildEmptyState();
                        return RefreshIndicator(
                          onRefresh: () async => ref.refresh(eventsProvider),
                          color: AppColors.primary,
                          backgroundColor: AppColors.surface,
                          child: ListView.builder(
                            padding: const EdgeInsets.only(top: 8, bottom: 120),
                            itemCount: events.length,
                            itemBuilder: (context, index) {
                              final event = events[index];
                              final pos = locationAsync.value;
                              return EventCard(
                                    event: event,
                                    userLatitude: pos?.latitude,
                                    userLongitude: pos?.longitude,
                                  )
                                  .animate()
                                  .fadeIn(delay: (index * 100).ms)
                                  .slideY(begin: 0.1, end: 0);
                            },
                          ),
                        );
                      }
                    },
                    loading: () => const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                      ),
                    ),
                    error: (err, _) => Center(
                      child: Text(
                        "Error loading events: $err",
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Notification Drawer Overlay
          if (_isNotificationOpen)
            GestureDetector(
              onTap: _toggleNotifications,
              child: Container(color: Colors.black54),
            ),

          SlideTransition(
            position:
                Tween<Offset>(
                  begin: const Offset(0, -1),
                  end: Offset.zero,
                ).animate(
                  CurvedAnimation(
                    parent: _notificationController,
                    curve: Curves.easeOutBack,
                  ),
                ),
            child: NotificationDrawer(
              notifications: notificationAsync.value ?? [],
              onDismiss: _toggleNotifications,
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildViewToggle(bool isMapView) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Container(
        height: 50,
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(25),
        ),
        child: Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => ref.read(isMapViewProvider.notifier).state = true,
                child: Container(
                  decoration: BoxDecoration(
                    color: isMapView ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(21),
                  ),
                  child: Center(
                    child: Text(
                      "Map View",
                      style: TextStyle(
                        color: isMapView ? Colors.black : AppColors.textMuted,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: GestureDetector(
                onTap: () => ref.read(isMapViewProvider.notifier).state = false,
                child: Container(
                  decoration: BoxDecoration(
                    color: !isMapView ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(21),
                  ),
                  child: Center(
                    child: Text(
                      "List View",
                      style: TextStyle(
                        color: !isMapView ? Colors.black : AppColors.textMuted,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationBell(
    AsyncValue<List<NotificationModel>> notificationAsync,
  ) {
    return notificationAsync.when(
      data: (List<NotificationModel> notifications) {
        final unreadCount = notifications.where((n) => !n.isRead).length;
        return GestureDetector(
          onTap: _toggleNotifications,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border, width: 0.5),
                ),
                child: const Icon(
                  Icons.notifications_none,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              if (unreadCount > 0)
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.spark,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 18,
                      minHeight: 18,
                    ),
                    child: Text(
                      unreadCount.toString(),
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
      loading: () => const SizedBox(width: 44, height: 44),
      error: (_, __) =>
          const Icon(Icons.notifications_none, color: Colors.white),
    );
  }

  Widget _buildLocationPrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.location_off_outlined,
              color: AppColors.textMuted,
              size: 64,
            ),
            const SizedBox(height: 24),
            const Text(
              "Location access needed",
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            const Text(
              "We need your GPS to show events near you and verify your check-ins.",
              style: TextStyle(color: AppColors.textMuted, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => ref.refresh(locationStateProvider),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
              ),
              child: const Text(
                "Enable GPS",
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.event_busy, color: AppColors.textMuted, size: 64),
          const SizedBox(height: 16),
          const Text(
            "No events found",
            style: TextStyle(color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/theme/app_colors.dart';
import '../../../routes/route_names.dart';
import '../../../data/models/event_model.dart';
import '../../../core/providers/api_provider.dart';
import 'admin_events_providers.dart';

class AdminEventsScreen extends ConsumerWidget {
  const AdminEventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(filteredAdminEventsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          "Events",
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded, color: AppColors.textPrimary, size: 32),
            onPressed: () => context.push(RouteNames.createEvent),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          const _FilterTabBar(),
          Expanded(
            child: eventsAsync.when(
              data: (events) {
                if (events.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.event_busy_rounded, size: 64, color: AppColors.textMuted),
                        const SizedBox(height: 16),
                        Text("No events found", style: TextStyle(color: AppColors.textSecondary)),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.only(top: 8, bottom: 100),
                  itemCount: events.length,
                  itemBuilder: (context, index) => _EventManagementCard(event: events[index]),
                );
              },
              loading: () => _buildSkeletonLoader(),
              error: (err, stack) => Center(
                child: Text("Error: $err", style: const TextStyle(color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonLoader() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: 5,
      itemBuilder: (context, index) => Shimmer.fromColors(
        baseColor: AppColors.surface,
        highlightColor: AppColors.card,
        child: Container(
          height: 140,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
        ),
      ),
    );
  }
}

class _FilterTabBar extends ConsumerWidget {
  const _FilterTabBar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentFilter = ref.watch(adminEventFilterProvider);

    return Container(
      height: 44,
      margin: const EdgeInsets.symmetric(vertical: 12),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: AdminEventFilter.values.map((filter) {
          final isSelected = currentFilter == filter;
          return GestureDetector(
            onTap: () => ref.read(adminEventFilterProvider.notifier).state = filter,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 10),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? Colors.white : AppColors.card,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: isSelected ? Colors.white : AppColors.border,
                  width: 1,
                ),
              ),
              child: Text(
                _getFilterLabel(filter),
                style: TextStyle(
                  color: isSelected ? Colors.black : AppColors.textSecondary,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  fontSize: 13,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  String _getFilterLabel(AdminEventFilter filter) {
    switch (filter) {
      case AdminEventFilter.all: return "All";
      case AdminEventFilter.active: return "Active";
      case AdminEventFilter.upcoming: return "Upcoming";
      case AdminEventFilter.completed: return "Completed";
    }
  }
}

class _EventManagementCard extends StatelessWidget {
  final EventModel event;
  const _EventManagementCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(event.status);
    final statusLabel = _getStatusLabel(event.status);

    return GestureDetector(
      onTap: () => _showDetailSheet(context, event),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border(
            left: BorderSide(color: statusColor, width: 3),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      event.name,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _StatusChip(label: statusLabel, color: statusColor, isDark: event.status == 'ended'),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                   const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.textMuted),
                   const SizedBox(width: 6),
                   Text(
                     "${DateFormat('MMM d, h:mma').format(event.startDate)} → ${DateFormat('h:mma').format(event.endDate)}",
                     style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                   ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                   const Icon(Icons.location_on_rounded, size: 14, color: AppColors.textMuted),
                   const SizedBox(width: 6),
                   Text(
                     event.locationName,
                     style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                   ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _StatMini("👥", event.totalSubmissions, "attended"),
                  _StatMini("✅", event.verifiedSubmissions, "verified"),
                  _StatMini("⏳", event.pendingSubmissions, "pending"),
                  _PointsBadge(points: event.points),
                ],
              ),
              if (event.capacity != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Text("Capacity", style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                    const Spacer(),
                    Text("${event.attendeeCount}/${event.capacity}", style: const TextStyle(color: AppColors.primary, fontSize: 11)),
                  ],
                ),
                const SizedBox(height: 4),
                LinearProgressIndicator(
                  value: (event.capacity! > 0) ? (event.attendeeCount / event.capacity!) : 0,
                  color: AppColors.primary,
                  backgroundColor: AppColors.border,
                  borderRadius: BorderRadius.circular(4),
                  minHeight: 4,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'live': return AppColors.spark;
      case 'upcoming': return const Color(0xFFFF9800);
      default: return const Color(0xFF606060);
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'live': return "Active";
      case 'upcoming': return "Upcoming";
      default: return "Completed";
    }
  }

  void _showDetailSheet(BuildContext context, EventModel event) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _EventManagementDetailSheet(event: event),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool isDark;
  const _StatusChip({required this.label, required this.color, this.isDark = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isDark ? Colors.white : Colors.black,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _StatMini extends StatelessWidget {
  final String emoji;
  final int count;
  final String label;
  const _StatMini(this.emoji, this.count, this.label);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 4),
            Text(count.toString(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
      ],
    );
  }
}

class _PointsBadge extends StatelessWidget {
  final int points;
  const _PointsBadge({required this.points});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        "$points pts",
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
      ),
    );
  }
}

class _EventManagementDetailSheet extends ConsumerStatefulWidget {
  final EventModel event;
  const _EventManagementDetailSheet({required this.event});

  @override
  ConsumerState<_EventManagementDetailSheet> createState() => _EventManagementDetailSheetState();
}

class _EventManagementDetailSheetState extends ConsumerState<_EventManagementDetailSheet> {
  late EventModel currentEvent;
  bool _isEditingCapacity = false;
  late TextEditingController _capacityController;

  @override
  void initState() {
    super.initState();
    currentEvent = widget.event;
    _capacityController = TextEditingController(text: currentEvent.capacity?.toString() ?? '');
  }

  @override
  void dispose() {
    _capacityController.dispose();
    super.dispose();
  }

  Future<void> _updateCapacity() async {
    final newCapacity = int.tryParse(_capacityController.text);
    try {
      final updated = await ref.read(apiServiceProvider).updateEvent(
        currentEvent.id,
        {'capacity': newCapacity},
      );
      setState(() {
        currentEvent = updated;
        _isEditingCapacity = false;
      });
      // Also refresh the main list
      ref.invalidate(adminEventsProvider);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e"), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      builder: (context, scrollController) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 40),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[800],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    currentEvent.name,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                _PointsBadge(points: currentEvent.points),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _Badge(label: currentEvent.category, color: AppColors.primary.withOpacity(0.1), textColor: AppColors.primary),
                const SizedBox(width: 8),
                _Badge(
                  label: currentEvent.status == 'live' ? "Active" : currentEvent.status == 'upcoming' ? "Upcoming" : "Completed",
                  color: _getStatusColor(currentEvent.status).withOpacity(0.1),
                  textColor: _getStatusColor(currentEvent.status),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _Section("📍 Location", children: [
              Container(
                height: 180,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: LatLng(currentEvent.latitude, currentEvent.longitude),
                    initialZoom: 15,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.spark.app',
                    ),
                    CircleLayer(
                      circles: [
                        CircleMarker(
                          point: LatLng(currentEvent.latitude, currentEvent.longitude),
                          color: AppColors.primary.withOpacity(0.1),
                          borderStrokeWidth: 2,
                          borderColor: AppColors.primary.withOpacity(0.5),
                          useRadiusInMeter: true,
                          radius: currentEvent.locationRadiusMeters?.toDouble() ?? 100,
                        ),
                      ],
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(currentEvent.latitude, currentEvent.longitude),
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 40),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(currentEvent.locationName, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
              Text(
                "${currentEvent.latitude.toStringAsFixed(6)}, ${currentEvent.longitude.toStringAsFixed(6)}",
                style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
              ),
            ]),
            const SizedBox(height: 24),
            _Section("⏰ Time Window", children: [
              Row(
                children: [
                  _TimeBox(label: "Start", time: currentEvent.startDate),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Icon(Icons.arrow_forward_rounded, color: AppColors.textMuted, size: 16),
                  ),
                  _TimeBox(label: "End", time: currentEvent.endDate),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                "Tolerance: ±${currentEvent.timeToleranceMinutes ?? 30} min",
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
            ]),
            const SizedBox(height: 24),
            _Section("👥 Submissions (${currentEvent.totalSubmissions})", children: [
              Row(
                children: [
                  _InfoPill("✅ ${currentEvent.verifiedSubmissions} Verified", const Color(0xFF4CAF50)),
                  const SizedBox(width: 8),
                  _InfoPill("⏳ ${currentEvent.pendingSubmissions} Pending", Colors.orange),
                  const SizedBox(width: 8),
                  _InfoPill("❌ ${currentEvent.totalSubmissions - currentEvent.verifiedSubmissions - currentEvent.pendingSubmissions} Rejected", Colors.red),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    context.pop();
                    context.go(RouteNames.adminSubmissions, extra: currentEvent.id);
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text("View Submissions →"),
                ),
              ),
            ]),
            const SizedBox(height: 24),
            _Section("⚙️ Settings", children: [
              Row(
                children: [
                  const Text("Capacity", style: TextStyle(color: AppColors.textPrimary, fontSize: 14)),
                  const Spacer(),
                  if (_isEditingCapacity) ...[
                    SizedBox(
                      width: 80,
                      height: 40,
                      child: TextField(
                        controller: _capacityController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: "Inf",
                          hintStyle: TextStyle(color: AppColors.textMuted),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          enabledBorder: OutlineInputBorder(borderSide: const BorderSide(color: AppColors.border), borderRadius: BorderRadius.circular(8)),
                          focusedBorder: OutlineInputBorder(borderSide: const BorderSide(color: AppColors.primary), borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.check_circle_rounded, color: AppColors.primary),
                      onPressed: _updateCapacity,
                    ),
                  ] else ...[
                    Text(
                      currentEvent.capacity?.toString() ?? "Unlimited",
                      style: TextStyle(color: currentEvent.capacity == null ? AppColors.textMuted : Colors.white, fontSize: 14),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _isEditingCapacity = true),
                      child: const Text("Edit", style: TextStyle(color: AppColors.primary, fontSize: 14)),
                    ),
                  ],
                ],
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'live': return AppColors.spark;
      case 'upcoming': return const Color(0xFFFF9800);
      default: return const Color(0xFF606060);
    }
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section(this.title, {required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(), style: GoogleFonts.poppins(color: Colors.white60, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        const SizedBox(height: 12),
        ...children,
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final Color textColor;
  const _Badge({required this.label, required this.color, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(color: textColor, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

class _InfoPill extends StatelessWidget {
  final String label;
  final Color color;
  const _InfoPill(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

class _TimeBox extends StatelessWidget {
  final String label;
  final DateTime time;
  const _TimeBox({required this.label, required this.time});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
        Text(
          DateFormat('MMM d').format(time),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
        ),
        Text(
          DateFormat('h:mm a').format(time),
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
      ],
    );
  }
}

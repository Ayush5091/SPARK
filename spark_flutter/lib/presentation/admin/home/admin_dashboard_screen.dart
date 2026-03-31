import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../routes/route_names.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/event_submission_model.dart';
import 'admin_home_providers.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  String _chartPeriod = '30D'; // 7D, 30D, All

  Future<void> _onRefresh() async {
    ref.invalidate(adminMeProvider);
    ref.invalidate(adminEventsProvider);
    ref.invalidate(pendingPhotoSubmissionsProvider);
    ref.invalidate(pendingRequestsProvider);
    ref.invalidate(pendingClaimsProvider);
    ref.invalidate(allClaimsProvider);
    ref.invalidate(allPhotoSubmissionsProvider);
    return ref.read(adminDashboardDataProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(adminDashboardDataProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: _buildHeader(),
            ),

            dashboardAsync.when(
              data: (_) => SliverList(
                delegate: SliverChildListDelegate([
                  _buildQuickStats(),
                  _buildActionRequired(),
                  _buildSubmissionTrend(),
                  _buildCategoryBreakdown(),
                  _buildEventsOverview(),
                  _buildRecentSubmissions(),
                  const SizedBox(height: 100), // Bottom nav space
                ]),
              ),
              loading: () => SliverToBoxAdapter(
                child: _buildShimmerLoading(),
              ),
              error: (err, stack) => SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error, size: 48),
                      const SizedBox(height: 16),
                      Text("Error: $err", style: const TextStyle(color: Colors.white)),
                      ElevatedButton(
                        onPressed: _onRefresh,
                        child: const Text("Retry"),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final adminMe = ref.watch(adminMeProvider).value;
    final name = adminMe?['name'] ?? 'Admin';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'A';

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "SPARK ADMIN",
                style: GoogleFonts.poppins(
                  color: AppColors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2.0,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                "Dashboard",
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          GestureDetector(
            onTap: () {
              // Admin profile side sheet toggle or navigation
            },
            child: Container(
              width: 50,
              height: 50,
              decoration: const BoxDecoration(
                color: AppColors.spark,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  initial,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStats() {
    final events = ref.watch(adminEventsProvider).value ?? [];
    final legacyClaims = ref.watch(allClaimsProvider).value ?? [];
    final photoSubmissions = ref.watch(allPhotoSubmissionsProvider).value ?? [];
    final pendingPhoto = ref.watch(pendingPhotoSubmissionsProvider).value ?? [];
    final pendingRequests = ref.watch(pendingRequestsProvider).value ?? [];
    final pendingClaims = ref.watch(pendingClaimsProvider).value ?? [];

    // Calculate sum of points awarded
    double totalPoints = 0;
    for (var sub in photoSubmissions) {
      if (sub.status == 'verified') {
        totalPoints += sub.manualPoints.toDouble();
      }
    }
    for (var sub in legacyClaims) {
      if (sub.status == 'approved') {
        totalPoints += sub.request?.activity?.points.toDouble() ?? 0;
      }
    }

    // Unique students count (approximate)
    final studentIds = <String>{};
    for (var sub in photoSubmissions) studentIds.add(sub.studentId.toString());
    for (var sub in legacyClaims) studentIds.add(sub.requestId.toString()); // best approximation

    int activeEvents = events.where((e) => e.status == 'live').length;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          _StatCard(label: "Points Awarded", value: totalPoints.toInt().toString(), icon: Icons.bolt_rounded, isHighlight: true),
          _StatCard(label: "Total Students", value: studentIds.length.toString(), icon: Icons.group_rounded),
          _StatCard(label: "Pending Reviews", value: pendingPhoto.length.toString(), icon: Icons.assignment_rounded),
          _StatCard(label: "Active Events", value: activeEvents.toString(), icon: Icons.calendar_today_rounded),
          _StatCard(label: "Pending Claims", value: (pendingRequests.length + pendingClaims.length).toString(), icon: Icons.description_rounded),
        ],
      ),
    );
  }

  Widget _buildActionRequired() {
    final pendingPhoto = ref.watch(pendingPhotoSubmissionsProvider).value ?? [];
    final pendingClaims = (ref.watch(pendingRequestsProvider).value?.length ?? 0) + 
                          (ref.watch(pendingClaimsProvider).value?.length ?? 0);

    if (pendingPhoto.isEmpty && pendingClaims == 0) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(title: "Action Required"),
        SizedBox(
          height: 120,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            children: [
              if (pendingPhoto.isNotEmpty)
                _ActionCard(
                  title: "${pendingPhoto.length} Photo Submissions",
                  subtitle: "need review",
                  icon: Icons.camera_alt_rounded,
                  isUrgent: pendingPhoto.length > 5,
                  onTap: () => context.go(RouteNames.adminSubmissions),
                ),
              const SizedBox(width: 16),
              if (pendingClaims > 0)
                _ActionCard(
                  title: "$pendingClaims Claims",
                  subtitle: "pending review",
                  icon: Icons.description_rounded,
                  isUrgent: pendingClaims > 5,
                  isDark: true,
                  onTap: () => context.go(RouteNames.adminSubmissions),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSubmissionTrend() {
    final claims = ref.watch(allClaimsProvider).value ?? [];
    final photoSubmissions = ref.watch(allPhotoSubmissionsProvider).value ?? [];

    // Simple grouping by date
    Map<String, int> dailyCounts = {};
    DateTime now = DateTime.now();
    int daysToLookBack = _chartPeriod == '7D' ? 7 : (_chartPeriod == '30D' ? 30 : 90);

    for (int i = 0; i < daysToLookBack; i++) {
      final date = now.subtract(Duration(days: i));
      final dateStr = DateFormat('yyyy-MM-dd').format(date);
      dailyCounts[dateStr] = 0;
    }

    for (var sub in photoSubmissions) {
      final dateStr = DateFormat('yyyy-MM-dd').format(sub.createdAt);
      if (dailyCounts.containsKey(dateStr)) dailyCounts[dateStr] = dailyCounts[dateStr]! + 1;
    }
    for (var sub in claims) {
      // SubmissionModel has activityDate; use that as proxy
      final dateStr = DateFormat('yyyy-MM-dd').format(sub.activityDate);
      if (dailyCounts.containsKey(dateStr)) dailyCounts[dateStr] = dailyCounts[dateStr]! + 1;
    }

    final sortedDates = dailyCounts.keys.toList()..sort();
    final spots = sortedDates.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), dailyCounts[e.value]!.toDouble());
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: "Submission Activity",
          trailing: _buildChartToggle(),
        ),
        Container(
          height: 220,
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
          ),
          child: LineChart(
            LineChartData(
              gridData: const FlGridData(show: false),
              titlesData: const FlTitlesData(show: false),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: AppColors.spark,
                  barWidth: 3,
                  isStrokeCapRound: true,
                  dotData: const FlDotData(show: false),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      colors: [
                        AppColors.spark.withOpacity(0.15),
                        AppColors.spark.withOpacity(0),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChartToggle() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: ['7D', '30D', 'All'].map((p) {
          final isSelected = _chartPeriod == p;
          return GestureDetector(
            onTap: () => setState(() => _chartPeriod = p),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.surface : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                p,
                style: TextStyle(
                  color: isSelected ? AppColors.primary : AppColors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCategoryBreakdown() {
    final claims = ref.watch(allClaimsProvider).value ?? [];
    final photoSubmissions = ref.watch(allPhotoSubmissionsProvider).value ?? [];
    
    Map<String, int> categories = {};
    for (var sub in photoSubmissions) {
       final cat = sub.event?.category ?? 'Other';
       categories[cat] = (categories[cat] ?? 0) + 1;
    }
    for (var sub in claims) {
       final cat = sub.request?.activity?.category ?? 'Other';
       categories[cat] = (categories[cat] ?? 0) + 1;
    }

    if (categories.isEmpty) return const SizedBox.shrink();

    final List<PieChartSectionData> sections = [];
    final List<Widget> legend = [];
    final int total = categories.values.fold(0, (sum, val) => sum + val);
    
    int i = 0;
    final List<Color> colors = [
      const Color(0xFF888888),
      const Color(0xFF666666),
      const Color(0xFF555555),
      const Color(0xFF444444),
      const Color(0xFF333333),
    ];

    categories.forEach((name, count) {
      if (i >= colors.length) i = 0;
      final color = colors[i++];
      final percentage = (count / total * 100).toStringAsFixed(1);
      
      sections.add(PieChartSectionData(
        color: color,
        value: count.toDouble(),
        title: '',
        radius: 20,
      ));

      legend.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text("$name ($percentage%)", style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ],
          ),
        ),
      );
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(title: "Activity Categories"),
        Container(
          height: 180,
          margin: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              Expanded(
                flex: 1,
                child: PieChart(
                  PieChartData(
                    sectionsSpace: 4,
                    centerSpaceRadius: 40,
                    sections: sections,
                  ),
                ),
              ),
              Expanded(
                flex: 1,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: legend,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEventsOverview() {
    final events = ref.watch(adminEventsProvider).value ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: "Events",
          trailing: TextButton.icon(
            onPressed: () => context.push(RouteNames.createEvent),
            icon: const Icon(Icons.add_circle_outline, size: 18, color: AppColors.textPrimary),
            label: const Text("Create", style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
          ),
        ),
        SizedBox(
          height: 140,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            itemCount: events.length,
            itemBuilder: (context, index) {
              return _EventAdminCard(event: events[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecentSubmissions() {
    final pendingPhoto = ref.watch(pendingPhotoSubmissionsProvider).value ?? [];
    final recent = pendingPhoto.take(5).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          title: "Recent Submissions",
          trailing: TextButton(
            onPressed: () => context.go(RouteNames.adminSubmissions),
            child: const Text("See All", style: TextStyle(color: AppColors.primary)),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: recent.map((s) => _RecentSubmissionRow(submission: s)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildShimmerLoading() {
    return Shimmer.fromColors(
      baseColor: AppColors.surface,
      highlightColor: AppColors.border,
      child: Column(
        children: [
          Container(
            height: 100,
            margin: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
          ),
          Container(
            height: 200,
            margin: const EdgeInsets.symmetric(horizontal: 24),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool isHighlight;

  const _StatCard({required this.label, required this.value, required this.icon, this.isHighlight = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 120,
      height: 90,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: AppColors.textMuted, size: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: GoogleFonts.poppins(color: isHighlight ? AppColors.spark : AppColors.textPrimary, fontSize: 24, fontWeight: FontWeight.bold)),
              Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatefulWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isUrgent;
  final bool isDark;
  final VoidCallback onTap;

  const _ActionCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    this.isUrgent = false,
    this.isDark = false,
    required this.onTap,
  });

  @override
  State<_ActionCard> createState() => _ActionCardState();
}

class _ActionCardState extends State<_ActionCard> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
       vsync: this,
       duration: const Duration(seconds: 2),
    );
    if (widget.isUrgent) _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return GestureDetector(
          onTap: widget.onTap,
          child: Container(
            width: 200,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: widget.isUrgent ? AppColors.sparkCardGradient : null,
              color: widget.isUrgent ? null : AppColors.card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: widget.isUrgent 
                    ? Colors.white.withOpacity(_pulseController.value) 
                    : Colors.white.withOpacity(0.1),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(widget.icon, color: widget.isUrgent ? AppColors.spark : AppColors.textPrimary, size: 32),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(widget.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      Text(widget.subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _EventAdminCard extends StatelessWidget {
  final EventModel event;
  const _EventAdminCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final isActive = event.status == 'live';
    return Container(
      width: 180,
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: isActive ? Colors.green : Colors.grey, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(isActive ? "Live" : event.status == 'upcoming' ? "Upcoming" : "Ended", style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
            ],
          ),
          Text(event.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
          Text(
            "${DateFormat('MMM d').format(event.startDate)} – ${DateFormat('MMM d').format(event.endDate)}",
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 10),
          ),
          Text(
            "${event.attendeeCount} submitted",
            style: TextStyle(color: AppColors.textPrimary.withOpacity(0.6), fontSize: 9, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _RecentSubmissionRow extends StatelessWidget {
  final EventSubmissionModel submission;
  const _RecentSubmissionRow({required this.submission});

  @override
  Widget build(BuildContext context) {
    final diff = DateTime.now().difference(submission.createdAt);
    final timeAgo = diff.inMinutes < 60 ? "${diff.inMinutes} mins ago" : "${diff.inHours} hrs ago";
    final studentLabel = "Student #${submission.studentId}";
    final eventLabel = submission.event?.name ?? "Event #${submission.eventId}";

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.person, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(studentLabel, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                Text(eventLabel, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(timeAgo, style: const TextStyle(color: AppColors.textSecondary, fontSize: 10)),
              const Text("Review →", style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const _SectionHeader({required this.title, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../routes/route_names.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/spark_card.dart';
import '../../../core/widgets/spark_button.dart';
import '../../../core/widgets/spark_text_field.dart';
import '../../../data/models/student_model.dart';
import '../../../data/models/submission_model.dart';
import '../../../data/models/event_submission_model.dart';
import '../activity/activity_providers.dart';
import 'profile_providers.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/api_provider.dart';

class StudentProfileScreen extends ConsumerStatefulWidget {
  const StudentProfileScreen({super.key});

  @override
  ConsumerState<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends ConsumerState<StudentProfileScreen> {
  bool _notificationAlerts = true;
  bool _submissionUpdates = true;

  @override
  void initState() {
    super.initState();
    _loadNotificationSettings();
  }

  Future<void> _loadNotificationSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _notificationAlerts = prefs.getBool('notif_alerts') ?? true;
      _submissionUpdates = prefs.getBool('sub_updates') ?? true;
    });
  }

  Future<void> _saveNotificationSetting(String key, bool val) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, val);
  }

  Future<void> _refresh() async {
    ref.invalidate(studentMeProvider);
    ref.invalidate(myEventSubmissionsProvider);
    ref.invalidate(mySubmissionsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final studentAsync = ref.watch(studentMeProvider);
    final eventsAsync = ref.watch(myEventSubmissionsProvider);
    final claimsAsync = ref.watch(mySubmissionsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppColors.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            studentAsync.when(
              data: (student) => SliverAppBar(
                expandedHeight: 220,
                pinned: true,
                backgroundColor: AppColors.background,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => context.pop(),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  centerTitle: true,
                  titlePadding: const EdgeInsets.only(bottom: 16),
                  title: Text(
                    student.name,
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  background: Stack(
                    children: [
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [AppColors.loginBackground, AppColors.background],
                          ),
                        ),
                      ),
                      CustomPaint(
                        painter: HexagonPatternPainter(),
                        size: const Size(double.infinity, 220),
                      ),
                      SafeArea(
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'SPARK',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              CircleAvatar(
                                radius: 32,
                                backgroundColor: AppColors.primary,
                                backgroundImage: student.profilePhoto != null 
                                    ? NetworkImage(student.profilePhoto!) 
                                    : null,
                                child: student.profilePhoto == null 
                                    ? Text(
                                        student.name.isNotEmpty ? student.name[0].toUpperCase() : 'S',
                                        style: const TextStyle(
                                          fontSize: 24,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.black,
                                        ),
                                      )
                                    : null,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                student.enrollmentNo,
                                style: const TextStyle(
                                  color: AppColors.textSecondary, 
                                  fontSize: 12,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              Text(
                                student.department,
                                style: const TextStyle(
                                  color: AppColors.textSecondary, 
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              loading: () => const SliverAppBar(expandedHeight: 220),
              error: (e, __) => SliverAppBar(
                title: const Text('Error'),
                expandedHeight: 120,
              ),
            ),
            
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Stats Cards
                  _buildStatsRow(studentAsync, eventsAsync, claimsAsync),
                  const SizedBox(height: 24),

                  // Total Progress Card (New)
                  _buildTotalPointsProgressCard(studentAsync, eventsAsync, claimsAsync),
                  const SizedBox(height: 24),

                  // Points by Category Chart (Moved down)
                  _buildChartCard(eventsAsync, claimsAsync),
                  const SizedBox(height: 24),

                  // Recent Activity
                  _buildRecentActivity(eventsAsync, claimsAsync),
                  const SizedBox(height: 24),

                  // Notif Settings
                  _buildNotificationSettings(),
                  const SizedBox(height: 24),

                  // Account details
                  _buildAccountSection(context, studentAsync),
                  const SizedBox(height: 32),

                  // Log Out
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: OutlinedButton.icon(
                      onPressed: () => _confirmLogout(context),
                      icon: const Icon(Icons.logout, color: AppColors.error),
                      label: const Text('Log Out', style: TextStyle(color: AppColors.error)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.error),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 120),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(
    AsyncValue<StudentModel> studentAsync,
    AsyncValue<List<EventSubmissionModel>> eventsAsync,
    AsyncValue<List<SubmissionModel>> claimsAsync,
  ) {
    int totalP = 0;
    int completed = 0;
    int pending = 0;

    studentAsync.whenData((s) => totalP = s.totalPoints);
    
    eventsAsync.whenData((list) {
      completed += list.where((e) => e.status == 'verified').length;
      pending += list.where((e) => e.status == 'pending_review' || e.status == 'pending').length;
    });

    claimsAsync.whenData((list) {
      completed += list.where((e) => e.status == 'approved' || e.status == 'verified').length;
      pending += list.where((e) => e.status == 'pending').length;
    });

    return Row(
      children: [
        Expanded(child: SparkStatCard(label: "Total Points", value: "$totalP", isSparkValue: true)),
        const SizedBox(width: 12),
        Expanded(child: SparkStatCard(label: "Completed", value: "$completed")),
        const SizedBox(width: 12),
        Expanded(child: SparkStatCard(label: "Pending", value: "$pending")),
      ],
    );
  }

  Widget _buildTotalPointsProgressCard(
    AsyncValue<StudentModel> studentAsync,
    AsyncValue<List<EventSubmissionModel>> eventsAsync,
    AsyncValue<List<SubmissionModel>> claimsAsync,
  ) {
    const int pointsTarget = 100; // TODO: Make this configurable from backend
    int totalP = 0;
    studentAsync.whenData((s) => totalP = s.totalPoints);

    // Prepare line chart data
    final now = DateTime.now();
    final last6MonthsList = List.generate(6, (i) {
      return DateTime(now.year, now.month - (5 - i), 1);
    });
    
    final Map<String, int> monthlyGain = {
      for (var d in last6MonthsList) DateFormat('MMM').format(d): 0
    };

    void processData() {
      eventsAsync.whenData((list) {
        for (var s in list) {
          if (s.status == 'verified') {
            final month = DateFormat('MMM').format(s.createdAt);
            if (monthlyGain.containsKey(month)) {
              monthlyGain[month] = monthlyGain[month]! + (s.manualPoints > 0 ? s.manualPoints : (s.event?.points ?? 0));
            }
          }
        }
      });

      claimsAsync.whenData((list) {
        for (var s in list) {
          if (s.status == 'approved' || s.status == 'verified') {
            final month = DateFormat('MMM').format(s.activityDate);
            if (monthlyGain.containsKey(month)) {
              monthlyGain[month] = monthlyGain[month]! + (s.request?.activity?.points ?? 0);
            }
          }
        }
      });
    }

    processData();

    int cumulative = 0;
    final List<FlSpot> spots = [];
    final monthLabels = last6MonthsList.map((d) => DateFormat('MMM').format(d)).toList();
    
    for (int i = 0; i < monthLabels.length; i++) {
        cumulative += monthlyGain[monthLabels[i]]!;
        spots.add(FlSpot(i.toDouble(), cumulative.toDouble()));
    }

    final hasData = cumulative > 0;

    return Container(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.08),
            blurRadius: 24,
            spreadRadius: 0,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: SparkCard(
        padding: 20,
        radius: 24,
        gradient: AppColors.cardGradient,
        child: Column(
          children: [
            // TOP ROW
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Total Activity Points",
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Animate(
                      effects: [
                        FadeEffect(duration: 800.ms),
                        SlideEffect(begin: const Offset(-0.1, 0), end: Offset.zero),
                      ],
                      child: RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: "$totalP",
                              style: GoogleFonts.poppins(
                                fontSize: 44,
                                fontWeight: FontWeight.w700,
                                color: AppColors.spark,
                              ),
                            ),
                            TextSpan(
                              text: " / $pointsTarget",
                              style: GoogleFonts.poppins(
                                fontSize: 20,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildStatusPill(totalP, pointsTarget),
                  ],
                ),
                _AnimatedProgressRing(targetPoints: pointsTarget, currentPoints: totalP),
              ],
            ),
            const SizedBox(height: 12),
            // BOTTOM LINE CHART
            SizedBox(
              height: 110,
              child: hasData 
                ? _AnimatedLineChart(spots: spots, monthLabels: monthLabels)
                : const Center(
                    child: Text(
                      "Start earning points to see your progress!",
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusPill(int total, int target) {
    String text;
    Color color;
    Color textColor = Colors.white;
    if (total >= target) {
      text = "✅ Target Reached";
      color = Colors.white;
      textColor = Colors.black;
    } else if (total >= target * 0.75) {
      text = "🔥 Almost there";
      color = Colors.orange;
      textColor = Colors.white;
    } else {
      text = "Keep going →";
      color = AppColors.textMuted;
      textColor = Colors.white;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: total >= target ? Colors.white : color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        text,
        style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildChartCard(
    AsyncValue<List<EventSubmissionModel>> eventsAsync,
    AsyncValue<List<SubmissionModel>> claimsAsync,
  ) {
    Map<String, double> categoryPoints = {};

    void addPoint(String cat, double pts) {
      final key = cat.toUpperCase();
      categoryPoints[key] = (categoryPoints[key] ?? 0) + pts;
    }

    eventsAsync.whenData((list) {
      for (var s in list) {
        if (s.status == 'verified') {
          addPoint(s.event?.category ?? 'OTHER', (s.manualPoints > 0 ? s.manualPoints : (s.event?.points ?? 0)).toDouble());
        }
      }
    });

    claimsAsync.whenData((list) {
      for (var s in list) {
        if (s.status == 'approved' || s.status == 'verified') {
          addPoint(s.request?.activity?.category ?? 'OTHER', (s.request?.activity?.points ?? 0).toDouble());
        }
      }
    });

    final sortedKeys = categoryPoints.keys.toList()..sort((a, b) => categoryPoints[b]!.compareTo(categoryPoints[a]!));

    return SparkCard(
      padding: 20,
      radius: 20,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Points by Category",
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          if (sortedKeys.isEmpty)
            const SizedBox(
              height: 100,
              child: Center(
                child: Text("No points accumulated yet.", style: TextStyle(color: AppColors.textMuted)),
              ),
            )
          else
            SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceEvenly,
                  maxY: (categoryPoints.values.isEmpty ? 10 : categoryPoints.values.reduce((a, b) => a > b ? a : b)) + 10,
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipColor: (_) => AppColors.card,
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        return BarTooltipItem(
                          '${sortedKeys[group.x.toInt()]}\n${rod.toY.toInt()} pts',
                          const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (val, meta) {
                          if (val.toInt() < 0 || val.toInt() >= sortedKeys.length) return const SizedBox();
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(
                              sortedKeys[val.toInt()].length > 3 
                                  ? sortedKeys[val.toInt()].substring(0, 3) 
                                  : sortedKeys[val.toInt()],
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600),
                            ),
                          );
                        },
                      ),
                    ),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: const FlGridData(show: false),
                  borderData: FlBorderData(show: false),
                  barGroups: sortedKeys.asMap().entries.map((e) {
                    return BarChartGroupData(
                      x: e.key,
                      barRods: [
                        BarChartRodData(
                          toY: categoryPoints[e.value]!,
                          color: AppColors.primary,
                          width: 14,
                          borderRadius: BorderRadius.circular(4),
                          backDrawRodData: BackgroundBarChartRodData(
                            show: true,
                            toY: (categoryPoints.values.reduce((a, b) => a > b ? a : b)) + 10,
                            color: Colors.white.withOpacity(0.05),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRecentActivity(
    AsyncValue<List<EventSubmissionModel>> eventsAsync,
    AsyncValue<List<SubmissionModel>> claimsAsync,
  ) {
    List<ActivityTimelineItem> items = [];

    eventsAsync.whenData((list) {
      for (var s in list) {
        items.add(ActivityTimelineItem(
          name: s.event?.name ?? 'Event',
          date: s.createdAt,
          points: s.manualPoints > 0 ? s.manualPoints : (s.event?.points ?? 0),
          status: s.status,
          type: 'Event',
        ));
      }
    });

    claimsAsync.whenData((list) {
      for (var s in list) {
        items.add(ActivityTimelineItem(
          name: s.request?.activity?.name ?? 'Claim',
          date: s.activityDate,
          points: s.request?.activity?.points ?? 0,
          status: s.status,
          type: 'Claim',
        ));
      }
    });

    items.sort((a, b) => b.date.compareTo(a.date));
    final displayItems = items.take(10).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Recent Activity",
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        if (displayItems.isEmpty)
          Center(
            child: Column(
              children: [
                const SizedBox(height: 20),
                const Icon(Icons.bolt, color: AppColors.primary, size: 48),
                const SizedBox(height: 12),
                Text(
                  "No activity yet — get started!",
                  style: GoogleFonts.poppins(color: AppColors.textSecondary),
                ),
              ],
            ),
          )
        else
          Stack(
            children: [
              Positioned(
                left: 11,
                top: 10,
                bottom: 10,
                child: Container(
                  width: 2,
                  color: AppColors.spark.withOpacity(0.3),
                ),
              ),
              Column(
                children: displayItems.map((item) => _buildTimelineTile(item)).toList(),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildTimelineTile(ActivityTimelineItem item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: AppColors.background,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.spark, width: 2),
            ),
            child: const Center(
              child: Icon(Icons.check, size: 12, color: AppColors.spark),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item.name,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        "+${item.points} pts",
                        style: const TextStyle(color: AppColors.spark, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        DateFormat('MMM dd, yyyy').format(item.date),
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                      ),
                      _buildStatusChip(item.status),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        color = AppColors.spark;
        break;
      case 'rejected':
        color = AppColors.error;
        break;
      default:
        color = Colors.orange;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.3), width: 0.5),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 8, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildNotificationSettings() {
    return SparkCard(
      padding: 0,
      radius: 20,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 20, top: 20, bottom: 8),
            child: Text(
              "Notifications",
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          SwitchListTile(
            value: _notificationAlerts,
            onChanged: (val) {
              setState(() => _notificationAlerts = val);
              _saveNotificationSetting('notif_alerts', val);
            },
            title: const Text("Event alerts", style: TextStyle(color: Colors.white, fontSize: 14)),
            activeColor: AppColors.primary,
          ),
          SwitchListTile(
            value: _submissionUpdates,
            onChanged: (val) {
              setState(() => _submissionUpdates = val);
              _saveNotificationSetting('sub_updates', val);
            },
            title: const Text("Submission updates", style: TextStyle(color: Colors.white, fontSize: 14)),
            activeColor: AppColors.primary,
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _buildAccountSection(BuildContext context, AsyncValue<StudentModel> studentAsync) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Account",
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        ListTile(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          tileColor: AppColors.card,
          leading: const Icon(Icons.person_outline, color: AppColors.primary),
          title: const Text("Edit Profile", style: TextStyle(color: Colors.white)),
          trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
          onTap: () => studentAsync.whenData((s) => _showEditProfileSheet(context, s)),
        ),
        const SizedBox(height: 12),
        ListTile(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          tileColor: AppColors.card,
          leading: const Icon(Icons.history, color: AppColors.primary),
          title: const Text("View All Submissions", style: TextStyle(color: Colors.white)),
          trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
          onTap: () => context.push(RouteNames.mySubmissions),
        ),
      ],
    );
  }

  void _showEditProfileSheet(BuildContext context, StudentModel student) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EditProfileBottomSheet(student: student),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Log Out', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to log out?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(authProvider.notifier).logout();
              if (mounted) context.go('/login');
            },
            child: const Text('Log Out', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}

// Redundant SparkStatCard removed

class HexagonPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    const hexRadius = 30.0;
    final hexWidth = hexRadius * 1.732;
    final hexHeight = hexRadius * 2;

    for (double y = 0; y < size.height + hexHeight; y += hexHeight * 0.75) {
      double offsetX = (y / (hexHeight * 0.75)).floor() % 2 == 0 ? 0 : hexWidth / 2;
      for (double x = -hexWidth; x < size.width + hexWidth; x += hexWidth) {
        _drawHexagon(canvas, Offset(x + offsetX, y), hexRadius, paint);
      }
    }
  }

  void _drawHexagon(Canvas canvas, Offset center, double radius, Paint paint) {
    final path = Path();
    final double h = radius * 0.866; // cos(30) or sin(60)
    
    path.moveTo(center.dx, center.dy - radius);
    path.lineTo(center.dx + h, center.dy - radius * 0.5);
    path.lineTo(center.dx + h, center.dy + radius * 0.5);
    path.lineTo(center.dx, center.dy + radius);
    path.lineTo(center.dx - h, center.dy + radius * 0.5);
    path.lineTo(center.dx - h, center.dy - radius * 0.5);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class ActivityTimelineItem {
  final String name;
  final DateTime date;
  final int points;
  final String status;
  final String type;

  ActivityTimelineItem({
    required this.name,
    required this.date,
    required this.points,
    required this.status,
    required this.type,
  });
}

class EditProfileBottomSheet extends ConsumerStatefulWidget {
  final StudentModel student;

  const EditProfileBottomSheet({super.key, required this.student});

  @override
  ConsumerState<EditProfileBottomSheet> createState() => _EditProfileBottomSheetState();
}

class _EditProfileBottomSheetState extends ConsumerState<EditProfileBottomSheet> {
  late TextEditingController _phoneController;
  String? _selectedDept;
  bool _isSaving = false;

  final List<String> _departments = [
    'CS', 'IS', 'AIML', 'EC', 'ME', 'Robotics', 'Other'
  ];

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: widget.student.phoneNumber ?? "");
    _selectedDept = _departments.contains(widget.student.department) ? widget.student.department : _departments.last;
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final apiService = ref.read(apiServiceProvider);
      await apiService.updateStudentProfile(
        phoneNumber: _phoneController.text.trim(),
        department: _selectedDept ?? 'Other',
      );
      ref.invalidate(studentMeProvider);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!'), backgroundColor: AppColors.primary),
        );
      }
    } catch (e) {
       if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Update failed: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 120,
      ),
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        border: Border(top: BorderSide(color: AppColors.primary, width: 2)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Edit Profile",
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SparkTextField(
            label: "Phone Number",
            controller: _phoneController,
            hint: "Enter your phone number",
            keyboardType: TextInputType.phone,
            prefixIcon: const Icon(Icons.phone, color: AppColors.textMuted),
          ),
          const SizedBox(height: 20),
          const Text(
            "Department",
            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedDept,
                isExpanded: true,
                dropdownColor: AppColors.card,
                icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted),
                style: const TextStyle(color: Colors.white, fontSize: 16),
                items: _departments.map((String dept) {
                  return DropdownMenuItem<String>(
                    value: dept,
                    child: Text(dept),
                  );
                }).toList(),
                onChanged: (String? newVal) {
                  setState(() => _selectedDept = newVal);
                },
              ),
            ),
          ),
          const SizedBox(height: 32),
          SparkButton(
            label: "Save Changes",
            isLoading: _isSaving,
            onPressed: _save,
          ),
        ],
      ),
    );
  }
}

class _AnimatedProgressRing extends StatefulWidget {
  final int targetPoints;
  final int currentPoints;

  const _AnimatedProgressRing({
    required this.targetPoints,
    required this.currentPoints,
  });

  @override
  State<_AnimatedProgressRing> createState() => _AnimatedProgressRingState();
}

class _AnimatedProgressRingState extends State<_AnimatedProgressRing> with SingleTickerProviderStateMixin {
  double get _progress => (widget.targetPoints > 0) ? (widget.currentPoints / widget.targetPoints).clamp(0.0, 1.0) : 0.0;
  int get _percentage => (widget.targetPoints > 0) ? ((widget.currentPoints / widget.targetPoints) * 100).toInt() : 0;

  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _animation = Tween<double>(begin: 0, end: _progress).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _controller.forward();
  }

  @override
  void didUpdateWidget(_AnimatedProgressRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentPoints != widget.currentPoints || oldWidget.targetPoints != widget.targetPoints) {
      _animation = Tween<double>(begin: _animation.value, end: _progress).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
      );
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 72,
      height: 72,
      child: Stack(
        alignment: Alignment.center,
        children: [
          AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              return CustomPaint(
                size: const Size(72, 72),
                painter: CircularProgressPainter(progress: _animation.value),
              );
            },
          ),
          if (_progress >= 1.0)
            const Positioned(
              top: 4, right: 4,
              child: Icon(Icons.bolt, color: AppColors.spark, size: 16),
            ),
          Text(
            "$_percentage%",
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class SparkStatCard extends StatelessWidget {
  final String label;
  final String value;
  final bool isSparkValue;

  const SparkStatCard({
    super.key,
    required this.label,
    required this.value,
    this.isSparkValue = false,
  });

  @override
  Widget build(BuildContext context) {
    return SparkCard(
      padding: 16,
      radius: 16,
      gradient: AppColors.cardGradient,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          Row(
            children: [
              if (isSparkValue)
                const Icon(Icons.bolt, color: AppColors.spark, size: 16),
              if (isSparkValue) const SizedBox(width: 2),
              Text(
                value,
                style: GoogleFonts.poppins(
                  color: isSparkValue ? AppColors.spark : Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class CircularProgressPainter extends CustomPainter {
  final double progress;

  CircularProgressPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 3;
    
    final bgPaint = Paint()
      ..color = AppColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6;

    final progressPaint = Paint()
      ..color = AppColors.spark
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -1.5708, // -90 degrees
      6.28319 * progress, // 360 degrees * progress
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CircularProgressPainter oldDelegate) => oldDelegate.progress != progress;
}

class _AnimatedLineChart extends StatelessWidget {
  final List<FlSpot> spots;
  final List<String> monthLabels;

  const _AnimatedLineChart({required this.spots, required this.monthLabels});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: const Duration(milliseconds: 900),
      builder: (context, value, child) {
        final animatedSpots = spots.map((s) => FlSpot(s.x, s.y * value)).toList();
        
        return LineChart(
          LineChartData(
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              getDrawingHorizontalLine: (val) => const FlLine(
                color: AppColors.border,
                strokeWidth: 0.5,
              ),
            ),
            titlesData: FlTitlesData(
              leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  interval: 1,
                  getTitlesWidget: (val, meta) {
                    final int idx = val.toInt();
                    if (idx < 0 || idx >= monthLabels.length) return const SizedBox();
                    return Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Text(
                        monthLabels[idx],
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                      ),
                    );
                  },
                ),
              ),
            ),
            borderData: FlBorderData(
              show: true,
              border: const Border(
                bottom: BorderSide(color: AppColors.border, width: 1),
              ),
            ),
            lineBarsData: [
              LineChartBarData(
                spots: animatedSpots,
                isCurved: true,
                curveSmoothness: 0.35,
                preventCurveOverShooting: true,
                color: AppColors.spark.withOpacity(0.7),
                barWidth: 2.5,
                isStrokeCapRound: true,
                dotData: FlDotData(
                  show: true,
                  getDotPainter: (spot, percent, barData, index) {
                    if (index == animatedSpots.length - 1) {
                      return FlDotCirclePainter(
                        radius: 5,
                        color: AppColors.spark,
                        strokeWidth: 0,
                      );
                    }
                    return FlDotCirclePainter(radius: 0, color: Colors.transparent);
                  },
                ),
                belowBarData: BarAreaData(
                  show: true,
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.spark.withOpacity(0.2),
                      AppColors.spark.withOpacity(0.0),
                    ],
                  ),
                ),
              ),
            ],
            lineTouchData: const LineTouchData(enabled: false),
          ),
        );
      },
    );
  }
}

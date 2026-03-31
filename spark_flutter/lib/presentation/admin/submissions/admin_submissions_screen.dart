import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:badges/badges.dart' as badges;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/spark_button.dart';
import '../../../core/widgets/spark_text_field.dart';
import '../../../data/models/event_submission_model.dart';
import '../../../data/models/submission_model.dart';
import '../../../core/providers/api_provider.dart';
import 'admin_submissions_providers.dart';

class AdminSubmissionsScreen extends ConsumerWidget {
  const AdminSubmissionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingEvents = ref.watch(pendingEventSubmissionsCountProvider).value ?? 0;
    final pendingClaims = ref.watch(pendingDirectClaimsCountProvider).value ?? 0;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text(
            "Submissions",
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(60),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(30),
              ),
              child: TabBar(
                indicator: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(30),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                labelColor: AppColors.textInverse,
                unselectedLabelColor: AppColors.textMuted,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                tabs: [
                  _buildTab("📸 Photo Check-ins", pendingEvents),
                  _buildTab("📄 Direct Claims", pendingClaims),
                ],
              ),
            ),
          ),
        ),
        body: const TabBarView(
          children: [
            _PhotoCheckinsTab(),
            _DirectClaimsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildTab(String label, int count) {
    return Tab(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 8),
            badges.Badge(
              badgeContent: Text(
                count.toString(),
                style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold),
              ),
              badgeStyle: const badges.BadgeStyle(badgeColor: Colors.white),
            ),
          ],
        ],
      ),
    );
  }
}

class _PhotoCheckinsTab extends ConsumerStatefulWidget {
  const _PhotoCheckinsTab();

  @override
  ConsumerState<_PhotoCheckinsTab> createState() => _PhotoCheckinsTabState();
}

class _PhotoCheckinsTabState extends ConsumerState<_PhotoCheckinsTab> {
  String _selectedStatus = "pending_review";

  @override
  Widget build(BuildContext context) {
    final submissionsAsync = ref.watch(eventSubmissionsProvider(_selectedStatus));

    return Column(
      children: [
        _FilterToggle(
          options: const {
            "pending_review": "Pending Review",
            "approved": "Approved",
            "rejected": "Rejected",
          },
          selected: _selectedStatus,
          onSelected: (val) => setState(() => _selectedStatus = val),
        ),
        Expanded(
          child: submissionsAsync.when(
            data: (submissions) {
              if (submissions.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle_outline_rounded, size: 64, color: AppColors.textMuted),
                      const SizedBox(height: 16),
                      Text(
                        _selectedStatus == "pending_review" ? "✅ No pending photo submissions" : "All clear!",
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.only(top: 8, bottom: 40),
                itemCount: submissions.length,
                itemBuilder: (context, index) => _PhotoSubmissionCard(submission: submissions[index]),
              );
            },
            loading: () => _buildSkeleton(),
            error: (err, _) => Center(child: Text("Error: $err", style: const TextStyle(color: Colors.white))),
          ),
        ),
      ],
    );
  }

  Widget _buildSkeleton() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (context, index) => Shimmer.fromColors(
        baseColor: AppColors.surface,
        highlightColor: AppColors.card,
        child: Container(
          height: 180,
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
        ),
      ),
    );
  }
}

class _PhotoSubmissionCard extends ConsumerWidget {
  final EventSubmissionModel submission;
  const _PhotoSubmissionCard({required this.submission});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusColor = _getStatusColor(submission.status);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border(left: BorderSide(color: statusColor, width: 3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _UsnPill(usn: submission.studentUsn ?? "USN"),
                const Spacer(),
                Text(
                  _formatTimeAgo(submission.createdAt),
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              submission.event?.name ?? "Event Name",
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.poppins(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              "${submission.studentName ?? 'Student Name'} • ${submission.studentEmail ?? 'email'}",
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 12),
            _buildVerificationSummary(submission.verificationResult),
            const SizedBox(height: 12),
            if (submission.status == 'pending_review')
              Row(
                children: [
                  Expanded(
                    child: SparkButton(
                      label: "✅ Approve",
                      height: 44,
                      onPressed: () => _showReviewSheet(context, submission),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _showRejectionDialog(context, ref, submission),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error,
                        side: const BorderSide(color: AppColors.error),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text("❌ Reject", style: TextStyle(color: Color(0xFFE53935), fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                ],
              )
            else if (submission.status == 'approved')
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Awarded ${submission.manualPoints} pts",
                    style: const TextStyle(color: AppColors.spark, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  if (submission.reviewedAt != null)
                    Text(
                      "Reviewed ${_formatDate(submission.reviewedAt!)}",
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                ],
              )
            else if (submission.status == 'rejected' && submission.reviewNotes != null)
              Text(
                "Reason: ${submission.reviewNotes}",
                style: const TextStyle(color: Color(0xFFFF5252), fontSize: 12, fontStyle: FontStyle.italic),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerificationSummary(Map<String, dynamic>? result) {
    if (result == null) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _VerifChip(
          emoji: "📍",
          label: "Location",
          isMatch: result['locationMatch'] == true,
          value: result['distanceText']?.toString() ?? "N/A",
        ),
        _VerifChip(
          emoji: "⏱️",
          label: "Time",
          isMatch: result['timeMatch'] == true,
          value: result['timeDiffText']?.toString() ?? "N/A",
        ),
        _VerifChip(
          emoji: "🤖",
          label: "Auto",
          isMatch: result['autoVerified'] == true,
          value: result['autoVerified'] == true ? "Yes" : "No",
        ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'approved': return const Color(0xFF4CAF50);
      case 'rejected': return const Color(0xFFE53935);
      default: return const Color(0xFFE5A100);
    }
  }

  String _formatTimeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return "${diff.inMinutes}m ago";
    if (diff.inHours < 24) return "${diff.inHours}h ago";
    return DateFormat('MMM d').format(date);
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('MMM d, h:mm a').format(date);
    } catch (_) {
      return dateStr;
    }
  }

  void _showReviewSheet(BuildContext context, EventSubmissionModel submission) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ReviewSubmissionSheet(submission: submission),
    );
  }

  void _showRejectionDialog(BuildContext context, WidgetRef ref, EventSubmissionModel submission) {
    final noteController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text("Reject Submission", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Reason for rejection", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 8),
            SparkTextField(
              label: "",
              controller: noteController,
              hint: "Explain why the submission was rejected...",
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (noteController.text.isEmpty) return;
              await ref.read(apiServiceProvider).reviewEventSubmission(
                submissionId: submission.id,
                action: 'reject',
                reviewNotes: noteController.text,
              );
              Navigator.pop(context);
              ref.invalidate(eventSubmissionsProvider("pending_review"));
              ref.invalidate(pendingEventSubmissionsCountProvider);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text("Reject"),
          ),
        ],
      ),
    );
  }
}

class _DirectClaimsTab extends ConsumerStatefulWidget {
  const _DirectClaimsTab();

  @override
  ConsumerState<_DirectClaimsTab> createState() => _DirectClaimsTabState();
}

class _DirectClaimsTabState extends ConsumerState<_DirectClaimsTab> {
  String _selectedStatus = "pending";

  @override
  Widget build(BuildContext context) {
    final claimsAsync = ref.watch(directClaimsProvider(_selectedStatus));

    return Column(
      children: [
        _FilterToggle(
          options: const {
            "pending": "Pending",
            "approved": "Approved",
          },
          selected: _selectedStatus,
          onSelected: (val) => setState(() => _selectedStatus = val),
        ),
        Expanded(
          child: claimsAsync.when(
            data: (claims) {
              if (claims.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.description_outlined, size: 64, color: AppColors.textMuted),
                      const SizedBox(height: 16),
                      Text("📄 No claims to review", style: TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.only(top: 8, bottom: 40),
                itemCount: claims.length,
                itemBuilder: (context, index) => _DirectClaimCard(claim: claims[index]),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Center(child: Text("Error: $err", style: const TextStyle(color: Colors.white))),
          ),
        ),
      ],
    );
  }
}

class _DirectClaimCard extends ConsumerWidget {
  final SubmissionModel claim;
  const _DirectClaimCard({required this.claim});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusColor = claim.status == 'approved' ? const Color(0xFF4CAF50) : const Color(0xFFE5A100);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border(left: BorderSide(color: statusColor, width: 3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    claim.activityName ?? claim.request?.activity?.name ?? "Activity",
                    style: GoogleFonts.poppins(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 8),
                _StatusChip(
                  label: claim.status.toUpperCase(),
                  color: statusColor.withOpacity(0.1),
                  textColor: statusColor,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(claim.studentName ?? "Student", style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                const SizedBox(width: 8),
                _UsnPill(usn: claim.studentUsn ?? "USN", isSmall: true),
              ],
            ),
            const SizedBox(height: 12),
            _buildProofLine(),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.calendar_today_rounded, size: 12, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Text(DateFormat('MMM d, yyyy').format(claim.activityDate), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const Spacer(),
                const Icon(Icons.timer_outlined, size: 12, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Text("${claim.hoursSpent}h", style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
            if (claim.description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                claim.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
            ],
            if (claim.status == 'pending') ...[
              const SizedBox(height: 16),
              SparkButton(
                label: "✅ Verify & Award Points",
                height: 44,
                onPressed: () => _showVerifySheet(context, claim),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildProofLine() {
    final isUrl = Uri.tryParse(claim.proof)?.hasAbsolutePath ?? false;
    if (isUrl) {
      return GestureDetector(
        onTap: () => launchUrl(Uri.parse(claim.proof)),
        child: Row(
          children: [
            const Icon(Icons.link_rounded, color: AppColors.primary, size: 16),
            const SizedBox(width: 4),
            Expanded(
              child: Text(
                claim.proof,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.primary, fontSize: 13, decoration: TextDecoration.underline),
              ),
            ),
          ],
        ),
      );
    }
    return Text(
      claim.proof,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
    );
  }

  void _showVerifySheet(BuildContext context, SubmissionModel claim) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _VerifyClaimSheet(claim: claim),
    );
  }
}

class _ReviewSubmissionSheet extends ConsumerStatefulWidget {
  final EventSubmissionModel submission;
  const _ReviewSubmissionSheet({required this.submission});

  @override
  ConsumerState<_ReviewSubmissionSheet> createState() => _ReviewSubmissionSheetState();
}

class _ReviewSubmissionSheetState extends ConsumerState<_ReviewSubmissionSheet> {
  late TextEditingController _pointsController;
  late TextEditingController _notesController;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _pointsController = TextEditingController(text: widget.submission.event?.points.toString() ?? '10');
    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _pointsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleReview(String action) async {
    setState(() => _isSubmitting = true);
    try {
      await ref.read(apiServiceProvider).reviewEventSubmission(
        submissionId: widget.submission.id,
        action: action,
        reviewNotes: _notesController.text,
        pointsAwarded: action == 'approve' ? int.tryParse(_pointsController.text) : null,
      );
      if (mounted) {
        Navigator.pop(context);
        ref.invalidate(eventSubmissionsProvider("pending_review"));
        ref.invalidate(pendingEventSubmissionsCountProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              action == 'approve' 
                ? "Approved — ${_pointsController.text} pts awarded to ${widget.submission.studentName} ⚡"
                : "Submission rejected",
            ),
            backgroundColor: action == 'approve' ? AppColors.primary : AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sub = widget.submission;
    final verif = sub.verificationResult;
    final meta = sub.photoMetadata;

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (context, scrollController) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[800], borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 20),
            Text("Review Submission", style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            
            _SheetSection("Student & Event", children: [
              Row(
                children: [
                  Expanded(child: Text(sub.studentName ?? "Student", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                  _UsnPill(usn: sub.studentUsn ?? "USN"),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: Text(sub.event?.name ?? "Event", style: const TextStyle(color: AppColors.textSecondary))),
                  _StatusChip(label: sub.event?.category ?? "General", color: AppColors.primary.withOpacity(0.1), textColor: AppColors.primary),
                ],
              ),
            ]),

            const SizedBox(height: 24),
            _SheetSection("Verification Details", children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  children: [
                    _VerifRow("📍 Location Match", verif?['locationMatch'] == true),
                    _VerifValueRow("📏 Distance from event", "${verif?['distanceText'] ?? 'N/A'}", verif?['locationMatch'] == true),
                    _VerifRow("⏱️ Time Match", verif?['timeMatch'] == true),
                    _VerifValueRow("🕐 Time difference", "${verif?['timeDiffText'] ?? 'N/A'}", verif?['timeMatch'] == true),
                    _VerifRow("🤖 Auto-verified", verif?['autoVerified'] == true),
                    _VerifValueRow("📱 Device", "${meta?['make'] ?? ''} ${meta?['model'] ?? 'Unknown'}", true, isMuted: true),
                  ],
                ),
              ),
            ]),

            const SizedBox(height: 24),
            _SheetSection("Map — Event vs Photo", children: [
              _buildMap(sub),
            ]),

            const SizedBox(height: 24),
            _SheetSection("Points Award", children: [
              Row(
                children: [
                  const Text("Points to Award", style: TextStyle(color: Colors.white, fontSize: 14)),
                  const Spacer(),
                  SizedBox(
                    width: 100,
                    child: SparkTextField(
                      label: "",
                      controller: _pointsController,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SparkTextField(
                label: "Review Notes",
                controller: _notesController,
                hint: "Optional notes for the student",
                maxLines: 2,
              ),
            ]),

            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: SparkButton(
                    label: "✅ Approve & Award Points",
                    isLoading: _isSubmitting,
                    onPressed: () => _handleReview('approve'),
                  ),
                ),
                const SizedBox(width: 16),
                TextButton(
                  onPressed: () => _handleReview('reject'),
                  child: const Text("Reject", style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildMap(EventSubmissionModel sub) {
    final eventLat = sub.event?.latitude;
    final eventLng = sub.event?.longitude;
    final photoLat = double.tryParse(sub.photoMetadata?['latitude']?.toString() ?? '');
    final photoLng = double.tryParse(sub.photoMetadata?['longitude']?.toString() ?? '');

    if (eventLat == null || eventLng == null || photoLat == null || photoLng == null) {
      return Container(
        height: 100,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16)),
        child: const Text("Photo GPS data not available", style: TextStyle(color: AppColors.textMuted)),
      );
    }

    final eventLoc = LatLng(eventLat, eventLng);
    final photoLoc = LatLng(photoLat, photoLng);

    return Container(
      height: 180,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
      child: FlutterMap(
        options: MapOptions(
          initialCenter: eventLoc,
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
                point: eventLoc,
                color: AppColors.primary.withOpacity(0.1),
                borderStrokeWidth: 2,
                borderColor: AppColors.primary.withOpacity(0.5),
                useRadiusInMeter: true,
                radius: sub.event?.locationRadiusMeters?.toDouble() ?? 100,
              ),
            ],
          ),
          PolylineLayer(
            polylines: [
              Polyline(
                points: [eventLoc, photoLoc],
                color: AppColors.primary,
                strokeWidth: 2,
                strokeCap: StrokeCap.round,
              ),
            ],
          ),
          MarkerLayer(
            markers: [
              Marker(
                point: eventLoc,
                width: 30,
                height: 30,
                child: const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 30),
              ),
              Marker(
                point: photoLoc,
                width: 24,
                height: 24,
                child: Container(
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4)]),
                  child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.camera_alt_rounded, color: Colors.blue, size: 14)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _VerifyClaimSheet extends ConsumerStatefulWidget {
  final SubmissionModel claim;
  const _VerifyClaimSheet({required this.claim});

  @override
  ConsumerState<_VerifyClaimSheet> createState() => _VerifyClaimSheetState();
}

class _VerifyClaimSheetState extends ConsumerState<_VerifyClaimSheet> {
  bool _isSubmitting = false;

  Future<void> _handleVerify() async {
    setState(() => _isSubmitting = true);
    try {
      await ref.read(apiServiceProvider).verifySubmission(widget.claim.id);
      if (mounted) {
        Navigator.pop(context);
        ref.invalidate(directClaimsProvider("pending"));
        ref.invalidate(pendingDirectClaimsCountProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Verified — ${widget.claim.activityName ?? 'Activity'} points awarded ⚡"),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final claim = widget.claim;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[800], borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 20),
          Text(claim.activityName ?? "Activity", style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text("By ${claim.studentName} (${claim.studentUsn})", style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 24),
          
          _DataRow("Proof", _buildProofWidget()),
          const SizedBox(height: 16),
          _DataRow("Description", Text(claim.description, style: const TextStyle(color: AppColors.textSecondary))),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _DataRow("Date", Text(DateFormat('MMM d, yyyy').format(claim.activityDate), style: const TextStyle(color: Colors.white)))),
              Expanded(child: _DataRow("Duration", Text("${claim.hoursSpent}h", style: const TextStyle(color: Colors.white)))),
            ],
          ),
          const SizedBox(height: 16),
          _DataRow("Points", const Text("10 pts (Fixed)", style: TextStyle(color: AppColors.spark, fontWeight: FontWeight.bold))),
          
          const SizedBox(height: 32),
          SparkButton(
            label: "Verify",
            isLoading: _isSubmitting,
            onPressed: _handleVerify,
          ),
        ],
      ),
    );
  }

  Widget _buildProofWidget() {
    final isUrl = Uri.tryParse(widget.claim.proof)?.hasAbsolutePath ?? false;
    if (isUrl) {
      return InkWell(
        onTap: () => launchUrl(Uri.parse(widget.claim.proof)),
        child: Text(widget.claim.proof, style: const TextStyle(color: AppColors.primary, decoration: TextDecoration.underline)),
      );
    }
    return Text(widget.claim.proof, style: const TextStyle(color: Colors.white));
  }
}

// Global UI Components
class _FilterToggle extends StatelessWidget {
  final Map<String, String> options;
  final String selected;
  final ValueChanged<String> onSelected;

  const _FilterToggle({required this.options, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      margin: const EdgeInsets.symmetric(vertical: 12),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: options.entries.map((e) {
          final isSelected = selected == e.key;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(e.value),
              selected: isSelected,
              onSelected: (_) => onSelected(e.key),
              backgroundColor: AppColors.card,
              selectedColor: Colors.white,
              labelStyle: TextStyle(
                color: isSelected ? Colors.black : AppColors.textSecondary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              side: BorderSide(color: isSelected ? Colors.white : AppColors.border),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              showCheckmark: false,
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _UsnPill extends StatelessWidget {
  final String usn;
  final bool isSmall;
  const _UsnPill({required this.usn, this.isSmall = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isSmall ? 8 : 10, vertical: isSmall ? 2 : 4),
      decoration: BoxDecoration(color: AppColors.cardElevated, borderRadius: BorderRadius.circular(12)),
      child: Text(
        usn,
        style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold, fontSize: isSmall ? 10 : 12),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  final Color textColor;
  const _StatusChip({required this.label, required this.color, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
      child: Text(label, style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 10)),
    );
  }
}

class _VerifChip extends StatelessWidget {
  final String emoji;
  final String label;
  final bool isMatch;
  final String value;
  const _VerifChip({required this.emoji, required this.label, required this.isMatch, required this.value});

  @override
  Widget build(BuildContext context) {
    final color = isMatch ? const Color(0xFF4CAF50) : const Color(0xFFE53935);
    final bgColor = isMatch ? const Color(0xFF1E2A1A) : const Color(0xFF2A1A1A);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 10)),
          const SizedBox(width: 4),
          Text("$label: ", style: TextStyle(color: color.withOpacity(0.7), fontSize: 10)),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 10)),
        ],
      ),
    );
  }
}

class _VerifRow extends StatelessWidget {
  final String label;
  final bool isOk;
  const _VerifRow(this.label, this.isOk);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const Spacer(),
          Icon(isOk ? Icons.check_circle_rounded : Icons.cancel_rounded, color: isOk ? AppColors.primary : AppColors.error, size: 18),
        ],
      ),
    );
  }
}

class _VerifValueRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isOk;
  final bool isMuted;
  const _VerifValueRow(this.label, this.value, this.isOk, {this.isMuted = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const Spacer(),
          Text(value, style: TextStyle(color: isMuted ? AppColors.textSecondary : (isOk ? AppColors.primary : AppColors.error), fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}

class _SheetSection extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _SheetSection(this.title, {required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(), style: const TextStyle(color: Colors.white60, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        const SizedBox(height: 12),
        ...children,
      ],
    );
  }
}

class _DataRow extends StatelessWidget {
  final String label;
  final Widget child;
  const _DataRow(this.label, this.child);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}

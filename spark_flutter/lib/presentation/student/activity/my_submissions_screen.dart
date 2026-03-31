import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/spark_card.dart';
import '../../../../data/models/submission_model.dart';
import '../../../../data/models/event_submission_model.dart';
import 'activity_providers.dart';

class MySubmissionsScreen extends ConsumerStatefulWidget {
  const MySubmissionsScreen({super.key});

  @override
  ConsumerState<MySubmissionsScreen> createState() => _MySubmissionsScreenState();
}

class _MySubmissionsScreenState extends ConsumerState<MySubmissionsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(myEventSubmissionsProvider);
    ref.invalidate(mySubmissionsProvider);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Submissions', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          _buildPillTabBar(),
          const SizedBox(height: 16),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              color: AppColors.primary,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildEventsTab(),
                  _buildClaimsTab(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPillTabBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(24),
        ),
        child: TabBar(
          controller: _tabController,
          indicator: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: AppColors.primary,
          ),
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: Colors.transparent,
          labelColor: Colors.black, // AppColors.background or dark for contrast over primary
          unselectedLabelColor: AppColors.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: "📸 Events"),
            Tab(text: "📄 Claims"),
          ],
        ),
      ),
    );
  }

  Widget _buildEventsTab() {
    final asyncEvents = ref.watch(myEventSubmissionsProvider);

    return asyncEvents.when(
      data: (submissions) {
        if (submissions.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: Text(
                "No event check-ins yet — attend a live event to earn points!",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
              ),
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: submissions.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            return EventSubmissionCard(submission: submissions[index]);
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      error: (e, st) => Center(child: Text('Error: $e', style: const TextStyle(color: AppColors.error))),
    );
  }

  Widget _buildClaimsTab() {
    final asyncClaims = ref.watch(mySubmissionsProvider);

    return asyncClaims.when(
      data: (submissions) {
        if (submissions.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: Text(
                "No claims yet — tap ⚡ to claim points for something you've done!",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
              ),
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: submissions.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            return ClaimSubmissionCard(submission: submissions[index]);
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      error: (e, st) => Center(child: Text('Error: $e', style: const TextStyle(color: AppColors.error))),
    );
  }
}

class EventSubmissionCard extends StatelessWidget {
  final EventSubmissionModel submission;

  const EventSubmissionCard({super.key, required this.submission});

  @override
  Widget build(BuildContext context) {
    return SparkCard(
      padding: 16,
      radius: 16,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  submission.event?.name ?? 'Unknown Event',
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              _buildStatusChip(submission.status),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  submission.event?.category.toUpperCase() ?? 'EVENT',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 10, fontWeight: FontWeight.w600),
                ),
              ),
              const Spacer(),
              Text(
                submission.status == 'verified' ? '${submission.event?.points ?? 0} pts' : '—',
                style: TextStyle(
                  color: submission.status == 'verified' ? AppColors.primary : AppColors.textMuted,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            DateFormat('MMM dd, yyyy • hh:mm a').format(submission.createdAt),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          // const SizedBox(height: 12),
          // const Divider(color: Colors.white10),
          // // Just mocking the verification row for now based on prompt description
          // Row(
          //   mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          //   children: [
          //     const Text('Auto ✅', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          //     Text('Loc ' + (submission.locationLat.isNotEmpty ? '✅' : '❌'), style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          //     const Text('Time ✅', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          //   ],
          // ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color bg;
    Color text;
    String label;

    switch (status.toLowerCase()) {
      case 'verified':
        bg = AppColors.success.withOpacity(0.2);
        text = AppColors.success;
        label = '✅ Verified';
        break;
      case 'rejected':
        bg = AppColors.error.withOpacity(0.2);
        text = AppColors.error;
        label = '❌ Rejected';
        break;
      case 'pending':
      case 'pending_review':
      default:
        bg = AppColors.warning.withOpacity(0.2);
        text = AppColors.warning;
        label = '⏳ In Review';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(color: text, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}


class ClaimSubmissionCard extends StatelessWidget {
  final SubmissionModel submission;

  const ClaimSubmissionCard({super.key, required this.submission});

  @override
  Widget build(BuildContext context) {
    return SparkCard(
      padding: 16,
      radius: 16,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  submission.request?.activity?.name ?? 'Custom Claim',
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              _buildStatusChip(submission.status),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  submission.request?.activity?.category.toUpperCase() ?? 'CLAIM',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 10, fontWeight: FontWeight.w600),
                ),
              ),
              const Spacer(),
              Text(
                submission.status == 'approved' ? '${submission.request?.activity?.points ?? 0} pts' : '—',
                style: TextStyle(
                  color: submission.status == 'approved' ? AppColors.primary : AppColors.textMuted,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (submission.proof.isNotEmpty)
            GestureDetector(
              onTap: () {
                final uri = Uri.tryParse(submission.proof);
                if (uri != null) launchUrl(uri);
              },
              child: Text(
                submission.proof,
                style: const TextStyle(color: AppColors.primary, fontSize: 12, decoration: TextDecoration.underline),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          const SizedBox(height: 8),
          Text(
            DateFormat('MMM dd, yyyy').format(submission.activityDate),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color bg;
    Color text;
    String label;

    switch (status.toLowerCase()) {
      case 'approved':
      case 'verified':
        bg = AppColors.success.withOpacity(0.2);
        text = AppColors.success;
        label = '✅ Approved';
        break;
      case 'rejected':
        bg = AppColors.error.withOpacity(0.2);
        text = AppColors.error;
        label = '❌ Rejected';
        break;
      case 'pending':
      default:
        bg = AppColors.warning.withOpacity(0.2);
        text = AppColors.warning;
        label = '⏳ In Review';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(color: text, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}

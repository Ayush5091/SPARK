import 'package:shimmer/shimmer.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/spark_button.dart';
import '../../../core/widgets/spark_text_field.dart';
import '../../../core/providers/api_provider.dart';
import '../../../routes/route_names.dart';

final adminInfoProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.watch(apiServiceProvider).getAdminMe();
});

class AdminMoreScreen extends ConsumerWidget {
  const AdminMoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final adminAsync = ref.watch(adminInfoProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 60, 16, 24),
              child: adminAsync.when(
                data: (admin) => _AdminProfileCard(admin: admin),
                loading: () => _buildProfileSkeleton(),
                error: (err, _) => const Center(child: Text("Error loading profile", style: TextStyle(color: Colors.white))),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildSectionHeader("Activity Catalog"),
                const SizedBox(height: 12),
                _MoreMenuCard(
                  title: "Manage Activities →",
                  description: "Add activities students can claim points for",
                  onTap: () => context.push(RouteNames.manageActivities),
                ),
                const SizedBox(height: 24),
                
                _buildSectionHeader("App Info"),
                const SizedBox(height: 12),
                _AppInfoCard(),
                const SizedBox(height: 24),
                
                _buildSectionHeader("Danger Zone"),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => _showLogoutDialog(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text("Log Out", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 40),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title.toUpperCase(),
      style: GoogleFonts.poppins(
        color: AppColors.primary,
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildProfileSkeleton() {
    return Shimmer.fromColors(
      baseColor: AppColors.surface,
      highlightColor: AppColors.card,
      child: Container(
        height: 100,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text("Log out of SPARK?", style: TextStyle(color: Colors.white)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          TextButton(
            onPressed: () async {
              const storage = FlutterSecureStorage();
              await storage.deleteAll();
              if (context.mounted) {
                context.go(RouteNames.login);
              }
            },
            child: const Text("Log Out", style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}

class _AdminProfileCard extends ConsumerWidget {
  final Map<String, dynamic> admin;
  const _AdminProfileCard({required this.admin});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = admin['name'] ?? 'Admin Name';
    final email = admin['email'] ?? 'admin@sahyadri.edu.in';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: const Border(left: BorderSide(color: AppColors.primary, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Text(
                  name[0].toUpperCase(),
                  style: const TextStyle(color: Colors.black, fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(email, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => _showEditNameSheet(context, ref, name),
            style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
            child: const Text("Edit Name →", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showEditNameSheet(BuildContext context, WidgetRef ref, String currentName) {
    final controller = TextEditingController(text: currentName);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SparkTextField(label: "Full Name", controller: controller),
              const SizedBox(height: 24),
              SparkButton(
                label: "Save",
                onPressed: () async {
                  if (controller.text.isEmpty) return;
                  await ref.read(apiServiceProvider).updateAdminName(controller.text);
                  ref.invalidate(adminInfoProvider);
                  if (context.mounted) Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoreMenuCard extends StatelessWidget {
  final String title;
  final String description;
  final VoidCallback onTap;

  const _MoreMenuCard({required this.title, required this.description, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 4),
            Text(description, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _AppInfoCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(20)),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.flash_on_rounded, color: AppColors.primary, size: 24),
              const SizedBox(width: 12),
              const Text("SPARK", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              const Spacer(),
              const Text("v1.0.0", style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 12),
          const Row(
            children: [
              Text("Sahyadri College Activity Points", style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 6),
          const Row(
            children: [
              Text("Backend: aicte-beta.vercel.app", style: TextStyle(color: Color(0xFF404040), fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}


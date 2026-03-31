import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/spark_button.dart';
import '../../../core/widgets/spark_text_field.dart';
import '../../../core/providers/api_provider.dart';
import '../../../data/models/activity_model.dart';

final activitiesProvider = FutureProvider<List<ActivityModel>>((ref) async {
  return ref.watch(apiServiceProvider).getActivities();
});

class ManageActivitiesScreen extends ConsumerWidget {
  const ManageActivitiesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync = ref.watch(activitiesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Activity Catalog"),
        backgroundColor: Colors.transparent,
      ),
      body: activitiesAsync.when(
        data: (activities) => ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: activities.length,
          itemBuilder: (context, index) => _ActivityTile(activity: activities[index]),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text("Error: $err", style: const TextStyle(color: Colors.white))),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SparkButton(
            label: "+ Add Activity",
            onPressed: () => _showAddActivitySheet(context, ref),
          ),
        ),
      ),
    );
  }

  void _showAddActivitySheet(BuildContext context, WidgetRef ref) {
    final nameController = TextEditingController();
    final pointsController = TextEditingController();
    String selectedCategory = "Technical";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: Container(
            decoration: const BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Add Activity", style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),
                SparkTextField(label: "Activity Name*", controller: nameController, hint: "e.g. Workshop Participation"),
                const SizedBox(height: 16),
                const Text("Category", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedCategory,
                  dropdownColor: AppColors.surface,
                  decoration: InputDecoration(
                    fillColor: AppColors.card,
                    filled: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.border)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary)),
                  ),
                  items: ["Technical", "Sports", "Cultural", "Social", "Leadership", "Health"].map((cat) => DropdownMenuItem(
                    value: cat,
                    child: Text(cat, style: const TextStyle(color: Colors.white)),
                  )).toList(),
                  onChanged: (val) => setState(() => selectedCategory = val!),
                ),
                const SizedBox(height: 16),
                SparkTextField(label: "Points*", controller: pointsController, keyboardType: TextInputType.number),
                const SizedBox(height: 24),
                SparkButton(
                  label: "Add Activity",
                  onPressed: () async {
                    if (nameController.text.isEmpty || pointsController.text.isEmpty) return;
                    await ref.read(apiServiceProvider).createActivity(
                      name: nameController.text,
                      category: selectedCategory,
                      points: int.parse(pointsController.text),
                    );
                    ref.invalidate(activitiesProvider);
                    if (context.mounted) Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final ActivityModel activity;
  const _ActivityTile({required this.activity});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(activity.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text(activity.category, style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: Colors.black.withOpacity(0.3), borderRadius: BorderRadius.circular(12)),
            child: Text("${activity.points} pts", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

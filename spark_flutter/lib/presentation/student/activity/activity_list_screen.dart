import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'activity_providers.dart';
import 'widgets/activity_card.dart';
import 'dart:convert';
import 'package:go_router/go_router.dart';
import '../../../../routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/activity_model.dart';

class ActivityListScreen extends ConsumerWidget {
  const ActivityListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync = ref.watch(activitiesProvider);
    final selectedCategory = ref.watch(categoryFilterProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Activities',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          _buildCategoryFilter(ref, selectedCategory),
          Expanded(
            child: activitiesAsync.when(
              data: (activities) {
                final filtered = selectedCategory == 'All'
                    ? activities
                    : activities.where((a) => a.category == selectedCategory).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Text(
                      'No activities found',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  );
                }

                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.6,
                  ),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final activity = filtered[index];
                    return ActivityCard(
                      activity: activity,
                      onClaim: () => _launchClaimProofScreen(context, activity),
                    );
                  },
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.spark),
              ),
              error: (e, _) => Center(
                child: Text(
                  'Error loading activities: $e',
                  style: const TextStyle(color: AppColors.error),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryFilter(WidgetRef ref, String selected) {
    final categories = ['All', 'Sports', 'Cultural', 'Technical', 'Social', 'Leadership'];
    return SizedBox(
      height: 60,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = cat == selected;
          return ChoiceChip(
            label: Text(cat),
            selected: isSelected,
            onSelected: (val) {
              if (val) ref.read(categoryFilterProvider.notifier).state = cat;
            },
            selectedColor: AppColors.spark,
            backgroundColor: AppColors.card,
            side: BorderSide.none,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            labelStyle: TextStyle(
              color: isSelected ? Colors.black : AppColors.textSecondary,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          );
        },
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemCount: categories.length,
      ),
    );
  }

  void _launchClaimProofScreen(BuildContext context, ActivityModel activity) {
    context.push(Uri(
      path: RouteNames.claimProof,
      queryParameters: {
        'activity': jsonEncode(activity.toJson()),
      },
    ).toString());
  }
}

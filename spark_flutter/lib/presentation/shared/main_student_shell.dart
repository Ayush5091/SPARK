import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'spark_action_sheet.dart';
import '../../core/theme/app_colors.dart';
import '../../core/providers/student_nav_provider.dart';
import '../../routes/route_names.dart';

class MainStudentShell extends ConsumerStatefulWidget {
  final Widget child;
  const MainStudentShell({super.key, required this.child});

  @override
  ConsumerState<MainStudentShell> createState() => _MainStudentShellState();
}

class _MainStudentShellState extends ConsumerState<MainStudentShell> with SingleTickerProviderStateMixin {
  late AnimationController _fabController;

  @override
  void initState() {
    super.initState();
    _fabController = AnimationController(
      vsync: this,
      duration: 300.ms,
    );
  }

  @override
  void dispose() {
    _fabController.dispose();
    super.dispose();
  }

  void _onTabTapped(int index) {
    ref.read(studentTabProvider.notifier).state = index;
    if (index == 0) {
      context.go(RouteNames.studentHome);
    } else if (index == 1) {
      context.go(RouteNames.studentProfile);
    }
  }

  void _showActionSheet() {
    _fabController.forward();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => const SparkActionSheet(),
    ).then((_) => _fabController.reverse());
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(studentTabProvider);
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Content
          Positioned.fill(child: widget.child),
          
          // Bottom Navigation Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              height: 72 + bottomPadding,
              decoration: BoxDecoration(
                color: AppColors.surface.withOpacity(0.95),
                border: const Border(
                  top: BorderSide(color: AppColors.border, width: 0.5),
                ),
              ),
              padding: EdgeInsets.only(bottom: bottomPadding),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                   _buildNavItem(
                    icon: Icons.bolt,
                    inactiveIcon: Icons.bolt_outlined,
                    label: "Home",
                    isSelected: currentIndex == 0,
                    onTap: () => _onTabTapped(0),
                  ),
                  const SizedBox(width: 60), // Space for FAB
                  _buildNavItem(
                    icon: Icons.person_rounded,
                    inactiveIcon: Icons.person_outline_rounded,
                    label: "Profile",
                    isSelected: currentIndex == 1,
                    onTap: () => _onTabTapped(1),
                  ),
                ],
              ),
            ),
          ),

          // Floating Center FAB
          Positioned(
            left: 0,
            right: 0,
            bottom: 36 + bottomPadding / 2,
            child: Center(
              child: GestureDetector(
                onTap: _showActionSheet,
                child: RotationTransition(
                  turns: Tween(begin: 0.0, end: 0.125).animate(
                    CurvedAnimation(parent: _fabController, curve: Curves.easeOutBack),
                  ),
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppColors.spark,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.spark.withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.add, color: Colors.black, size: 32),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required IconData inactiveIcon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      highlightColor: Colors.transparent,
      splashColor: Colors.transparent,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSelected ? icon : inactiveIcon,
            color: isSelected ? AppColors.primary : AppColors.textMuted,
            size: 26,
          ).animate(target: isSelected ? 1 : 0)
           .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2), duration: 200.ms),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.primary : AppColors.textMuted,
              fontSize: 10,
              fontWeight: FontWeight.w500,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }
}

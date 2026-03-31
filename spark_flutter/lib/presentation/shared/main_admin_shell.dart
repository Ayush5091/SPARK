import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../routes/route_names.dart';

class MainAdminShell extends StatelessWidget {
  final Widget child;

  const MainAdminShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final String location = GoRouterState.of(context).matchedLocation;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Screen Content
          Positioned.fill(
            bottom: 80 + bottomPadding,
            child: child,
          ),

          // Custom Bottom Navigation
          Positioned(
            left: 20,
            right: 20,
            bottom: 20 + bottomPadding / 2,
            child: Container(
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.surface.withOpacity(0.9),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: AppColors.border.withOpacity(0.5),
                  width: 0.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _AdminNavItem(
                      icon: Icons.analytics_outlined,
                      label: "Dashboard",
                      isActive: location == RouteNames.adminDashboard,
                      onTap: () => context.go(RouteNames.adminDashboard),
                    ),
                    _AdminNavItem(
                      icon: Icons.calendar_month_outlined,
                      label: "Events",
                      isActive: location == RouteNames.adminEvents,
                      onTap: () => context.go(RouteNames.adminEvents),
                    ),
                    _AdminNavItem(
                      icon: Icons.inbox_outlined,
                      label: "Reviews",
                      isActive: location == RouteNames.adminSubmissions,
                      onTap: () => context.go(RouteNames.adminSubmissions),
                    ),
                    _AdminNavItem(
                      icon: Icons.grid_view_outlined,
                      label: "More",
                      isActive: location == RouteNames.adminMore,
                      onTap: () => context.go(RouteNames.adminMore),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AdminNavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _AdminNavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: isActive ? AppColors.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              icon,
              color: isActive ? Colors.black : AppColors.textMuted,
              size: 24,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isActive ? AppColors.primary : AppColors.textMuted,
              fontSize: 10,
              fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

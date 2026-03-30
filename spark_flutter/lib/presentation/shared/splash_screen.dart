import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../data/repositories/auth_repository.dart';
import '../../routes/route_names.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final AuthRepository _repository = AuthRepository();

  @override
  void initState() {
    super.initState();
    _handleRouting();
  }

  void _handleRouting() async {
    // Wait for the animation to play
    await Future.delayed(3.seconds);

    // Perform routing logic
    final bool loggedIn = await _repository.isLoggedIn();
    if (!loggedIn) {
      if (mounted) context.go(RouteNames.login);
      return;
    }

    final bool onboardingDone = await _repository.isOnboardingComplete();
    if (!onboardingDone) {
      if (mounted) context.go(RouteNames.onboarding);
      return;
    }

    final String? role = await _repository.getUserRole();
    if (mounted) {
      if (role == 'admin') {
        context.go(RouteNames.adminDashboard);
      } else {
        context.go(RouteNames.studentHome);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.bolt, size: 60, color: Colors.black),
            )
            .animate()
            .scale(begin: const Offset(0.5, 0.5), end: const Offset(1.0, 1.0), duration: 800.ms, curve: Curves.elasticOut)
            .fadeIn(),
            
            const SizedBox(height: 24),
            
            const Text(
              "SPARK",
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 28,
                fontWeight: FontWeight.w700,
                letterSpacing: 4,
              ),
            )
            .animate()
            .fadeIn(delay: 400.ms, duration: 800.ms)
            .slideY(begin: 0.2, end: 0),
          ],
        ),
      ),
    );
  }
}

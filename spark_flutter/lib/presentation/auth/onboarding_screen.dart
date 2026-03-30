import 'package:flutter/material.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/spark_button.dart';
import '../../data/repositories/auth_repository.dart';
import '../../routes/route_names.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  final AuthRepository _repository = AuthRepository();
  int _currentPage = 0;

  final List<OnboardingPageData> _pages = [
    OnboardingPageData(
      title: "Welcome to SPARK",
      subtitle: "From blood donations to hackathons — SPARK tracks your campus activity points",
      headline: "Earn points for everything you do",
      icon: Icons.bolt,
    ),
    OnboardingPageData(
      title: "Attend Live Events",
      subtitle: "At GPS-verified events, just take a photo to prove you were there",
      headline: "Show up, snap a pic, earn points",
      icon: Icons.location_on,
    ),
    OnboardingPageData(
      title: "Log Your Activities",
      subtitle: "Submit proof for blood donations, volunteering, sports and more — anytime",
      headline: "Already did something great?",
      icon: Icons.check_circle_outline,
    ),
    OnboardingPageData(
      title: "Track Your Growth",
      subtitle: "See your points, activity history and rank among peers",
      headline: "Your dashboard, your story",
      icon: Icons.bar_chart,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          PageView.builder(
            controller: _controller,
            onPageChanged: (i) => setState(() => _currentPage = i),
            itemCount: _pages.length,
            itemBuilder: (context, i) => _OnboardingPage(_pages[i]),
          ),
          
          // Skip button
          if (_currentPage < _pages.length - 1)
            Positioned(
              top: 60,
              right: 20,
              child: TextButton(
                onPressed: _completeOnboarding,
                child: const Text(
                  "Skip",
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
                ),
              ),
            ),
            
          // Bottom controls
          Positioned(
            bottom: 60,
            left: 20,
            right: 20,
            child: Column(
              children: [
                SmoothPageIndicator(
                  controller: _controller,
                  count: _pages.length,
                  effect: const ScrollingDotsEffect(
                    activeDotColor: AppColors.primary,
                    dotColor: AppColors.cardElevated,
                    dotHeight: 8,
                    dotWidth: 8,
                  ),
                ),
                const SizedBox(height: 40),
                SparkButton(
                  label: _currentPage == _pages.length - 1 ? "Get Started" : "Next",
                  onPressed: () {
                    if (_currentPage < _pages.length - 1) {
                      _controller.nextPage(
                        duration: const Duration(milliseconds: 400),
                        curve: Curves.easeInOut,
                      );
                    } else {
                      _completeOnboarding();
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _completeOnboarding() async {
    await _repository.setOnboardingComplete();
    final role = await _repository.getUserRole();
    if (role == 'admin') {
      context.go(RouteNames.adminDashboard);
    } else {
      context.go(RouteNames.studentHome);
    }
  }
}

class _OnboardingPage extends StatelessWidget {
  final OnboardingPageData data;
  const _OnboardingPage(this.data);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            height: 240,
            width: 240,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(
              data.icon,
              size: 120,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 60),
          Text(
            data.title,
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            data.headline,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            data.subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 16,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 100), // Space for indicator/button
        ],
      ),
    );
  }
}

class OnboardingPageData {
  final String title;
  final String headline;
  final String subtitle;
  final IconData icon;

  OnboardingPageData({
    required this.title,
    required this.headline,
    required this.subtitle,
    required this.icon,
  });
}

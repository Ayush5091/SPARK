import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../core/theme/app_colors.dart';

import '../../core/widgets/spark_card.dart';
import '../../data/services/auth_service.dart';
import '../../data/repositories/auth_repository.dart';
import '../../routes/route_names.dart';
import 'admin_login_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: '452620927260-ijiu5lrf229hqpfnt3r6opk1scii5qqk.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
  );
  
  final AuthService _authService = AuthService();
  final AuthRepository _authRepository = AuthRepository();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.loginBackground,
      body: Stack(
        children: [
          // Dot pattern background
          Positioned.fill(child: CustomPaint(painter: _DotPatternPainter())),
          
          // Top 65% area
          Column(
            children: [
              Expanded(
                flex: 65,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "SPARK",
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 4,
                      ),
                    ).animate().fadeIn(duration: 800.ms).slideY(begin: 0.2, end: 0),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          "Let's go",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 48,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const _SparkLogoHexagon()
                            .animate(onPlay: (controller) => controller.repeat(reverse: true))
                            .scale(begin: const Offset(1, 1), end: const Offset(1.15, 1.15), duration: 2.seconds, curve: Curves.easeInOut)
                            .shimmer(duration: 2.seconds, color: Colors.white.withOpacity(0.3)),
                      ],
                    ).animate().fadeIn(delay: 400.ms, duration: 800.ms).slideY(begin: 0.2, end: 0),
                  ],
                ),
              ),
              
              // Bottom 35% area
              Expanded(
                flex: 35,
                child: Hero(
                  tag: 'login_bottom_sheet',
                  child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(28),
                      topRight: Radius.circular(28),
                    ),
                  ),
                  child: Column(
                    children: [
                      _buildAuthButton(
                        label: "Continue with Google",
                        iconPath: 'assets/google_logo.png', // Assuming asset exists
                        onTap: _handleGoogleSignIn,
                        isGoogle: true,
                      ),
                      const SizedBox(height: 16),
                      _buildAuthButton(
                        label: "Admin Login",
                        icon: Icons.lock_outline,
                        onTap: _showAdminLogin,
                      ),
                      const Spacer(),
                      const Text(
                        "SPARK • Sahyadri College",
                        style: TextStyle(
                          color: AppColors.primaryMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  ),
                ).animate().slideY(begin: 1.0, end: 0, duration: 800.ms, curve: Curves.easeOutCubic),
              ),
            ],
          ),
          
          if (_isLoading)
            const Positioned.fill(
              child: ColoredBox(
                color: Colors.black45,
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAuthButton({
    required String label,
    IconData? icon,
    String? iconPath,
    required VoidCallback onTap,
    bool isGoogle = false,
  }) {
    return SparkCard(
      onTap: onTap,
      padding: 16,
      radius: 16,
      child: Row(
        children: [
          if (isGoogle)
            const Text("G", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white))
          else if (icon != null)
            Icon(icon, color: AppColors.textSecondary, size: 24),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: isGoogle ? Colors.white : AppColors.textSecondary,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _handleGoogleSignIn() async {
    try {
      // Force sign out first to guarantee Android gives us a fresh serverAuthCode
      await _googleSignIn.signOut();
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) return;

      // serverAuthCode lives on the account object, NOT on account.authentication
      final serverAuthCode = account.serverAuthCode;
      if (serverAuthCode == null) {
        throw Exception('Server auth code not found. Make sure the Android OAuth client is registered in Google Cloud Console with the correct SHA-1 and package name.');
      }
      
      setState(() => _isLoading = true);
      
      final result = await _authService.googleAuthCallback(serverAuthCode);
      
      if (result.containsKey('access_token')) {
        await _authRepository.saveToken(result['access_token']);
        final role = result['role'] ?? 'student';
        
        final onboardingComplete = await _authRepository.isOnboardingComplete();
        if (!onboardingComplete) {
          context.go(RouteNames.onboarding);
        } else {
          context.go(role == 'admin' ? RouteNames.adminDashboard : RouteNames.studentHome);
        }
      } else if (result.containsKey('register_token')) {
        context.push('${RouteNames.register}?token=${result['register_token']}&name=${account.displayName}&photo=${account.photoUrl}');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sign in failed: ${e.toString()}')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showAdminLogin() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const AdminLoginScreen(),
    );
  }
}

class _SparkLogoHexagon extends StatelessWidget {
  const _SparkLogoHexagon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: const BoxDecoration(
        color: AppColors.primary,
        shape: BoxShape.circle, // Simplified hexagon for now
      ),
      child: const Center(
        child: Icon(Icons.bolt, color: Colors.black, size: 24),
      ),
    );
  }
}

class _DotPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primaryDark.withOpacity(0.05)
      ..strokeWidth = 2;
    
    const double spacing = 24.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.5, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

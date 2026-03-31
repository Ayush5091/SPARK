import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/spark_button.dart';
import '../../routes/route_names.dart';
import 'package:go_router/go_router.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // TOP ZONE (65%)
          Container(
            width: double.infinity,
            height: MediaQuery.of(context).size.height * 0.65,
            color: AppColors.loginBackground,
            child: Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: HexagonGridPainter(),
                  ),
                ),
                _buildHeroContent(),
              ],
            ),
          ),
          
          // BOTTOM ZONE (35%)
          Align(
            alignment: Alignment.bottomCenter,
            child: _buildBottomZone(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroContent() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            "SPARK",
            style: GoogleFonts.poppins(
              color: AppColors.spark,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 6,
            ),
          ).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 20),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: "Let's go",
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 38,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                WidgetSpan(
                  alignment: PlaceholderAlignment.middle,
                  child: Padding(
                    padding: const EdgeInsets.only(left: 10),
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: const BoxDecoration(
                        color: AppColors.spark,
                        shape: BoxShape.circle,
                      ),
                    ).animate(onPlay: (c) => c.repeat())
                     .scale(begin: const Offset(1, 1), end: const Offset(1.15, 1.15), duration: 1200.ms, curve: Curves.easeInOut)
                     .then()
                     .scale(begin: const Offset(1.15, 1.15), end: const Offset(1, 1), duration: 1200.ms),
                  ),
                ),
              ],
            ),
          ).animate()
           .fadeIn(duration: 600.ms)
           .slideY(begin: 0.1, end: 0, curve: Curves.easeOutCubic, duration: 800.ms),
        ],
      ),
    );
  }

  Widget _buildBottomZone() {
    return Container(
      width: double.infinity,
      height: MediaQuery.of(context).size.height * 0.35,
      padding: const EdgeInsets.fromLTRB(28, 32, 28, 24),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
      ),
      child: Column(
        children: [
          SparkButton(
            label: "Continue with Google",
            variant: SparkButtonVariant.spark,
            height: 58,
            borderRadius: 16,
            leading: _buildGoogleIcon(),
            isLoading: _isLoading,
            onPressed: () async {
              setState(() => _isLoading = true);
              await Future.delayed(const Duration(milliseconds: 1500));
              if (mounted) context.go(RouteNames.studentHome);
            },
          ),
          const SizedBox(height: 14),
          SparkButton(
            label: "Admin Login",
            variant: SparkButtonVariant.secondary,
            height: 54,
            borderRadius: 16,
            leading: const Icon(Icons.lock_outline, size: 18, color: AppColors.textSecondary),
            onPressed: () => context.push(RouteNames.adminDashboard),
          ),
          const Spacer(),
          Text(
            "SPARK · Sahyadri College of Engineering",
            style: GoogleFonts.poppins(
              color: AppColors.textMuted,
              fontSize: 10,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    ).animate()
     .slideY(begin: 1.0, end: 0, duration: 800.ms, curve: Curves.elasticOut);
  }

  Widget _buildGoogleIcon() {
    return Container(
      width: 20,
      height: 20,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: const Text(
        "G",
        style: TextStyle(
          color: Colors.black,
          fontSize: 13,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class HexagonGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF1E2E0A)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    const double radius = 35;
    final double hexWidth = radius * math.sqrt(3);
    final double hexHeight = radius * 1.5;

    for (double y = 0; y < size.height + hexHeight; y += hexHeight) {
      bool isOdd = (y / hexHeight).round() % 2 != 0;
      double xOffset = isOdd ? hexWidth / 2 : 0;
      for (double x = -hexWidth; x < size.width + hexWidth; x += hexWidth) {
        _drawHexagon(canvas, Offset(x + xOffset, y), radius, paint);
      }
    }
  }

  void _drawHexagon(Canvas canvas, Offset center, double radius, Paint paint) {
    final path = Path();
    for (int i = 0; i < 6; i++) {
      double angle = (i * 60 - 30) * math.pi / 180;
      double x = center.dx + radius * math.cos(angle);
      double y = center.dy + radius * math.sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}

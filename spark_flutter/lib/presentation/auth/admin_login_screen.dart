import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/spark_button.dart';
import '../../core/widgets/spark_text_field.dart';
import '../../data/services/auth_service.dart';
import '../../routes/route_names.dart';
import 'package:go_router/go_router.dart';

class AdminLoginScreen extends ConsumerStatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  ConsumerState<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends ConsumerState<AdminLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();
  bool _isLoading = false;
  bool _showError = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(28),
          topRight: Radius.circular(28),
        ),
      ),
      padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.divider,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),
          
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.security, color: Colors.black, size: 24),
          ),
          const SizedBox(height: 16),
          const Text(
            "Admin Access",
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            "Enter your institutional credentials",
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),
          
          Column(
            children: [
              SparkTextField(
                label: "INSTITUTIONAL EMAIL",
                hint: "admin@college.edu",
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                prefixIcon: const Icon(Icons.email_outlined, color: AppColors.textMuted),
              ),
              const SizedBox(height: 20),
              SparkTextField(
                label: "PASSWORD",
                hint: "••••••••",
                controller: _passwordController,
                isPassword: true,
                prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textMuted),
              ),
            ],
          ).animate(target: _showError ? 1 : 0).shakeX(duration: 400.ms),
          
          const SizedBox(height: 32),
          SparkButton(
            label: "Sign In",
            isLoading: _isLoading,
            onPressed: _handleLogin,
          ),
        ],
      ),
    ).animate().slideY(begin: 1.0, end: 0, duration: 400.ms, curve: Curves.easeOutCubic);
  }

  void _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      _triggerError();
      return;
    }

    setState(() => _isLoading = true);
    try {
      final token = await _authService.adminLogin(
        _emailController.text,
        _passwordController.text,
      );

      await ref.read(authProvider.notifier).signInWithToken(
        token,
        role: 'admin',
      );
      
      if (mounted) {
        context.pop(); // Close bottom sheet
        context.go(RouteNames.adminDashboard);
      }
    } catch (e) {
      _triggerError();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login failed: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _triggerError() {
    setState(() => _showError = true);
    Future.delayed(400.ms, () {
      if (mounted) setState(() => _showError = false);
    });
  }
}

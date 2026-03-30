import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/spark_button.dart';
import '../../core/widgets/spark_text_field.dart';
import '../../data/services/auth_service.dart';
import '../../data/repositories/auth_repository.dart';
import '../../routes/route_names.dart';
import 'package:go_router/go_router.dart';

class RegisterScreen extends StatefulWidget {
  final String registerToken;
  final String name;
  final String? photoUrl;

  const RegisterScreen({
    super.key,
    required this.registerToken,
    required this.name,
    this.photoUrl,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _usnController = TextEditingController();
  final _authService = AuthService();
  final _authRepository = AuthRepository();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Student Registration"),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 40),
            Center(
              child: Container(
                width: 120,
                height: 120,
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: CircleAvatar(
                  backgroundImage: widget.photoUrl != null
                      ? NetworkImage(widget.photoUrl!)
                      : null,
                  child: widget.photoUrl == null
                      ? const Icon(Icons.person, size: 60)
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              "Welcome to SPARK, ${widget.name.split(' ')[0]}!",
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "Help us identify your institutional profile by entering your unique USN.",
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 60),
            SparkTextField(
              label: "ENTER YOUR USN",
              hint: "e.g. 1MS22CS001",
              controller: _usnController,
              keyboardType: TextInputType.text,
              prefixIcon: const Icon(Icons.badge_outlined, color: AppColors.textMuted),
              onChanged: (v) {
                _usnController.value = TextEditingValue(
                  text: v.toUpperCase(),
                  selection: _usnController.selection,
                );
              },
              validator: (v) {
                if (v == null || v.isEmpty) return "USN is required";
                // Regex for USN: optional digit, 2 letters, 2 digits, 2 letters, 3 digits
                final regex = RegExp(r"^[0-9]?[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{3}$");
                if (!regex.hasMatch(v)) return "Invalid USN format";
                return null;
              },
            ).animate().fadeIn(delay: 200.ms, duration: 800.ms).slideY(begin: 0.2, end: 0),
            const SizedBox(height: 80),
            SparkButton(
              label: "Join SPARK",
              isLoading: _isLoading,
              onPressed: _handleRegister,
            ).animate().fadeIn(delay: 400.ms, duration: 800.ms).slideY(begin: 0.2, end: 0),
            const SizedBox(height: 40),
            TextButton(
              onPressed: () => context.go(RouteNames.login),
              child: const Text(
                "Cancel and sign out",
                style: TextStyle(color: AppColors.textMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleRegister() async {
    final usn = _usnController.text.trim();
    if (usn.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      final token = await _authService.registerStudent(
        widget.registerToken,
        usn,
      );
      
      await _authRepository.saveToken(token);
      
      if (mounted) {
        context.go(RouteNames.onboarding);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Registration failed: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

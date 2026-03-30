import 'package:flutter/material.dart';

class AppColors {
  // Core backgrounds
  static const Color background = Color(0xFF0A0A0A);
  static const Color surface = Color(0xFF161616);
  static const Color card = Color(0xFF1C1C1C);
  static const Color cardElevated = Color(0xFF242424);
  
  // Login screen specific
  static const Color loginBackground = Color(0xFF0F1A08);
  static const Color loginCard = Color(0xFF182210);
  
  // Accent - Electric Lime Green
  static const Color primary = Color(0xFFC6FF00);
  static const Color primaryDark = Color(0xFF8AB800);
  static const Color primaryMuted = Color(0xFF2A3D14);
  static const Color primaryContainer = Color(0xFF1E2E0A);
  
  // Text
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B0B0);
  static const Color textMuted = Color(0xFF606060);
  static const Color textInverse = Color(0xFF0A0A0A);
  
  // Status
  static const Color success = Color(0xFF4CAF50);
  static const Color warning = Color(0xFFFFC107);
  static const Color error = Color(0xFFFF5252);
  static const Color pending = Color(0xFFFF9800);
  static const Color info = Color(0xFF2196F3);
  
  // Border & Divider
  static const Color border = Color(0xFF2A2A2A);
  static const Color divider = Color(0xFF1E1E1E);
  
  // Overlay
  static const Color overlay = Color(0x80000000);
  
  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFC6FF00), Color(0xFF8AB800)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF1C1C1C), Color(0xFF0A0A0A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
  
  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF242424), Color(0xFF1C1C1C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient accentCardGradient = LinearGradient(
    colors: [Color(0xFF2A3D14), Color(0xFF1A2A08)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

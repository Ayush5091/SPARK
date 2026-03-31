import 'package:flutter/material.dart';

class AppColors {
  // Backgrounds
  static const Color background    = Color(0xFF080808);
  static const Color surface       = Color(0xFF101010);
  static const Color card          = Color(0xFF161616);
  static const Color cardElevated  = Color(0xFF1E1E1E);

  // Login specific — deep forest green tint
  static const Color loginBackground = Color(0xFF0F1A08);
  static const Color loginSurface    = Color(0xFF141E0A);

  // Lime — the SPARK accent
  // Medium usage: meaningful moments + select decorative components
  static const Color spark          = Color(0xFFC6FF00);
  static const Color sparkDim       = Color(0xFF8AB800);
  static const Color sparkContainer = Color(0xFF182210);
  static const Color sparkBorder    = Color(0xFF2A3D14);

  // White — primary interactive
  static const Color primary        = Color(0xFFFFFFFF);
  static const Color primaryMuted   = Color(0xFFCCCCCC);

  // Text
  static const Color textPrimary    = Color(0xFFFFFFFF);
  static const Color textSecondary  = Color(0xFF8A8A8A);
  static const Color textMuted      = Color(0xFF484848);
  static const Color textInverse    = Color(0xFF080808);

  // Status
  static const Color success  = Color(0xFF4CAF50);
  static const Color warning  = Color(0xFFE5A100);
  static const Color error    = Color(0xFFE53935);
  static const Color info     = Color(0xFF2196F3);
  static const Color pending  = Color(0xFFE5A100);

  // Borders
  static const Color border      = Color(0xFF202020);
  static const Color cardBorder  = Color(0xFF202020);
  static const Color divider     = Color(0xFF141414);

  // Gradients
  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF1C1C1C), Color(0xFF131313)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient sparkGradient = LinearGradient(
    colors: [Color(0xFFC6FF00), Color(0xFF8AB800)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient sparkCardGradient = LinearGradient(
    colors: [Color(0xFF1E2E0A), Color(0xFF131A07)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

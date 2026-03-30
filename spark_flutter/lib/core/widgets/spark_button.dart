import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_colors.dart';

enum SparkButtonVariant { primary, secondary, ghost }

class SparkButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final SparkButtonVariant variant;
  final double? width;
  final double height;

  const SparkButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.variant = SparkButtonVariant.primary,
    this.width = double.infinity,
    this.height = 56,
  });

  @override
  State<SparkButton> createState() => _SparkButtonState();
}

class _SparkButtonState extends State<SparkButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final bool isEnabled = widget.onPressed != null && !widget.isLoading;

    return GestureDetector(
      onTapDown: isEnabled ? (_) => setState(() => _isPressed = true) : null,
      onTapUp: isEnabled ? (_) => setState(() => _isPressed = false) : null,
      onTapCancel: isEnabled ? () => setState(() => _isPressed = false) : null,
      onTap: isEnabled ? widget.onPressed : null,
      child: AnimatedScale(
        scale: _isPressed ? 0.97 : 1.0,
        duration: 100.ms,
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: _buildDecoration(),
          child: Center(
            child: widget.isLoading
                ? _buildLoadingIndicator()
                : Text(
                    widget.label,
                    style: _buildTextStyle(),
                  ),
          ),
        ),
      ),
    );
  }

  BoxDecoration _buildDecoration() {
    switch (widget.variant) {
      case SparkButtonVariant.primary:
        return BoxDecoration(
          color: widget.onPressed == null ? AppColors.textMuted : AppColors.primary,
          borderRadius: BorderRadius.circular(16),
          boxShadow: widget.onPressed != null
              ? [
                  BoxShadow(
                    color: AppColors.primary.withAlpha(51),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  )
                ]
              : null,
        );
      case SparkButtonVariant.secondary:
        return BoxDecoration(
          color: AppColors.cardElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primary, width: 1.5),
        );
      case SparkButtonVariant.ghost:
        return const BoxDecoration(
          color: Colors.transparent,
        );
    }
  }

  TextStyle _buildTextStyle() {
    const baseStyle = TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.5,
    );

    switch (widget.variant) {
      case SparkButtonVariant.primary:
        return baseStyle.copyWith(color: AppColors.textInverse);
      case SparkButtonVariant.secondary:
      case SparkButtonVariant.ghost:
        return baseStyle.copyWith(color: AppColors.primary);
    }
  }

  Widget _buildLoadingIndicator() {
    return SizedBox(
      height: 24,
      width: 24,
      child: CircularProgressIndicator(
        strokeWidth: 2.5,
        valueColor: AlwaysStoppedAnimation<Color>(
          widget.variant == SparkButtonVariant.primary
              ? AppColors.textInverse
              : AppColors.primary,
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_colors.dart';

enum SparkButtonVariant { primary, secondary, ghost, spark }

class SparkButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final SparkButtonVariant variant;
  final double? width;
  final double height;
  final double borderRadius;
  final Widget? leading;

  const SparkButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.variant = SparkButtonVariant.primary,
    this.width = double.infinity,
    this.height = 56,
    this.borderRadius = 16,
    this.leading,
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
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: _buildDecoration(),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.leading != null && !widget.isLoading) ...[
                widget.leading!,
                const SizedBox(width: 12),
              ],
              if (widget.isLoading)
                _buildLoadingIndicator()
              else
                Text(
                  widget.label,
                  style: _buildTextStyle(),
                ),
            ],
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
          borderRadius: BorderRadius.circular(widget.borderRadius),
        );
      case SparkButtonVariant.secondary:
        return BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(widget.borderRadius),
          border: Border.all(
            color: const Color(0xFF2A2A2A),
            width: 1.2,
          ),
        );
      case SparkButtonVariant.ghost:
        return const BoxDecoration(
          color: Colors.transparent,
        );
      case SparkButtonVariant.spark:
        return BoxDecoration(
          color: widget.onPressed == null ? AppColors.textMuted : AppColors.spark,
          borderRadius: BorderRadius.circular(widget.borderRadius),
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
        return baseStyle.copyWith(color: AppColors.textPrimary);
      case SparkButtonVariant.ghost:
        return baseStyle.copyWith(color: AppColors.textSecondary);
      case SparkButtonVariant.spark:
        return baseStyle.copyWith(color: AppColors.textInverse);
    }
  }

  Widget _buildLoadingIndicator() {
    return SizedBox(
      height: 24,
      width: 24,
      child: CircularProgressIndicator(
        strokeWidth: 2.5,
        valueColor: AlwaysStoppedAnimation<Color>(
          (widget.variant == SparkButtonVariant.primary || widget.variant == SparkButtonVariant.spark)
              ? AppColors.textInverse
              : AppColors.primary,
        ),
      ),
    );
  }
}

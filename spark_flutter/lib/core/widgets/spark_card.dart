import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class SparkCard extends StatelessWidget {
  final Widget? child;
  final VoidCallback? onTap;
  final bool accentCard;
  final double padding;
  final double radius;
  final LinearGradient? gradient;

  const SparkCard({
    super.key,
    this.child,
    this.onTap,
    this.accentCard = false,
    this.padding = 20,
    this.radius = 20,
    this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(padding),
        decoration: BoxDecoration(
          gradient: gradient ??
              (accentCard ? AppColors.accentCardGradient : AppColors.cardGradient),
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(
            color: AppColors.border,
            width: 0.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(51),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: child,
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'spark_button.dart';

class SparkErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const SparkErrorWidget({
    super.key,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: AppColors.error,
              size: 64,
            ),
            const SizedBox(height: 24),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 32),
              SparkButton(
                label: "Try Again",
                variant: SparkButtonVariant.secondary,
                onPressed: onRetry,
                width: 200,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Fixed naming conflict with Flutter's ErrorWidget
typedef SparkError = SparkErrorWidget;

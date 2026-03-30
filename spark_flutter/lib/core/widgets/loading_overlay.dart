import 'package:flutter/material.dart';

// TODO: Implement lib/core/widgets/loading_overlay.dart
class LoadingOverlay extends StatelessWidget {
  const LoadingOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(appBar: AppBar(title: const Text('LoadingOverlay')), body: const Center(child: Text('LoadingOverlay')));
  }
}

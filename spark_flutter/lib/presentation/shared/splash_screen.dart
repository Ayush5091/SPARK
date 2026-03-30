import 'package:flutter/material.dart';

// TODO: Implement lib/presentation/shared/splash_screen.dart
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(appBar: AppBar(title: const Text('SplashScreen')), body: const Center(child: Text('SplashScreen')));
  }
}

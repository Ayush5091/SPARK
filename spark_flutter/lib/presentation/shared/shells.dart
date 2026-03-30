import 'package:flutter/material.dart';

class MainStudentShell extends StatelessWidget {
  final Widget child;

  const MainStudentShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      // Bottom navigation will be added later
    );
  }
}

class MainAdminShell extends StatelessWidget {
  final Widget child;

  const MainAdminShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      // Bottom navigation will be added later
    );
  }
}

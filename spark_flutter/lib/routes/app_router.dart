import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'route_names.dart';
import '../core/providers/auth_provider.dart';
import '../presentation/shared/splash_screen.dart';
import '../presentation/auth/login_screen.dart';
import '../presentation/auth/register_screen.dart';
import '../presentation/auth/onboarding_screen.dart';
import '../presentation/student/home/student_home_screen.dart';
import '../presentation/student/profile/student_profile_screen.dart';
import '../presentation/admin/home/admin_dashboard_screen.dart';
import '../presentation/admin/events/admin_events_screen.dart';
import '../presentation/admin/submissions/admin_submissions_screen.dart';
import '../presentation/admin/more/admin_more_screen.dart';
import '../presentation/shared/shells.dart';

// Import newly requested screens too
class AppRouter {
  static final routerProvider = Provider<GoRouter>((ref) {
    final authState = ref.watch(authProvider);

    return GoRouter(
      initialLocation: RouteNames.splash,
      redirect: (context, state) {
        final isLoggingIn = state.matchedLocation == RouteNames.login || 
                          state.matchedLocation == RouteNames.splash ||
                          state.matchedLocation == RouteNames.onboarding ||
                          state.matchedLocation == RouteNames.register;

        if (authState.status == AuthStatus.checking) return null;
        if (authState.status == AuthStatus.unauthenticated) {
          return isLoggingIn ? null : RouteNames.login;
        }

        if (authState.status == AuthStatus.authenticated && isLoggingIn) {
          return authState.role == 'admin' ? RouteNames.adminHome : RouteNames.studentHome;
        }

        return null;
      },
      routes: [
        GoRoute(
          path: RouteNames.splash,
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: RouteNames.onboarding,
          builder: (context, state) => const OnboardingScreen(),
        ),
        GoRoute(
          path: RouteNames.login,
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: RouteNames.register,
          builder: (context, state) {
            final queryParams = state.uri.queryParameters;
            return RegisterScreen(
              registerToken: queryParams['token'] ?? '',
              name: queryParams['name'] ?? '',
              photoUrl: queryParams['photo'],
            );
          },
        ),
        
        // Student Shell
        ShellRoute(
          builder: (context, state, child) => MainStudentShell(child: child),
          routes: [
            GoRoute(
              path: RouteNames.studentHome,
              builder: (context, state) => const StudentHomeScreen(),
            ),
            GoRoute(
              path: RouteNames.studentProfile,
              builder: (context, state) => const StudentProfileScreen(),
            ),
          ],
        ),

        // Private Student non-shell routes
        GoRoute(
          path: RouteNames.activityList,
          builder: (context, state) => const Scaffold(body: Center(child: Text("Activities Screen"))),
        ),
        GoRoute(
          path: RouteNames.requestActivity,
          builder: (context, state) => const Scaffold(body: Center(child: Text("Request Activity"))),
        ),
        GoRoute(
          path: RouteNames.submitProof,
          builder: (context, state) => const Scaffold(body: Center(child: Text("Submit Proof"))),
        ),
        GoRoute(
          path: RouteNames.myRequests,
          builder: (context, state) => const Scaffold(body: Center(child: Text("My Requests"))),
        ),
        GoRoute(
          path: RouteNames.eventCamera,
          builder: (context, state) => const Scaffold(body: Center(child: Text("Event Camera"))),
        ),

        // Admin Shell
        ShellRoute(
          builder: (context, state, child) => MainAdminShell(child: child),
          routes: [
            GoRoute(
              path: RouteNames.adminHome,
              builder: (context, state) => const AdminDashboardScreen(),
            ),
            GoRoute(
              path: RouteNames.adminEvents,
              builder: (context, state) => const AdminEventsScreen(),
            ),
            GoRoute(
              path: RouteNames.adminSubmissions,
              builder: (context, state) => const AdminSubmissionsScreen(),
            ),
            GoRoute(
              path: RouteNames.adminMore,
              builder: (context, state) => const AdminMoreScreen(),
            ),
          ],
        ),

        GoRoute(
          path: RouteNames.createEvent,
          builder: (context, state) => const Scaffold(body: Center(child: Text("Create Event"))),
        ),
      ],
      errorBuilder: (context, state) => Scaffold(
        body: Center(child: Text('Error: ${state.error}')),
      ),
    );
  });
}

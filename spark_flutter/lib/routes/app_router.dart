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
import '../presentation/admin/events/create_event_screen.dart';
import '../presentation/admin/submissions/admin_submissions_screen.dart';
import '../presentation/admin/more/admin_more_screen.dart';
import '../presentation/student/activity/activity_list_screen.dart';
import '../presentation/student/activity/claim_proof_screen.dart';
import '../presentation/student/activity/my_submissions_screen.dart';
import '../presentation/shared/main_student_shell.dart';
import '../presentation/shared/main_admin_shell.dart';
import '../presentation/admin/more/manage_activities_screen.dart';

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
          return authState.role == 'admin' ? RouteNames.adminDashboard : RouteNames.studentHome;
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
              pageBuilder: (context, state) => CustomTransitionPage(
                key: state.pageKey,
                child: const StudentHomeScreen(),
                transitionsBuilder: (context, animation, secondaryAnimation, child) {
                  return SlideTransition(
                    position: animation.drive(
                      Tween<Offset>(
                        begin: const Offset(1, 0),
                        end: Offset.zero,
                      ).chain(CurveTween(curve: Curves.easeOutCubic)),
                    ),
                    child: child,
                  );
                },
              ),
            ),
            GoRoute(
              path: RouteNames.studentProfile,
              pageBuilder: (context, state) => CustomTransitionPage(
                key: state.pageKey,
                child: const StudentProfileScreen(),
                transitionsBuilder: (context, animation, secondaryAnimation, child) {
                  return SlideTransition(
                    position: animation.drive(
                      Tween<Offset>(
                        begin: const Offset(-1, 0),
                        end: Offset.zero,
                      ).chain(CurveTween(curve: Curves.easeOutCubic)),
                    ),
                    child: child,
                  );
                },
              ),
            ),
          ],
        ),

        // Private Student non-shell routes
        GoRoute(
          path: RouteNames.activityList,
          builder: (context, state) => const ActivityListScreen(),
        ),
        GoRoute(
          path: RouteNames.claimProof,
          builder: (context, state) {
            final activityJson = state.uri.queryParameters['activity'];
            return ClaimProofScreen(activityJson: activityJson);
          },
        ),
        GoRoute(
          path: RouteNames.mySubmissions,
          builder: (context, state) => const MySubmissionsScreen(),
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
              path: RouteNames.adminDashboard,
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
            GoRoute(
              path: RouteNames.manageActivities,
              builder: (context, state) => const ManageActivitiesScreen(),
            ),
          ],
        ),

        GoRoute(
          path: RouteNames.createEvent,
          builder: (context, state) => const CreateEventScreen(),
        ),
      ],
      errorBuilder: (context, state) => Scaffold(
        body: Center(child: Text('Error: ${state.error}')),
      ),
    );
  });
}

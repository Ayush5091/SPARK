
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/models/student_model.dart';

enum AuthStatus { authenticated, unauthenticated, checking }

class AuthState {
  final AuthStatus status;
  final String? role;
  final StudentModel? user;

  AuthState({required this.status, this.role, this.user});

  factory AuthState.checking() => AuthState(status: AuthStatus.checking);
  factory AuthState.unauthenticated() => AuthState(status: AuthStatus.unauthenticated);
  factory AuthState.authenticated(String role, {StudentModel? user}) => 
      AuthState(status: AuthStatus.authenticated, role: role, user: user);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(AuthState.checking()) {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    final isLoggedIn = await _repository.isLoggedIn();
    if (!isLoggedIn) {
      state = AuthState.unauthenticated();
      return;
    }

    final role = await _repository.getUserRole();
    if (role != null) {
      // For now, only fetching student profile if role is student
      StudentModel? student;
      if (role == 'student') {
        // Mocking user profile for now, should call ApiService in future
        student = StudentModel(
          id: '1', 
          name: 'Student User', 
          email: 'student@example.com',
          totalPoints: 450,
          enrollmentNo: 'EN12345',
          department: 'Computer Science'
        );
      }
      state = AuthState.authenticated(role, user: student);
    } else {
      state = AuthState.unauthenticated();
    }
  }

  Future<void> signInWithToken(String token, {String? role}) async {
    await _repository.saveToken(token);
    final resolvedRole = role ?? await _repository.getUserRole();

    if (resolvedRole != null) {
      state = AuthState.authenticated(resolvedRole);
    } else {
      state = AuthState.unauthenticated();
    }
  }

  Future<void> handleUnauthorized() async {
    if (state.status == AuthStatus.unauthenticated) {
      return;
    }

    await logout();
  }

  Future<void> logout() async {
    await _repository.clearToken();
    state = AuthState.unauthenticated();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(AuthRepository());
});

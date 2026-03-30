import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/repositories/auth_repository.dart';

enum AuthStatus { authenticated, unauthenticated, checking }

class AuthState {
  final AuthStatus status;
  final String? role;

  AuthState({required this.status, this.role});

  factory AuthState.checking() => AuthState(status: AuthStatus.checking);
  factory AuthState.unauthenticated() => AuthState(status: AuthStatus.unauthenticated);
  factory AuthState.authenticated(String role) => AuthState(status: AuthStatus.authenticated, role: role);
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
      state = AuthState.authenticated(role);
    } else {
      state = AuthState.unauthenticated();
    }
  }

  Future<void> logout() async {
    await _repository.clearToken();
    state = AuthState.unauthenticated();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(AuthRepository());
});

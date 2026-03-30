import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthRepository {
  static const String _jwtKey = 'spark_jwt';
  static const String _onboardingKey = 'onboarding_done';
  static final AuthRepository _instance = AuthRepository._internal();
  
  factory AuthRepository() => _instance;
  AuthRepository._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  Future<void> saveToken(String token) async {
    await _storage.write(key: _jwtKey, value: token);
  }
  
  Future<String?> getToken() async {
    return await _storage.read(key: _jwtKey);
  }
  
  Future<void> clearToken() async {
    await _storage.delete(key: _jwtKey);
  }
  
  Future<String?> getUserRole() async {
    final token = await getToken();
    if (token == null) return null;
    try {
      final decoded = _decodeJwt(token);
      final payload = json.decode(decoded);
      return payload['role'];
    } catch (e) {
      return null;
    }
  }
  
  Future<int?> getUserId() async {
    final token = await getToken();
    if (token == null) return null;
    try {
      final decoded = _decodeJwt(token);
      final payload = json.decode(decoded);
      return payload['user_id'];
    } catch (e) {
      return null;
    }
  }
  
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
  
  // For onboarding
  Future<void> setOnboardingComplete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingKey, true);
  }
  
  Future<bool> isOnboardingComplete() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_onboardingKey) ?? false;
  }

  String _decodeJwt(String token) {
    final parts = token.split('.');
    if (parts.length < 2) throw Exception('Invalid token');
    final payload = parts[1];
    String normalized = base64Url.normalize(payload);
    return utf8.decode(base64Url.decode(normalized));
  }
}


import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../../core/constants/api_constants.dart';
import '../repositories/auth_repository.dart';

class AuthService {
  late Dio _dio;
  final AuthRepository _authRepository = AuthRepository();

  AuthService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _authRepository.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            await _authRepository.clearToken();
            // TODO: In a real app, use a navigator key or stream to redirect to login
          }
          return handler.next(e);
        },
      ),
    );

    if (kDebugMode) {
      _dio.interceptors.add(
        PrettyDioLogger(
          requestHeader: true,
          requestBody: true,
          responseBody: true,
          responseHeader: false,
          error: true,
          compact: true,
          maxWidth: 90,
        ),
      );
    }
  }

  Future<String> adminLogin(String email, String password) async {
    try {
      final response = await _dio.post(
        ApiConstants.adminLogin,
        data: {
          'email': email,
          'password': password,
        },
      );
      return response.data['access_token'];
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> googleAuthCallback(String serverAuthCode) async {
    try {
      final response = await _dio.get(
        ApiConstants.googleCallback,
        queryParameters: {'code': serverAuthCode, 'source': 'mobile'},
      );

      // Diagnostic: log raw response to debug type mismatch
      debugPrint('=== Google Callback Response ===');
      debugPrint('Status: ${response.statusCode}');
      debugPrint('Data type: ${response.data.runtimeType}');
      debugPrint('Data: ${response.data}');

      // If Dio followed a redirect and got back HTML/string, catch it gracefully
      if (response.data is String) {
        throw Exception(
          'Server returned a non-JSON response (type: String). '
          'Raw response: ${response.data.toString().substring(0, (response.data as String).length.clamp(0, 300))}',
        );
      }

      // Returns {access_token, role: 'student'} or {register_token: token}
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      debugPrint('=== DioException in googleAuthCallback ===');
      debugPrint('Status: ${e.response?.statusCode}');
      debugPrint('Response data: ${e.response?.data}');
      debugPrint('Message: ${e.message}');
      throw _handleError(e);
    } catch (e) {
      debugPrint('=== Unknown error in googleAuthCallback: $e');
      rethrow;
    }
  }

  /// Mobile-specific: verifies an ID token directly with the backend.
  /// No redirect_uri or server auth code exchange needed.
  Future<Map<String, dynamic>> googleMobileAuth(String idToken) async {
    try {
      final response = await _dio.post(
        ApiConstants.googleMobileAuth,
        data: {'id_token': idToken},
      );
      debugPrint('=== googleMobileAuth Response ===');
      debugPrint('Status: ${response.statusCode}');
      debugPrint('Data: ${response.data}');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      debugPrint('=== DioException in googleMobileAuth: ${e.response?.data}');
      throw _handleError(e);
    }
  }

  Future<String> registerStudent(String registerToken, String usn) async {
    try {
      final response = await _dio.post(
        ApiConstants.register,
        data: {
          'token': registerToken,
          'usn': usn.toUpperCase(),
        },
      );
      return response.data['access_token'];
    } catch (e) {
      throw _handleError(e);
    }
  }

  Exception _handleError(dynamic e) {
    if (e is DioException) {
      if (e.response != null) {
        final message = e.response?.data['detail'] ?? 'An error occurred';
        return Exception(message);
      }
      return Exception(e.message);
    }
    return Exception(e.toString());
  }
}

import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../constants/api_constants.dart';
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
        queryParameters: {'code': serverAuthCode},
      );
      // Returns {access_token, role: 'student'} or {register_token: token}
      return response.data;
    } catch (e) {
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

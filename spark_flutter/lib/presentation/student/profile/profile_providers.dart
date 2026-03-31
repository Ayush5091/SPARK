import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/student_model.dart';
import '../../../data/services/api_service.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/api_provider.dart';

final studentMeProvider = FutureProvider<StudentModel>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  try {
    return await apiService.getStudentMe();
  } on UnauthorizedException {
    await ref.read(authProvider.notifier).handleUnauthorized();
    throw Exception('Unauthorized');
  }
});

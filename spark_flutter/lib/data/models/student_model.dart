class StudentModel {
  final String id;
  final String name;
  final String email;
  final String? profilePhoto;
  final int totalPoints;
  final String enrollmentNo;
  final String department;
  final String? phoneNumber;

  StudentModel({
    required this.id,
    required this.name,
    required this.email,
    this.profilePhoto,
    required this.totalPoints,
    required this.enrollmentNo,
    required this.department,
    this.phoneNumber,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: (json['id'] ?? json['student_id'] ?? '').toString(),
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      profilePhoto: json['profile_photo']?.toString(),
      totalPoints: int.tryParse(json['total_points']?.toString() ?? '') ?? 0,
      enrollmentNo: (json['usn'] ?? json['enrollment_no'] ?? '').toString(),
      department: json['department']?.toString() ?? '',
      phoneNumber: json['phone_number']?.toString(),
    );
  }
}

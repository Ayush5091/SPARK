class NotificationModel {
  final String id;
  final String title;
  final String content;
  final DateTime createdAt;
  final bool isRead;

  NotificationModel({
    required this.id,
    required this.title,
    required this.content,
    required this.createdAt,
    required this.isRead,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic date) {
      if (date == null) return DateTime.now();
      try {
        return DateTime.parse(date.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    return NotificationModel(
      id: (json['id'] ?? '').toString(),
      title: json['title']?.toString() ?? 'Notification',
      content: json['message']?.toString() ?? json['content']?.toString() ?? '',
      createdAt: parseDate(json['created_at']),
      isRead: json['is_read'] ?? false,
    );
  }
}

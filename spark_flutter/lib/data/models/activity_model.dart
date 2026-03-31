class ActivityModel {
  final int id;
  final String name;
  final String category;
  final int points;

  ActivityModel({
    required this.id,
    required this.name,
    required this.category,
    required this.points,
  });

  factory ActivityModel.fromJson(Map<String, dynamic> json) {
    return ActivityModel(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      name: json['name']?.toString() ?? 'N/A',
      category: json['category']?.toString() ?? 'Other',
      points: int.tryParse(json['points']?.toString() ?? '') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'points': points,
    };
  }
}

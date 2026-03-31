import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/geo_utils.dart';
import '../../../../data/models/event_model.dart';
import 'event_detail_sheet.dart';

class EventCard extends StatelessWidget {
  final EventModel event;
  final double? userLatitude;
  final double? userLongitude;

  const EventCard({
    super.key,
    required this.event,
    this.userLatitude,
    this.userLongitude,
  });

  @override
  Widget build(BuildContext context) {
    String distanceString = "---";
    if (userLatitude != null && userLongitude != null) {
      double meters = GeoUtils.calculateDistance(
        userLatitude!,
        userLongitude!,
        event.latitude,
        event.longitude,
      );
      distanceString = GeoUtils.formatDistance(meters);
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      decoration: BoxDecoration(
        gradient: AppColors.cardGradient,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: InkWell(
        onTap: () => _showEventDetail(context),
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.sparkContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Icon(
                        _getCategoryIcon(event.category),
                        color: AppColors.spark,
                        size: 28,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on, color: AppColors.textMuted, size: 14),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                event.locationName,
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 13,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  _buildPointsBadge(),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(color: AppColors.border, thickness: 1),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatusChip(),
                  Row(
                    children: [
                      const Icon(Icons.near_me, color: AppColors.textMuted, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        distanceString,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.group, color: AppColors.textMuted, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        "${event.attendeeCount} attending",
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPointsBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.sparkContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.bolt, size: 14, color: AppColors.spark),
          const SizedBox(width: 2),
          Text(
            "+${event.points}",
            style: const TextStyle(
              color: AppColors.spark,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip() {
    if (event.isLive) {
      return Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppColors.spark,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          const Text(
            "LIVE",
            style: TextStyle(
              color: AppColors.spark,
              fontWeight: FontWeight.bold,
              fontSize: 11,
              letterSpacing: 1,
            ),
          ),
        ],
      );
    }

    Color color;
    String label;
    IconData icon;

    switch (event.status) {
      case 'upcoming':
        label = "SOON";
        color = AppColors.warning;
        icon = Icons.schedule;
        break;
      default:
        label = "ENDED";
        color = AppColors.textMuted;
        icon = Icons.history;
    }

    return Row(
      children: [
        Icon(icon, color: color, size: 12),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: 11,
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }

  IconData _getCategoryIcon(String category) {
    category = category.toLowerCase();
    if (category.contains('blood') || category.contains('health')) return Icons.medical_services;
    if (category.contains('volunteer')) return Icons.volunteer_activism;
    if (category.contains('sport')) return Icons.sports_basketball;
    if (category.contains('tech')) return Icons.code;
    return Icons.event;
  }

  void _showEventDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EventDetailSheet(event: event),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/spark_button.dart';
import '../../../../data/models/event_model.dart';
import '../../../../routes/route_names.dart';

class EventDetailSheet extends StatelessWidget {
  final EventModel event;

  const EventDetailSheet({super.key, required this.event});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(24),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                event.name,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  event.category,
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.sparkContainer,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.bolt, color: AppColors.spark, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                "${event.points} PTS",
                                style: const TextStyle(
                                  color: AppColors.spark,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildInfoRow(Icons.calendar_today, "${_formatDate(event.startDate)} • ${_formatTime(event.startDate)}"),
                    const SizedBox(height: 12),
                    _buildInfoRow(Icons.location_on, event.locationName),
                    const SizedBox(height: 12),
                    _buildInfoRow(Icons.group, event.capacity != null ? "${event.attendeeCount} / ${event.capacity} attending" : "${event.attendeeCount} attending"),
                    
                    const SizedBox(height: 24),
                    const Text(
                      "About this event",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      event.description ?? "No description provided.",
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 15,
                        height: 1.5,
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    // Small Map Thumbnail
                    SizedBox(
                      height: 140,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: FlutterMap(
                          options: MapOptions(
                            initialCenter: LatLng(event.latitude, event.longitude),
                            initialZoom: 14.0,
                            interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName: 'com.aicte.spark',
                              tileBuilder: (context, tileWidget, tile) {
                                return ColorFiltered(
                                  colorFilter: const ColorFilter.matrix([
                                    -1.0, 0.0, 0.0, 0.0, 255.0,
                                    0.0, -1.0, 0.0, 0.0, 255.0,
                                    0.0, 0.0, -1.0, 0.0, 255.0,
                                    0.0, 0.0, 0.0, 1.0, 0.0,
                                  ]),
                                  child: tileWidget,
                                );
                              },
                            ),
                            MarkerLayer(
                              markers: [
                                Marker(
                                  point: LatLng(event.latitude, event.longitude),
                                  width: 40,
                                  height: 40,
                                  child: const Icon(Icons.location_on, color: AppColors.spark, size: 40),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 40),
                    _buildCheckInButton(context),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCheckInButton(BuildContext context) {
    final bool isLive = event.isLive;
    final bool hasSubmitted = event.hasSubmitted ?? false;

    if (hasSubmitted) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppColors.sparkContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.spark.withOpacity(0.5)),
        ),
        child: const Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle, color: AppColors.spark),
              SizedBox(width: 8),
              Text(
                "VERIFIED",
                style: TextStyle(
                  color: AppColors.spark,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return SparkButton(
      label: isLive ? "CHECK IN NOW" : "EVENT NOT ACTIVE",
      variant: isLive ? SparkButtonVariant.spark : SparkButtonVariant.secondary,
      onPressed: isLive 
          ? () => context.push(RouteNames.eventCamera, extra: event) 
          : null,
    ).animate(target: isLive ? 1 : 0).shimmer(duration: 1.5.seconds, color: Colors.white24);
  }

  String _formatDate(DateTime date) {
    return "${date.day}/${date.month}/${date.year}";
  }

  String _formatTime(DateTime date) {
    return "${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}";
  }
}

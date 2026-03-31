import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/models/event_model.dart';
import 'event_detail_sheet.dart';

class EventMapView extends ConsumerWidget {
  final List<EventModel> events;
  final LatLng userLocation;

  const EventMapView({
    super.key,
    required this.events,
    required this.userLocation,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FlutterMap(
      options: MapOptions(
        initialCenter: userLocation,
        initialZoom: 15.0,
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
            // User location marker
            Marker(
              point: userLocation,
              width: 30,
              height: 30,
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.5),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
              ).animate(onPlay: (controller) => controller.repeat())
                  .scale(begin: const Offset(0.8, 0.8), end: const Offset(1.2, 1.2), duration: 1.seconds, curve: Curves.easeInOut)
                  .then()
                  .scale(begin: const Offset(1.2, 1.2), end: const Offset(0.8, 0.8), duration: 1.seconds, curve: Curves.easeInOut),
            ),
            // Event markers
            ...events.map(
              (event) => Marker(
                point: LatLng(event.latitude, event.longitude),
                width: 44,
                height: 44,
                child: GestureDetector(
                  onTap: () => _showEventDetail(context, event),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primary, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        "${event.points}",
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ).animate().scale(delay: 200.ms, duration: 400.ms, curve: Curves.elasticOut),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showEventDetail(BuildContext context, EventModel event) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EventDetailSheet(event: event),
    );
  }
}

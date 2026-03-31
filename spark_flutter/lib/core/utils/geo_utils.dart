import 'dart:math';
import 'package:latlong2/latlong.dart';

class GeoUtils {
  /// Calculate distance between two points in meters using Haversine formula
  static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double radius = 6371000; // Earth's radius in meters
    double dLat = _toRadians(lat2 - lat1);
    double dLon = _toRadians(lon2 - lon1);
    
    double a = sin(dLat / 2) * sin(dLat / 2) +
               cos(_toRadians(lat1)) * cos(_toRadians(lat2)) *
               sin(dLon / 2) * sin(dLon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    
    return radius * c;
  }

  static double _toRadians(double degree) {
    return degree * pi / 180;
  }

  static String formatDistance(double meters) {
    if (meters < 1000) {
      return '${meters.toInt()}m away';
    } else {
      return '${(meters / 1000).toStringAsFixed(1)}km away';
    }
  }
}

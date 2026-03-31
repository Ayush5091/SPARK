import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/spark_text_field.dart';
import '../../../core/widgets/spark_button.dart';
import '../../../core/providers/api_provider.dart';
import 'admin_events_providers.dart';

class CreateEventScreen extends ConsumerStatefulWidget {
  const CreateEventScreen({super.key});

  @override
  ConsumerState<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends ConsumerState<CreateEventScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationNameController = TextEditingController();
  final _pointsController = TextEditingController(text: "10");
  final _capacityController = TextEditingController();

  String _selectedCategory = "Technical";
  LatLng? _selectedLatLng;
  double _radiusMeters = 100;
  DateTime? _startDateTime;
  DateTime? _endDateTime;
  double _timeTolerance = 30;
  bool _limitCapacity = false;
  bool _isLoading = false;

  final MapController _mapController = MapController();

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _locationNameController.dispose();
    _pointsController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    if (permission == LocationPermission.deniedForever) return;

    final position = await Geolocator.getCurrentPosition();
    setState(() {
      _selectedLatLng = LatLng(position.latitude, position.longitude);
      _mapController.move(_selectedLatLng!, 16);
    });
  }

  Future<void> _pickDateTime(bool isStart) async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.primary,
            onPrimary: Colors.black,
            surface: AppColors.surface,
            onSurface: Colors.white,
          ),
        ),
        child: child!,
      ),
    );

    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.now(),
        builder: (context, child) => Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: Colors.black,
              surface: AppColors.surface,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        ),
      );

      if (time != null) {
        setState(() {
          final combined = DateTime(date.year, date.month, date.day, time.hour, time.minute);
          if (isStart) {
            _startDateTime = combined;
          } else {
            _endDateTime = combined;
          }
        });
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedLatLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Tap the map to set location"), backgroundColor: AppColors.error));
      return;
    }
    if (_startDateTime == null || _endDateTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Set start and end times"), backgroundColor: AppColors.error));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final eventData = {
        'name': _nameController.text,
        'description': _descriptionController.text,
        'category': _selectedCategory,
        'points': int.parse(_pointsController.text),
        'latitude': _selectedLatLng!.latitude,
        'longitude': _selectedLatLng!.longitude,
        'location_name': _locationNameController.text,
        'location_radius_meters': _radiusMeters.toInt(),
        'capacity': _limitCapacity ? int.tryParse(_capacityController.text) : null,
        'start_time': _startDateTime!.toIso8601String(),
        'end_time': _endDateTime!.toIso8601String(),
        'time_tolerance_minutes': _timeTolerance.toInt(),
      };

      await ref.read(apiServiceProvider).createEvent(eventData);
      ref.invalidate(adminEventsProvider);
      
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Event created! Students have been notified 🎉"), backgroundColor: AppColors.primary),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Create Event"),
        backgroundColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Basic Info
              const _SectionHeader(title: "Basic Info"),
              SparkTextField(
                label: "Event Name*",
                controller: _nameController,
                validator: (val) => (val == null || val.length < 3) ? "Min 3 characters required" : null,
              ),
              const SizedBox(height: 16),
              SparkTextField(
                label: "Description",
                controller: _descriptionController,
                maxLines: 4,
                hint: "What is this event about?",
              ),
              const SizedBox(height: 16),
              _buildCategoryDropdown(),
              const SizedBox(height: 16),
              SparkTextField(
                label: "Points*",
                controller: _pointsController,
                keyboardType: TextInputType.number,
                validator: (val) => (val == null || int.tryParse(val) == null || int.parse(val) <= 0) ? "Points must be > 0" : null,
              ),

              // Location
              const SizedBox(height: 32),
              const _SectionHeader(title: "Location"),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("📍 Set Event Location", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  Text("Tap map to pin", style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                height: 260,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Stack(
                  children: [
                    FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        initialCenter: const LatLng(12.8687, 74.9255), // Sahyadri Campus
                        initialZoom: 15,
                        onTap: (tapPosition, point) => setState(() => _selectedLatLng = point),
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.spark.app',
                        ),
                        if (_selectedLatLng != null) ...[
                          CircleLayer(
                            circles: [
                              CircleMarker(
                                point: _selectedLatLng!,
                                radius: _radiusMeters,
                                useRadiusInMeter: true,
                                color: AppColors.primary.withOpacity(0.15),
                                borderStrokeWidth: 2,
                                borderColor: AppColors.primary.withOpacity(0.4),
                              ),
                            ],
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: _selectedLatLng!,
                                width: 40,
                                height: 40,
                                child: const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 40),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                    Positioned(
                      top: 12,
                      right: 12,
                      child: FloatingActionButton.small(
                        onPressed: _getCurrentLocation,
                        backgroundColor: AppColors.surface,
                        foregroundColor: AppColors.primary,
                        child: const Icon(Icons.my_location_rounded),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _buildRadiusSlider(),
              const SizedBox(height: 16),
              SparkTextField(
                label: "Location Name*",
                controller: _locationNameController,
                hint: "e.g. Sahyadri Main Block Entrance",
                validator: (val) => (val == null || val.isEmpty) ? "Required" : null,
              ),

              // Time
              const SizedBox(height: 32),
              const _SectionHeader(title: "Time Window"),
              _buildDateTimeSelector(
                label: "Start Date & Time*",
                value: _startDateTime,
                onTap: () => _pickDateTime(true),
              ),
              const SizedBox(height: 16),
              _buildDateTimeSelector(
                label: "End Date & Time*",
                value: _endDateTime,
                onTap: () => _pickDateTime(false),
              ),
              if (_startDateTime != null && _endDateTime != null) ...[
                const SizedBox(height: 16),
                _buildDurationCard(),
              ],
              const SizedBox(height: 24),
              _buildToleranceSlider(),

              // Capacity
              const SizedBox(height: 32),
              const _SectionHeader(title: "Capacity"),
              Row(
                children: [
                  const Text("Limit capacity?", style: TextStyle(color: Colors.white, fontSize: 16)),
                  const Spacer(),
                  Switch(
                    value: _limitCapacity,
                    onChanged: (val) => setState(() => _limitCapacity = val),
                    activeColor: AppColors.primary,
                  ),
                ],
              ),
              if (_limitCapacity)
                SparkTextField(
                  label: "Attendee Limit*",
                  controller: _capacityController,
                  keyboardType: TextInputType.number,
                  validator: (val) => (val == null || int.tryParse(val) == null || int.parse(val) <= 0) ? "Required (> 0)" : null,
                )
              else
                Text("Unlimited — anyone can attend", style: TextStyle(color: AppColors.textMuted, fontSize: 14)),

              const SizedBox(height: 48),
              SparkButton(
                label: "Create Event",
                onPressed: _submit,
                isLoading: _isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryDropdown() {
    final List<Map<String, dynamic>> categories = [
      {'val': 'Sports', 'icon': Icons.sports_basketball_rounded},
      {'val': 'Cultural', 'icon': Icons.palette_rounded},
      {'val': 'Technical', 'icon': Icons.code_rounded},
      {'val': 'Social', 'icon': Icons.people_alt_rounded},
      {'val': 'Leadership', 'icon': Icons.stars_rounded},
      {'val': 'Health', 'icon': Icons.favorite_rounded},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Category", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedCategory,
          dropdownColor: AppColors.surface,
          decoration: InputDecoration(
            fillColor: AppColors.surface,
            filled: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.border)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary)),
          ),
          items: categories.map((cat) => DropdownMenuItem(
            value: cat['val'] as String,
            child: Row(
              children: [
                Icon(cat['icon'] as IconData, color: AppColors.primary, size: 20),
                const SizedBox(width: 12),
                Text(cat['val'] as String, style: const TextStyle(color: Colors.white)),
              ],
            ),
          )).toList(),
          onChanged: (val) => setState(() => _selectedCategory = val!),
        ),
      ],
    );
  }

  Widget _buildRadiusSlider() {
    return Column(
      children: [
        Row(
          children: [
            const Text("Radius:", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const Spacer(),
            Text("${_radiusMeters.toInt()}m", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ],
        ),
        Slider(
          value: _radiusMeters,
          min: 50,
          max: 500,
          divisions: 45,
          activeColor: AppColors.primary,
          onChanged: (val) => setState(() => _radiusMeters = val),
        ),
      ],
    );
  }

  Widget _buildDateTimeSelector({required String label, DateTime? value, required VoidCallback onTap}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value != null ? DateFormat('EEE, MMM d · h:mm a').format(value) : "Select date & time",
                    style: TextStyle(color: value != null ? Colors.white : AppColors.textMuted),
                  ),
                ),
                const Icon(Icons.calendar_month_rounded, color: AppColors.textMuted, size: 20),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDurationCard() {
    final duration = _endDateTime!.difference(_startDateTime!);
    if (duration.isNegative) {
      return const Text("End time must be after start time", style: TextStyle(color: AppColors.error, fontSize: 12));
    }
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.05), borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text("⏱️ Event runs for ", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          Text("${hours}h ${minutes}m", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildToleranceSlider() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text("Check-in tolerance", style: TextStyle(color: Colors.white, fontSize: 14)),
            const SizedBox(width: 4),
            Tooltip(
              message: "How early/late a student can check in relative to the time window",
              child: Icon(Icons.info_outline_rounded, size: 14, color: AppColors.textMuted),
            ),
            const Spacer(),
            Text("±${_timeTolerance.toInt()} min", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ],
        ),
        Slider(
          value: _timeTolerance,
          min: 15,
          max: 60,
          divisions: 9,
          activeColor: AppColors.primary,
          onChanged: (val) => setState(() => _timeTolerance = val),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Text(title.toUpperCase(), style: GoogleFonts.poppins(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          const SizedBox(width: 16),
          const Expanded(child: Divider(color: AppColors.divider)),
        ],
      ),
    );
  }
}

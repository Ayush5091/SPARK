import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/event_model.dart';
import '../../../data/services/api_service.dart';

class EventCameraScreen extends StatefulWidget {
  final EventModel event;

  const EventCameraScreen({super.key, required this.event});

  @override
  State<EventCameraScreen> createState() => _EventCameraScreenState();
}

class _EventCameraScreenState extends State<EventCameraScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isInitializing = true;
  bool _isCapturing = false;
  bool _isVerifying = false;
  String? _verificationResult;
  bool? _isVerified;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    _cameras = await availableCameras();
    if (_cameras != null && _cameras!.isNotEmpty) {
      _controller = CameraController(
        _cameras![0],
        ResolutionPreset.high,
        enableAudio: false,
      );

      try {
        await _controller!.initialize();
        setState(() => _isInitializing = false);
      } catch (e) {
        debugPrint("Camera Error: $e");
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    if (_controller == null || !_controller!.value.isInitialized || _isCapturing) return;

    setState(() => _isCapturing = true);

    try {
      final image = await _controller!.takePicture();
      await _verifyAttendance(image.path);
    } catch (e) {
      setState(() {
        _isCapturing = false;
        _verificationResult = e.toString();
        _isVerified = false;
      });
    }
  }

  Future<void> _verifyAttendance(String imagePath) async {
    setState(() => _isVerifying = true);

    try {
      // Get current GPS location
      final pos = await Geolocator.getCurrentPosition();
      
      final apiService = ApiService();
      final result = await apiService.verifyPresence(
        eventId: widget.event.id,
        imagePath: imagePath,
        latitude: pos.latitude,
        longitude: pos.longitude,
      );

      final bool autoVerified = result['auto_verified'] ?? false;
      
      setState(() {
        _isVerifying = false;
        _isVerified = autoVerified;
        _verificationResult = autoVerified 
            ? "You're in! +${widget.event.points} pts earned 🎉" 
            : "Photo submitted for review!";
      });

      // Auto-navigate back after success
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) context.pop();
      });

    } catch (e) {
      setState(() {
        _isVerifying = false;
        _isVerified = false;
        _verificationResult = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Camera Preview
          if (_controller != null)
             CameraPreview(_controller!),
          
          // Viewfinder Overlay
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withOpacity(0.5),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Center(
                  child: Container(
                    width: 280,
                    height: 380,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Header & Guidelines
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        style: IconButton.styleFrom(backgroundColor: Colors.black45),
                      ),
                      const SizedBox(width: 16),
                      const Text(
                        "Verify Attendance",
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                const Text(
                  "Hold still and take a photo",
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500),
                ).animate().fadeIn().moveY(begin: 10, end: 0),
                const SizedBox(height: 8),
                const Text(
                   "Must be taken at the event location",
                   style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 60),
              ],
            ),
          ),

          // Bottom Controls
          Positioned(
            bottom: 48,
            left: 0,
            right: 0,
            child: Column(
              children: [
                GestureDetector(
                  onTap: _takePhoto,
                  child: Container(
                    width: 80,
                    height: 80,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                    ),
                    child: Container(
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ).animate(target: _isCapturing ? 0 : 1).scale(begin: const Offset(0.8, 0.8)),
                ),
              ],
            ),
          ),

          // Verification Overlay
          if (_isVerifying)
             Container(
               color: Colors.black87,
               child: Column(
                 mainAxisAlignment: MainAxisAlignment.center,
                 children: [
                   const CircularProgressIndicator(color: AppColors.primary),
                   const SizedBox(height: 24),
                   const Text(
                     "Verifying your presence...",
                     style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                   ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 2.seconds),
                 ],
               ),
             ),

          // Result Overlay
          if (_isVerified != null && !_isVerifying)
            Container(
              color: const Color(0xE6000000), // ~90% opacity black
              padding: const EdgeInsets.all(40),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _isVerified!
                      ? const Icon(Icons.check_circle, color: AppColors.primary, size: 80).animate().scale(curve: Curves.elasticOut, duration: 600.ms)
                      : const Icon(Icons.error, color: AppColors.error, size: 80).animate().shake(),
                  const SizedBox(height: 24),
                  Text(
                    _verificationResult ?? "",
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ).animate().fadeIn(),
                  const SizedBox(height: 32),
                  if (!_isVerified!)
                    ElevatedButton(
                      onPressed: () => setState(() {
                        _isVerified = null;
                        _isCapturing = false;
                      }),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.white12),
                      child: const Text("Retry capture", style: TextStyle(color: Colors.white)),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

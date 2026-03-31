import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/spark_button.dart';
import '../../../../core/widgets/spark_text_field.dart';
import '../../../../data/models/activity_model.dart';
import '../../../../core/widgets/spark_card.dart';
import '../../../../data/services/api_service.dart';

class ClaimProofScreen extends StatefulWidget {
  final String? activityJson;

  const ClaimProofScreen({super.key, this.activityJson});

  @override
  State<ClaimProofScreen> createState() => _ClaimProofScreenState();
}

class _ClaimProofScreenState extends State<ClaimProofScreen> {
  final _formKey = GlobalKey<FormState>();
  final _proofController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _hoursController = TextEditingController();

  DateTime? _selectedDate;
  bool _isLoading = false;
  bool _isSuccess = false;
  String? _errorMessage;
  ActivityModel? _activity;

  @override
  void initState() {
    super.initState();
    if (widget.activityJson != null) {
      try {
        _activity = ActivityModel.fromJson(jsonDecode(widget.activityJson!));
      } catch (e) {
        debugPrint('Error parsing activity json: $e');
      }
    }
  }

  @override
  void dispose() {
    _proofController.dispose();
    _descriptionController.dispose();
    _hoursController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: AppColors.background,
              surface: AppColors.card,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _submitClaim() async {
    if (_activity == null) return;
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an activity date'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ApiService();
      final hoursText = _hoursController.text.trim();
      final hoursSpent = hoursText.isNotEmpty ? double.tryParse(hoursText) : null;

      await apiService.submitDirectClaim(
        activityId: _activity!.id,
        proof: _proofController.text.trim(),
        description: _descriptionController.text.trim(),
        hoursSpent: hoursSpent,
        activityDate: _selectedDate!,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          _isSuccess = true;
        });
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) context.pop();
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst('Exception: ', '');
        setState(() {
          _isLoading = false;
          _errorMessage = msg;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_activity == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Text(
            'Error: No activity selected',
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Claim Points',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isSuccess ? _buildSuccessState() : _buildForm(),
    );
  }

  Widget _buildSuccessState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: AppColors.primaryMuted,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle, color: AppColors.primary, size: 80),
          ),
          const SizedBox(height: 24),
          const Text(
            'Claim Submitted!',
            style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Your proof is under review.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    return SafeArea(
      child: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Activity header card
            SparkCard(
              padding: 20,
              radius: 16,
              accentCard: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          _activity!.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${_activity!.points} pts',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white10,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _activity!.category.toUpperCase(),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Fill in the details below and submit your proof',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Proof link
            SparkTextField(
              controller: _proofController,
              label: 'Proof Link',
              hint: 'e.g. drive.google.com/... or certificate link',
              prefixIcon: const Icon(Icons.link, color: AppColors.textMuted),
              validator: (val) => (val == null || val.isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 20),

            // Description
            SparkTextField(
              controller: _descriptionController,
              label: 'Description',
              hint: 'Describe what you did, when, and where',
              maxLines: 4,
              validator: (val) => (val == null || val.length < 20)
                  ? 'Please provide at least 20 characters'
                  : null,
            ),
            const SizedBox(height: 20),

            // Hours + Date row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: SparkTextField(
                    controller: _hoursController,
                    label: 'Hours Spent',
                    hint: '0',
                    keyboardType: TextInputType.number,
                    prefixIcon: const Icon(Icons.timer_outlined, color: AppColors.textMuted),
                    validator: (_) => null, // optional
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(left: 4, bottom: 8),
                        child: Text(
                          'Activity Date',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => _selectDate(context),
                        child: Container(
                          height: 56,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today,
                                  color: AppColors.textMuted, size: 20),
                              const SizedBox(width: 12),
                              Text(
                                _selectedDate == null
                                    ? 'Select Date'
                                    : DateFormat('MMM dd, yyyy').format(_selectedDate!),
                                style: TextStyle(
                                  color: _selectedDate == null
                                      ? AppColors.textMuted
                                      : Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AppColors.error, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 48),
            SparkButton(
              label: 'Submit Claim',
              isLoading: _isLoading,
              onPressed: _submitClaim,
            ),
          ],
        ),
      ),
    );
  }
}

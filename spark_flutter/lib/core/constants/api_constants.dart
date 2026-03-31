class ApiConstants {
  static const String baseUrl = 'https://aicte-beta.vercel.app';
  // For local dev: 'http://localhost:3000'
  
  // Auth
  static const String adminLogin = '/api/auth/admin/login';
  static const String googleCallback = '/api/auth/google/callback';
  static const String googleMobileAuth = '/api/auth/google/mobile';
  static const String register = '/api/auth/register';
  
  // Student
  static const String studentMe = '/api/students/me';
  
  // Admin
  static const String adminMe = '/api/admins/me';
  
  // Activities
  static const String activities = '/api/activities';
  static const String activityRequests = '/api/activity-requests';
  static const String myActivityRequests = '/api/activity-requests/me';
  static const String submissions = '/api/submissions';
  static const String mySubmissions = '/api/submissions/me';

  // Direct Claims (new flow)
  static const String directClaims = '/api/direct-claims';
  static const String myDirectClaims = '/api/direct-claims/me';
  
  // Events
  static const String events = '/api/events';
  static const String personalEvents = '/api/events/personal';
  static const String eventSubmissions = '/api/event-submissions';
  static const String photoVerification = '/api/photo-verification';
  static const String adminEventSubmissions = '/api/admin/event-submissions';
  
  // Notifications
  static const String notifications = '/api/notifications';
}

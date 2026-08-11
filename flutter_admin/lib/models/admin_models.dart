import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String id;
  final String displayName;
  final String username;
  final String? profileImageUrl;
  final String role;
  final String status;
  final String? suspensionReason;
  final DateTime? suspensionUntil;
  final DateTime createdAt;
  final String? emailVisible;

  UserModel({
    required this.id,
    required this.displayName,
    required this.username,
    this.profileImageUrl,
    required this.role,
    required this.status,
    this.suspensionReason,
    this.suspensionUntil,
    required this.createdAt,
    this.emailVisible,
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return UserModel(
      id: doc.id,
      displayName: data['display_name'] ?? 'مستخدم بَدِل',
      username: data['username'] ?? '',
      profileImageUrl: data['profile_image_url'],
      role: data['role'] ?? 'user',
      status: data['status'] ?? 'active',
      suspensionReason: data['suspension_reason'],
      suspensionUntil: data['suspension_until'] != null 
          ? DateTime.tryParse(data['suspension_until']) 
          : null,
      createdAt: data['created_at'] != null 
          ? DateTime.tryParse(data['created_at']) ?? DateTime.now()
          : DateTime.now(),
      emailVisible: data['email_visible'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'display_name': displayName,
      'username': username,
      'profile_image_url': profileImageUrl,
      'role': role,
      'status': status,
      'suspension_reason': suspensionReason,
      'suspension_until': suspensionUntil?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'email_visible': emailVisible,
    };
  }
}

class ListingModel {
  final String id;
  final String title;
  final String description;
  final String ownerId;
  final String ownerName;
  final String status;
  final double? latitude;
  final double? longitude;
  final String? category;
  final List<String> imageUrls;
  final DateTime createdAt;

  ListingModel({
    required this.id,
    required this.title,
    required this.description,
    required this.ownerId,
    required this.ownerName,
    required this.status,
    this.latitude,
    this.longitude,
    this.category,
    required this.imageUrls,
    required this.createdAt,
  });

  factory ListingModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ListingModel(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      ownerId: data['owner_id'] ?? '',
      ownerName: data['owner_name'] ?? 'مستخدم بَدِل',
      status: data['status'] ?? 'active',
      latitude: (data['approximate_latitude'] as num?)?.toDouble(),
      longitude: (data['approximate_longitude'] as num?)?.toDouble(),
      category: data['category'],
      imageUrls: List<String>.from(data['image_urls'] ?? []),
      createdAt: data['created_at'] != null 
          ? DateTime.tryParse(data['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class ReportModel {
  final String id;
  final String reporterId;
  final String reporterName;
  final String targetId;
  final String targetType; // 'listing' or 'user'
  final String targetTitle;
  final String reason;
  final String details;
  final String status; // 'pending', 'resolved', 'dismissed'
  final DateTime createdAt;

  ReportModel({
    required this.id,
    required this.reporterId,
    required this.reporterName,
    required this.targetId,
    required this.targetType,
    required this.targetTitle,
    required this.reason,
    required this.details,
    required this.status,
    required this.createdAt,
  });

  factory ReportModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ReportModel(
      id: doc.id,
      reporterId: data['reporter_id'] ?? '',
      reporterName: data['reporter_name'] ?? 'مبلغ',
      targetId: data['target_id'] ?? '',
      targetType: data['target_type'] ?? 'listing',
      targetTitle: data['target_title'] ?? '',
      reason: data['reason'] ?? '',
      details: data['details'] ?? '',
      status: data['status'] ?? 'pending',
      createdAt: data['created_at'] != null 
          ? DateTime.tryParse(data['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

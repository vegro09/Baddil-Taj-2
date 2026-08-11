import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  final _specificUserCodeController = TextEditingController();
  
  String _targetAudience = 'all'; // 'all', 'specific', 'active', 'blocked'
  bool _sending = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.notifications_active, color: Color(0xFFE11D48), size: 24),
                const SizedBox(width: 10),
                const Text(
                  'مركز الإشعارات وجماهير بَدِل',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 24),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('1. اختر شريحة الجمهور المستهدفة', style: TextStyle(fontWeight: FontWeight.black, fontSize: 13, color: Colors.white)),
                    const SizedBox(height: 12),
                    _buildAudienceOption('إرسال لكافة المسجلين على المنصة (All Users)', 'all', Icons.campaign),
                    _buildAudienceOption('إرسال للمستخدمين النشطين فقط (Active Users)', 'active', Icons.person_add),
                    _buildAudienceOption('إرسال للمستخدمين المحظورين فقط (Blocked Users)', 'blocked', Icons.gpp_bad),
                    _buildAudienceOption('إرسال لرمز مستخدم محدد (Specific Member Code)', 'specific', Icons.person),
                    
                    if (_targetAudience == 'specific') ...[
                      const SizedBox(height: 16),
                      TextField(
                        controller: _specificUserCodeController,
                        decoration: const InputDecoration(
                          labelText: 'أدخل كود العضو (مثال: K:000001)',
                          hintText: 'K:000001',
                        ),
                      ),
                    ],
                    
                    const SizedBox(height: 24),
                    const Divider(color: Color(0xFF1E293B)),
                    const SizedBox(height: 16),
                    
                    const Text('2. تفاصيل الإشعار الفوري (FCM Broadcast)', style: TextStyle(fontWeight: FontWeight.black, fontSize: 13, color: Colors.white)),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        labelText: 'عنوان التنبيه الإداري باللغة العربية',
                        hintText: 'تحديث أمان هام بخصوص المقايضات المجدولة...',
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _bodyController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'تفاصيل ومضمون الإشعار بالكامل',
                        hintText: 'يرجى العلم بأنه تم تفعيل فحص الموثوقية التلقائي...',
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _sending ? null : _sendNotification,
                        icon: _sending ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.send_rounded),
                        label: Text(_sending ? 'جاري بث الإشعارات للجماهير...' : 'إرسال الإشعار وبثه عبر FCM', style: const TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE11D48),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAudienceOption(String label, String value, IconData icon) {
    final bool isSelected = _targetAudience == value;
    return GestureDetector(
      onTap: () => setState(() => _targetAudience = value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE11D48).withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFFE11D48) : const Color(0xFF1E293B)),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? const Color(0xFFE11D48) : Colors.grey, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.grey,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle, color: Color(0xFFE11D48), size: 18),
          ],
        ),
      ),
    );
  }

  void _sendNotification() async {
    final title = _titleController.text.trim();
    final body = _bodyController.text.trim();
    final specificCode = _specificUserCodeController.text.trim();

    if (title.isEmpty || body.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرجاء إدخال عنوان الإشعار ومحتواه أولاً')),
      );
      return;
    }

    if (_targetAudience == 'specific' && specificCode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرجاء كتابة رمز العضو لتوجيه التنبيه له')),
      );
      return;
    }

    setState(() => _sending = true);

    try {
      final now = DateTime.now();

      // Write to the notifications collection in Cloud Firestore
      // (This will be intercepted by Cloud Functions triggers to dispatch real FCM push payloads)
      await FirebaseFirestore.instance.collection('notifications').add({
        'title': title,
        'body': body,
        'target_audience': _targetAudience,
        'target_user_code': _targetAudience == 'specific' ? specificCode : null,
        'sender_email': FirebaseAuth.instance.currentUser?.email ?? 'baddil.support@gmail.com',
        'created_at': now.toIso8601String(),
        'status': 'queued',
      });

      // Log Activity
      await FirebaseFirestore.instance.collection('activity_logs').add({
        'admin_id': FirebaseAuth.instance.currentUser?.uid ?? 'system',
        'admin_name': 'بَدِل الدعم الإداري',
        'action_type': 'broadcast_notification',
        'target_id': _targetAudience,
        'target_name': 'بث إشعار فوري لـ $_targetAudience',
        'reason': title,
        'created_at': now.toIso8601String(),
      });

      _titleController.clear();
      _bodyController.clear();
      _specificUserCodeController.clear();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: Colors.emerald, content: Text('تم جدولة إرسال الإشعار وبثه بنجاح عبر الخادم الفني')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('عذراً، فشل بث الإشعار الفوري')),
      );
    } finally {
      setState(() => _sending = false);
    }
  }
}

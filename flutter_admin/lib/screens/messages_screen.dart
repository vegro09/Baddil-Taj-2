import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final _messageController = TextEditingController();
  final _userIdController = TextEditingController();
  bool _sending = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.chat_bubble, color: Color(0xFFE11D48), size: 24),
              const SizedBox(width: 10),
              const Text(
                'نظام المراسلات الإدارية المباشرة',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Sender form
                Expanded(
                  flex: 5,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('إرسال رسالة نظام/تحذير لعضو', style: TextStyle(fontWeight: FontWeight.black, fontSize: 13, color: Colors.white)),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _userIdController,
                            decoration: const InputDecoration(
                              labelText: 'كود أو معرف العضو المستلم (UID)',
                              hintText: 'أدخل المعرف الفريد للعضو...',
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _messageController,
                            maxLines: 5,
                            decoration: const InputDecoration(
                              labelText: 'نص الرسالة المباشرة',
                              hintText: 'اكتب نص التوجيه أو الرسالة الإدارية هنا...',
                            ),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton.icon(
                              onPressed: _sending ? null : _sendMessage,
                              icon: const Icon(Icons.send),
                              label: const Text('إرسال الرسالة الإدارية الفورية', style: TextStyle(fontWeight: FontWeight.bold)),
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
                ),
                
                const SizedBox(width: 20),
                
                // Recent admin communications stream
                Expanded(
                  flex: 5,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('سجل المراسلات والرسائل الإدارية الأخيرة', style: TextStyle(fontWeight: FontWeight.black, fontSize: 13, color: Colors.white)),
                          const SizedBox(height: 16),
                          Expanded(
                            child: StreamBuilder<QuerySnapshot>(
                              stream: FirebaseFirestore.instance
                                  .collection('messages')
                                  .where('sender_type', isEqualTo: 'admin')
                                  .orderBy('created_at', descending: true)
                                  .limit(20)
                                  .snapshots(),
                              builder: (context, snapshot) {
                                if (!snapshot.hasData) {
                                  return const Center(child: CircularProgressIndicator(color: Color(0xFFE11D48)));
                                }

                                final docs = snapshot.data!.docs;

                                if (docs.isEmpty) {
                                  return const Center(child: Text('لا توجد مراسلات مرسلة من قبلك مؤخراً', style: TextStyle(color: Colors.grey, fontSize: 12)));
                                }

                                return ListView.builder(
                                  itemCount: docs.length,
                                  itemBuilder: (context, index) {
                                    final data = docs[index].data() as Map<String, dynamic>;
                                    return _buildMessageItem(data);
                                  },
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageItem(Map<String, dynamic> data) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Text(
                'إلى: ${data['receiver_name'] ?? data['receiver_id']}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFFE11D48)),
              ),
              Text(
                data['created_at'] != null ? data['created_at'].toString().split('T')[0] : '',
                style: const TextStyle(fontSize: 9, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            data['text'] ?? '',
            style: const TextStyle(fontSize: 12, color: Colors.white70),
          ),
        ],
      ),
    );
  }

  void _sendMessage() async {
    final receiverId = _userIdController.text.trim();
    final text = _messageController.text.trim();

    if (receiverId.isEmpty || text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرجاء إدخال معرّف المستلم ونص الرسالة أولاً')),
      );
      return;
    }

    setState(() => _sending = true);

    try {
      final now = DateTime.now();
      await FirebaseFirestore.instance.collection('messages').add({
        'sender_id': FirebaseAuth.instance.currentUser?.uid ?? 'admin_system',
        'sender_name': 'بَدِل الدعم الإداري والنزاهة',
        'sender_type': 'admin',
        'receiver_id': receiverId,
        'receiver_name': 'عضو بَدِل',
        'text': text,
        'created_at': now.toIso8601String(),
        'status': 'sent',
      });

      // Log Activity
      await FirebaseFirestore.instance.collection('activity_logs').add({
        'admin_id': FirebaseAuth.instance.currentUser?.uid ?? 'system',
        'admin_name': 'بَدِل الدعم الإداري',
        'action_type': 'admin_message_send',
        'target_id': receiverId,
        'target_name': 'مراسلة إدارية',
        'reason': text,
        'created_at': now.toIso8601String(),
      });

      _messageController.clear();
      _userIdController.clear();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: Colors.emerald, content: Text('تم إرسال الرسالة وتوجيه إشعار للعضو بنجاح')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('عذراً، فشل إرسال الرسالة المباشرة')),
      );
    } finally {
      setState(() => _sending = false);
    }
  }
}

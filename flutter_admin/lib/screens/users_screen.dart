import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/admin_models.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _filterRole = 'all';
  String _filterStatus = 'all';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.people, color: Color(0xFFE11D48), size: 24),
              const SizedBox(width: 10),
              const Text(
                'إدارة أعضاء ومستخدمي بَدِل',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Search & Filter Bar
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    hintText: 'البحث عن طريق الاسم، اسم المستخدم K:000001 أو البريد...',
                    prefixIcon: Icon(Icons.search, color: Colors.grey),
                  ),
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val.toLowerCase().trim();
                    });
                  },
                ),
              ),
              const SizedBox(width: 16),
              _buildFilterDropdown(
                value: _filterRole,
                items: [
                  const DropdownMenuItem(value: 'all', child: Text('جميع الرتب')),
                  const DropdownMenuItem(value: 'user', child: Text('مستخدم عادي')),
                  const DropdownMenuItem(value: 'admin', child: Text('مدير خادم')),
                ],
                onChanged: (val) => setState(() => _filterRole = val!),
              ),
              const SizedBox(width: 16),
              _buildFilterDropdown(
                value: _filterStatus,
                items: [
                  const DropdownMenuItem(value: 'all', child: Text('جميع الحالات')),
                  const DropdownMenuItem(value: 'active', child: Text('نشط')),
                  const DropdownMenuItem(value: 'suspended', child: Text('معلق مؤقتاً')),
                  const DropdownMenuItem(value: 'banned', child: Text('محظور نهائياً')),
                ],
                onChanged: (val) => setState(() => _filterStatus = val!),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Users Table/List
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance.collection('profiles').snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFFE11D48)));
                }

                final docs = snapshot.data!.docs;
                final users = docs.map((d) => UserModel.fromFirestore(d)).where((user) {
                  // Search query matching
                  final matchesSearch = user.displayName.toLowerCase().contains(_searchQuery) ||
                      user.username.toLowerCase().contains(_searchQuery) ||
                      (user.emailVisible?.toLowerCase().contains(_searchQuery) ?? false);

                  // Filter Matching
                  final matchesRole = _filterRole == 'all' || user.role == _filterRole;
                  final matchesStatus = _filterStatus == 'all' || user.status == _filterStatus;

                  return matchesSearch && matchesRole && matchesStatus;
                }).toList();

                if (users.isEmpty) {
                  return const Center(
                    child: Text('لم يتم العثور على مستخدمين يطابقون هذه الفلاتر', style: TextStyle(color: Colors.grey)),
                  );
                }

                return ListView.builder(
                  itemCount: users.length,
                  itemBuilder: (context, index) {
                    final user = users[index];
                    return _buildUserCard(context, user);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterDropdown({
    required String value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          dropdownColor: const Color(0xFF0F172A),
          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildUserCard(BuildContext context, UserModel user) {
    final bool isBlocked = user.status == 'suspended' || user.status == 'banned';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: const Color(0xFF1E293B),
              backgroundImage: user.profileImageUrl != null ? NetworkImage(user.profileImageUrl!) : null,
              child: user.profileImageUrl == null ? const Icon(Icons.person, color: Colors.white) : null,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        user.displayName,
                        style: const TextStyle(fontWeight: FontWeight.black, fontSize: 14, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: user.role == 'admin' ? Colors.purple.withOpacity(0.1) : Colors.blue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          user.role == 'admin' ? 'مدير خادم' : 'عضو',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: user.role == 'admin' ? Colors.purple : Colors.blue,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'كود المستخدم: ${user.username} | ${user.emailVisible ?? "مخفي الحماية"}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  if (isBlocked) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.withOpacity(0.2)),
                      ),
                      child: Text(
                        'سبب الحظر: ${user.suspensionReason ?? "بدون سبب مدون"}',
                        style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            
            // Administrative Actions buttons
            Row(
              children: [
                if (!isBlocked)
                  ElevatedButton(
                    onPressed: () => _showBlockDialog(context, user),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.withOpacity(0.1),
                      foregroundColor: Colors.redAccent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('حظر العضو', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  )
                else
                  ElevatedButton(
                    onPressed: () => _unblockUser(user.id),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.emerald.withOpacity(0.1),
                      foregroundColor: Colors.emerald,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('إلغاء الحظر', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showBlockDialog(BuildContext context, UserModel user) {
    final reasonController = TextEditingController();
    String blockType = 'suspended'; // or banned
    int hours = 24;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF0F172A),
              title: Text('إجراء حظر الحساب (${user.displayName})', style: const TextStyle(fontWeight: FontWeight.black, color: Colors.white, fontSize: 16)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: RadioListTile<String>(
                            title: const Text('تعليق مؤقت', style: TextStyle(fontSize: 12, color: Colors.white)),
                            value: 'suspended',
                            groupValue: blockType,
                            onChanged: (v) => setDialogState(() => blockType = v!),
                          ),
                        ),
                        Expanded(
                          child: RadioListTile<String>(
                            title: const Text('حظر كلي', style: TextStyle(fontSize: 12, color: Colors.white)),
                            value: 'banned',
                            groupValue: blockType,
                            onChanged: (v) => setDialogState(() => blockType = v!),
                          ),
                        ),
                      ],
                    ),
                    if (blockType == 'suspended') ...[
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('مدة التعليق (بالساعات):', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          DropdownButton<int>(
                            value: hours,
                            dropdownColor: const Color(0xFF0F172A),
                            items: [24, 48, 72, 168].map((h) {
                              return DropdownMenuItem<int>(
                                value: h,
                                child: Text('$h ساعة (${(h/24).floor()} أيام)', style: const TextStyle(color: Colors.white, fontSize: 12)),
                              );
                            }).toList(),
                            onChanged: (v) => setDialogState(() => hours = v!),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),
                    TextField(
                      controller: reasonController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'اكتب سبب حظر العضو لتوثيق الامتثال الإداري وسجلات الأمان الفنية...',
                        hintStyle: TextStyle(fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('إلغاء', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (reasonController.text.trim().isEmpty) return;
                    
                    final adminEmail = FirebaseAuth.instance.currentUser?.email ?? 'baddil.support@gmail.com';
                    final now = DateTime.now();
                    final DateTime? suspensionUntil = blockType == 'suspended' 
                        ? now.add(Duration(hours: hours))
                        : null;

                    await FirebaseFirestore.instance.collection('profiles').doc(user.id).update({
                      'status': blockType,
                      'suspension_reason': reasonController.text.trim(),
                      'block_reason': reasonController.text.trim(),
                      'block_date': now.toIso8601String(),
                      'blocked_by_admin_email': adminEmail,
                      'suspension_until': suspensionUntil?.toIso8601String(),
                      'updated_at': now.toIso8601String(),
                    });

                    // Add to system Activity Logs inside Firestore
                    await FirebaseFirestore.instance.collection('activity_logs').add({
                      'admin_id': FirebaseAuth.instance.currentUser?.uid ?? 'system',
                      'admin_name': 'بَدِل الدعم الإداري',
                      'action_type': blockType == 'suspended' ? 'user_suspend' : 'user_ban',
                      'target_id': user.id,
                      'target_name': user.displayName,
                      'reason': reasonController.text.trim(),
                      'created_at': now.toIso8601String(),
                    });

                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                  child: const Text('حظر فوري ومصادرة', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _unblockUser(String uid) async {
    final now = DateTime.now();
    await FirebaseFirestore.instance.collection('profiles').doc(uid).update({
      'status': 'active',
      'suspension_reason': FieldValue.delete(),
      'block_reason': FieldValue.delete(),
      'block_date': FieldValue.delete(),
      'blocked_by_admin_email': FieldValue.delete(),
      'suspension_until': FieldValue.delete(),
      'updated_at': now.toIso8601String(),
    });
  }
}

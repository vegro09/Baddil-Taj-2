import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/admin_models.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  String _filterStatus = 'pending'; // 'pending', 'resolved', 'dismissed'

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gavel, color: Color(0xFFE11D48), size: 24),
              const SizedBox(width: 10),
              const Text(
                'إدارة الشكاوى وبلاغات النزاهة',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Filters Tab Bar
          Row(
            children: [
              _buildTabButton('قيد المراجعة والتدقيق', 'pending'),
              const SizedBox(width: 12),
              _buildTabButton('محلولة إدارياً', 'resolved'),
              const SizedBox(width: 12),
              _buildTabButton('مستبعدة / كاذبة', 'dismissed'),
            ],
          ),
          const SizedBox(height: 20),

          // Reports List
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('reports')
                  .where('status', isEqualTo: _filterStatus)
                  .snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFFE11D48)));
                }

                final docs = snapshot.data!.docs;
                final reports = docs.map((d) => ReportModel.fromFirestore(d)).toList();

                if (reports.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shield, size: 48, color: Colors.grey.withOpacity(0.3)),
                        const SizedBox(height: 12),
                        const Text('لا توجد بلاغات معلقة في هذا القسم حالياً', style: TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: reports.length,
                  itemBuilder: (context, index) {
                    final report = reports[index];
                    return _buildReportCard(context, report);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(String label, String status) {
    final bool isActive = _filterStatus == status;
    return GestureDetector(
      onTap: () => setState(() => _filterStatus = status),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFE11D48) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isActive ? const Color(0xFFE11D48) : const Color(0xFF1E293B)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.white : Colors.grey,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildReportCard(BuildContext context, ReportModel report) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Row(
                  children: [
                    const Icon(Icons.report_problem, color: Colors.orangeAccent, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'نوع المخالفة: ${report.reason}',
                      style: const TextStyle(fontWeight: FontWeight.black, fontSize: 13, color: Colors.white),
                    ),
                  ],
                ),
                Text(
                  'التاريخ: ${report.createdAt.toLocal().toString().split(' ')[0]}',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'تفاصيل البلاغ: ${report.details}',
              style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.5),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'المبلّغ: ${report.reporterName} | المشكو ضده: ${report.targetTitle}',
                  style: const TextStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.bold),
                ),
                
                // Administrative actions
                if (report.status == 'pending')
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: () => _updateReportStatus(report.id, 'dismissed'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey.withOpacity(0.1),
                          foregroundColor: Colors.grey,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('حفظ / تجاهل', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => _updateReportStatus(report.id, 'resolved'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.emerald.withOpacity(0.1),
                          foregroundColor: Colors.emerald,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('إقرار المخالفة وحلها', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _updateReportStatus(String reportId, String newStatus) async {
    final now = DateTime.now();
    await FirebaseFirestore.instance.collection('reports').doc(reportId).update({
      'status': newStatus,
      'resolved_at': now.toIso8601String(),
      'resolved_by_email': FirebaseAuth.instance.currentUser?.email ?? 'baddil.support@gmail.com',
    });

    // Log Activity
    await FirebaseFirestore.instance.collection('activity_logs').add({
      'admin_id': FirebaseAuth.instance.currentUser?.uid ?? 'system',
      'admin_name': 'بَدِل الدعم الإداري',
      'action_type': 'report_resolve',
      'target_id': reportId,
      'target_name': 'بلاغ انتهاك',
      'reason': 'تم تغيير حالة البلاغ إلى $newStatus',
      'created_at': now.toIso8601String(),
    });
  }
}

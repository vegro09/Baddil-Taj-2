import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/admin_models.dart';

class ListingsScreen extends StatefulWidget {
  const ListingsScreen({super.key});

  @override
  State<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends State<ListingsScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _filterCategory = 'all';
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
              const Icon(Icons.storefront, color: Color(0xFFE11D48), size: 24),
              const SizedBox(width: 10),
              const Text(
                'إدارة السلع والإعلانات المعروضة للمقايضة',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Search & Filters
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    hintText: 'البحث عن طريق عنوان الإعلان، اسم المعلن أو تفاصيل السلعة...',
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
                value: _filterCategory,
                items: [
                  const DropdownMenuItem(value: 'all', child: Text('جميع التصنيفات')),
                  const DropdownMenuItem(value: 'أجهزة إلكترونية', child: Text('إلكترونيات')),
                  const DropdownMenuItem(value: 'ملابس وأزياء', child: Text('ملابس وأزياء')),
                  const DropdownMenuItem(value: 'أثاث ومنزل', child: Text('أثاث ومنزل')),
                  const DropdownMenuItem(value: 'كتب ومستلزمات', child: Text('كتب')),
                ],
                onChanged: (val) => setState(() => _filterCategory = val!),
              ),
              const SizedBox(width: 16),
              _buildFilterDropdown(
                value: _filterStatus,
                items: [
                  const DropdownMenuItem(value: 'all', child: Text('جميع الحالات')),
                  const DropdownMenuItem(value: 'active', child: Text('نشط ومعروض')),
                  const DropdownMenuItem(value: 'hidden_by_admin', child: Text('محجوب إدارياً')),
                  const DropdownMenuItem(value: 'removed', child: Text('محذوف')),
                ],
                onChanged: (val) => setState(() => _filterStatus = val!),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Listings Grid/List
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance.collection('listings').snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFFE11D48)));
                }

                final docs = snapshot.data!.docs;
                final items = docs.map((d) => ListingModel.fromFirestore(d)).where((listing) {
                  final matchesSearch = listing.title.toLowerCase().contains(_searchQuery) ||
                      listing.ownerName.toLowerCase().contains(_searchQuery) ||
                      listing.description.toLowerCase().contains(_searchQuery);

                  final matchesCategory = _filterCategory == 'all' || listing.category == _filterCategory;
                  final matchesStatus = _filterStatus == 'all' || listing.status == _filterStatus;

                  return matchesSearch && matchesCategory && matchesStatus;
                }).toList();

                if (items.isEmpty) {
                  return const Center(
                    child: Text('لم يتم العثور على سلع تطابق هذه الفلاتر', style: TextStyle(color: Colors.grey)),
                  );
                }

                return GridView.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: MediaQuery.of(context).size.width > 1100 ? 3 : (MediaQuery.of(context).size.width > 700 ? 2 : 1),
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.15,
                  ),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final listing = items[index];
                    return _buildListingCard(context, listing);
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

  Widget _buildListingCard(BuildContext context, ListingModel listing) {
    final bool isHidden = listing.status == 'hidden_by_admin';
    final bool isRemoved = listing.status == 'removed';

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image Banner
          Expanded(
            flex: 4,
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                image: listing.imageUrls.isNotEmpty
                    ? DecorationImage(image: NetworkImage(listing.imageUrls.first), fit: BoxFit.cover)
                    : null,
              ),
              child: listing.imageUrls.isEmpty
                  ? const Center(child: Icon(Icons.image_not_supported, color: Colors.grey))
                  : null,
            ),
          ),
          
          // Body content
          Expanded(
            flex: 6,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Text(
                            listing.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.black, fontSize: 13, color: Colors.white),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: isHidden ? Colors.orange.withOpacity(0.1) : (isRemoved ? Colors.red.withOpacity(0.1) : Colors.emerald.withOpacity(0.1)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              isHidden ? 'محجوب' : (isRemoved ? 'محذوف' : 'نشط'),
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isHidden ? Colors.orange : (isRemoved ? Colors.red : Colors.emerald),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        listing.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, color: Colors.grey, height: 1.4),
                      ),
                    ],
                  ),
                  
                  // Metadata and actions
                  Column(
                    children: [
                      const Divider(color: Color(0xFF1E293B), height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Text(
                            'بواسطة: ${listing.ownerName}',
                            style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
                          ),
                          
                          // Administrative Actions
                          Row(
                            children: [
                              if (!isHidden && !isRemoved)
                                IconButton(
                                  icon: const Icon(Icons.visibility_off, color: Colors.orange, size: 18),
                                  onPressed: () => _toggleHideListing(listing, true),
                                  tooltip: 'حجب الإعلان مؤقتاً',
                                )
                              else if (isHidden)
                                IconButton(
                                  icon: const Icon(Icons.visibility, color: Colors.emerald, size: 18),
                                  onPressed: () => _toggleHideListing(listing, false),
                                  tooltip: 'إلغاء حجب الإعلان',
                                ),
                              IconButton(
                                icon: const Icon(Icons.delete_forever, color: Colors.redAccent, size: 18),
                                onPressed: () => _deleteListing(context, listing),
                                tooltip: 'حذف الإعلان نهائياً',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _toggleHideListing(ListingModel listing, bool hide) async {
    final now = DateTime.now();
    await FirebaseFirestore.instance.collection('listings').doc(listing.id).update({
      'status': hide ? 'hidden_by_admin' : 'active',
      'updated_at': now.toIso8601String(),
    });

    // Log Activity
    await FirebaseFirestore.instance.collection('activity_logs').add({
      'admin_id': FirebaseAuth.instance.currentUser?.uid ?? 'system',
      'admin_name': 'بَدِل الدعم الفني',
      'action_type': hide ? 'listing_hide' : 'listing_unhide',
      'target_id': listing.id,
      'target_name': listing.title,
      'created_at': now.toIso8601String(),
    });
  }

  void _deleteListing(BuildContext context, ListingModel listing) {
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text('حذف إعلان المقايضة نهائياً', style: TextStyle(fontWeight: FontWeight.black, color: Colors.white, fontSize: 14)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'سيتم إزالة السلعة وتوجيه رسالة مخالفة شروط الاستخدام لمالكها.',
                style: TextStyle(color: Colors.grey, fontSize: 11),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'اكتب سبب حذف السلعة لتسجيله في السجل الإداري...',
                  hintStyle: TextStyle(fontSize: 11),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('إلغاء', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () async {
                if (reasonController.text.trim().isEmpty) return;

                final now = DateTime.now();
                await FirebaseFirestore.instance.collection('listings').doc(listing.id).update({
                  'status': 'removed',
                  'deleted_reason': reasonController.text.trim(),
                  'deleted_at': now.toIso8601String(),
                  'deleted_by_admin_email': FirebaseAuth.instance.currentUser?.email ?? 'baddil.support@gmail.com',
                });

                // Add to Activity Logs
                await FirebaseFirestore.instance.collection('activity_logs').add({
                  'admin_id': FirebaseAuth.instance.currentUser?.uid ?? 'system',
                  'admin_name': 'بَدِل الدعم الإداري',
                  'action_type': 'listing_delete',
                  'target_id': listing.id,
                  'target_name': listing.title,
                  'reason': reasonController.text.trim(),
                  'created_at': now.toIso8601String(),
                });

                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('تأكيد الحذف', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        );
      },
    );
  }
}

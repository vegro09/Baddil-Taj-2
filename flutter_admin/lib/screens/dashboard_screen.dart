import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import '../models/admin_models.dart';
import '../main.dart';
import 'users_screen.dart';
import 'listings_screen.dart';
import 'reports_screen.dart';
import 'notifications_screen.dart';
import 'messages_screen.dart';

class MainDashboardScreen extends StatefulWidget {
  const MainDashboardScreen({super.key});

  @override
  State<MainDashboardScreen> createState() => _MainDashboardScreenState();
}

class _MainDashboardScreenState extends State<MainDashboardScreen> {
  int _selectedTabIndex = 0;
  bool _isCollapsed = false;

  // Statistics counters
  int totalUsers = 0;
  int activeUsers = 0;
  int blockedUsers = 0;
  int totalListings = 0;
  int activeListings = 0;
  int hiddenListings = 0;
  int deletedListings = 0;
  int totalReports = 0;
  int newUsersToday = 0;
  int newListingsToday = 0;
  bool _statsLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchRealtimeStats();
  }

  void _fetchRealtimeStats() async {
    setState(() => _statsLoading = true);
    try {
      final usersSnap = await FirebaseFirestore.instance.collection('profiles').get();
      final listingsSnap = await FirebaseFirestore.instance.collection('listings').get();
      final reportsSnap = await FirebaseFirestore.instance.collection('reports').get();

      final now = DateTime.now();
      final todayStart = DateTime(now.year, now.month, now.day);

      int usersToday = 0;
      int listingsToday = 0;

      for (var doc in usersSnap.docs) {
        final data = doc.data();
        final createdAtStr = data['created_at'];
        if (createdAtStr != null) {
          final dt = DateTime.tryParse(createdAtStr);
          if (dt != null && dt.isAfter(todayStart)) {
            usersToday++;
          }
        }
      }

      for (var doc in listingsSnap.docs) {
        final data = doc.data();
        final createdAtStr = data['created_at'];
        if (createdAtStr != null) {
          final dt = DateTime.tryParse(createdAtStr);
          if (dt != null && dt.isAfter(todayStart)) {
            listingsToday++;
          }
        }
      }

      setState(() {
        totalUsers = usersSnap.docs.length;
        activeUsers = usersSnap.docs.where((d) => d.data()['status'] == 'active' || d.data()['status'] == null).length;
        blockedUsers = usersSnap.docs.where((d) => d.data()['status'] == 'suspended' || d.data()['status'] == 'banned').length;
        
        totalListings = listingsSnap.docs.length;
        activeListings = listingsSnap.docs.where((d) => d.data()['status'] == 'active' || d.data()['status'] == null).length;
        hiddenListings = listingsSnap.docs.where((d) => d.data()['status'] == 'hidden_by_admin').length;
        deletedListings = listingsSnap.docs.where((d) => d.data()['status'] == 'removed').length;

        totalReports = reportsSnap.docs.length;
        newUsersToday = usersToday;
        newListingsToday = listingsToday;
        _statsLoading = false;
      });
    } catch (e) {
      setState(() => _statsLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        title: const Text(
          'بَدِل - لوحة التحكم الفنية والموثوقية',
          style: TextStyle(fontWeight: FontWeight.black, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0F172A),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFFE11D48)),
            onPressed: _fetchRealtimeStats,
            tooltip: 'تحديث البيانات الفورية',
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.grey),
            onPressed: () {
              Provider.of<AdminAuthProvider>(context, listen: false).logout();
            },
          ),
        ],
      ),
      body: Row(
        children: [
          // Collapsible custom dashboard navigation sidebar
          if (isDesktop)
            NavigationRail(
              extended: !_isCollapsed,
              backgroundColor: const Color(0xFF0F172A),
              selectedIconTheme: const IconThemeData(color: Color(0xFFE11D48)),
              unselectedIconTheme: const IconThemeData(color: Colors.grey),
              selectedIndex: _selectedTabIndex,
              onDestinationSelected: (int index) {
                setState(() {
                  _selectedTabIndex = index;
                });
              },
              leading: IconButton(
                icon: Icon(_isCollapsed ? Icons.menu : Icons.arrow_back_ios),
                onPressed: () {
                  setState(() {
                    _isCollapsed = !_isCollapsed;
                  });
                },
              ),
              destinations: const [
                NavigationRailDestination(
                  icon: Icon(Icons.dashboard_customize_outlined),
                  selectedIcon: Icon(Icons.dashboard_customize),
                  label: Text('المؤشرات العامة'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.people_outline),
                  selectedIcon: Icon(Icons.people),
                  label: Text('إدارة المستخدمين'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.grid_view_outlined),
                  selectedIcon: Icon(Icons.grid_view),
                  label: Text('إدارة الإعلانات والسلع'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.report_gmailerrorred_outlined),
                  selectedIcon: Icon(Icons.report_gmailerrorred),
                  label: Text('بلاغات وشكاوى النزاهة'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.notifications_active_outlined),
                  selectedIcon: Icon(Icons.notifications_active),
                  label: Text('مركز الإشعارات والجماهير'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.chat_bubble_outline),
                  selectedIcon: Icon(Icons.chat_bubble),
                  label: Text('التواصل والمراسلات'),
                ),
              ],
            ),
          
          // Main dynamic view body
          Expanded(
            child: _statsLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFE11D48)))
                : _buildActiveTab(context),
          ),
        ],
      ),
      bottomNavigationBar: !isDesktop
          ? BottomNavigationBar(
              backgroundColor: const Color(0xFF0F172A),
              selectedItemColor: const Color(0xFFE11D48),
              unselectedItemColor: Colors.grey,
              currentIndex: _selectedTabIndex,
              onTap: (index) {
                setState(() {
                  _selectedTabIndex = index;
                });
              },
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'الرئيسية'),
                BottomNavigationBarItem(icon: Icon(Icons.people), label: 'الأعضاء'),
                BottomNavigationBarItem(icon: Icon(Icons.grid_view), label: 'السلع'),
                BottomNavigationBarItem(icon: Icon(Icons.warning), label: 'البلاغات'),
              ],
            )
          : null,
    );
  }

  Widget _buildActiveTab(BuildContext context) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildOverviewDashboard();
      case 1:
        return const UsersScreen();
      case 2:
        return const ListingsScreen();
      case 3:
        return const ReportsScreen();
      case 4:
        return const NotificationsScreen();
      case 5:
        return const MessagesScreen();
      default:
        return _buildOverviewDashboard();
    }
  }

  Widget _buildOverviewDashboard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'نظرة شاملة ومؤشرات حية',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.black, color: Colors.white),
                  ),
                  Text(
                    'لوحة متابعة العمليات والمقايضات اليومية الفعالة',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lock, size: 14, color: Colors.emeraldColor ?? Colors.emerald),
                    SizedBox(width: 6),
                    Text(
                      'خادم مؤمن مشفر SSL',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Modern bento grid layout
          GridView.count(
            crossAxisCount: MediaQuery.of(context).size.width > 1200 ? 4 : (MediaQuery.of(context).size.width > 700 ? 2 : 1),
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 2.1,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _buildStatsCard('إجمالي الأعضاء والمسجلين', '$totalUsers', Icons.group, Colors.indigo),
              _buildStatsCard('المستخدمين النشطين', '$activeUsers', Icons.verified_user, Colors.emerald),
              _buildStatsCard('المستخدمين المحظورين', '$blockedUsers', Icons.gpp_bad, Colors.redAccent),
              _buildStatsCard('المقايضات المضافة اليوم', '$newListingsToday', Icons.bolt, Colors.amber),
              _buildStatsCard('إجمالي السلع المعروضة', '$totalListings', Icons.storefront, Colors.blue),
              _buildStatsCard('المعروض النشط الآن', '$activeListings', Icons.check_circle, Colors.teal),
              _buildStatsCard('السلع المخفية إدارياً', '$hiddenListings', Icons.visibility_off, Colors.orange),
              _buildStatsCard('بلاغات لم تُحل بعد', '$totalReports', Icons.gavel, Colors.rose),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCard(String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.between,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  value,
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.black, color: Colors.white),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: color.withOpacity(0.3)),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
          ],
        ),
      ),
    );
  }
}

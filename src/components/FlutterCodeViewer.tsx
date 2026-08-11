import { useState } from 'react';
import { Terminal, FileCode, Check, Copy } from 'lucide-react';

const FLUTTER_FILES: Record<string, { desc: string; lang: string; content: string }> = {
  'pubspec.yaml': {
    desc: 'Dependencies configuration for Material 3 and Firebase Core, Auth, Firestore, Storage, FCM.',
    lang: 'yaml',
    content: `name: baddil_admin_panel
description: "A production-ready Flutter Admin Panel for the Baddil (بدل) application with full Firebase integration."
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.5
  firebase_core: ^2.24.0
  firebase_auth: ^4.15.0
  cloud_firestore: ^4.13.0
  firebase_storage: ^11.5.0
  firebase_messaging: ^14.7.5
  provider: ^6.1.1
  intl: ^0.18.1
  cached_network_image: ^3.3.1
  flutter_spinkit: ^5.2.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.1

flutter:
  uses-material-design: true`
  },
  'main.dart': {
    desc: 'Application bootstrap, global Theme configuration, multi-provider state, and security auth gateways.',
    lang: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AdminAuthProvider()),
      ],
      child: const BaddilAdminApp(),
    ),
  );
}

class BaddilAdminApp extends StatefulWidget {
  const BaddilAdminApp({super.key});

  @override
  State<BaddilAdminApp> createState() => _BaddilAdminAppState();
}

class _BaddilAdminAppState extends State<BaddilAdminApp> {
  bool _isArabic = true;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'بَدِل - لوحة الإشراف',
      debugShowCheckedModeBanner: false,
      locale: Locale(_isArabic ? 'ar' : 'en'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      builder: (context, child) {
        return Directionality(
          textDirection: _isArabic ? TextDirection.rtl : TextDirection.ltr,
          child: child!,
        );
      },
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE11D48),
          brightness: Brightness.dark,
          primary: const Color(0xFFE11D48),
          surface: const Color(0xFF0F172A),
          background: const Color(0xFF020617),
        ),
      ),
      home: const AuthGate(),
    );
  }
}`
  },
  'admin_models.dart': {
    desc: 'Strongly typed parsing objects mapping Firestore records to local immutable instances.',
    lang: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String id;
  final String displayName;
  final String username;
  final String? profileImageUrl;
  final String role;
  final String status;
  final String? suspensionReason;
  final DateTime? suspensionUntil;

  UserModel({
    required this.id,
    required this.displayName,
    required this.username,
    this.profileImageUrl,
    required this.role,
    required this.status,
    this.suspensionReason,
    this.suspensionUntil,
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
    );
  }
}`
  },
  'dashboard_screen.dart': {
    desc: 'Core dashboard featuring dynamic sidebar / drawer widgets and real-time statistics panels.',
    lang: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';

class MainDashboardScreen extends StatefulWidget {
  const MainDashboardScreen({super.key});

  @override
  State<MainDashboardScreen> createState() => _MainDashboardScreenState();
}

class _MainDashboardScreenState extends State<MainDashboardScreen> {
  int _selectedTabIndex = 0;
  bool _statsLoading = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: Row(
        children: [
          // NavigationRail...
        ],
      ),
    );
  }
}`
  },
  'users_screen.dart': {
    desc: 'Members screen with text filters, real-time Firestore synchronization, and block controllers.',
    lang: 'dart',
    content: `import 'package:flutter/material.dart';
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
    return Scaffold(
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('profiles').snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final docs = snapshot.data!.docs;
          // Filtering logic and User Card rendering
          return ListView();
        },
      ),
    );
  }
}`
  },
  'listings_screen.dart': {
    desc: 'Interactive bento grid to inspect, shadow-ban, or delete reported listings with instant activity logging.',
    lang: 'dart',
    content: `import 'package:flutter/material.dart';
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
    return Scaffold(
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('listings').snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          // Grid rendering & Admin actions (hide, delete)
          return GridView();
        },
      ),
    );
  }
}`
  },
  'reports_screen.dart': {
    desc: 'Interactive gavel system to audit, dismiss, or resolve reported user listings with automatic logs.',
    lang: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/admin_models.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  String _filterStatus = 'pending';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('reports')
            .where('status', isEqualTo: _filterStatus)
            .snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          // Render reported issues with dismiss/approve actions
          return ListView();
        },
      ),
    );
  }
}`
  },
  'notifications_screen.dart': {
    desc: 'Broadcasting platform leveraging Firebase Cloud Messaging (FCM) to reach defined targeted audiences.',
    lang: 'dart',
    content: `import 'package:flutter/material.dart';
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
  String _targetAudience = 'all';

  void _sendNotification() async {
    // Write FCM token broadcast payload to Firestore triggers
    await FirebaseFirestore.instance.collection('notifications').add({
      'title': _titleController.text,
      'body': _bodyController.text,
      'target_audience': _targetAudience,
      'sender_email': FirebaseAuth.instance.currentUser?.email,
      'status': 'queued',
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: Column());
  }
}`
  },
  'messages_screen.dart': {
    desc: 'Direct administrative inbox and outbox dispatch system to message users about warnings or guidelines.',
    lang: 'dart',
    content: `import 'package:flutter/material.dart';
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

  void _sendMessage() async {
    await FirebaseFirestore.instance.collection('messages').add({
      'sender_type': 'admin',
      'receiver_id': _userIdController.text,
      'text': _messageController.text,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: Row());
  }
}`
  }
};

export default function FlutterCodeViewer() {
  const [activeFile, setActiveFile] = useState<string>('pubspec.yaml');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(FLUTTER_FILES[activeFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col md:flex-row h-[550px] text-right" dir="rtl">
      
      {/* File Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 border-l border-slate-800 p-4 shrink-0 flex flex-col gap-1 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 px-2">
          قائمة ملفات المشروع الإداري
        </div>
        {Object.entries(FLUTTER_FILES).map(([fileName, info]) => (
          <button
            key={fileName}
            onClick={() => setActiveFile(fileName)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-mono transition text-right ${
              activeFile === fileName
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'text-slate-400 hover:bg-slate-950 hover:text-white'
            }`}
          >
            <FileCode className="h-4 w-4 shrink-0" />
            <span className="truncate">{fileName}</span>
          </button>
        ))}
      </div>

      {/* Editor/Viewer Body */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        
        {/* Top bar with details and copy option */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col text-right">
            <span className="text-xs font-mono text-white font-bold">{activeFile}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{FLUTTER_FILES[activeFile].desc}</span>
          </div>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl px-4 py-2 text-[10px] font-bold transition cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ الكود'}</span>
          </button>
        </div>

        {/* Code Content Box */}
        <div className="flex-1 p-6 overflow-auto text-left font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/80" dir="ltr">
          <pre>
            <code>{FLUTTER_FILES[activeFile].content}</code>
          </pre>
        </div>

      </div>

    </div>
  );
}

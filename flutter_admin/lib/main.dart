import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'screens/dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // In production, initialize Firebase:
  // await Firebase.initializeApp();
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

  void _toggleLanguage() {
    setState(() {
      _isArabic = !_isArabic;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'بَدِل - لوحة الإشراف',
      debugShowCheckedModeBanner: false,
      locale: Locale(_isArabic ? 'ar' : 'en'),
      supportedLocales: const [
        Locale('ar'),
        Locale('en'),
      ],
      // Standard directionality based on language
      builder: (context, child) {
        return Directionality(
          textDirection: _isArabic ? TextDirection.rtl : TextDirection.ltr,
          child: child!,
        );
      },
      themeMode: ThemeMode.dark, // Defaulting to the professional Dark theme as requested
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE11D48), // Rose 600
          brightness: Brightness.dark,
          primary: const Color(0xFFE11D48),
          surface: const Color(0xFF0F172A), // Slate 900
          background: const Color(0xFF020617), // Slate 950
        ),
        fontFamily: 'Inter',
        cardTheme: CardTheme(
          color: const Color(0xFF0F172A),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xFF1E293B), width: 1),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1E293B),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFFE11D48), width: 1.5),
          ),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AdminAuthProvider>(context);

    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: Color(0xFFE11D48)),
            ),
          );
        }

        final user = snapshot.data;
        if (user == null) {
          return const LoginScreen();
        }

        // Validate secure admin email constraint immediately at gateway level
        if (user.email != 'baddil.support@gmail.com') {
          return const AccessDeniedScreen();
        }

        return FutureBuilder<DocumentSnapshot>(
          future: FirebaseFirestore.instance
              .collection('profiles')
              .doc(user.uid)
              .get(),
          builder: (context, profileSnapshot) {
            if (profileSnapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                body: Center(
                  child: CircularProgressIndicator(color: Color(0xFFE11D48)),
                ),
              );
            }

            if (!profileSnapshot.hasData || !profileSnapshot.data!.exists) {
              return const AccessDeniedScreen();
            }

            final data = profileSnapshot.data!.data() as Map<String, dynamic>?;
            final role = data?['role'] ?? 'user';

            // BOTH email and role = 'admin' are verified
            if (role != 'admin') {
              return const AccessDeniedScreen();
            }

            return const MainDashboardScreen();
          },
        );
      },
    );
  }
}

class AdminAuthProvider with ChangeNotifier {
  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<bool> login(String email, String password) async {
    if (email.trim() != 'baddil.support@gmail.com') {
      return false;
    }

    _isLoading = true;
    notifyListeners();

    try {
      final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      // Fetch role
      final doc = await FirebaseFirestore.instance
          .collection('profiles')
          .doc(credential.user!.uid)
          .get();

      if (doc.exists) {
        final data = doc.data();
        final role = data?['role'] ?? 'user';
        if (role == 'admin') {
          _isLoading = false;
          notifyListeners();
          return true;
        }
      }

      await FirebaseAuth.instance.signOut();
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await FirebaseAuth.instance.signOut();
    notifyListeners();
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'baddil.support@gmail.com');
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String? _errorMessage;

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AdminAuthProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE11D48).withOpacity(0.1),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFE11D48).withOpacity(0.3)),
                    ),
                    child: const Icon(
                      Icons.shield,
                      size: 48,
                      color: Color(0xFFE11D48),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'بَدِل - بوابة الإدارة الآمنة',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.black, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Secure Baddil Admin Portal',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 32),
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextFormField(
                    controller: _emailController,
                    decoration: const InputDecoration(
                      labelText: 'البريد الإلكتروني (baddil.support@gmail.com)',
                      prefixIcon: Icon(Icons.email, size: 20),
                    ),
                    validator: (v) {
                      if (v == null || v.trim() != 'baddil.support@gmail.com') {
                        return 'يجب تسجيل الدخول بالبريد الإلكتروني المعتمد فقط';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'كلمة المرور',
                      prefixIcon: Icon(Icons.lock, size: 20),
                    ),
                    validator: (v) => (v == null || v.isEmpty) ? 'الرجاء إدخال كلمة المرور' : null,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading
                          ? null
                          : () async {
                              if (_formKey.currentState!.validate()) {
                                final success = await authProvider.login(
                                  _emailController.text,
                                  _passwordController.text,
                                );
                                if (!success) {
                                  setState(() {
                                    _errorMessage = 'بيانات الدخول غير صحيحة أو الحساب لا يملك صلاحية admin';
                                  });
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE11D48),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: authProvider.isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('تسجيل الدخول الآمن', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AccessDeniedScreen extends StatelessWidget {
  const AccessDeniedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: const Icon(
                  Icons.gpp_bad,
                  size: 64,
                  color: Colors.red,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'عذراً، تم رفض الوصول!',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.black, color: Colors.white),
              ),
              const SizedBox(height: 12),
              const Text(
                'تتطلب لوحة تحكم بَدِل الإدارية صلاحيات مسؤول خادم نشطة ومطابقة شروط أمان الخصوصية. يقتصر الوصول على البريد الإلكتروني المعتمد والرتبة المطلوبة.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: const Column(
                  children: [
                    Text(
                      '• البريد الإلكتروني المطلوب: baddil.support@gmail.com',
                      style: TextStyle(fontFamily: 'monospace', color: Colors.white70, fontSize: 12),
                    ),
                    SizedBox(height: 8),
                    Text(
                      '• الرتبة المطلوبة: admin',
                      style: TextStyle(fontFamily: 'monospace', color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () async {
                  await FirebaseAuth.instance.signOut();
                },
                icon: const Icon(Icons.logout),
                label: const Text('تسجيل الخروج والعودة'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

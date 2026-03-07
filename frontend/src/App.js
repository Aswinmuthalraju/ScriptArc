import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import Starfield from "@/components/ui/Starfield";
import AmbientBackground from "@/components/ui/AmbientBackground";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/App.css";

const Landing = lazy(() => import("@/pages/Landing"));
const Auth = lazy(() => import("@/pages/Auth"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Courses = lazy(() => import("@/pages/Courses"));
const CourseSingle = lazy(() => import("@/pages/CourseSingle"));
const Learn = lazy(() => import("@/pages/Learn"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const MentorDashboard = lazy(() => import("@/pages/MentorDashboard"));
const MentorPending = lazy(() => import("@/pages/MentorPending"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const VerifyCertificate = lazy(() => import("@/pages/VerifyCertificate"));

// Protected Route — any authenticated user
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Public Route — redirect logged-in users to their home
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (user) {
    if (user.isAdmin) return <Navigate to="/admin" replace />;
    if (user.role === 'mentor') {
      return <Navigate to={user.mentorProfile?.status === 'approved' ? '/mentor' : '/mentor/pending'} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Mentor Route — approved mentors only
const MentorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'mentor') return <Navigate to="/dashboard" replace />;
  if (user.mentorProfile?.status !== 'approved') return <Navigate to="/mentor/pending" replace />;
  return children;
};

// Admin Route — ScriptArc.dev@gmail.com only
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

// Branded splash screen
const SplashScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <img
          src="/logo.jpeg"
          alt="ScriptArc"
          className="w-14 h-14 rounded-2xl shadow-glass"
          style={{ animation: 'float 2s ease-in-out infinite' }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(circle at center, rgba(37,99,235,0.3), transparent 70%)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{
              animation: `pulse-glow 1.2s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

// Layout with Navbar
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      {children}
    </>
  );
};

// Page wrapper with transition
const Page = ({ children }) => (
  <div className="page-transition relative z-10">{children}</div>
);

function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<PublicRoute><Page><Landing /></Page></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Page><Auth /></Page></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Page><Auth /></Page></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><AppLayout><Page><Dashboard /></Page></AppLayout></ProtectedRoute>
      } />
      <Route path="/courses" element={
        <ProtectedRoute><AppLayout><Page><Courses /></Page></AppLayout></ProtectedRoute>
      } />
      <Route path="/courses/:id" element={
        <ProtectedRoute><AppLayout><Page><CourseSingle /></Page></AppLayout></ProtectedRoute>
      } />
      <Route path="/learn/:lessonId" element={
        <ProtectedRoute><AppLayout><Page><Learn /></Page></AppLayout></ProtectedRoute>
      } />
      <Route path="/leaderboard" element={
        <ProtectedRoute><AppLayout><Page><Leaderboard /></Page></AppLayout></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><AppLayout><Page><Profile /></Page></AppLayout></ProtectedRoute>
      } />

      {/* Mentor routes */}
      <Route path="/mentor" element={
        <MentorRoute><AppLayout><Page><MentorDashboard /></Page></AppLayout></MentorRoute>
      } />
      <Route path="/mentor/pending" element={
        <ProtectedRoute><AppLayout><Page><MentorPending /></Page></AppLayout></ProtectedRoute>
      } />

      {/* Admin route */}
      <Route path="/admin" element={
        <AdminRoute><AppLayout><Page><AdminPage /></Page></AppLayout></AdminRoute>
      } />

      {/* Public certificate verification — no auth required */}
      <Route path="/verify/:certificateId" element={
        <Page><VerifyCertificate /></Page>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppInner() {
  return (
    <>
      {/* Background layers — z-0, behind all content */}
      <AmbientBackground />
      <Starfield />
      {/* Noise texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.035,
          mixBlendMode: 'overlay',
        }}
      />
      {/* App content — z-10 */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <ErrorBoundary>
          <Suspense fallback={<SplashScreen />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
            backdropFilter: 'blur(20px)',
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <div className="App bg-background min-h-screen">
        <BrowserRouter>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Code2, ArrowLeft, Loader2, GraduationCap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const isRegisterPage = location.pathname === '/register';
  const [activeTab, setActiveTab] = useState(isRegisterPage ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (registerData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(registerData.name, registerData.email, registerData.password, registerData.role);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (context) => {
    // If coming from register tab, show role picker first
    if (context === 'register') {
      setShowRolePicker(true);
      return;
    }

    // Direct sign in from login tab
    await initiateGoogleOAuth();
  };

  const handleRoleConfirm = async () => {
    setShowRolePicker(false);
    localStorage.setItem('pendingRole', selectedRole);
    await initiateGoogleOAuth();
  };

  const initiateGoogleOAuth = async () => {
    setGoogleLoading(true);
    try {
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        toast.error(error.message || 'Google sign-in failed');
        setGoogleLoading(false);
      }
    } catch (error) {
      toast.error('Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  const Divider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-surface px-3 text-muted-foreground">or continue with</span>
      </div>
    </div>
  );

  const GoogleButton = ({ context }) => (
    <Button
      type="button"
      variant="outline"
      onClick={() => handleGoogleSignIn(context)}
      disabled={googleLoading}
      className="w-full py-5 bg-surface-highlight border-border hover:bg-white/5 hover:border-white/20 text-foreground transition-all"
      data-testid={`google-${context}-btn`}
    >
      {googleLoading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <GoogleIcon />
      )}
      <span className="ml-2">
        {context === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
      </span>
    </Button>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      data-testid="auth-page"
    >
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors text-sm"
          data-testid="back-to-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2 text-2xl font-outfit font-bold mb-8">
          <div className="p-1 rounded-xl" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
            <img src="/logo.jpeg" alt="ScriptArc" className="w-9 h-9 rounded-lg object-contain" />
          </div>
          <span className="text-foreground">Script<span className="text-primary">Arc</span></span>
        </div>

        <Card className="card-glass">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-surface-highlight">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="login-tab"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="register-tab"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle className="text-foreground font-outfit">Welcome back</CardTitle>
                  <CardDescription className="text-text-secondary">
                    Enter your credentials to continue learning
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-text-secondary">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="input-dark"
                      data-testid="login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-text-secondary">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="input-dark"
                      data-testid="login-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full btn-primary py-5"
                    disabled={loading}
                    data-testid="login-submit"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Login'
                    )}
                  </Button>

                  <Divider />
                  <GoogleButton context="login" />
                </CardContent>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardHeader>
                  <CardTitle className="text-foreground font-outfit">Create account</CardTitle>
                  <CardDescription className="text-text-secondary">
                    Start your coding journey today
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-text-secondary">Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="John Doe"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="input-dark"
                      data-testid="register-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-text-secondary">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="input-dark"
                      data-testid="register-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-text-secondary">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="input-dark"
                      data-testid="register-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm" className="text-text-secondary">Confirm Password</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      className="input-dark"
                      data-testid="register-confirm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-text-secondary">I am a</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'student' })}
                        className={`p-3 rounded-md border text-sm font-medium transition-all flex items-center justify-center gap-2 ${registerData.role === 'student'
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-surface-highlight border-border text-text-secondary hover:border-white/20'
                          }`}
                        data-testid="role-student"
                      >
                        <GraduationCap className="w-4 h-4" />
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'mentor' })}
                        className={`p-3 rounded-md border text-sm font-medium transition-all flex items-center justify-center gap-2 ${registerData.role === 'mentor'
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-surface-highlight border-border text-text-secondary hover:border-white/20'
                          }`}
                        data-testid="role-mentor"
                      >
                        <Users className="w-4 h-4" />
                        Mentor
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full btn-primary py-5"
                    disabled={loading}
                    data-testid="register-submit"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Create Account'
                    )}
                  </Button>

                  <Divider />
                  <GoogleButton context="register" />
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Role Picker Modal — shown after clicking "Sign up with Google" on register tab */}
      {showRolePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4 bg-surface border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-foreground font-outfit text-xl">Choose your role</CardTitle>
              <CardDescription className="text-text-secondary">
                How will you use ScriptArc?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  className={`p-4 rounded-md border text-left transition-all ${selectedRole === 'student'
                    ? 'bg-primary/20 border-primary'
                    : 'bg-surface-highlight border-border hover:border-white/20'
                    }`}
                  data-testid="google-role-student"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${selectedRole === 'student' ? 'bg-primary/30' : 'bg-white/5'}`}>
                      <GraduationCap className={`w-5 h-5 ${selectedRole === 'student' ? 'text-primary' : 'text-text-secondary'}`} />
                    </div>
                    <div>
                      <div className={`font-medium ${selectedRole === 'student' ? 'text-primary' : 'text-foreground'}`}>Student</div>
                      <div className="text-xs text-muted-foreground">Learn, solve challenges, earn stars</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('mentor')}
                  className={`p-4 rounded-md border text-left transition-all ${selectedRole === 'mentor'
                    ? 'bg-primary/20 border-primary'
                    : 'bg-surface-highlight border-border hover:border-white/20'
                    }`}
                  data-testid="google-role-mentor"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${selectedRole === 'mentor' ? 'bg-primary/30' : 'bg-white/5'}`}>
                      <Users className={`w-5 h-5 ${selectedRole === 'mentor' ? 'text-primary' : 'text-text-secondary'}`} />
                    </div>
                    <div>
                      <div className={`font-medium ${selectedRole === 'mentor' ? 'text-primary' : 'text-foreground'}`}>Mentor</div>
                      <div className="text-xs text-muted-foreground">Create courses, track students</div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRolePicker(false)}
                  className="flex-1 border-border text-text-secondary hover:text-foreground"
                  data-testid="google-role-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRoleConfirm}
                  className="flex-1 btn-primary"
                  disabled={googleLoading}
                  data-testid="google-role-confirm"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <GoogleIcon />
                      <span className="ml-2">Continue</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Auth;

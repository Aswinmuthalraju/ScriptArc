import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import GridPattern from '@/components/ui/GridPattern';
import {
  Play, Trophy, Users, Star, CheckCircle, ArrowRight,
  Zap, Award, Flame, Sun, Moon, Code2, Terminal,
} from 'lucide-react';

// ─── Static code lines for the editor preview ────────────────────────────────
const CODE_LINES = [
  { num: 1, tokens: [{ t: 'def ', c: '#C084FC' }, { t: 'fibonacci', c: '#60A5FA' }, { t: '(n):', c: '#CBD5E1' }] },
  { num: 2, tokens: [{ t: '    if ', c: '#C084FC' }, { t: 'n <= 1', c: '#CBD5E1' }, { t: ':', c: '#CBD5E1' }] },
  { num: 3, tokens: [{ t: '        return ', c: '#C084FC' }, { t: 'n', c: '#FB923C' }] },
  { num: 4, tokens: [{ t: '    return ', c: '#C084FC' }, { t: 'fibonacci', c: '#60A5FA' }, { t: '(n-1) + fibonacci(n-2)', c: '#CBD5E1' }] },
  { num: 5, tokens: [] },
  { num: 6, tokens: [{ t: '# ✅ Checkpoint: call fibonacci(10)', c: '#4B5563' }] },
  { num: 7, tokens: [{ t: 'print', c: '#60A5FA' }, { t: '(fibonacci(', c: '#CBD5E1' }, { t: '10', c: '#4ADE80' }, { t: '))', c: '#CBD5E1' }] },
];

// ─── Animated code editor component ──────────────────────────────────────────
const CodeEditorPreview = () => {
  const [visible, setVisible] = useState(0);
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    const run = () => {
      setVisible(0);
      setShowOutput(false);
      let i = 0;
      const lineId = setInterval(() => {
        i++;
        setVisible(i);
        if (i >= CODE_LINES.length) {
          clearInterval(lineId);
          setTimeout(() => setShowOutput(true), 600);
        }
      }, 380);
      return lineId;
    };

    let lineId = run();
    const loopId = setInterval(() => {
      clearInterval(lineId);
      lineId = run();
    }, 8000);

    return () => { clearInterval(lineId); clearInterval(loopId); };
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      style={{ background: '#0D1117', fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
        style={{ background: '#161B22' }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28CA41' }} />
        </div>
        <span className="flex-1 text-center text-xs" style={{ color: '#4B5563' }}>fibonacci.py</span>
        <div
          className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md"
          style={{ background: 'rgba(37,99,235,0.2)', color: '#60A5FA' }}
        >
          <Terminal style={{ width: 11, height: 11 }} />
          <span>ScriptArc IDE</span>
        </div>
      </div>

      {/* Code area */}
      <div style={{ padding: '12px 0', minHeight: 196, background: '#0D1117' }}>
        {CODE_LINES.map((line, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 16,
              padding: '1px 16px',
              fontSize: 13,
              lineHeight: '24px',
              opacity: i < visible ? 1 : 0,
              transform: i < visible ? 'translateX(0)' : 'translateX(-6px)',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          >
            <span style={{ color: '#30363D', width: 16, textAlign: 'right', flexShrink: 0, userSelect: 'none' }}>
              {line.num}
            </span>
            <span>
              {line.tokens.map((tok, j) => (
                <span key={j} style={{ color: tok.c }}>{tok.t}</span>
              ))}
              {i === visible - 1 && line.tokens.length > 0 && (
                <span style={{ color: '#60A5FA', animation: 'blink 1s step-end infinite' }}>▋</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Output panel */}
      <div
        className="border-t border-white/5 px-4 py-3"
        style={{
          background: '#010409',
          opacity: showOutput ? 1 : 0,
          transform: showOutput ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: '#4B5563' }}>Output:</span>
            <span style={{ color: '#4ADE80', fontWeight: 600, fontSize: 14 }}>55</span>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} style={{ width: 12, height: 12, color: '#FBBF24', fill: '#FBBF24' }} />
            ))}
            <span style={{ color: '#FBBF24', fontSize: 11, marginLeft: 5, fontWeight: 600 }}>+2 pts</span>
          </div>
        </div>
        <div style={{ color: '#10B981', fontSize: 12, marginTop: 4 }}>✓ All 3 test cases passed · 12ms</div>
      </div>
    </div>
  );
};

// ─── Landing page ─────────────────────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const features = [
    { icon: Play, title: 'Learn by Doing', description: 'Video lessons pause at key moments for hands-on coding challenges' },
    { icon: Zap, title: 'Real-time Evaluation', description: 'Code is compiled and tested instantly with Judge0' },
    { icon: Zap, title: 'Point-Based Scoring', description: 'Earn points per challenge, convert to stars on course completion' },
    { icon: Trophy, title: 'Compete & Climb', description: 'Optional leaderboards to compete with peers' },
    { icon: Users, title: 'Mentor Tracking', description: 'Teachers monitor progress and provide guidance' },
    { icon: Award, title: 'Skill Certificates', description: 'Performance-based certificates that prove mastery' },
  ];

  const howItWorks = [
    { step: '01', title: 'Watch & Learn', desc: 'Engaging video lessons explain concepts clearly', icon: Play },
    { step: '02', title: 'Stop & Solve', desc: 'Videos pause automatically for coding challenges', icon: Code2 },
    { step: '03', title: 'Earn Points', desc: 'Solve challenges to earn points and complete courses for stars', icon: Zap },
  ];

  const comparisons = [
    { traditional: 'Watch and forget', scriptarc: 'Learn and solve immediately' },
    { traditional: 'Completion certificate', scriptarc: 'Point + star skill rating' },
    { traditional: 'No accountability', scriptarc: 'Mentor dashboard tracking' },
    { traditional: 'Solo learning', scriptarc: 'Peer competition & gamification' },
  ];

  const testimonials = [
    {
      quote: 'ScriptArc made learning algorithms actually fun. The checkpoint challenges keep me focused instead of passively watching.',
      name: 'Priya S.', role: 'CS Student', stars: 5,
    },
    {
      quote: 'Finally a platform where you prove skills, not just watch videos. The star system is genuinely addictive.',
      name: 'Marcus K.', role: 'Self-taught Developer', stars: 5,
    },
    {
      quote: 'My students love the gamification. I can see exactly where each one gets stuck and step in early.',
      name: 'Dr. Anita R.', role: 'CS Professor', stars: 5,
    },
  ];

  const leaderboard = [
    { rank: 1, name: 'Alex T.', stars: 284, badge: '🏆' },
    { rank: 2, name: 'Sofia R.', stars: 271, badge: '🥈' },
    { rank: 3, name: 'Jin L.', stars: 255, badge: '🥉' },
    { rank: 4, name: 'You', stars: 142, isYou: true },
  ];

  return (
    <div className="min-h-screen">

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 w-full z-50 border-b border-border/40"
        style={{ background: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-2.5 font-outfit font-bold text-xl">
              <div className="p-1 rounded-xl overflow-hidden" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                <img src="/logo.jpeg" alt="ScriptArc" className="w-7 h-7 rounded-lg object-contain" />
              </div>
              <span className="text-foreground">Script<span className="text-primary">Arc</span></span>
            </div>

            {/* Center nav links */}
            <div className="hidden md:flex items-center gap-1">
              {[
                { label: 'Features', id: 'features' },
                { label: 'How It Works', id: 'how-it-works' },
                { label: 'Leaderboard', id: 'gamification' },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                aria-label="Toggle theme"
                data-testid="landing-theme-toggle"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-muted-foreground hover:text-foreground text-sm px-4"
                data-testid="landing-login-btn"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="btn-primary px-4 py-2 text-sm"
                data-testid="landing-get-started-btn"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        id="hero"
        className="min-h-screen flex items-center justify-center px-4 pt-16 relative overflow-hidden"
        data-testid="hero-section"
      >
        {/* Radial glow behind hero text */}
        <div className="hero-glow" aria-hidden="true" />

        <div className="max-w-7xl mx-auto w-full py-16">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left: Text content */}
            <div className="text-center md:text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 mb-8 text-sm"
                style={{ background: 'hsl(var(--muted) / 0.5)' }}
              >
                <Flame className="w-3.5 h-3.5 text-warning" />
                <span className="text-muted-foreground">Gamified coding education</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-outfit font-bold text-foreground mb-6 tracking-tight leading-[1.05]">
                Stop. Solve.{' '}
                <span className="gradient-text succeed-glow">Succeed.</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-lg mx-auto md:mx-0 mb-10 leading-relaxed">
                Transform passive video learning into active coding mastery.
                Challenges at every checkpoint, points for every solution.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 mb-10">
                <Button
                  onClick={() => navigate('/register')}
                  className="btn-primary px-8 py-3 text-base h-12 flex items-center gap-2 w-full sm:w-auto"
                  data-testid="hero-cta-btn"
                >
                  Start Learning Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/courses')}
                  className="btn-secondary px-8 py-3 text-base h-12 w-full sm:w-auto"
                  data-testid="explore-courses-btn"
                >
                  Explore Courses
                </Button>
              </div>

              {/* Social proof bullets */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 text-sm text-muted-foreground">
                {[
                  { label: '50+ Languages', icon: Code2 },
                  { label: 'Real-time Execution', icon: Zap },
                  { label: 'Mentor Support', icon: Users },
                ].map(({ label }) => (
                  <div key={label} className="flex items-center gap-1.5 group">
                    <CheckCircle className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Code editor */}
            <div className="hidden md:block">
              <CodeEditorPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        className="py-10 px-4 border-y border-border/30"
        style={{ background: 'hsl(var(--muted) / 0.25)' }}
        data-testid="stats-section"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: '10K+', label: 'Active Learners', icon: Users },
              { num: '500+', label: 'Coding Challenges', icon: Zap },
              { num: '50+', label: 'Languages', icon: Code2 },
              { num: '4.9 ★', label: 'Average Rating', icon: Star },
            ].map(({ num, label, icon: Icon }) => (
              <div key={label} className="text-center group">
                <div className="text-3xl md:text-4xl font-outfit font-bold mb-1.5 gradient-text">
                  {num}
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-4" data-testid="how-it-works-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold text-foreground mb-4">
              How ScriptArc Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A proven method that turns watching into mastering
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => (
              <div key={i} className="relative card-glass p-8 overflow-hidden text-center group" data-testid={`how-step-${i + 1}`}>
                <GridPattern />
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'hsl(var(--primary) / 0.12)' }}
                >
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div
                  className="text-5xl font-outfit font-bold mb-4"
                  style={{ color: 'hsl(var(--primary) / 0.18)' }}
                >
                  {item.step}
                </div>
                <h3 className="text-base font-outfit font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        className="py-24 px-4"
        style={{ background: 'hsl(var(--muted) / 0.3)' }}
        data-testid="features-section"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold text-foreground mb-4">
              Everything You Need to Master Code
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built for serious learners who want measurable results
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="relative card-glass p-6 overflow-hidden group" data-testid={`feature-${i}`}>
                <GridPattern />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'hsl(var(--primary) / 0.12)' }}
                >
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-outfit font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gamification ── */}
      <section id="gamification" className="py-24 px-4" data-testid="gamification-section">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left: Text */}
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Gamification</p>
              <h2 className="text-3xl md:text-4xl font-outfit font-semibold text-foreground mb-5">
                Learning That Feels Like a Game
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Earn points on every challenge. Complete courses for stars. Unlock skill certificates.
                ScriptArc makes progress visible, measurable, and addictive.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Zap, title: 'Point-Based Rewards', desc: 'Earn 2 points per challenge, convert to 1–5 stars on completion', color: 'text-primary' },
                  { icon: Trophy, title: 'Live Leaderboard', desc: 'Compete with peers and track your rank in real-time', color: 'text-primary' },
                  { icon: Award, title: 'Skill Certificates', desc: 'Performance-based certificates that prove mastery', color: 'text-accent' },
                ].map(({ icon: Icon, title, desc, color }) => (
                  <div key={title} className="flex items-start gap-4 group">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                      style={{ background: 'hsl(var(--primary) / 0.10)' }}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm mb-0.5">{title}</div>
                      <div className="text-muted-foreground text-sm">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Leaderboard preview card */}
            <div className="relative card-glass p-6 overflow-hidden">
              <GridPattern />
              <div className="flex items-center justify-between mb-5">
                <div className="font-outfit font-semibold text-foreground">Live Leaderboard</div>
                <div className="flex items-center gap-1.5 text-xs text-accent">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span>Live</span>
                </div>
              </div>
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${entry.isYou ? 'ring-1 ring-primary/30' : 'hover:bg-muted/40'
                      }`}
                    style={entry.isYou ? { background: 'hsl(var(--primary) / 0.08)' } : {}}
                  >
                    <span className="text-base w-6 text-center shrink-0">
                      {entry.badge || `#${entry.rank}`}
                    </span>
                    <span className={`flex-1 text-sm font-medium ${entry.isYou ? 'text-primary' : 'text-foreground'}`}>
                      {entry.isYou ? '⭐ You' : entry.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                      <span className="text-sm font-semibold text-foreground">{entry.stars}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-border/40 text-center">
                <p className="text-xs text-muted-foreground">Solve more challenges to climb the ranks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section
        className="py-24 px-4"
        style={{ background: 'hsl(var(--muted) / 0.3)' }}
        data-testid="comparison-section"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Comparison</p>
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold text-foreground mb-4">
              Why ScriptArc is Different
            </h2>
            <p className="text-muted-foreground">Not just another course platform</p>
          </div>

          <div className="relative card-glass overflow-hidden">
            <GridPattern />
            <div
              className="grid grid-cols-2 border-b border-border/60"
              style={{ background: 'hsl(var(--muted) / 0.5)' }}
            >
              <div className="p-4 text-center text-sm text-muted-foreground font-medium border-r border-border/60">
                Traditional Platforms
              </div>
              <div className="p-4 text-center text-sm text-primary font-semibold">ScriptArc</div>
            </div>
            {comparisons.map((item, i) => (
              <div key={i} className="grid grid-cols-2 border-t border-border/40 hover:bg-muted/20 transition-colors">
                <div className="p-4 text-sm text-muted-foreground border-r border-border/40">{item.traditional}</div>
                <div className="p-4 text-sm text-foreground flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  {item.scriptarc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-4" data-testid="testimonials-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold text-foreground mb-4">
              Loved by Learners
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Join thousands who transformed their coding skills with ScriptArc
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="relative card-glass p-6 overflow-hidden flex flex-col gap-4" data-testid={`testimonial-${i}`}>
                <GridPattern />
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-24 px-4"
        style={{ background: 'hsl(var(--muted) / 0.3)' }}
        data-testid="cta-section"
      >
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="relative card-glass p-12 overflow-hidden"
            style={{ background: 'hsl(var(--primary) / 0.05)', borderColor: 'hsl(var(--primary) / 0.2)' }}
          >
            <GridPattern />
            {/* Subtle top glow inside card */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.12), transparent 70%)' }}
            />
            <h2 className="relative text-3xl md:text-4xl font-outfit font-semibold text-foreground mb-4">
              Ready to Level Up?
            </h2>
            <p className="relative text-muted-foreground mb-8 leading-relaxed">
              Join thousands of learners who prove their skills through action, not just completion.
            </p>
            <Button
              onClick={() => navigate('/register')}
              className="relative btn-primary px-10 py-3 text-base h-12"
              data-testid="final-cta-btn"
            >
              Get Started for Free
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-4 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-outfit font-bold text-lg">
            <img src="/logo.jpeg" alt="ScriptArc" className="w-6 h-6 rounded-lg object-contain" />
            <span className="text-foreground">Script<span className="text-primary">Arc</span></span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2025 ScriptArc. Learn. Solve. Succeed.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

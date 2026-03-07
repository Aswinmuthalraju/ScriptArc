import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Users, LayoutDashboard, MessageSquare, Zap, BarChart2,
  FileDown, Loader2, Search, CheckCircle, XCircle, AlertTriangle,
  Target, TrendingUp, TrendingDown, Lightbulb, RotateCcw,
  AlertOctagon, ClipboardList, Send, User,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── constants ─────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',      label: 'Overview',      icon: LayoutDashboard },
  { id: 'students',      label: 'Students',       icon: Users },
  { id: 'analytics',     label: 'Analytics',      icon: BarChart2 },
  { id: 'messages',      label: 'Messages',       icon: MessageSquare },
  { id: 'interventions', label: 'Interventions',  icon: Zap },
  { id: 'reports',       label: 'Reports',        icon: FileDown },
];

const ACTION_TYPES = [
  { value: 'hint_unlock',       label: 'Unlock Hint',        icon: Lightbulb },
  { value: 'retry_allow',       label: 'Allow Retry',        icon: RotateCcw },
  { value: 'warning',           label: 'Issue Warning',      icon: AlertOctagon },
  { value: 'revision_assigned', label: 'Assign Revision',    icon: ClipboardList },
];

const MSG_TYPES = [
  { value: 'feedback',       label: 'Feedback' },
  { value: 'clarification',  label: 'Clarification' },
  { value: 'revision',       label: 'Revision' },
  { value: 'motivation',     label: 'Motivation' },
  { value: 'warning',        label: 'Warning' },
];

// ── helpers ───────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString() : '—';

// Classify student: top = success ≥ 70% AND hint rate ≤ 30%; struggling = otherwise with ≥ 3 submissions
const classify = (student) => {
  const { total, passed, hinted } = student.submissionStats || {};
  if (!total || total < 3) return 'new';
  const successRate = passed / total;
  const hintRate    = hinted / total;
  if (successRate >= 0.7 && hintRate <= 0.3) return 'top';
  if (successRate < 0.5 || hintRate > 0.5)   return 'struggling';
  return 'average';
};

const ClassBadge = ({ cat }) => {
  if (cat === 'top')        return <Badge className="text-xs bg-accent/20 text-accent border-accent/40">Top Performer</Badge>;
  if (cat === 'struggling') return <Badge className="text-xs bg-destructive/20 text-destructive border-destructive/40">Needs Help</Badge>;
  if (cat === 'new')        return <Badge className="text-xs bg-primary/20 text-primary border-primary/40">New</Badge>;
  return <Badge className="text-xs bg-surface-highlight text-text-secondary border-border">Average</Badge>;
};

// ── main component ────────────────────────────────────────────
const MentorDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Data
  const [students, setStudents] = useState([]);       // enriched list
  const [messages, setMessages] = useState([]);
  const [interventions, setInterventions] = useState([]);

  // UI
  const [searchTerm, setSearchTerm]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail]     = useState(null);
  const [detailLoading, setDetailLoading]     = useState(false);

  // Message form
  const [msgForm, setMsgForm] = useState({ student_id: '', subject: '', message: '', message_type: 'feedback' });
  const [msgLoading, setMsgLoading] = useState(false);

  // Intervention form
  const [intForm, setIntForm] = useState({ student_id: '', action_type: 'hint_unlock', description: '' });
  const [intLoading, setIntLoading] = useState(false);

  // ── fetch students ──────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Get assignment rows
      const { data: assignments } = await supabase
        .from('mentor_students')
        .select('id, student_id, course_id, assigned_at')
        .eq('mentor_id', user.id);

      if (!assignments?.length) { setStudents([]); setLoading(false); return; }

      const studentIds = [...new Set(assignments.map(a => a.student_id))];

      // 2. Get user profiles
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name, email, total_stars, level, created_at')
        .in('id', studentIds);

      // 3. Get progress
      const { data: progress } = await supabase
        .from('user_progress')
        .select('user_id, completed, stars_earned, completed_challenge_ids')
        .in('user_id', studentIds);

      // 4. Get submissions (for success/hint stats) — capped at 500 per mentor's cohort
      const { data: subs } = await supabase
        .from('submissions')
        .select('user_id, stars_awarded, hint_used, solution_viewed, created_at')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(500);

      // 5. Merge
      const profileMap  = {};
      (profiles  || []).forEach(p => { profileMap[p.id]  = p; });
      const progressMap = {};
      (progress  || []).forEach(p => {
        if (!progressMap[p.user_id]) progressMap[p.user_id] = [];
        progressMap[p.user_id].push(p);
      });
      const subsMap = {};
      (subs || []).forEach(s => {
        if (!subsMap[s.user_id]) subsMap[s.user_id] = [];
        subsMap[s.user_id].push(s);
      });

      const enriched = studentIds.map(sid => {
        const p    = profileMap[sid] || {};
        const prog = progressMap[sid] || [];
        const ss   = subsMap[sid] || [];

        const completedLessons = prog.filter(p => p.completed).length;
        const totalChallenges  = prog.reduce((acc, p) => acc + (p.completed_challenge_ids?.length || 0), 0);

        const passed  = ss.filter(s => s.stars_awarded > 0).length;
        const hinted  = ss.filter(s => s.hint_used).length;
        const solutionViewed = ss.filter(s => s.solution_viewed).length;

        const lastActivity = ss.length
          ? ss.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at
          : null;

        return {
          ...p,
          assignment: assignments.find(a => a.student_id === sid),
          completedLessons,
          totalChallenges,
          submissionStats: { total: ss.length, passed, hinted, solutionViewed },
          lastActivity,
        };
      });

      setStudents(enriched);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── fetch student detail ────────────────────────────────────
  const fetchStudentDetail = useCallback(async (studentId) => {
    setDetailLoading(true);
    try {
      const [progRes, subsRes, msgsRes] = await Promise.all([
        supabase.from('user_progress')
          .select('*, lessons(title, order_index, duration_minutes)')
          .eq('user_id', studentId)
          .order('lessons(order_index)', { ascending: true }),
        supabase.from('submissions')
          .select('id, stars_awarded, hint_used, solution_viewed, created_at, challenges(title, challenge_type)')
          .eq('user_id', studentId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('mentor_messages')
          .select('*')
          .eq('mentor_id', user.id)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
      ]);
      setStudentDetail({
        progress:  progRes.data  || [],
        subs:      subsRes.data  || [],
        messages:  msgsRes.data  || [],
      });
    } finally {
      setDetailLoading(false);
    }
  }, [user?.id]);

  // ── fetch messages ──────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('mentor_messages')
        .select('id, student_id, subject, message, message_type, read, created_at')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      const studentIds = [...new Set((data || []).map(m => m.student_id))];
      let nameMap = {};
      if (studentIds.length) {
        const { data: users } = await supabase
          .from('users').select('id, name').in('id', studentIds);
        (users || []).forEach(u => { nameMap[u.id] = u.name; });
      }
      setMessages((data || []).map(m => ({ ...m, studentName: nameMap[m.student_id] || 'Unknown' })));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── fetch interventions ─────────────────────────────────────
  const fetchInterventions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('mentor_interventions')
        .select('id, student_id, action_type, description, created_at')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      const studentIds = [...new Set((data || []).map(i => i.student_id))];
      let nameMap = {};
      if (studentIds.length) {
        const { data: users } = await supabase
          .from('users').select('id, name').in('id', studentIds);
        (users || []).forEach(u => { nameMap[u.id] = u.name; });
      }
      setInterventions((data || []).map(i => ({ ...i, studentName: nameMap[i.student_id] || 'Unknown' })));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── trigger fetches on section change ──────────────────────
  useEffect(() => {
    if (section === 'overview' || section === 'students' || section === 'analytics' || section === 'reports') {
      fetchStudents();
    }
    if (section === 'messages') { fetchStudents(); fetchMessages(); }
    if (section === 'interventions') { fetchStudents(); fetchInterventions(); }
  }, [section]); // eslint-disable-line

  // ── send message ────────────────────────────────────────────
  const sendMessage = async () => {
    if (!msgForm.student_id || !msgForm.message.trim()) {
      toast.error('Select a student and enter a message');
      return;
    }
    setMsgLoading(true);
    try {
      const { error } = await supabase.from('mentor_messages').insert({
        mentor_id:    user.id,
        student_id:   msgForm.student_id,
        subject:      msgForm.subject.trim() || null,
        message:      msgForm.message.trim(),
        message_type: msgForm.message_type,
      });
      if (error) throw error;
      toast.success('Message sent!');
      setMsgForm({ student_id: '', subject: '', message: '', message_type: 'feedback' });
      fetchMessages();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setMsgLoading(false);
    }
  };

  // ── log intervention ────────────────────────────────────────
  const logIntervention = async () => {
    if (!intForm.student_id) {
      toast.error('Select a student');
      return;
    }
    setIntLoading(true);
    try {
      const { error } = await supabase.from('mentor_interventions').insert({
        mentor_id:   user.id,
        student_id:  intForm.student_id,
        action_type: intForm.action_type,
        description: intForm.description.trim() || null,
      });
      if (error) throw error;
      toast.success('Intervention logged.');
      setIntForm({ student_id: '', action_type: 'hint_unlock', description: '' });
      fetchInterventions();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIntLoading(false);
    }
  };

  // ── CSV report download ─────────────────────────────────────
  const downloadReport = () => {
    const headers = ['Name','Email','Total Points','Level','Completed Lessons','Challenges Done','Submissions','Pass Rate','Hint Rate'];
    const rows = students.map(s => {
      const ss   = s.submissionStats;
      const pass = ss.total ? Math.round((ss.passed / ss.total) * 100) : 0;
      const hint = ss.total ? Math.round((ss.hinted / ss.total) * 100) : 0;
      return [s.name, s.email, s.total_stars, s.level, s.completedLessons, s.totalChallenges, ss.total, `${pass}%`, `${hint}%`];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `mentor_report_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded.');
  };

  // ── derived data — memoized so they don't recompute on every render ─
  const analyticsData = useMemo(() => students.map(s => ({
    name: s.name?.split(' ')[0] || 'S',
    successRate: s.submissionStats.total
      ? Math.round((s.submissionStats.passed / s.submissionStats.total) * 100)
      : 0,
    category: classify(s),
  })), [students]);

  const filtered = useMemo(() => students.filter(s =>
    (s.name + (s.email || '')).toLowerCase().includes(searchTerm.toLowerCase())
  ), [students, searchTerm]);

  const topCount        = useMemo(() => students.filter(s => classify(s) === 'top').length, [students]);
  const strugglingCount = useMemo(() => students.filter(s => classify(s) === 'struggling').length, [students]);

  // ── overview stats ──────────────────────────────────────────
  const avgSuccess = students.length
    ? Math.round(students.reduce((acc, s) => {
        const ss = s.submissionStats;
        return acc + (ss.total ? ss.passed / ss.total : 0);
      }, 0) / students.length * 100)
    : 0;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-16" data-testid="mentor-dashboard">
      <div className="flex min-h-[calc(100vh-4rem)]">

        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-56 bg-surface border-r border-border p-4 gap-1 shrink-0">
          <div className="mb-4 px-2">
            <div className="flex items-center gap-2 mb-0.5">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-outfit font-semibold text-foreground">Mentor Portal</span>
            </div>
            <p className="text-xs text-primary font-mono">{user?.mentorProfile?.mentor_code || '...'}</p>
          </div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setSearchTerm(''); setSelectedStudent(null); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all text-left ${
                section === s.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:text-foreground hover:bg-surface-highlight'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </aside>

        {/* ── Mobile tab bar ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex overflow-x-auto">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setSearchTerm(''); setSelectedStudent(null); }}
              className={`flex-none flex flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors ${
                section === s.id ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* ── Main ── */}
        <main className="flex-1 p-6 pb-24 lg:pb-6 overflow-y-auto">

          {/* ════ OVERVIEW ════ */}
          {section === 'overview' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-outfit font-bold text-foreground">
                  Welcome, {user?.name?.split(' ')[0]}
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                  Mentor ID: <span className="text-primary font-mono">{user?.mentorProfile?.mentor_code}</span>
                  {user?.mentorProfile?.expertise && (
                    <> · <span>{user.mentorProfile.expertise}</span></>
                  )}
                </p>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Total Students',   value: students.length,   icon: Users,         color: 'text-primary' },
                      { label: 'Top Performers',   value: topCount,          icon: TrendingUp,    color: 'text-accent' },
                      { label: 'Needs Help',        value: strugglingCount,   icon: TrendingDown,  color: 'text-warning' },
                      { label: 'Avg Success Rate',  value: `${avgSuccess}%`, icon: Target,        color: 'text-secondary' },
                    ].map(item => (
                      <Card key={item.label} className="card-glass">
                        <CardContent className="pt-5 pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-text-secondary font-medium">{item.label}</span>
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <p className={`text-3xl font-outfit font-bold ${item.color}`}>{item.value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Recent students */}
                  <Card className="card-glass">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-outfit text-foreground">Recent Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {students.length === 0 ? (
                        <p className="text-text-secondary text-sm py-4 text-center">No students assigned yet</p>
                      ) : (
                        <div className="space-y-3">
                          {students.slice(0, 5).map(s => {
                            const cat = classify(s);
                            const ss  = s.submissionStats;
                            const sr  = ss.total ? Math.round(ss.passed / ss.total * 100) : 0;
                            return (
                              <div key={s.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                  {s.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                                    <ClassBadge cat={cat} />
                                  </div>
                                  <p className="text-xs text-text-secondary">{sr}% success · {s.totalChallenges} challenges done</p>
                                </div>
                                <span className="text-sm font-mono text-primary shrink-0">{s.total_stars} pts</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ════ STUDENTS ════ */}
          {section === 'students' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-outfit font-bold text-foreground">
                  Students <span className="text-lg text-text-secondary font-normal">({students.length})</span>
                </h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 input-dark w-56"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{students.length === 0 ? 'No students assigned yet' : 'No results'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(s => {
                    const cat = classify(s);
                    const ss  = s.submissionStats;
                    const sr  = ss.total ? Math.round(ss.passed / ss.total * 100) : 0;
                    return (
                      <Card
                        key={s.id}
                        className="card-glass cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => {
                          setSelectedStudent(s);
                          fetchStudentDetail(s.id);
                        }}
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                              {s.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-foreground">{s.name}</span>
                                <ClassBadge cat={cat} />
                              </div>
                              <p className="text-xs text-text-secondary mb-2">{s.email}</p>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-text-secondary">Success</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Progress value={sr} className="h-1 flex-1" />
                                    <span className="text-foreground font-mono w-8 text-right">{sr}%</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-text-secondary">Points</span>
                                  <p className="text-primary font-mono font-bold mt-0.5">{s.total_stars}</p>
                                </div>
                                <div>
                                  <span className="text-text-secondary">Hints Used</span>
                                  <p className="text-warning font-mono mt-0.5">{ss.hinted}/{ss.total}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-xs text-text-secondary shrink-0">
                              <p>Lv {s.level}</p>
                              <p className="mt-1">{s.completedLessons} lessons</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════ ANALYTICS ════ */}
          {section === 'analytics' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-6">Analytics</h1>
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : students.length === 0 ? (
                <p className="text-center text-text-secondary py-16">No student data available</p>
              ) : (
                <div className="space-y-6">
                  {/* Classification summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Top Performers',   count: topCount,                                  color: 'text-accent',      bg: 'bg-accent/10',      icon: TrendingUp },
                      { label: 'Average',           count: students.length - topCount - strugglingCount, color: 'text-text-secondary', bg: 'bg-surface',  icon: Target },
                      { label: 'Struggling',        count: strugglingCount,                           color: 'text-warning',     bg: 'bg-warning/10',     icon: TrendingDown },
                    ].map(item => (
                      <Card key={item.label} className={`card-glass ${item.bg}`}>
                        <CardContent className="pt-4 pb-4 text-center">
                          <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
                          <p className={`text-2xl font-bold font-outfit ${item.color}`}>{item.count}</p>
                          <p className="text-xs text-text-secondary mt-1">{item.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Success rate chart */}
                  <Card className="card-glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-outfit text-foreground">Student Success Rates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analyticsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }}
                            formatter={(val) => [`${val}%`, 'Success Rate']}
                          />
                          <Bar dataKey="successRate" radius={[3, 3, 0, 0]}>
                            {analyticsData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.category === 'top' ? 'hsl(var(--accent))' : entry.category === 'struggling' ? 'hsl(var(--warning))' : 'hsl(var(--primary))'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Struggling students list */}
                  {strugglingCount > 0 && (
                    <Card className="card-glass border-warning/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-outfit text-warning flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Students Needing Attention
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {students.filter(s => classify(s) === 'struggling').map(s => {
                            const ss = s.submissionStats;
                            const sr = ss.total ? Math.round(ss.passed / ss.total * 100) : 0;
                            return (
                              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                                  <p className="text-xs text-text-secondary">{sr}% success · {ss.hinted} hints used</p>
                                </div>
                                <span className="text-xs text-text-secondary">{fmtDate(s.lastActivity)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════ MESSAGES ════ */}
          {section === 'messages' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-6">Messages</h1>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Compose */}
                <Card className="card-glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-outfit text-foreground flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" />
                      Send Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">To Student</Label>
                      <select
                        value={msgForm.student_id}
                        onChange={(e) => setMsgForm({ ...msgForm, student_id: e.target.value })}
                        className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">-- Select student --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Type</Label>
                      <select
                        value={msgForm.message_type}
                        onChange={(e) => setMsgForm({ ...msgForm, message_type: e.target.value })}
                        className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
                      >
                        {MSG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Subject (optional)</Label>
                      <Input
                        placeholder="e.g. Feedback on Module 3"
                        value={msgForm.subject}
                        onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
                        className="input-dark"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Message *</Label>
                      <Textarea
                        placeholder="Write your message..."
                        value={msgForm.message}
                        onChange={(e) => setMsgForm({ ...msgForm, message: e.target.value })}
                        className="input-dark resize-none"
                        rows={4}
                      />
                    </div>
                    <Button onClick={sendMessage} disabled={msgLoading} className="btn-primary w-full">
                      {msgLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Send Message
                    </Button>
                  </CardContent>
                </Card>

                {/* History */}
                <Card className="card-glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-outfit text-foreground">Sent Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                    ) : messages.length === 0 ? (
                      <p className="text-text-secondary text-sm py-6 text-center">No messages sent yet</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {messages.map(m => (
                          <div key={m.id} className="p-3 bg-surface-highlight rounded-md border border-border/40">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-text-secondary" />
                                <span className="text-sm font-medium text-foreground">{m.studentName}</span>
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary capitalize">
                                  {m.message_type}
                                </Badge>
                              </div>
                              <span className="text-xs text-text-secondary">{fmtDate(m.created_at)}</span>
                            </div>
                            {m.subject && <p className="text-xs font-medium text-text-secondary mb-1">{m.subject}</p>}
                            <p className="text-sm text-foreground line-clamp-2">{m.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ════ INTERVENTIONS ════ */}
          {section === 'interventions' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-6">Interventions</h1>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Log form */}
                <Card className="card-glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-outfit text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Log Intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Student</Label>
                      <select
                        value={intForm.student_id}
                        onChange={(e) => setIntForm({ ...intForm, student_id: e.target.value })}
                        className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">-- Select student --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Action Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {ACTION_TYPES.map(a => (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => setIntForm({ ...intForm, action_type: a.value })}
                            className={`flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-all ${
                              intForm.action_type === a.value
                                ? 'bg-primary/20 border-primary text-primary'
                                : 'bg-surface-highlight border-border text-text-secondary hover:border-white/20'
                            }`}
                          >
                            <a.icon className="w-3.5 h-3.5" />
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Notes (optional)</Label>
                      <Textarea
                        placeholder="Describe the reason..."
                        value={intForm.description}
                        onChange={(e) => setIntForm({ ...intForm, description: e.target.value })}
                        className="input-dark resize-none"
                        rows={3}
                      />
                    </div>
                    <Button onClick={logIntervention} disabled={intLoading} className="btn-primary w-full">
                      {intLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                      Log Intervention
                    </Button>
                  </CardContent>
                </Card>

                {/* Audit log */}
                <Card className="card-glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-outfit text-foreground">Intervention Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                    ) : interventions.length === 0 ? (
                      <p className="text-text-secondary text-sm py-6 text-center">No interventions logged</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {interventions.map(i => {
                          const action = ACTION_TYPES.find(a => a.value === i.action_type);
                          return (
                            <div key={i.id} className="p-3 bg-surface-highlight rounded-md border border-border/40">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {action && <action.icon className="w-3.5 h-3.5 text-primary" />}
                                  <span className="text-sm font-medium text-foreground">{i.studentName}</span>
                                </div>
                                <span className="text-xs text-text-secondary">{fmtDate(i.created_at)}</span>
                              </div>
                              <p className="text-xs text-primary">{action?.label || i.action_type}</p>
                              {i.description && <p className="text-xs text-text-secondary mt-1">{i.description}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ════ REPORTS ════ */}
          {section === 'reports' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-6">Reports</h1>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="card-glass">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-md bg-primary/15 flex items-center justify-center">
                        <FileDown className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Student Progress Report</p>
                        <p className="text-xs text-text-secondary">CSV · {students.length} students</p>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mb-4">
                      Includes: name, email, points, level, lessons completed, success rate, hint rate.
                    </p>
                    <Button onClick={downloadReport} disabled={students.length === 0} className="btn-primary w-full">
                      <FileDown className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="card-glass border-dashed border-border/50 opacity-60">
                  <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                    <CheckCircle className="w-8 h-8 text-text-secondary mb-3" />
                    <p className="font-medium text-foreground">More Reports</p>
                    <p className="text-xs text-text-secondary mt-1">Coming soon</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Student detail dialog ── */}
      <Dialog open={!!selectedStudent} onOpenChange={() => { setSelectedStudent(null); setStudentDetail(null); }}>
        <DialogContent className="bg-surface border-border w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {selectedStudent.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p>{selectedStudent.name}</p>
                    <p className="text-xs text-text-secondary font-normal">{selectedStudent.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-5 pt-2">
                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Points',    value: selectedStudent.total_stars, color: 'text-primary' },
                      { label: 'Level',     value: selectedStudent.level,       color: 'text-accent' },
                      { label: 'Lessons',   value: selectedStudent.completedLessons, color: 'text-secondary' },
                    ].map(item => (
                      <div key={item.label} className="bg-surface-highlight rounded-md p-3 text-center">
                        <p className={`text-xl font-bold font-outfit ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-text-secondary">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Submission history */}
                  {studentDetail?.subs?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Recent Submissions</p>
                      <div className="space-y-1.5">
                        {studentDetail.subs.slice(0, 8).map(s => (
                          <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2">
                              {s.stars_awarded > 0
                                ? <CheckCircle className="w-3.5 h-3.5 text-accent" />
                                : <XCircle className="w-3.5 h-3.5 text-destructive" />
                              }
                              <span className="text-foreground">{s.challenges?.title || 'Challenge'}</span>
                              {s.hint_used && <span className="text-xs text-warning">hint</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <span className={s.stars_awarded > 0 ? 'text-primary font-mono' : 'text-destructive'}>
                                {s.stars_awarded > 0 ? `+${s.stars_awarded}` : '0'} pts
                              </span>
                              <span>{fmtDate(s.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentDetail(null);
                        setMsgForm({ ...msgForm, student_id: selectedStudent.id });
                        setSection('messages');
                      }}
                      className="btn-primary"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Send Message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentDetail(null);
                        setIntForm({ ...intForm, student_id: selectedStudent.id });
                        setSection('interventions');
                      }}
                      className="border-border text-text-secondary"
                    >
                      <Zap className="w-3.5 h-3.5 mr-1.5" />
                      Log Action
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MentorDashboard;

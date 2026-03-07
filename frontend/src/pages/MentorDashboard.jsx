import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
  AlertOctagon, ClipboardList, Send, User, BookOpen, CheckSquare,
  Square, AlertCircle, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── constants ─────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'courses', label: 'My Courses', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'interventions', label: 'Interventions', icon: Zap },
  { id: 'reports', label: 'Reports', icon: FileDown },
];

const ACTION_TYPES = [
  { value: 'hint_unlock', label: 'Unlock Hint', icon: Lightbulb },
  { value: 'retry_allow', label: 'Allow Retry', icon: RotateCcw },
  { value: 'warning', label: 'Issue Warning', icon: AlertOctagon },
  { value: 'revision_assigned', label: 'Assign Revision', icon: ClipboardList },
];

const MSG_TYPES = [
  { value: 'feedback', label: 'Feedback' },
  { value: 'clarification', label: 'Clarification' },
  { value: 'revision', label: 'Revision' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'warning', label: 'Warning' },
];

// ── helpers ───────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const fmtRelative = (d) => {
  if (!d) return 'Never';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
};

const classify = (student) => {
  const { total, passed, hinted } = student.submissionStats || {};
  if (!total || total < 3) return 'new';
  const successRate = passed / total;
  const hintRate = hinted / total;
  if (successRate >= 0.7 && hintRate <= 0.3) return 'top';
  if (successRate < 0.5 || hintRate > 0.5) return 'struggling';
  return 'average';
};

const ClassBadge = ({ cat }) => {
  if (cat === 'top') return <Badge className="text-xs bg-accent/20 text-accent border-accent/40">Top Performer</Badge>;
  if (cat === 'struggling') return <Badge className="text-xs bg-destructive/20 text-destructive border-destructive/40">Needs Help</Badge>;
  if (cat === 'new') return <Badge className="text-xs bg-primary/20 text-primary border-primary/40">New</Badge>;
  return <Badge className="text-xs bg-surface-highlight text-text-secondary border-border">Average</Badge>;
};

// ── main component ────────────────────────────────────────────
const MentorDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Data
  const [students, setStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [mentorCourseIds, setMentorCourseIds] = useState(new Set());
  const [messages, setMessages] = useState([]);
  const [interventions, setInterventions] = useState([]);

  // UI
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [savingCourses, setSavingCourses] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Message form
  const [msgForm, setMsgForm] = useState({ student_id: '', subject: '', message: '', message_type: 'feedback' });
  const [msgLoading, setMsgLoading] = useState(false);

  // Intervention form
  const [intForm, setIntForm] = useState({ student_id: '', action_type: 'hint_unlock', description: '' });
  const [intLoading, setIntLoading] = useState(false);

  // ── fetch students (per-assignment so same student appears per course) ──
  const fetchStudents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: assignments } = await supabase
        .from('mentor_students')
        .select('id, student_id, course_id, assigned_at')
        .eq('mentor_id', user.id);

      if (!assignments?.length) { setStudents([]); setLoading(false); return; }

      const studentIds = [...new Set(assignments.map(a => a.student_id))];
      const courseIds = [...new Set(assignments.filter(a => a.course_id).map(a => a.course_id))];

      // Fetch in parallel
      const [profilesRes, progressRes, subsRes, coursesRes] = await Promise.all([
        supabase.from('users').select('id, name, total_stars, level, created_at').in('id', studentIds),
        supabase.from('user_progress').select('user_id, completed, stars_earned, completed_challenge_ids').in('user_id', studentIds),
        supabase.from('submissions').select('user_id, stars_awarded, hint_used, solution_viewed, created_at')
          .in('user_id', studentIds).order('created_at', { ascending: false }).limit(500),
        courseIds.length
          ? supabase.from('courses').select('id, title, total_challenges').in('id', courseIds)
          : { data: [] },
      ]);

      const profileMap = {};
      (profilesRes.data || []).forEach(p => { profileMap[p.id] = p; });

      const progressMap = {};
      (progressRes.data || []).forEach(p => {
        if (!progressMap[p.user_id]) progressMap[p.user_id] = [];
        progressMap[p.user_id].push(p);
      });

      const subsMap = {};
      (subsRes.data || []).forEach(s => {
        if (!subsMap[s.user_id]) subsMap[s.user_id] = [];
        subsMap[s.user_id].push(s);
      });

      const courseMapObj = {};
      (coursesRes.data || []).forEach(c => { courseMapObj[c.id] = c; });

      // One entry per assignment — same student can appear multiple times (different courses)
      const enriched = assignments.map(assignment => {
        const sid = assignment.student_id;
        const p = profileMap[sid] || {};
        const prog = progressMap[sid] || [];
        const ss = subsMap[sid] || [];

        const completedLessons = prog.filter(r => r.completed).length;
        const totalChallenges = prog.reduce((acc, r) => acc + (r.completed_challenge_ids?.length || 0), 0);
        const passed = ss.filter(s => s.stars_awarded > 0).length;
        const hinted = ss.filter(s => s.hint_used).length;
        const solutionViewed = ss.filter(s => s.solution_viewed).length;
        const lastActivity = ss.length
          ? ss.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at
          : null;

        return {
          ...p,
          assignmentKey: assignment.id,   // unique React key
          assignment: {
            ...assignment,
            courseName: assignment.course_id ? (courseMapObj[assignment.course_id]?.title || 'Unknown Course') : 'No Course',
            total_challenges: assignment.course_id ? (courseMapObj[assignment.course_id]?.total_challenges || 0) : 0,
          },
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

  // ── fetch all courses (for mentor course selection) ──────────
  const fetchAllCourses = useCallback(async () => {
    const { data } = await supabase.from('courses').select('id, title, level').order('title');
    setAllCourses(data || []);
  }, []);

  // ── fetch mentor's currently selected courses ────────────────
  const fetchMentorCourses = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('mentor_courses').select('course_id').eq('mentor_id', user.id);
    setMentorCourseIds(new Set((data || []).map(r => r.course_id)));
  }, [user?.id]);

  // ── save mentor course selections ────────────────────────────
  const saveMentorCourses = async () => {
    setSavingCourses(true);
    try {
      // Delete all existing, then insert selected ones
      const { error: delErr } = await supabase.from('mentor_courses').delete().eq('mentor_id', user.id);
      if (delErr) throw delErr;

      if (mentorCourseIds.size > 0) {
        const inserts = [...mentorCourseIds].map(course_id => ({ mentor_id: user.id, course_id }));
        const { error: insErr } = await supabase.from('mentor_courses').insert(inserts);
        if (insErr) throw insErr;
      }
      toast.success(`Saved — you are mentoring ${mentorCourseIds.size} course(s).`);
    } catch (e) {
      toast.error(e.message || 'Failed to save courses.');
    } finally {
      setSavingCourses(false);
    }
  };

  // ── fetch student detail ─────────────────────────────────────
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
        progress: progRes.data || [],
        subs: subsRes.data || [],
        messages: msgsRes.data || [],
      });
    } finally {
      setDetailLoading(false);
    }
  }, [user?.id]);

  // ── fetch messages ───────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('mentor_messages')
        .select('id, student_id, subject, message, message_type, read, created_at, from_student')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      const studentIds = [...new Set((data || []).map(m => m.student_id))];
      let nameMap = {};
      if (studentIds.length) {
        const { data: users } = await supabase.from('users').select('id, name').in('id', studentIds);
        (users || []).forEach(u => { nameMap[u.id] = u.name; });
      }
      setMessages((data || []).map(m => ({ ...m, studentName: nameMap[m.student_id] || 'Unknown' })));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── mark student reply as read ───────────────────────────────
  const markStudentMsgRead = async (msgId) => {
    const { error } = await supabase.from('mentor_messages').update({ read: true }).eq('id', msgId);
    if (!error) setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
  };

  // ── fetch interventions ──────────────────────────────────────
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
        const { data: users } = await supabase.from('users').select('id, name').in('id', studentIds);
        (users || []).forEach(u => { nameMap[u.id] = u.name; });
      }
      setInterventions((data || []).map(i => ({ ...i, studentName: nameMap[i.student_id] || 'Unknown' })));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── trigger fetches on section change ───────────────────────
  useEffect(() => {
    if (['overview', 'students', 'insights', 'reports'].includes(section)) fetchStudents();
    if (section === 'courses') { fetchAllCourses(); fetchMentorCourses(); }
    if (section === 'messages') { fetchStudents(); fetchMessages(); }
    if (section === 'interventions') { fetchStudents(); fetchInterventions(); }
  }, [section]); // eslint-disable-line

  // ── send message ─────────────────────────────────────────────
  const sendMessage = async () => {
    if (!msgForm.student_id || !msgForm.message.trim()) {
      toast.error('Select a student and enter a message');
      return;
    }
    setMsgLoading(true);
    try {
      const { error } = await supabase.from('mentor_messages').insert({
        mentor_id: user.id,
        student_id: msgForm.student_id,
        subject: msgForm.subject.trim() || null,
        message: msgForm.message.trim(),
        message_type: msgForm.message_type,
        from_student: false,
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

  // ── log intervention ─────────────────────────────────────────
  const logIntervention = async () => {
    if (!intForm.student_id) { toast.error('Select a student'); return; }
    setIntLoading(true);
    try {
      const { error } = await supabase.from('mentor_interventions').insert({
        mentor_id: user.id,
        student_id: intForm.student_id,
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

  // ── remove student from mentor ───────────────────────────────
  const removeStudent = async (studentId) => {
    if (!studentId) return;
    if (!window.confirm("Are you sure you want to remove this student from your mentorship?")) return;
    setIntLoading(true);
    try {
      const { error } = await supabase
        .from('mentor_students')
        .delete()
        .eq('mentor_id', user.id)
        .eq('student_id', studentId);

      if (error) throw error;
      toast.success("Student removed successfully.");

      setIntForm({ ...intForm, student_id: '' });
      fetchStudents();
    } catch (e) {
      toast.error(e.message || "Failed to remove student.");
    } finally {
      setIntLoading(false);
    }
  };

  // ── Excel report download ────────────────────────────────────
  const downloadReport = () => {
    const headers = [
      'Student Name', 'Email', 'Course', 'Progress %', 'Challenges Completed', 'Score', 'Last Active'
    ];

    const rows = students.map(s => {
      const tc = s.assignment?.total_challenges || 1;
      const cc = s.totalChallenges || 0;
      const progress = `${Math.min(100, Math.round((cc / Math.max(tc, 1)) * 100))}%`;

      return [
        s.name || 'Student',
        '—', // Email not stored in public.users
        s.assignment?.courseName || '—',
        progress,
        `${cc} / ${tc}`,
        `${s.total_stars || 0} pts`,
        s.lastActivity ? new Date(s.lastActivity).toLocaleDateString() : '—',
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 20 }, // Student Name
      { wch: 25 }, // Email
      { wch: 20 }, // Course
      { wch: 12 }, // Progress %
      { wch: 22 }, // Challenges Completed
      { wch: 10 }, // Score
      { wch: 14 }, // Last Active
    ];

    // Attempt to add styling to header row (basic XLSX supports limited styles without the Pro version)
    // To conform exactly to prompt we would use exceljs, but SheetJS basic styling might just bold if supported.
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "EAEAEA" } }
        };
      }
    }

    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }),
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mentor Report');
    const date = new Date().toISOString().slice(0, 10);

    // Format filename based on course if possible
    const firstCourseName = students[0]?.assignment?.courseName || 'all-courses';
    const safeCourseName = firstCourseName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    XLSX.writeFile(wb, `mentor-report-${safeCourseName}-${date}.xlsx`);
    toast.success('Excel report downloaded.');
  };

  // ── derived / memoized ───────────────────────────────────────

  // Unique students (deduplicated by id) — for stats that shouldn't double-count
  const uniqueStudents = useMemo(() => {
    const seen = new Set();
    return students.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
  }, [students]);

  // Filtered + course-filtered list (all assignment entries, not deduplicated)
  const filteredStudents = useMemo(() => {
    const bySearch = students.filter(s =>
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (courseFilter === 'all') return bySearch;
    return bySearch.filter(s => s.assignment?.course_id === courseFilter);
  }, [students, searchTerm, courseFilter]);

  // Group filtered students by course for the Students view
  const studentsByCourse = useMemo(() => {
    const grouped = {};
    filteredStudents.forEach(s => {
      const key = s.assignment?.course_id || '__none__';
      const label = s.assignment?.courseName || 'No Course';
      if (!grouped[key]) grouped[key] = { label, students: [] };
      grouped[key].students.push(s);
    });
    return Object.values(grouped);
  }, [filteredStudents]);

  // Group messages by student
  const messagesByStudent = useMemo(() => {
    const grouped = {};
    messages.forEach(m => {
      if (!grouped[m.student_id]) {
        grouped[m.student_id] = {
          student_id: m.student_id,
          studentName: m.studentName || 'Student',
          messages: []
        };
      }
      grouped[m.student_id].messages.push(m);
    });
    return Object.values(grouped);
  }, [messages]);


  // Distinct course options from assignments (for filter dropdown)
  const courseOptions = useMemo(() => {
    const seen = new Set();
    return students
      .filter(s => s.assignment?.course_id && !seen.has(s.assignment.course_id) && seen.add(s.assignment.course_id))
      .map(s => ({ id: s.assignment.course_id, name: s.assignment.courseName }));
  }, [students]);

  const analyticsData = useMemo(() => uniqueStudents.map(s => ({
    name: s.name?.split(' ')[0] || 'S',
    successRate: s.submissionStats.total
      ? Math.round((s.submissionStats.passed / s.submissionStats.total) * 100)
      : 0,
    category: classify(s),
  })), [uniqueStudents]);

  const topCount = useMemo(() => uniqueStudents.filter(s => classify(s) === 'top').length, [uniqueStudents]);
  const strugglingCount = useMemo(() => uniqueStudents.filter(s => classify(s) === 'struggling').length, [uniqueStudents]);
  const avgSuccess = uniqueStudents.length
    ? Math.round(uniqueStudents.reduce((acc, s) => {
      const ss = s.submissionStats;
      return acc + (ss.total ? ss.passed / ss.total : 0);
    }, 0) / uniqueStudents.length * 100)
    : 0;

  // Insights: at-risk, top performers, course-level stats
  const insights = useMemo(() => {
    const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const atRisk = uniqueStudents
      .map(s => {
        const reasons = [];
        const daysSince = s.lastActivity ? (now - new Date(s.lastActivity).getTime()) : Infinity;
        if (daysSince > FIVE_DAYS) reasons.push(`Inactive ${Math.floor(daysSince / 86400000)}d`);
        const ss = s.submissionStats;
        if (ss.total >= 3 && ss.passed / ss.total < 0.5) reasons.push(`Low accuracy ${Math.round(ss.passed / ss.total * 100)}%`);
        if (s.completedLessons === 0) reasons.push('No lessons completed');
        return { ...s, riskReasons: reasons };
      })
      .filter(s => s.riskReasons.length > 0);

    const topPerformers = [...uniqueStudents]
      .sort((a, b) => (b.total_stars || 0) - (a.total_stars || 0))
      .slice(0, 5);

    // Course stats from all assignment entries (so counts are per-course, not per-student)
    const courseMap = {};
    students.forEach(s => {
      const cid = s.assignment?.course_id;
      const cname = s.assignment?.courseName || 'Unknown';
      if (!cid) return;
      if (!courseMap[cid]) courseMap[cid] = { name: cname, count: 0, totalAcc: 0, withSubs: 0, inactive: 0 };
      const ss = s.submissionStats;
      if (ss.total > 0) { courseMap[cid].totalAcc += ss.passed / ss.total; courseMap[cid].withSubs++; }
      const daysSince = s.lastActivity ? (now - new Date(s.lastActivity).getTime()) : Infinity;
      if (daysSince > FIVE_DAYS) courseMap[cid].inactive++;
      courseMap[cid].count++;
    });
    const courseStats = Object.values(courseMap).map(c => ({
      ...c,
      avgAccuracy: c.withSubs > 0 ? Math.round(c.totalAcc / c.withSubs * 100) : 0,
    }));

    return { atRisk, topPerformers, courseStats };
  }, [uniqueStudents, students]);

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
              onClick={() => { setSection(s.id); setSearchTerm(''); setSelectedStudent(null); setCourseFilter('all'); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all text-left ${section === s.id
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
              onClick={() => { setSection(s.id); setSearchTerm(''); setSelectedStudent(null); setCourseFilter('all'); }}
              className={`flex-none flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${section === s.id ? 'text-primary' : 'text-text-secondary'
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
                  {user?.mentorProfile?.expertise && <> · <span>{user.mentorProfile.expertise}</span></>}
                </p>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Total Students', value: uniqueStudents.length, icon: Users, color: 'text-primary' },
                      { label: 'Top Performers', value: topCount, icon: TrendingUp, color: 'text-accent' },
                      { label: 'Needs Help', value: strugglingCount, icon: TrendingDown, color: 'text-warning' },
                      { label: 'Avg Success Rate', value: `${avgSuccess}%`, icon: Target, color: 'text-secondary' },
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

                  <Card className="card-glass">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-outfit text-foreground">Recent Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {uniqueStudents.length === 0 ? (
                        <p className="text-text-secondary text-sm py-4 text-center">No students assigned yet</p>
                      ) : (
                        <div className="space-y-3">
                          {uniqueStudents.slice(0, 5).map(s => {
                            const cat = classify(s);
                            const ss = s.submissionStats;
                            const sr = ss.total ? Math.round(ss.passed / ss.total * 100) : 0;
                            return (
                              <div key={s.assignmentKey} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                  {s.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                                    <ClassBadge cat={cat} />
                                  </div>
                                  <p className="text-xs text-text-secondary">{Math.round((s.totalChallenges / Math.max(s.assignment?.total_challenges || 1, 1)) * 100)}% progress · {s.assignment?.courseName}</p>
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

          {/* ════ MY COURSES ════ */}
          {section === 'courses' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-1">My Courses</h1>
              <p className="text-text-secondary text-sm mb-6">
                Select the courses you are actively mentoring. Students can only connect to you for courses you select here.
              </p>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="max-w-lg space-y-4">
                  <Card className="card-glass">
                    <CardContent className="pt-4 pb-2">
                      {allCourses.length === 0 ? (
                        <p className="text-text-secondary text-sm py-6 text-center">No courses available</p>
                      ) : allCourses.map(course => {
                        const checked = mentorCourseIds.has(course.id);
                        return (
                          <button
                            key={course.id}
                            onClick={() => setMentorCourseIds(prev => {
                              const next = new Set(prev);
                              if (next.has(course.id)) next.delete(course.id);
                              else next.add(course.id);
                              return next;
                            })}
                            className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-surface-highlight transition-colors text-left mb-1"
                          >
                            {checked
                              ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                              : <Square className="w-4 h-4 text-text-secondary shrink-0" />
                            }
                            <span className={`flex-1 text-sm font-medium ${checked ? 'text-foreground' : 'text-text-secondary'}`}>
                              {course.title}
                            </span>
                            <Badge variant="outline" className="text-xs capitalize border-border/50 text-text-secondary">
                              {course.level}
                            </Badge>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <div className="flex items-center gap-3">
                    <Button onClick={saveMentorCourses} disabled={savingCourses} className="btn-primary">
                      {savingCourses
                        ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        : <CheckSquare className="w-4 h-4 mr-2" />
                      }
                      Save Course Selection
                    </Button>
                    <span className="text-xs text-text-secondary">
                      {mentorCourseIds.size} course{mentorCourseIds.size !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ STUDENTS ════ */}
          {section === 'students' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-outfit font-bold text-foreground">
                  Students <span className="text-lg text-text-secondary font-normal">({uniqueStudents.length})</span>
                </h1>
                <div className="flex gap-2 flex-wrap">
                  {/* Course filter */}
                  <select
                    value={courseFilter}
                    onChange={e => setCourseFilter(e.target.value)}
                    className="bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All Courses</option>
                    {courseOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 input-dark w-48"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{students.length === 0 ? 'No students assigned yet' : 'No results'}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {studentsByCourse.map(group => (
                    <div key={group.label}>
                      {/* Course group header */}
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-semibold text-primary font-outfit">{group.label}</h2>
                        <span className="text-xs text-text-secondary">({group.students.length})</span>
                        <div className="flex-1 border-t border-border/40 ml-2" />
                      </div>

                      <div className="space-y-3">
                        {group.students.map(s => {
                          const cat = classify(s);
                          const ss = s.submissionStats;
                          const sr = ss.total ? Math.round(ss.passed / ss.total * 100) : 0;
                          return (
                            <Card
                              key={s.assignmentKey}
                              className="card-glass cursor-pointer hover:border-primary/40 transition-colors"
                              onClick={() => { setSelectedStudent(s); fetchStudentDetail(s.id); }}
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
                                    <div className="grid grid-cols-3 gap-4 text-xs mt-3">
                                      <div>
                                        <span className="text-text-secondary">Progress</span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <Progress value={Math.round((s.totalChallenges / Math.max(s.assignment?.total_challenges || 1, 1)) * 100)} className="h-1 flex-1" />
                                          <span className="text-foreground font-mono w-8 text-right">{Math.round((s.totalChallenges / Math.max(s.assignment?.total_challenges || 1, 1)) * 100)}%</span>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-text-secondary">Points</span>
                                        <p className="text-primary font-mono font-bold mt-0.5">{s.total_stars}</p>
                                      </div>
                                      <div>
                                        <span className="text-text-secondary">Last Active</span>
                                        <p className="text-foreground font-mono mt-0.5">{fmtRelative(s.lastActivity)}</p>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ INSIGHTS ════ */}
          {section === 'insights' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-6">Insights</h1>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-8">

                  {/* Course-level stats */}
                  {insights.courseStats.length > 0 && (
                    <div>
                      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Course Overview</h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {insights.courseStats.map(c => (
                          <Card key={c.name} className="card-glass">
                            <CardContent className="pt-5 pb-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-foreground text-sm">{c.name}</p>
                                  <p className="text-xs text-text-secondary mt-0.5">{c.count} student{c.count !== 1 ? 's' : ''}</p>
                                </div>
                                <BookOpen className="w-4 h-4 text-primary mt-0.5" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-secondary">Avg Accuracy</span>
                                  <span className="text-foreground font-mono">{c.avgAccuracy}%</span>
                                </div>
                                <Progress value={c.avgAccuracy} className="h-1.5" />
                                {c.inactive > 0 && (
                                  <p className="text-xs text-warning flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {c.inactive} inactive &gt;5 days
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* At-risk students */}
                  <div>
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      At-Risk Students
                      {insights.atRisk.length > 0 && (
                        <span className="bg-warning/20 text-warning text-xs px-2 py-0.5 rounded-full">{insights.atRisk.length}</span>
                      )}
                    </h2>
                    {insights.atRisk.length === 0 ? (
                      <Card className="card-glass">
                        <CardContent className="py-8 text-center">
                          <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
                          <p className="text-sm text-text-secondary">All students are on track</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {insights.atRisk.map(s => (
                          <Card key={s.assignmentKey} className="card-glass border-warning/20">
                            <CardContent className="pt-3 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-warning text-sm font-bold shrink-0">
                                  {s.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                                    <Badge className="text-xs bg-warning/10 text-warning border-warning/30">At Risk</Badge>
                                  </div>
                                  <p className="text-xs text-text-secondary mt-0.5">{s.assignment?.courseName}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  {s.riskReasons.map((r, i) => (
                                    <p key={i} className="text-xs text-warning">{r}</p>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top performers */}
                  <div>
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      Top Performers
                    </h2>
                    {insights.topPerformers.length === 0 ? (
                      <p className="text-text-secondary text-sm py-4">No students yet</p>
                    ) : (
                      <div className="space-y-2">
                        {insights.topPerformers.map((s, i) => {
                          const ss = s.submissionStats;
                          const sr = ss.total ? Math.round(ss.passed / ss.total * 100) : 0;
                          return (
                            <div key={s.assignmentKey} className="flex items-center gap-3 p-3 bg-surface-highlight rounded-md border border-border/40">
                              <span className={`text-sm font-bold font-mono w-5 shrink-0 ${i === 0 ? 'text-accent' : i === 1 ? 'text-primary' : 'text-text-secondary'}`}>
                                {i + 1}.
                              </span>
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                                {s.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground">{s.name}</span>
                                <p className="text-xs text-text-secondary">{s.assignment?.courseName} · {Math.round((s.totalChallenges / Math.max(s.assignment?.total_challenges || 1, 1)) * 100)}% progress</p>
                              </div>
                              <span className="text-sm font-mono text-primary font-bold">{s.total_stars} pts</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ════ MESSAGES ════ */}
          {section === 'messages' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-6">Messages</h1>
              <div className="grid lg:grid-cols-2 gap-6">
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
                        onChange={e => setMsgForm({ ...msgForm, student_id: e.target.value })}
                        className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">-- Select student --</option>
                        {uniqueStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Type</Label>
                      <select
                        value={msgForm.message_type}
                        onChange={e => setMsgForm({ ...msgForm, message_type: e.target.value })}
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
                        onChange={e => setMsgForm({ ...msgForm, subject: e.target.value })}
                        className="input-dark"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-text-secondary">Message *</Label>
                      <Textarea
                        placeholder="Write your message..."
                        value={msgForm.message}
                        onChange={e => setMsgForm({ ...msgForm, message: e.target.value })}
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

                <Card className="card-glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-outfit text-foreground flex items-center justify-between">
                      Message History
                      {messages.filter(m => m.from_student && !m.read).length > 0 && (
                        <span className="text-xs bg-accent text-background font-semibold px-2 py-0.5 rounded-full">
                          {messages.filter(m => m.from_student && !m.read).length} unread
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                    ) : messages.length === 0 ? (
                      <p className="text-text-secondary text-sm py-6 text-center">No messages yet</p>
                    ) : (
                      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
                        {messagesByStudent.map(group => (
                          <div key={group.student_id} className="border border-border/40 rounded-lg p-4 bg-surface/50">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/40">
                              <User className="w-4 h-4 text-primary" />
                              <h3 className="text-sm font-semibold text-foreground font-outfit">{group.studentName}</h3>
                              <span className="text-xs text-text-secondary">({group.messages.length} messages)</span>
                            </div>
                            <div className="space-y-3">
                              {group.messages.map(m => (
                                <div
                                  key={m.id}
                                  onClick={() => m.from_student && !m.read && markStudentMsgRead(m.id)}
                                  className={`p-3 rounded-md border transition-colors ${m.from_student
                                    ? m.read
                                      ? 'bg-surface-highlight border-border/40'
                                      : 'bg-accent/5 border-accent/30 cursor-pointer hover:bg-accent/10'
                                    : 'bg-surface-highlight border-border/40'
                                    }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        {m.from_student ? m.studentName : 'You'}
                                      </span>
                                      {!m.from_student && (
                                        <Badge variant="outline" className="text-xs border-primary/30 text-primary capitalize">{m.message_type}</Badge>
                                      )}
                                      {m.from_student && !m.read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                                    </div>
                                    <span className="text-xs text-text-secondary">{fmtDate(m.created_at)}</span>
                                  </div>
                                  {m.subject && <p className="text-xs font-medium text-text-secondary mb-1">{m.subject}</p>}
                                  <p className="text-sm text-foreground line-clamp-2">{m.message}</p>
                                </div>
                              ))}
                            </div>
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
                        onChange={e => setIntForm({ ...intForm, student_id: e.target.value })}
                        className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">-- Select student --</option>
                        {uniqueStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                            className={`flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-all ${intForm.action_type === a.value
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
                        onChange={e => setIntForm({ ...intForm, description: e.target.value })}
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

              {/* Delete Student Section */}
              <Card className="card-glass border-destructive/30 bg-destructive/5 mt-6">
                <CardHeader className="pb-3 border-b border-destructive/10">
                  <CardTitle className="text-sm font-outfit text-red-400 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4" />
                    Danger Zone: Remove Student
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-1 w-full space-y-1">
                    <Label className="text-xs text-text-secondary">Select Student to Remove</Label>
                    <select
                      value={intForm.student_id}
                      onChange={e => setIntForm({ ...intForm, student_id: e.target.value })}
                      className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">-- Select student --</option>
                      {uniqueStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <Button
                    variant="destructive"
                    disabled={!intForm.student_id || intLoading}
                    onClick={() => removeStudent(intForm.student_id)}
                    className="w-full sm:w-auto"
                  >
                    {intLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <User className="w-4 h-4 mr-2" />}
                    Remove Student
                  </Button>
                </CardContent>
              </Card>

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
                        <p className="text-xs text-text-secondary">Excel (.xlsx) · {students.length} student rows</p>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mb-4">
                      Includes: name, course, level, points, lessons, pass rate, hint rate, last active.
                    </p>
                    <Button onClick={downloadReport} disabled={students.length === 0} className="btn-primary w-full">
                      <FileDown className="w-4 h-4 mr-2" />
                      Download Excel (.xlsx)
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
                    <p className="text-xs text-text-secondary font-normal mt-0.5">
                      {selectedStudent.assignment?.courseName}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-5 pt-2">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Progress', value: `${Math.round((selectedStudent.totalChallenges / Math.max(selectedStudent.assignment?.total_challenges || 1, 1)) * 100)}%`, color: 'text-accent' },
                      { label: 'Points', value: selectedStudent.total_stars, color: 'text-primary' },
                      { label: 'Level', value: selectedStudent.level, color: 'text-foreground' },
                      { label: 'Lessons', value: selectedStudent.completedLessons, color: 'text-text-secondary' },
                    ].map(item => (
                      <div key={item.label} className="bg-surface-highlight rounded-md p-3 text-center">
                        <p className={`text-xl font-bold font-outfit ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-text-secondary">{item.label}</p>
                      </div>
                    ))}
                  </div>

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

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentDetail(null);
                        setMsgForm(f => ({ ...f, student_id: selectedStudent.id }));
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
                        setIntForm(f => ({ ...f, student_id: selectedStudent.id }));
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

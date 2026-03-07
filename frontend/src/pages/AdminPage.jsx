import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Users, ShieldCheck, Clock, CheckCircle, XCircle,
  Loader2, GraduationCap, Search, UserCheck, UserX,
  BarChart2, BookOpen, RefreshCw,
} from 'lucide-react';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'requests', label: 'Mentor Requests', icon: Clock },
  { id: 'mentors', label: 'Mentors', icon: Users },
  { id: 'students', label: 'Students', icon: GraduationCap },
];

const AdminPage = () => {
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(false);

  // ── data ────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);

  // ── approval dialog ──────────────────────────────────────────
  const [approving, setApproving] = useState(null); // mentor_profile row
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── assign dialog ────────────────────────────────────────────
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignMentorId, setAssignMentorId] = useState('');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [studentsPage, setStudentsPage] = useState(0);
  const [studentsTotalCount, setStudentsTotalCount] = useState(0);
  const STUDENTS_PAGE_SIZE = 50;

  // ── fetch helpers ────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, mentorsRes, pendingRes, coursesRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'mentor'),
        supabase.from('mentor_profiles').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('courses').select('id', { count: 'exact' }),
      ]);
      setStats({
        students: studentsRes.count ?? 0,
        mentors: mentorsRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        courses: coursesRes.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('mentor_profiles')
        .select('id, user_id, status, expertise, experience_years, bio, linkedin_url, created_at, mentor_code')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Enrich with user names
      const userIds = (data || []).map(r => r.user_id);
      let userMap = {};
      if (userIds.length) {
        const { data: users } = await supabase
          .from('users').select('id, name').in('id', userIds);
        (users || []).forEach(u => { userMap[u.id] = u; });
      }
      setRequests((data || []).map(r => ({ ...r, user: userMap[r.user_id] })));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMentors = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('mentor_profiles')
        .select('id, user_id, status, mentor_code, expertise, approved_at, rejection_reason')
        .neq('status', 'pending')
        .order('approved_at', { ascending: false });

      const userIds = (profiles || []).map(p => p.user_id);
      let userMap = {};
      if (userIds.length) {
        const { data: users } = await supabase
          .from('users').select('id, name').in('id', userIds);
        (users || []).forEach(u => { userMap[u.id] = u; });
      }

      // Count students per mentor
      const { data: assignments } = await supabase
        .from('mentor_students').select('mentor_id');
      const countMap = {};
      (assignments || []).forEach(a => {
        countMap[a.mentor_id] = (countMap[a.mentor_id] || 0) + 1;
      });

      setMentors((profiles || []).map(p => ({
        ...p,
        user: userMap[p.user_id],
        student_count: countMap[p.user_id] || 0,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const from = page * STUDENTS_PAGE_SIZE;
      const to = from + STUDENTS_PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from('users')
        .select('id, name, total_stars, level, created_at', { count: 'exact' })
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .range(from, to);
      setStudents(data || []);
      if (count !== null) setStudentsTotalCount(count);
      setStudentsPage(page);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (section === 'overview') fetchOverview();
    else if (section === 'requests') fetchRequests();
    else if (section === 'mentors') { fetchMentors(); fetchStudents(0); }
    else if (section === 'students') fetchStudents(0);
  }, [section, fetchOverview, fetchRequests, fetchMentors, fetchStudents]);

  // ── approve / reject ─────────────────────────────────────────
  const handleApprove = async () => {
    if (!approving) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('mentor_profiles')
        .update({ status: 'approved' })
        .eq('id', approving.id);
      if (error) throw error;
      toast.success(`${approving.user?.name || 'Mentor'} approved!`);
      setApproving(null);
      fetchRequests();
      fetchOverview();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('mentor_profiles')
        .update({ status: 'rejected', rejection_reason: rejectReason.trim() || null })
        .eq('id', rejecting.id);
      if (error) throw error;
      toast.success('Application rejected.');
      setRejecting(null);
      setRejectReason('');
      fetchRequests();
      fetchOverview();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── assign student to mentor ──────────────────────────────────
  const handleAssign = async () => {
    if (!assignMentorId || !assignStudentId) {
      toast.error('Select both a mentor and a student');
      return;
    }
    setAssignLoading(true);
    try {
      const { error } = await supabase.from('mentor_students').insert({
        mentor_id: assignMentorId,
        student_id: assignStudentId,
      });
      if (error) throw error;
      toast.success('Student assigned to mentor.');
      setAssignDialog(false);
      setAssignMentorId('');
      setAssignStudentId('');
      fetchMentors();
    } catch (e) {
      toast.error(e.message || 'Assignment failed (may already exist)');
    } finally {
      setAssignLoading(false);
    }
  };

  // ── helpers ───────────────────────────────────────────────────
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  const filtered = (list) =>
    list.filter(item => {
      const name = item.user?.name || item.name || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-16" data-testid="admin-page">
      <div className="flex min-h-[calc(100vh-4rem)]">

        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-56 bg-surface border-r border-border p-4 gap-1 shrink-0">
          <div className="mb-4 px-2">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-outfit font-semibold text-foreground">Admin Panel</span>
            </div>
            <p className="text-xs text-text-secondary">ScriptArc.dev</p>
          </div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setSearchTerm(''); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all text-left ${section === s.id
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:text-foreground hover:bg-surface-highlight'
                }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
              {s.id === 'requests' && stats?.pending > 0 && (
                <span className="ml-auto bg-warning/20 text-warning text-xs px-1.5 py-0.5 rounded-full font-mono">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* ── Mobile tab bar ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setSearchTerm(''); }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${section === s.id ? 'text-primary' : 'text-text-secondary'
                }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 p-6 pb-24 lg:pb-6 overflow-y-auto">

          {/* ── OVERVIEW ── */}
          {section === 'overview' && (
            <div>
              <h1 className="text-2xl font-outfit font-bold text-foreground mb-6">Platform Overview</h1>
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Students', value: stats?.students, icon: GraduationCap, color: 'text-primary' },
                    { label: 'Approved Mentors', value: stats?.mentors, icon: Users, color: 'text-accent' },
                    { label: 'Pending Requests', value: stats?.pending, icon: Clock, color: 'text-warning' },
                    { label: 'Courses', value: stats?.courses, icon: BookOpen, color: 'text-secondary' },
                  ].map(item => (
                    <Card key={item.label} className="card-glass">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-text-secondary font-medium">{item.label}</span>
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <p className={`text-3xl font-outfit font-bold ${item.color}`}>{item.value ?? '—'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MENTOR REQUESTS ── */}
          {section === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-outfit font-bold text-foreground">Mentor Requests</h1>
                <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />Refresh
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(req => (
                    <Card key={req.id} className="card-glass">
                      <CardContent className="pt-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground">{req.user?.name || 'Unknown'}</p>
                              <Badge variant="outline" className="text-xs border-warning/40 text-warning">Pending</Badge>
                            </div>
                            <p className="text-sm text-text-secondary mb-3">{req.user?.email}</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                              {req.expertise && (
                                <div><span className="text-text-secondary">Expertise: </span><span className="text-foreground">{req.expertise}</span></div>
                              )}
                              {req.experience_years != null && (
                                <div><span className="text-text-secondary">Experience: </span><span className="text-foreground">{req.experience_years} yrs</span></div>
                              )}
                              {req.linkedin_url && (
                                <div className="col-span-2">
                                  <a href={req.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                                    {req.linkedin_url}
                                  </a>
                                </div>
                              )}
                            </div>
                            {req.bio && (
                              <p className="text-sm text-text-secondary bg-surface-highlight rounded-md p-3 italic">
                                &ldquo;{req.bio}&rdquo;
                              </p>
                            )}
                            <p className="text-xs text-text-secondary mt-2">Applied {formatDate(req.created_at)}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => setApproving(req)}
                              className="bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30"
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1" />Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setRejecting(req); setRejectReason(''); }}
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            >
                              <UserX className="w-3.5 h-3.5 mr-1" />Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MENTORS ── */}
          {section === 'mentors' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-outfit font-bold text-foreground">Mentors</h1>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <Input
                      placeholder="Search mentors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 input-dark w-48"
                    />
                  </div>
                  <Button size="sm" onClick={() => setAssignDialog(true)} className="btn-primary shrink-0">
                    Assign Student
                  </Button>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-3">
                  {filtered(mentors).map(m => (
                    <Card key={m.id} className="card-glass">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                              {m.user?.name?.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{m.user?.name}</p>
                                {m.mentor_code && (
                                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    {m.mentor_code}
                                  </span>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${m.status === 'approved' ? 'border-accent/40 text-accent' : 'border-destructive/40 text-destructive'}`}
                                >
                                  {m.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-text-secondary">{m.expertise || 'General'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{m.student_count}</p>
                            <p className="text-xs text-text-secondary">students</p>
                          </div>
                        </div>
                        {m.status === 'rejected' && m.rejection_reason && (
                          <p className="text-xs text-destructive mt-2 pl-12">{m.rejection_reason}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {filtered(mentors).length === 0 && (
                    <p className="text-center text-text-secondary py-12">No mentors found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STUDENTS ── */}
          {section === 'students' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-outfit font-bold text-foreground">
                  Students{' '}
                  <span className="text-lg text-text-secondary font-normal">
                    ({studentsTotalCount} total · page {studentsPage + 1}/{Math.ceil(studentsTotalCount / STUDENTS_PAGE_SIZE) || 1})
                  </span>
                </h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 input-dark w-56"
                  />
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="pb-3 pr-4 font-medium">Student</th>
                        <th className="pb-3 pr-4 font-medium">Email</th>
                        <th className="pb-3 pr-4 font-medium text-right">Points</th>
                        <th className="pb-3 pr-4 font-medium text-right">Level</th>
                        <th className="pb-3 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filtered(students).map(s => (
                        <tr key={s.id} className="hover:bg-surface-highlight/30 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-xs font-bold">
                                {s.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-foreground font-medium">{s.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-text-secondary">Hidden (Auth)</td>
                          <td className="py-3 pr-4 text-right font-mono text-primary">{s.total_stars}</td>
                          <td className="py-3 pr-4 text-right text-text-secondary">{s.level}</td>
                          <td className="py-3 text-text-secondary">{formatDate(s.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered(students).length === 0 && (
                    <p className="text-center text-text-secondary py-12">No students found</p>
                  )}
                </div>
              )}
              {/* Pagination controls */}
              {studentsTotalCount > STUDENTS_PAGE_SIZE && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={studentsPage === 0 || loading}
                    onClick={() => fetchStudents(studentsPage - 1)}
                    className="border-border"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-text-secondary">
                    {studentsPage + 1} / {Math.ceil(studentsTotalCount / STUDENTS_PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(studentsPage + 1) * STUDENTS_PAGE_SIZE >= studentsTotalCount || loading}
                    onClick={() => fetchStudents(studentsPage + 1)}
                    className="border-border"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Approve dialog ── */}
      <Dialog open={!!approving} onOpenChange={() => setApproving(null)}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Approve Mentor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Approve <strong className="text-foreground">{approving?.user?.name}</strong> as a mentor?
            A mentor ID (MNTR-XXXX) will be auto-generated.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setApproving(null)} className="border-border">Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4 mr-1.5" />Approve</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ── */}
      <Dialog open={!!rejecting} onOpenChange={() => { setRejecting(null); setRejectReason(''); }}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary mb-3">
            Reject <strong className="text-foreground">{rejecting?.user?.name}</strong>'s application?
          </p>
          <div className="space-y-2">
            <Label className="text-text-secondary text-xs">Reason (optional)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide feedback for the applicant..."
              className="input-dark resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => { setRejecting(null); setRejectReason(''); }} className="border-border">Cancel</Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 border"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1.5" />Reject</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign student dialog ── */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Student to Mentor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-text-secondary text-xs">Select Mentor</Label>
              <select
                value={assignMentorId}
                onChange={(e) => setAssignMentorId(e.target.value)}
                className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                <option value="">-- Choose mentor --</option>
                {mentors.filter(m => m.status === 'approved').map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name} ({m.mentor_code || '...'})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-text-secondary text-xs">Select Student</Label>
              <select
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(e.target.value)}
                className="w-full bg-surface-highlight border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                <option value="">-- Choose student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setAssignDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleAssign} disabled={assignLoading} className="btn-primary">
              {assignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;

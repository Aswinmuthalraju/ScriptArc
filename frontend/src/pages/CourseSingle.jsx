import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Play, Clock, Star, Code2, ChevronRight, CheckCircle,
  Lock, Award, Loader2, ArrowLeft, Trophy, GraduationCap, Target, Users
} from 'lucide-react';

const levelColors = {
  beginner: 'bg-accent/20 text-accent border-accent/30',
  intermediate: 'bg-primary/20 text-primary border-primary/30',
  advanced: 'bg-secondary/20 text-secondary border-secondary/30',
};

const CourseSingle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState({}); // keyed by lesson_id
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [computedMaxPoints, setComputedMaxPoints] = useState(0);
  const [certLoading, setCertLoading] = useState(false);

  const [assignedMentor, setAssignedMentor] = useState(null);
  const [showMentorDialog, setShowMentorDialog] = useState(false);
  const [mentorCode, setMentorCode] = useState('');
  const [assigningMentor, setAssigningMentor] = useState(false);

  useEffect(() => { fetchCourseData(); }, [id, user]); // eslint-disable-line

  const fetchCourseData = async () => {
    try {
      // Fetch course, lessons, and challenge counts in parallel
      const [courseRes, lessonRes, challengeRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', id).single(),
        supabase.from('lessons').select('*').eq('course_id', id).order('order_index', { ascending: true }),
        supabase.from('challenges').select('challenge_type').eq('course_id', id),
      ]);

      if (courseRes.error || !courseRes.data) { setLoading(false); return; }

      const courseData = courseRes.data;
      const lessonData = lessonRes.data || [];
      const challengeData = challengeRes.data || [];

      const mcqCount = challengeData.filter(c => c.challenge_type === 'mcq').length;
      const codingCount = challengeData.filter(c => c.challenge_type === 'coding').length;
      setComputedMaxPoints(mcqCount * 2 + codingCount * 4);

      // Fetch user progress only if there are lessons
      let progressMap = {};
      if (user && lessonData.length) {
        const lessonIds = lessonData.map(l => l.id);
        const { data: progressData } = await supabase
          .from('user_progress').select('*')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);
        if (progressData) {
          progressMap = Object.fromEntries(progressData.map(p => [p.lesson_id, p]));
        }
      }

      if (user) {
        const { data: mentorLink } = await supabase
          .from('mentor_students')
          .select('mentor_id')
          .eq('student_id', user.id)
          .eq('course_id', id)
          .maybeSingle();
        if (mentorLink) {
          const { data: mentorUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', mentorLink.mentor_id)
            .maybeSingle();
          if (mentorUser) setAssignedMentor(mentorUser.name);
        }
      }

      setCourse(courseData);
      setLessons(lessonData);
      setProgress(progressMap);

      if (lessonData.length && lessonData.every(l => progressMap[l.id]?.completed)) {
        setShowCompletion(true);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleAddMentor = async () => {
    const code = mentorCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a Mentor ID');
      return;
    }
    setAssigningMentor(true);
    try {
      // Look up the mentor profile.
      // The mp_approved_select RLS policy (migration 010) lets any authenticated user
      // read rows where status = 'approved', so students can resolve a mentor_code.
      const { data: profile, error: lookupError } = await supabase
        .from('mentor_profiles')
        .select('user_id')
        .eq('mentor_code', code)
        .eq('status', 'approved')
        .maybeSingle();

      if (lookupError) {
        console.error('Mentor lookup error:', lookupError);
        throw new Error(`Lookup failed: ${lookupError.message}`);
      }

      if (!profile) {
        throw new Error('Mentor code not found or mentor is not yet approved.');
      }

      // Verify this mentor has registered to mentor THIS course (migration 011).
      const { data: courseLink, error: courseErr } = await supabase
        .from('mentor_courses')
        .select('id')
        .eq('mentor_id', profile.user_id)
        .eq('course_id', id)
        .maybeSingle();

      if (courseErr) {
        console.error('Course link check error:', courseErr);
        throw new Error(`Verification failed: ${courseErr.message}`);
      }

      if (!courseLink) {
        throw new Error('This mentor does not mentor this course. Ask them to add this course from their Mentor Dashboard.');
      }

      // Insert the student → mentor assignment.
      const { error: insertError } = await supabase.from('mentor_students').insert({
        mentor_id: profile.user_id,
        student_id: user.id,
        course_id: id,
      });

      if (insertError) {
        console.error('Mentor assign error:', insertError);
        if (insertError.code === '23505') throw new Error('You are already assigned to this mentor.');
        throw new Error(`Assignment failed: ${insertError.message}`);
      }

      toast.success('Mentor assigned successfully!');
      setShowMentorDialog(false);
      setMentorCode('');
      fetchCourseData();
    } catch (err) {
      toast.error(err.message || 'Failed to assign mentor. Please try again.');
    } finally {
      setAssigningMentor(false);
    }
  };

  const handleRemoveMentor = async () => {
    if (!window.confirm("Are you sure you want to remove your assigned mentor for this course?")) return;
    try {
      const { error } = await supabase
        .from('mentor_students')
        .delete()
        .eq('student_id', user.id)
        .eq('course_id', id);

      if (error) throw error;
      toast.success('Mentor removed successfully.');
      setAssignedMentor(null);
    } catch (err) {
      toast.error(err.message || 'Failed to remove mentor. Please try again.');
    }
  };

  const handleGenerateCertificate = async () => {
    if (!user) return;
    setCertLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_certificate', { p_course_id: id });
      if (error) throw error;

      // Build date string matching what the verify page expects (YYYY-MM-DD → readable)
      const dateObj = new Date(data.completion_date);
      const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      const params = new URLSearchParams({
        name: data.student_name,
        course: data.course_name,
        mentor: data.mentor_name,
        score: data.score,
        maxScore: data.max_score,
        stars: data.star_rating,
        date: dateStr,
        certId: data.certificate_id,
      });

      window.open(`/certificate/editor.html?${params.toString()}`, '_blank');
    } catch (err) {
      toast.error(err.message || 'Failed to generate certificate. Please try again.');
    } finally {
      setCertLoading(false);
    }
  };

  // A lesson is locked if the previous one is not completed
  const isLocked = (lesson) => {
    if (user?.has_special_access) return false; // special access bypasses all locks
    if (lesson.order_index === 1) return false;
    const prev = lessons.find(l => l.order_index === lesson.order_index - 1);
    return !prev || !progress[prev.id]?.completed;
  };

  const startLesson = (lesson) => {
    if (isLocked(lesson)) {
      toast.error('Complete the previous lesson first!');
      return;
    }
    navigate(`/learn/${lesson.id}`);
  };

  // Find the first non-completed, unlocked lesson
  const continueLessonId = lessons.find(
    l => !progress[l.id]?.completed && !isLocked(l)
  )?.id || lessons[0]?.id;

  // Memoize lesson lists to avoid re-filtering on every render
  const unit1Lessons = useMemo(() => lessons.filter(l => l.order_index <= 11), [lessons]);
  const unit2Lessons = useMemo(() => lessons.filter(l => l.order_index > 11), [lessons]);

  const totalPoints = Object.values(progress).reduce((sum, p) => sum + (p.stars_earned || 0), 0);
  const completedLessonsCount = Object.values(progress).filter(p => p.completed).length;
  const completedChallengesCount = Object.values(progress).reduce((sum, p) => sum + (p.completed_challenge_ids?.length || 0), 0);

  const progressPct = course?.total_challenges ? Math.round((completedChallengesCount / course.total_challenges) * 100) : 0;
  const maxPoints = computedMaxPoints;
  const pointsPct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  // Stars only for certificate — thresholds per spec
  const courseStars = pointsPct >= 90 ? 5 : pointsPct >= 75 ? 4 : pointsPct >= 60 ? 3 : pointsPct >= 45 ? 2 : 1;

  // ── Loading / Not Found ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-outfit text-foreground mb-4">Course not found</h2>
          <Button onClick={() => navigate('/courses')} className="btn-primary">Browse Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12" data-testid="course-single-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-text-secondary hover:text-foreground mb-6 transition-colors"
          data-testid="back-to-courses"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to courses
        </button>

        {/* ── Completion Banner ── */}
        {showCompletion && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-accent/20 via-primary/10 to-warning/20 border border-accent/30 text-center"
            data-testid="completion-banner">
            <Trophy className="w-12 h-12 text-warning mx-auto mb-3" />
            <h2 className="text-2xl font-outfit font-bold text-foreground mb-1">Course Completed!</h2>
            <p className="text-text-secondary mb-4">You've mastered {course.title}</p>
            <p className="text-sm text-text-secondary mb-2">Points Earned: {totalPoints} / {maxPoints}</p>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-5 h-5 ${i <= courseStars ? 'text-warning fill-warning' : 'text-text-secondary/30'}`} />
              ))}
              <span className="text-lg font-bold text-warning ml-2">({courseStars} Stars Awarded)</span>
            </div>
            <Button
              className="btn-primary"
              onClick={handleGenerateCertificate}
              disabled={certLoading}
              data-testid="certificate-btn"
            >
              {certLoading
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <GraduationCap className="w-4 h-4 mr-2" />
              }
              {certLoading ? 'Generating…' : 'Download Certificate'}
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={course.thumbnail_url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200'}
                alt={course.title}
                className="w-full h-44 sm:h-56 object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <Badge className={`${levelColors[course.level] || levelColors.beginner} border mb-3`}>
                  {course.level}
                </Badge>
                <h1 className="text-2xl md:text-3xl font-outfit font-bold text-foreground mb-1">
                  {course.title}
                </h1>
                <p className="text-text-secondary text-sm line-clamp-2">{course.description}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Clock, label: 'Duration', value: `${course.duration_hours}h` },
                { icon: Code2, label: 'Challenges', value: course.total_challenges || lessons.length },
                { icon: Play, label: 'Lectures', value: lessons.length },
                { icon: Target, label: 'Accumulated Points', value: `${totalPoints} / ${maxPoints || '—'}`, gold: true },
              ].map(({ icon: Icon, label, value, gold }) => (
                <div key={label} className="card-glass p-3 text-center rounded-xl">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${gold ? 'text-warning' : 'text-primary'}`} />
                  <div className={`text-base font-bold ${gold ? 'text-warning' : 'text-foreground'}`}>{value}</div>
                  <div className="text-xs text-text-secondary">{label}</div>
                </div>
              ))}
            </div>

            {/* Lecture List */}
            <Card className="card-glass" data-testid="curriculum">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  Lectures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {/* UNIT 1 */}
                  <AccordionItem value="unit-1" className="border-border">
                    <AccordionTrigger className="text-lg font-outfit font-semibold hover:no-underline hover:text-primary transition-colors py-4">
                      Unit 1: Fundamentals
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2 pb-4">
                      {unit1Lessons.map((lesson) => {
                        const prog = progress[lesson.id];
                        const done = prog?.completed;
                        const locked = isLocked(lesson);
                        const starsEarned = prog?.stars_earned || 0;

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => startLesson(lesson)}
                            className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${locked
                              ? 'border-border/40 opacity-60 cursor-not-allowed'
                              : done
                                ? 'border-accent/40 bg-accent/5 cursor-pointer hover:bg-accent/8'
                                : 'border-border cursor-pointer hover:border-primary/50 hover:bg-surface-highlight/50'
                              }`}
                            data-testid={`lesson-${lesson.id}`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-accent/20 text-accent' :
                              locked ? 'bg-surface-highlight text-text-secondary' :
                                'bg-primary/20 text-primary'
                              }`}>
                              {done ? <CheckCircle className="w-5 h-5" /> :
                                locked ? <Lock className="w-4 h-4" /> :
                                  <span className="text-sm font-bold font-mono">{lesson.order_index}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                                {done && (
                                  <Badge variant="outline" className="text-xs border-accent/40 text-accent shrink-0">
                                    ✓ Done
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs text-text-secondary flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration_minutes} min
                                </span>
                                {starsEarned > 0 && (
                                  <span className="text-xs text-primary flex items-center gap-0.5">
                                    <Code2 className="w-3 h-3" />
                                    {starsEarned} pts
                                  </span>
                                )}
                                {locked && (
                                  <span className="text-xs text-text-secondary">Complete previous lecture first</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 shrink-0 ${locked ? 'text-text-secondary/40' : 'text-text-secondary'}`} />
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>

                  {/* UNIT 2 */}
                  {unit2Lessons.length > 0 && (
                    <AccordionItem value="unit-2" className="border-border border-b-0">
                      <AccordionTrigger className="text-lg font-outfit font-semibold hover:no-underline hover:text-primary transition-colors py-4">
                        Unit 2: Advanced Techniques
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 pt-2 pb-4">
                        {unit2Lessons.map((lesson) => {
                          const prog = progress[lesson.id];
                          const done = prog?.completed;
                          const locked = isLocked(lesson);
                          const starsEarned = prog?.stars_earned || 0;

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => startLesson(lesson)}
                              className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${locked
                                ? 'border-border/40 opacity-60 cursor-not-allowed'
                                : done
                                  ? 'border-accent/40 bg-accent/5 cursor-pointer hover:bg-accent/8'
                                  : 'border-border cursor-pointer hover:border-primary/50 hover:bg-surface-highlight/50'
                                }`}
                              data-testid={`lesson-${lesson.id}`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-accent/20 text-accent' :
                                locked ? 'bg-surface-highlight text-text-secondary' :
                                  'bg-primary/20 text-primary'
                                }`}>
                                {done ? <CheckCircle className="w-5 h-5" /> :
                                  locked ? <Lock className="w-4 h-4" /> :
                                    <span className="text-sm font-bold font-mono">{lesson.order_index - 11}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                                  {done && (
                                    <Badge variant="outline" className="text-xs border-accent/40 text-accent shrink-0">
                                      ✓ Done
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-xs text-text-secondary flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {lesson.duration_minutes} min
                                  </span>
                                  {starsEarned > 0 && (
                                    <span className="text-xs text-primary flex items-center gap-0.5">
                                      <Code2 className="w-3 h-3" />
                                      {starsEarned} pts
                                    </span>
                                  )}
                                  {locked && (
                                    <span className="text-xs text-text-secondary">Complete previous lecture first</span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 shrink-0 ${locked ? 'text-text-secondary/40' : 'text-text-secondary'}`} />
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>

            {/* Tags */}
            {course.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="border-border text-text-secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="card-glass lg:sticky lg:top-24" data-testid="enrollment-card">
              <CardContent className="p-6">
                {Object.keys(progress).length > 0 ? (
                  <>
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-text-secondary">Your Progress</span>
                        <span className="text-sm font-semibold text-foreground">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2 bg-surface-highlight" />
                      <p className="text-xs text-text-secondary mt-1">
                        {completedLessonsCount} of {lessons.length} lectures completed
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="text-center p-3 bg-surface-highlight rounded-xl">
                        <Target className="w-4 h-4 text-primary mx-auto mb-1" />
                        <div className="text-lg font-bold text-foreground">{totalPoints}</div>
                        <div className="text-xs text-text-secondary">Points Earned</div>
                      </div>
                      <div className="text-center p-3 bg-surface-highlight rounded-xl">
                        <CheckCircle className="w-4 h-4 text-accent mx-auto mb-1" />
                        <div className="text-lg font-bold text-foreground">{completedChallengesCount}</div>
                        <div className="text-xs text-text-secondary">Challenges</div>
                      </div>
                    </div>

                    <Button
                      onClick={() => continueLessonId && navigate(`/learn/${continueLessonId}`)}
                      disabled={showCompletion}
                      className="w-full btn-primary"
                      data-testid="continue-learning-btn"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {showCompletion ? 'All Done!' : 'Continue Learning'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-5">
                      <Award className="w-12 h-12 text-primary mx-auto mb-3" />
                      <h3 className="text-base font-outfit font-semibold text-foreground mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {lessons.length} lectures · {course.total_challenges} challenges
                      </p>
                      <p className="text-sm text-primary flex items-center justify-center gap-1 mt-1">
                        <Target className="w-3.5 h-3.5" />
                        Earn up to {maxPoints} points
                      </p>
                    </div>
                    <Button
                      onClick={() => lessons[0] && navigate(`/learn/${lessons[0].id}`)}
                      className="w-full btn-primary py-6"
                      data-testid="start-btn"
                    >
                      Start Course
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Mentor Card */}
            <Card className="card-glass">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-secondary mx-auto mb-3" />
                {assignedMentor ? (
                  <>
                    <h3 className="text-base font-outfit font-semibold text-foreground mb-1">Assigned Mentor</h3>
                    <p className="text-sm text-primary mb-2 font-medium">{assignedMentor}</p>
                    <Badge variant="outline" className="border-secondary/40 text-secondary bg-secondary/10 mb-4 block w-fit mx-auto">
                      Actively Reviewing
                    </Badge>
                    <Button onClick={handleRemoveMentor} variant="outline" className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                      Remove Mentor
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-outfit font-semibold text-foreground mb-1">Need Guidance?</h3>
                    <p className="text-xs text-text-secondary mb-4">
                      Add a mentor to get personalized feedback on your coding challenges.
                    </p>
                    <Button onClick={() => setShowMentorDialog(true)} variant="outline" className="w-full text-xs hover:border-primary/50 hover:bg-primary/5">
                      Enter Mentor ID
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* What you'll learn */}
            <Card className="card-glass">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit text-sm">What You'll Learn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessons.map((l) => (
                  <div key={l.id} className="flex items-start gap-2">
                    <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${progress[l.id]?.completed ? 'text-accent' : 'text-text-secondary/40'}`} />
                    <span className="text-sm text-text-secondary">{l.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Mentor Dialog */}
      <Dialog open={showMentorDialog} onOpenChange={setShowMentorDialog}>
        <DialogContent className="bg-surface border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Mentor to Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-text-secondary text-xs">Mentor ID (e.g. MNTR-1234)</Label>
              <Input
                placeholder="Enter Mentor Code"
                value={mentorCode}
                onChange={(e) => setMentorCode(e.target.value)}
                className="input-dark uppercase"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowMentorDialog(false)} className="border-border">Cancel</Button>
              <Button onClick={handleAddMentor} disabled={assigningMentor} className="btn-primary">
                {assigningMentor ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseSingle;

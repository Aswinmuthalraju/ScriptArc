import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Play, Clock, Star, Code2, ChevronRight, CheckCircle,
  Lock, Award, Loader2, ArrowLeft, Trophy, GraduationCap, Target
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

  useEffect(() => { fetchCourseData(); }, [id, user]); // eslint-disable-line

  const fetchCourseData = async () => {
    try {
      // Course
      const { data: courseData, error: courseErr } = await supabase
        .from('courses').select('*').eq('id', id).single();
      if (courseErr || !courseData) { setLoading(false); return; }

      // Lessons ordered
      const { data: lessonData } = await supabase
        .from('lessons').select('*')
        .eq('course_id', id)
        .order('order_index', { ascending: true });

      // User progress
      let progressMap = {};
      if (user && lessonData?.length) {
        const lessonIds = lessonData.map(l => l.id);
        const { data: progressData } = await supabase
          .from('user_progress').select('*')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);
        if (progressData) {
          progressMap = Object.fromEntries(progressData.map(p => [p.lesson_id, p]));
        }
      }

      setCourse(courseData);
      setLessons(lessonData || []);
      setProgress(progressMap);

      // Check full completion
      if (lessonData?.length && lessonData.every(l => progressMap[l.id]?.completed)) {
        setShowCompletion(true);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // A lesson is locked if the previous one is not completed
  const isLocked = (lesson) => {
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

  const totalPoints = Object.values(progress).reduce((sum, p) => sum + (p.stars_earned || 0), 0);
  const completedLessonsCount = Object.values(progress).filter(p => p.completed).length;
  const completedChallengesCount = Object.values(progress).reduce((sum, p) => sum + (p.completed_challenge_ids?.length || 0), 0);

  const progressPct = course?.total_challenges ? Math.round((completedChallengesCount / course.total_challenges) * 100) : 0;
  const maxPoints = (course?.total_challenges || 0) * 2;
  const pointsPct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const courseStars = pointsPct >= 100 ? 5 : pointsPct >= 80 ? 4 : pointsPct >= 60 ? 3 : pointsPct >= 40 ? 2 : pointsPct >= 20 ? 1 : 0;

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
            <h2 className="text-2xl font-outfit font-bold text-foreground mb-1">🎉 Course Completed!</h2>
            <p className="text-text-secondary mb-4">You've mastered {course.title}</p>
            <p className="text-sm text-text-secondary mb-2">Points Earned: {totalPoints} / {maxPoints}</p>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-5 h-5 ${i <= courseStars ? 'text-warning fill-warning' : 'text-text-secondary/30'}`} />
              ))}
              <span className="text-lg font-bold text-warning ml-2">({courseStars} Stars Awarded)</span>
            </div>
            <Button className="btn-primary" data-testid="certificate-btn">
              <GraduationCap className="w-4 h-4 mr-2" />
              Generate Certificate
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={course.thumbnail_url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200'}
                alt={course.title}
                className="w-full h-56 object-cover"
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
            <div className="grid grid-cols-4 gap-3">
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
              <CardContent className="space-y-2">
                {lessons.map((lesson) => {
                  const prog = progress[lesson.id];
                  const done = prog?.completed;
                  const locked = isLocked(lesson);
                  const starsEarned = prog?.stars_earned || 0;

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => startLesson(lesson)}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${locked
                        ? 'border-border/40 opacity-60 cursor-not-allowed'
                        : done
                          ? 'border-accent/40 bg-accent/5 cursor-pointer hover:bg-accent/8'
                          : 'border-border cursor-pointer hover:border-primary/50 hover:bg-surface-highlight/50'
                        }`}
                      data-testid={`lesson-${lesson.id}`}
                    >
                      {/* Status icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-accent/20 text-accent' :
                        locked ? 'bg-surface-highlight text-text-secondary' :
                          'bg-primary/20 text-primary'
                        }`}>
                        {done ? <CheckCircle className="w-5 h-5" /> :
                          locked ? <Lock className="w-4 h-4" /> :
                            <span className="text-sm font-bold font-mono">{lesson.order_index}</span>}
                      </div>

                      {/* Lesson info */}
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
                              {starsEarned * 5} pts
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
            <Card className="card-glass sticky top-24" data-testid="enrollment-card">
              <CardContent className="p-6">
                {completedChallengesCount > 0 ? (
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
    </div>
  );
};

export default CourseSingle;

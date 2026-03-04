import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Trophy,
  ArrowRight,
  BookOpen,
  Award,
  Clock,
  Loader2,
  Star,
  GraduationCap,
  Target
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const { data: progressList } = await supabase
        .from('user_progress')
        .select('course_id, stars_earned, completed_challenge_ids, courses(*)')
        .eq('user_id', user.id);

      const courseMap = {};
      (progressList || []).forEach(p => {
        if (!p.courses) return;
        const cid = p.course_id;
        if (!courseMap[cid]) {
          courseMap[cid] = {
            ...p.courses,
            total_stars_earned: 0,
            completed_challenges: new Set()
          };
        }
        courseMap[cid].total_stars_earned += p.stars_earned || 0;
        (p.completed_challenge_ids || []).forEach(id => courseMap[cid].completed_challenges.add(id));
      });

      const enrollments = Object.values(courseMap).map(c => ({
        ...c,
        progress: c.total_challenges > 0 ? Math.round((c.completed_challenges.size / c.total_challenges) * 100) : 0,
        stars_earned: c.total_stars_earned
      }));

      const { data: submissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: rankData } = await supabase
        .from('leaderboard')
        .select('rank')
        .eq('id', user.id)
        .single();

      setDashboardData({
        courses_in_progress: enrollments || [],
        recent_completions: (submissions || []).map(s => ({
          completed_at: s.created_at,
          stars_awarded: s.stars_awarded || 0,
        })),
        rank: rankData?.rank || '-',
      });
    } catch (error) {
      setDashboardData({
        courses_in_progress: [],
        recent_completions: [],
        rank: '-',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const certificationTarget = 100;
  const currentStars = user?.total_stars || 0;
  const certProgress = Math.min((currentStars / certificationTarget) * 100, 100);

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-outfit font-bold text-foreground mb-2">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Continue learning and progressing toward your certification.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* Certificate Progress Card */}
          <Card className="card-glass border-primary/20 bg-primary/5" data-testid="cert-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-foreground font-medium text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Certification
                </span>
                <span className="text-sm font-mono text-primary font-bold">
                  {Math.round(certProgress)}%
                </span>
              </div>
              <div className="text-3xl font-outfit font-bold text-foreground mb-3">
                {currentStars} <span className="text-lg text-muted-foreground font-normal">/ {certificationTarget} Stars</span>
              </div>
              <Progress value={certProgress} className="h-2 bg-muted/60" />
            </CardContent>
          </Card>

          {/* Challenges Completed Card */}
          <Card className="card-glass" data-testid="challenges-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Challenges
                </span>
              </div>
              <div className="text-3xl font-outfit font-bold text-foreground mb-3">
                {dashboardData?.recent_completions?.length || 0} <span className="text-lg text-muted-foreground font-normal">Solved</span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Keep an active learning routine
              </p>
            </CardContent>
          </Card>

          {/* Rank Card */}
          <Card className="card-glass" data-testid="rank-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Global Rank
                </span>
              </div>
              <div className="text-3xl font-outfit font-bold text-foreground mb-3">
                #{dashboardData?.rank || '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Compete with other learners
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Continue Learning */}
            <Card className="card-glass" data-testid="continue-learning">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Continue Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.courses_in_progress?.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.courses_in_progress.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-4 p-4 bg-surface-highlight border border-border/40 rounded-xl hover:bg-surface-highlight/80 hover:border-border transition-all cursor-pointer"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        <img
                          src={course.thumbnail_url || 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=100'}
                          alt={course.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-foreground font-medium truncate">{course.title}</h4>
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="text-xs text-muted-foreground">
                              {course.progress || 0}% complete
                            </span>
                            <span className="text-xs text-primary flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" />
                              {course.stars_earned || 0} pts earned
                            </span>
                          </div>
                          <Progress
                            value={course.progress || 0}
                            className="h-1.5 mt-3 bg-muted"
                          />
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed border-border/50 rounded-xl">
                    <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground text-sm mb-5">No courses started yet. Begin your journey today.</p>
                    <Button onClick={() => navigate('/courses')} className="btn-primary">
                      Browse Courses
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="card-glass" data-testid="recent-activity">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-secondary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recent_completions?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recent_completions.map((completion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-surface-highlight border border-border/30 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center">
                            <Star className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Challenge completed</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(completion.completed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-primary">
                          <Target className={`w-3.5 h-3.5`} />
                          <span className="text-xs font-semibold">+{(completion.stars_awarded || 0) * 2} points</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    No recent activity
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <Card className="card-glass">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => navigate('/courses')}
                  className="w-full btn-primary justify-between h-11"
                >
                  Explore Courses
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => navigate('/leaderboard')}
                  variant="outline"
                  className="w-full btn-secondary justify-between h-11"
                >
                  View Leaderboard
                  <Trophy className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

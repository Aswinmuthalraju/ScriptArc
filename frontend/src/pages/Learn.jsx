import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import {
  Play, Pause, Volume2, VolumeX, ChevronRight, Star, Lightbulb,
  CheckCircle, XCircle, Loader2, ArrowLeft, Code2, AlertTriangle,
  Trophy, ArrowRight, Lock, Target, Maximize, Minimize, Zap
} from 'lucide-react';
import { RoundSpinner } from '@/components/ui/spinner';

const LANGUAGE_MAP = {
  71: { name: 'Python', monaco: 'python' },
  63: { name: 'JavaScript', monaco: 'javascript' },
  62: { name: 'Java', monaco: 'java' },
  54: { name: 'C++', monaco: 'cpp' },
  50: { name: 'C', monaco: 'c' },
};

const Learn = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  // ── Lesson data ─────────────────────────────────────────────
  const [lesson, setLesson] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [nextLesson, setNextLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Video state ──────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoContainerRef = useRef(null);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // ── Challenge dialog ─────────────────────────────────────────
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [showChallenge, setShowChallenge] = useState(false);

  // ── MCQ state ────────────────────────────────────────────────
  const [selectedOption, setSelectedOption] = useState(null);
  const [mcqAttempts, setMcqAttempts] = useState(0);
  const [mcqResult, setMcqResult] = useState(null); // 'correct' | 'wrong' | null

  // ── Coding challenge state ───────────────────────────────────
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeResult, setCodeResult] = useState(null);
  const [solutionViewed, setSolutionViewed] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState(null);
  const [showHintOption, setShowHintOption] = useState(false);
  const [codeAttemptCount, setCodeAttemptCount] = useState(0);

  // ── Progress state ───────────────────────────────────────────
  const [completedChallenges, setCompletedChallenges] = useState(new Set());
  const [sessionPoints, setSessionPoints] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  // ── Keyboard Shortcuts ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showChallenge || showComplete || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      if (!videoRef.current) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextTime = videoRef.current.currentTime + 10;
          const maxTime = getMaxSeekTime();
          if (nextTime > maxTime) {
            videoRef.current.currentTime = maxTime;
            const blocker = challenges.find(ch => !completedChallenges.has(ch.id) && ch.timestamp_seconds === maxTime);
            if (blocker) {
              videoRef.current.pause();
              setIsPlaying(false);
              openChallenge(blocker);
            }
          } else {
            videoRef.current.currentTime = nextTime;
          }
          break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showChallenge, showComplete, isPlaying, challenges, completedChallenges]); // eslint-disable-line

  useEffect(() => { fetchLessonData(); }, [lessonId]); // eslint-disable-line

  const fetchLessonData = async () => {
    try {
      const { data: lessonData, error: lessonErr } = await supabase
        .from('lessons').select('*').eq('id', lessonId).single();

      if (lessonErr || !lessonData) { setLoading(false); return; }

      const { data: challengeData } = await supabase
        .from('challenges').select('*')
        .eq('lesson_id', lessonId)
        .order('timestamp_seconds', { ascending: true });

      const { data: nextLessonData } = await supabase
        .from('lessons').select('id, title, order_index')
        .eq('course_id', lessonData.course_id)
        .eq('order_index', lessonData.order_index + 1)
        .single();

      // Restore existing progress
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prog } = await supabase
          .from('user_progress').select('*')
          .eq('user_id', user.id).eq('lesson_id', lessonId).single();
        if (prog) {
          setCompletedChallenges(new Set(prog.completed_challenge_ids || []));
          setSessionPoints(prog.stars_earned || 0);
          if (prog.completed) setShowComplete(true);
        }
      }

      setLesson(lessonData);
      setChallenges(challengeData || []);
      setNextLesson(nextLessonData || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // ── Video controls ───────────────────────────────────────────
  // Use requestAnimationFrame to sync visual progress without excessive re-renders
  const updateProgress = () => {
    if (videoRef.current) {
      const now = performance.now();
      if (now - lastUpdateRef.current > 200) {
        setCurrentTime(videoRef.current.currentTime);
        lastUpdateRef.current = now;
      }

      // Check for challenge interruptions
      if (!showChallenge) {
        const sorted = [...challenges].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
        // Add a tiny buffer (0.1s) to prevent skipping if frame arrives slightly late
        for (const ch of sorted) {
          if (!completedChallenges.has(ch.id) && videoRef.current.currentTime >= ch.timestamp_seconds) {
            videoRef.current.currentTime = ch.timestamp_seconds;
            videoRef.current.pause();
            setIsPlaying(false);
            openChallenge(ch);
            return; // stop updates while challenge is open
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    if (isPlaying && !showChallenge) {
      rafRef.current = requestAnimationFrame(updateProgress);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, showChallenge, challenges, completedChallenges]); // eslint-disable-line

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) { console.error("Error attempting to enable fullscreen:", err); }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  // ── Locked seek: can't skip past uncompleted challenges ────
  const getMaxSeekTime = () => {
    const sorted = [...challenges].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    for (const ch of sorted) {
      if (!completedChallenges.has(ch.id)) return ch.timestamp_seconds;
    }
    return duration; // all done → full seek
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let targetTime = ((e.clientX - rect.left) / rect.width) * duration;
    const maxTime = getMaxSeekTime();
    if (targetTime > maxTime) {
      targetTime = maxTime;
      // trigger the challenge if seeking past it
      const blocker = challenges.find(ch => !completedChallenges.has(ch.id) && ch.timestamp_seconds === maxTime);
      if (blocker) {
        videoRef.current.currentTime = targetTime;
        videoRef.current.pause();
        setIsPlaying(false);
        openChallenge(blocker);
        return;
      }
    }
    videoRef.current.currentTime = targetTime;
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // ── Challenge open / close ───────────────────────────────────
  const openChallenge = (ch) => {
    setActiveChallenge(ch);
    setShowChallenge(true);
    // Reset MCQ
    setSelectedOption(null);
    setMcqAttempts(0);
    setMcqResult(null);
    // Reset coding
    setCode(ch.initial_code || '');
    setCodeResult(null);
    setSolutionViewed(false);
    setShowSolution(false);
    setHintsUsed(0);
    setCurrentHint(null);
    setShowHintOption(false);
    setCodeAttemptCount(0);
    setSubmitting(false);
  };

  const resumeVideo = () => {
    setShowChallenge(false);
    setActiveChallenge(null);
    if (videoRef.current && !showComplete) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // ── Progress save ────────────────────────────────────────────
  const saveProgress = async (newCompleted, newStars) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const isComplete = newCompleted.size >= challenges.length && challenges.length > 0;
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: lesson.course_id,
        completed: isComplete,
        stars_earned: newStars,
        completed_challenge_ids: Array.from(newCompleted),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });
      if (isComplete) setShowComplete(true);
    } catch (e) { console.error('saveProgress:', e); }
  };

  const onChallengeComplete = async (pointsEarned) => {
    if (completedChallenges.has(activeChallenge?.id)) return;
    const newCompleted = new Set([...completedChallenges, activeChallenge.id]);
    const newPoints = sessionPoints + pointsEarned;
    setCompletedChallenges(newCompleted);
    setSessionPoints(newPoints);
    await saveProgress(newCompleted, newPoints);
  };

  // ── MCQ handlers ─────────────────────────────────────────────
  const submitMCQ = async () => {
    if (selectedOption === null) return;
    if (completedChallenges.has(activeChallenge?.id)) return;
    const newAttempts = mcqAttempts + 1;
    setMcqAttempts(newAttempts);

    if (selectedOption === activeChallenge.correct_option) {
      setMcqResult('correct');
      // Save submission
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('submissions').insert({
            user_id: user.id,
            challenge_id: activeChallenge.id,
            attempts: newAttempts,
            hint_used: newAttempts > 2,
            stars_awarded: 1,
          });
        }
      } catch { /* non-critical */ }
      await onChallengeComplete(1);
    } else {
      setMcqResult('wrong');
      setSelectedOption(null);
      setTimeout(() => setMcqResult(null), 1000);
    }
  };

  // ── Coding handlers ──────────────────────────────────────────
  const getMarksPreview = () => solutionViewed ? 0 : hintsUsed > 0 ? 1 : 2;

  const saveCodeSubmission = async (marksEarned) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('submissions').insert({
      user_id: user.id,
      challenge_id: activeChallenge.id,
      attempts: codeAttemptCount,
      hint_used: hintsUsed > 0,
      solution_viewed: solutionViewed,
      stars_awarded: marksEarned,
    });
    if (error) toast.error('Progress could not be saved.');
  };

  const viewSolution = () => {
    if (!solutionViewed) {
      setSolutionViewed(true);
      toast.warning('Solution viewed — points reduced to 0.');
    }
    setShowSolution(prev => !prev);
  };

  const requestHint = () => {
    const hints = activeChallenge?.hints || [];
    const newCount = hintsUsed + 1;
    if (newCount <= hints.length) {
      setCurrentHint(hints[newCount - 1]);
      setHintsUsed(newCount);
      toast.info('Hint unlocked! Points reduced to 1.');
    } else {
      toast.info('No more hints available.');
    }
  };

  const submitCode = async () => {
    if (!activeChallenge || !code.trim()) return;
    if (completedChallenges.has(activeChallenge?.id)) return;
    setSubmitting(true);
    setCodeResult(null);
    const newAttempt = codeAttemptCount + 1;
    setCodeAttemptCount(newAttempt);
    try {
      // TODO: Replace with Judge0 API
      const passed = code.trim().length > 0;
      if (passed) {
        const marks = getMarksPreview();
        await saveCodeSubmission(marks);
        setCodeResult({ passed: true, marks_earned: marks });
        toast.success(marks === 2 ? '⚡ +2 Points earned!' : marks === 1 ? '✅ +1 Point earned.' : 'Solution viewed: 0 Points earned.');
        await onChallengeComplete(marks);
      } else {
        setCodeResult({ passed: false });
        if (newAttempt >= 2) setShowHintOption(true);
      }
    } catch { toast.error('Submission failed.'); }
    finally { setSubmitting(false); }
  };

  // ── Render helpers ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-outfit text-foreground mb-4">Lesson not found</h2>
          <Button onClick={() => navigate('/courses')} className="btn-primary">Browse Courses</Button>
        </div>
      </div>
    );
  }

  const progressPct = challenges.length
    ? Math.round((completedChallenges.size / challenges.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pt-16" data-testid="learn-page">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">

        {/* ── Video Section ── */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="p-4">
            <button
              onClick={() => navigate(`/courses/${lesson.course_id}`)}
              className="flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </button>
          </div>

          {/* Video Player */}
          <div className="flex-1 flex flex-col">
            <div ref={videoContainerRef} className={`relative bg-black flex flex-col justify-center ${isFullscreen ? 'h-screen w-screen fixed inset-0 z-50' : 'aspect-video'}`}>
              {lesson.video_url || lesson.order_index ? (
                <video
                  ref={videoRef}
                  src={`/Course/Data Science/lecture${lesson.order_index}.mp4`}
                  className={`${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-full'} w-full object-contain cursor-pointer`}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onWaiting={() => setIsBuffering(true)}
                  onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
                  onClick={togglePlay}
                  data-testid="video-player"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface">
                  <div className="text-center">
                    <Code2 className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-secondary font-medium mb-1">{lesson.title}</p>
                    <p className="text-sm text-text-secondary">Video coming soon — complete challenges below</p>
                  </div>
                </div>
              )}

              {isBuffering && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-emerald-900/20 backdrop-blur-sm">
                  <div className="bg-emerald-950/80 p-5 rounded-full backdrop-blur-md shadow-2xl border border-emerald-500/30">
                    <RoundSpinner size="xl" color="green" />
                  </div>
                </div>
              )}

              {/* Video Controls overlay when fullscreen or relative when inline */}
              <div className={`${isFullscreen ? 'absolute bottom-0 left-0 right-0 h-[80px] bg-black/80 backdrop-blur-md px-6' : 'bg-surface-highlight p-4 relative'}`}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-surface cursor-pointer z-0 transform -translate-y-1/2" onClick={handleSeek} data-testid="video-progress">
                  <div className="h-full bg-primary transition-all relative" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                    {/* Playhead */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md" />
                  </div>
                  {/* Challenge markers on timeline */}
                  {challenges.map((ch) => (
                    <div
                      key={ch.id}
                      className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ left: `${(ch.timestamp_seconds / (duration || 1)) * 100}%` }}
                    >
                      <div className={`w-3 h-3 rotate-45 shadow-[0_0_10px_rgba(37,99,235,0.2)] ${completedChallenges.has(ch.id) ? 'bg-accent' : 'bg-primary'}`}
                        title={ch.title} />
                    </div>
                  ))}
                </div>
                <div className={`flex items-center justify-between ${isFullscreen ? 'h-full' : 'mt-2'}`}>
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-md transition-colors" data-testid="play-pause-btn">
                      {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                    </button>
                    <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-md transition-colors">
                      {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                    </button>
                    <span className="text-sm text-text-secondary font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-white">{sessionPoints}</span>
                      <span className="text-xs text-text-secondary">points</span>
                    </div>
                    <div className="w-px h-6 bg-border mx-2" />
                    <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-md transition-colors">
                      {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lesson Progress Bar */}
            <div className="px-4 py-3 bg-surface border-t border-border">
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
                <span className="font-medium text-foreground">{lesson.title}</span>
                <span>{completedChallenges.size}/{challenges.length} challenges</span>
              </div>
              <Progress value={progressPct} className="h-1.5 bg-surface-highlight" />
            </div>
          </div>
        </div>

        {/* ── Challenges Panel ── */}
        <div className="lg:w-1/3 bg-surface border-l border-border p-6 overflow-y-auto">
          <h2 className="text-xl font-outfit font-semibold text-foreground mb-1">Challenges</h2>
          <p className="text-sm text-text-secondary mb-4">
            {lesson.title} · {lesson.duration_minutes} min
          </p>

          {challenges.length > 0 ? (
            <div className="space-y-2">
              {challenges.map((ch, i) => {
                const done = completedChallenges.has(ch.id);
                const isMCQ = ch.challenge_type === 'mcq';

                const isLocked = !done && (() => {
                  const sorted = [...challenges].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
                  const firstUncompleted = sorted.find(c => !completedChallenges.has(c.id));
                  if (firstUncompleted && firstUncompleted.id === ch.id) {
                    return currentTime < (ch.timestamp_seconds - 2);
                  }
                  return true; // Future uncompleted challenges are locked
                })();

                return (
                  <div
                    key={ch.id}
                    onClick={() => !isLocked && openChallenge(ch)}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${done ? 'border-accent/40 bg-accent/5 cursor-pointer hover:bg-accent/10' :
                      isLocked ? 'border-border/40 opacity-50 cursor-not-allowed' :
                        'border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10'
                      }`}
                    data-testid={`challenge-card-${ch.id}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-accent/20 text-accent' :
                      isLocked ? 'bg-surface-highlight text-text-secondary' :
                        'bg-primary/20 text-primary'
                      }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> :
                        isLocked ? <Lock className="w-4 h-4" /> :
                          <span className="text-xs font-mono font-bold">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">{ch.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={`text-xs ${isMCQ ? 'border-secondary/40 text-secondary' : 'border-primary/40 text-primary'}`}>
                            {isMCQ ? 'MCQ' : 'Code'}
                          </Badge>
                          <span className="text-xs text-text-secondary">@{formatTime(ch.timestamp_seconds || 0)}</span>
                          {done && (
                            <span className="text-xs text-primary flex items-center gap-0.5">
                              <Target className="w-3 h-3" />
                              +{(ch.star_value || 1)} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-3 h-3 rotate-45 bg-primary/40 shrink-0 ml-2 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Code2 className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary">No challenges in this lesson</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Challenge Dialog
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showChallenge} onOpenChange={() => { }}>
        <DialogContent portalContainer={videoContainerRef.current} className={`${isFullscreen ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0' : 'max-w-2xl max-h-[90vh]'} overflow-hidden bg-surface border-border p-0 flex flex-col`}>
          <DialogHeader className="p-6 pb-0 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-xs ${activeChallenge?.challenge_type === 'mcq' ? 'border-secondary/40 text-secondary' : 'border-primary/40 text-primary'}`}>
                {activeChallenge?.challenge_type === 'mcq' ? 'MCQ Challenge' : 'Coding Challenge'}
              </Badge>
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                🎯 {activeChallenge?.star_value === 2 ? 'Up to 4 points' : '2 points'}
              </Badge>
            </div>
            <DialogTitle className="text-foreground font-outfit text-xl">{activeChallenge?.title}</DialogTitle>
            <DialogDescription className="text-text-secondary whitespace-pre-line mt-2">
              {activeChallenge?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-4 flex-1 overflow-y-auto space-y-4">

            {/* ── MCQ content ── */}
            {activeChallenge?.challenge_type === 'mcq' && (
              <div className={`flex flex-col h-full ${isFullscreen ? 'max-w-4xl mx-auto w-full justify-center' : ''}`}>
                {/* Options */}
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  {(activeChallenge.options || []).map((opt, i) => {
                    const isSelected = selectedOption === i;
                    const isCorrect = mcqResult === 'correct' && i === activeChallenge.correct_option;
                    const isWrong = mcqResult === 'wrong' && isSelected;
                    return (
                      <label
                        key={i}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none ${isCorrect ? 'border-accent bg-accent/10 text-accent' :
                          isWrong ? 'border-destructive bg-destructive/10' :
                            isSelected ? 'border-primary bg-primary/10' :
                              'border-border hover:border-primary/40 hover:bg-surface-highlight/50'
                          } ${mcqResult === 'correct' ? 'pointer-events-none' : ''}`}
                      >
                        <input
                          type="radio"
                          name="mcq"
                          value={i}
                          checked={isSelected}
                          onChange={() => setSelectedOption(i)}
                          disabled={mcqResult === 'correct'}
                          className="accent-primary shrink-0"
                        />
                        <span className="text-sm font-mono font-semibold text-text-secondary mr-1 shrink-0">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <span className={`text-sm ${isCorrect ? 'text-accent font-medium' : 'text-foreground'}`}>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Attempts counter */}
                <p className="text-xs text-text-secondary">
                  Attempts: {mcqAttempts} / 3 {mcqAttempts >= 3 && '(keep trying!)'}
                </p>

                {/* Hint (after 2 failures) */}
                {mcqAttempts >= 2 && activeChallenge.hints?.[0] && (
                  <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl">
                    <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-warning">💡 {activeChallenge.hints[0]}</p>
                  </div>
                )}

                {/* Result feedback */}
                {mcqResult === 'correct' && (
                  <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/30 rounded-xl text-accent">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">✅ Correct! +2 Points Earned</span>
                  </div>
                )}
                {mcqResult === 'wrong' && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">❌ Wrong answer. Try again!</span>
                  </div>
                )}

                {/* Action button */}
                <div className="flex justify-end pt-2 border-t border-border mt-auto">
                  {mcqResult === 'correct' ? (
                    <Button onClick={resumeVideo} className="btn-primary" data-testid="continue-video-btn">
                      Continue Video
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={submitMCQ}
                      disabled={selectedOption === null}
                      className="btn-primary"
                      data-testid="submit-mcq-btn"
                    >
                      Submit Answer
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── Coding content ── */}
            {activeChallenge?.challenge_type === 'coding' && (
              <div className={`flex flex-col h-full ${isFullscreen ? 'max-w-6xl mx-auto w-full' : ''}`}>
                <div className="flex-1 flex flex-col space-y-4 justify-center">
                  {/* Marks preview */}
                  <div className="flex items-center justify-between p-3 bg-surface-highlight rounded-md">
                    <span className="text-sm text-text-secondary">Potential points:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2].map(pip => (
                          <div key={pip} className={`w-6 h-6 rounded border flex items-center justify-center text-xs font-mono font-bold ${getMarksPreview() >= pip ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-border text-text-secondary'
                            }`}>{pip}</div>
                        ))}
                      </div>
                      <span className="text-sm font-mono font-bold">{getMarksPreview()} pts</span>
                      {getMarksPreview() === 2
                        ? <Zap className="w-4 h-4 text-primary" />
                        : getMarksPreview() === 1
                          ? <span className="text-xs text-warning">(reduced)</span>
                          : <span className="text-xs text-destructive">(no points)</span>}
                    </div>
                  </div>

                  {/* Code Editor */}
                  <div className="border border-border rounded-md overflow-hidden flex-1 flex flex-col min-h-[300px]">
                    <div className="bg-[#1e1e1e] p-2 border-b border-border flex items-center justify-between">
                      <Badge className="bg-primary/20 text-primary border-0">
                        {LANGUAGE_MAP[activeChallenge?.language_id]?.name || 'Python'}
                      </Badge>
                      <span className="text-xs text-text-secondary">Attempt #{codeAttemptCount + 1}</span>
                    </div>
                    <div className="flex-1">
                      <Editor
                        height="100%"
                        language={LANGUAGE_MAP[activeChallenge?.language_id]?.monaco || 'python'}
                        theme="vs-dark"
                        value={code}
                        onChange={(v) => setCode(v || '')}
                        options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', padding: { top: 12 }, scrollBeyondLastLine: false }}
                        data-testid="code-editor"
                      />
                    </div>
                  </div>

                  {/* Hint option */}
                  {showHintOption && (activeChallenge.hints || []).length > 0 && !currentHint && (
                    <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/30 rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="text-sm text-warning">Struggling? Get a hint (reduces reward to 1 point)</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={requestHint}
                        className="border-warning text-warning hover:bg-warning/10" data-testid="request-hint-btn">
                        <Lightbulb className="w-4 h-4 mr-1" />
                        Get Hint
                      </Button>
                    </div>
                  )}

                  {currentHint && (
                    <div className="p-3 bg-primary/10 border border-primary/30 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Hint {hintsUsed}</span>
                      </div>
                      <p className="text-sm text-text-secondary">{currentHint}</p>
                    </div>
                  )}

                  {/* View Solution */}
                  {(codeAttemptCount >= 2 || hintsUsed > 0) && activeChallenge?.solution && (
                    <div className="flex items-center justify-between p-3 bg-secondary/10 border border-secondary/30 rounded-md">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-secondary" />
                        <span className="text-sm text-secondary">
                          {solutionViewed ? 'Solution viewed (0 points)' : 'Warning: Viewing solution results in 0 points for this challenge'}
                        </span>
                      </div>
                      <Button size="sm" variant="outline" onClick={viewSolution}
                        className="border-secondary text-secondary hover:bg-secondary/10" data-testid="view-solution-btn">
                        {showSolution ? 'Hide' : 'View'}
                      </Button>
                    </div>
                  )}

                  {showSolution && activeChallenge?.solution && (
                    <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Code2 className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-medium text-secondary">Solution</span>
                      </div>
                      <pre className="text-sm font-mono bg-black/30 p-3 rounded overflow-x-auto">{activeChallenge.solution}</pre>
                    </div>
                  )}

                  {/* Code result */}
                  {codeResult && (
                    <div className={`p-3 rounded-md ${codeResult.passed ? 'bg-accent/10 border border-accent/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                      <div className="flex items-center gap-2">
                        {codeResult.passed
                          ? <CheckCircle className="w-4 h-4 text-accent" />
                          : <XCircle className="w-4 h-4 text-destructive" />}
                        <span className={`text-sm font-medium ${codeResult.passed ? 'text-accent' : 'text-destructive'}`}>
                          {codeResult.passed
                            ? (codeResult.marks_earned === 2 ? '⚡ +2 Points earned!' : codeResult.marks_earned === 1 ? '✅ +1 Point earned' : 'Completed (0 Points)')
                            : 'Not quite right — try again'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                  {completedChallenges.has(activeChallenge?.id) ? (
                    <Button variant="ghost" onClick={resumeVideo} className="text-accent" data-testid="continue-btn">
                      Continue <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <span className="text-xs text-text-secondary">Complete this challenge to continue</span>
                  )}
                  <Button
                    onClick={submitCode}
                    disabled={submitting || completedChallenges.has(activeChallenge?.id)}
                    className="btn-primary"
                    data-testid="submit-code-btn"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    Run Code
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          Lesson Complete Dialog
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showComplete} onOpenChange={() => { }}>
        <DialogContent className="max-w-md bg-surface border-border text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-outfit font-bold text-foreground">Lesson Complete! 🎉</h2>
            <p className="text-text-secondary">{lesson.title}</p>

            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-6 py-3 rounded-full">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionPoints * 2}</span>
              <span className="text-sm text-text-secondary">points earned</span>
            </div>

            <div className="flex flex-col gap-2 w-full pt-2">
              {nextLesson ? (
                <Button
                  onClick={() => navigate(`/learn/${nextLesson.id}`)}
                  className="btn-primary w-full"
                  data-testid="next-lesson-btn"
                >
                  Next: {nextLesson.title}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                  <p className="text-sm font-medium text-primary">🎓 You've completed all lessons!</p>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => navigate(`/courses/${lesson.course_id}`)}
                className="text-text-secondary"
                data-testid="back-to-course-btn"
              >
                Back to Course
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Learn;

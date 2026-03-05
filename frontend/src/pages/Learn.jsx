import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
  Trophy, ArrowRight, Lock, Target, Maximize, Minimize, Zap, X
} from 'lucide-react';
import { RoundSpinner } from '@/components/ui/spinner';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

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
  const { user: authUser } = useAuth();
  const hasSpecialAccess = authUser?.has_special_access === true;
  const videoRef = useRef(null);
  const completingRef = useRef(false);

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
  const [videoError, setVideoError] = useState(false);
  const videoContainerRef = useRef(null);
  const bufferingTimerRef = useRef(null);
  const lastTimeUpdateRef = useRef(0);
  const sortedChallengesRef = useRef([]);
  const completedChallengesRef = useRef(new Set());

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

  // ── Mobile detection ─────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Keep refs in sync for use in onTimeUpdate (avoids stale closures) ──
  useEffect(() => {
    sortedChallengesRef.current = [...challenges].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  }, [challenges]);
  useEffect(() => {
    completedChallengesRef.current = completedChallenges;
  }, [completedChallenges]);

  // ── Memoize video URL so it never changes within the same lesson ──
  const videoUrl = useMemo(() => {
    if (!lesson) return '';
    const bucketUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dktkhwzhlsuahokrsxef.supabase.co';
    const isDSCourse = (lesson.title || '').toLowerCase().includes('data science')
      || (lesson.course_id === 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c');
    let filePath = '';
    if (isDSCourse) {
      const unit = lesson.order_index <= 11 ? 'Unit1' : 'Unit2';
      const fileIndex = lesson.order_index <= 11 ? lesson.order_index : lesson.order_index - 11;
      filePath = `videos/Course/Data Science/${unit}/lecture${fileIndex}.mp4`;
    } else {
      filePath = `videos/Course/Data Science/lecture${lesson.order_index}.mp4`;
    }
    return `${bucketUrl}/storage/v1/object/public/${encodeURI(filePath)}`;
  }, [lesson]);

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

  useEffect(() => {
    setVideoError(false);
    setIsBuffering(false);
    clearTimeout(bufferingTimerRef.current);
    fetchLessonData();
    return () => clearTimeout(bufferingTimerRef.current);
  }, [lessonId]); // eslint-disable-line

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
        .maybeSingle();

      // Restore existing progress
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prog } = await supabase
          .from('user_progress').select('*')
          .eq('user_id', user.id).eq('lesson_id', lessonId).maybeSingle();
        if (prog) {
          setCompletedChallenges(new Set(prog.completed_challenge_ids || []));
          setSessionPoints(prog.stars_earned || 0);
          if (prog.completed) setShowComplete(true);
        } else {
          // Auto-enroll on first visit so CourseSingle sees progress
          await supabase.from('user_progress').insert({
            user_id: user.id,
            lesson_id: lessonId,
            course_id: lessonData.course_id,
            completed: false,
            stars_earned: 0,
            completed_challenge_ids: []
          }).select().maybeSingle();
        }
      }

      setLesson(lessonData);
      setChallenges(challengeData || []);
      setNextLesson(nextLessonData || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // ── Video controls ───────────────────────────────────────────
  // Use native onTimeUpdate instead of RAF — fires ~4x/sec, throttled to ~2x/sec
  // for state updates. Challenge checks use pre-sorted ref to avoid re-sorting.
  const handleTimeUpdate = () => {
    if (!videoRef.current || showChallenge) return;
    const time = videoRef.current.currentTime;

    // Throttle React state updates to ~2/sec for the progress bar
    const now = performance.now();
    if (now - lastTimeUpdateRef.current > 500) {
      setCurrentTime(time);
      lastTimeUpdateRef.current = now;
    }

    // Challenge interruption check (uses pre-sorted ref)
    if (!hasSpecialAccess) {
      for (const ch of sortedChallengesRef.current) {
        if (!completedChallengesRef.current.has(ch.id) && time >= ch.timestamp_seconds) {
          videoRef.current.currentTime = ch.timestamp_seconds;
          videoRef.current.pause();
          openChallenge(ch);
          return;
        }
      }
    }
  };

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
    if (hasSpecialAccess) return duration; // special access → unrestricted seek
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
    setSubmitting(false);
    // Only reset solution/hint state when opening a different challenge
    if (!activeChallenge || activeChallenge.id !== ch.id) {
      setSolutionViewed(false);
      setShowSolution(false);
      setHintsUsed(0);
      setCurrentHint(null);
      setShowHintOption(false);
      setCodeAttemptCount(0);
    }
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
    } catch (e) {
      console.error('saveProgress:', e);
      toast.error('Progress could not be saved. Please check your connection.');
    }
  };

  const onChallengeComplete = async (pointsEarned) => {
    if (completedChallenges.has(activeChallenge?.id)) return;
    if (completingRef.current) return;
    completingRef.current = true;
    try {
      const newCompleted = new Set([...completedChallenges, activeChallenge.id]);
      const newPoints = sessionPoints + pointsEarned;
      setCompletedChallenges(newCompleted);
      setSessionPoints(newPoints);
      await saveProgress(newCompleted, newPoints);
    } finally {
      completingRef.current = false;
    }
  };

  // ── MCQ handlers ─────────────────────────────────────────────
  const submitMCQ = async () => {
    if (selectedOption === null) return;
    if (completedChallenges.has(activeChallenge?.id)) return;
    const newAttempts = mcqAttempts + 1;
    setMcqAttempts(newAttempts);

    if (selectedOption === activeChallenge.correct_option) {
      setMcqResult('correct');
      // Save submission — MCQ: 2 pts (no hint), 1 pt (hint shown), 0 pts (solution)
      const mcqHintUsed = newAttempts > 2 && (activeChallenge.hints?.length > 0);
      const mcqPoints = mcqHintUsed ? 1 : 2;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('submissions').insert({
            user_id: user.id,
            challenge_id: activeChallenge.id,
            attempts: newAttempts,
            hint_used: mcqHintUsed,
            stars_awarded: mcqPoints,
          });
        }
      } catch { /* non-critical */ }
      await onChallengeComplete(mcqPoints);
    } else {
      setMcqResult('wrong');
      setSelectedOption(null);
      setTimeout(() => setMcqResult(null), 1000);
    }
  };

  // ── Coding handlers ──────────────────────────────────────────
  // Coding: 4 pts (independent), 2 pts (hint), 0 pts (solution viewed)
  const getMarksPreview = () => solutionViewed ? 0 : hintsUsed > 0 ? 2 : 4;

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
      toast.warning('Solution viewed — 0 points.');
    }
    setShowSolution(prev => !prev);
  };

  const requestHint = () => {
    const hints = activeChallenge?.hints || [];
    const newCount = hintsUsed + 1;
    if (newCount <= hints.length) {
      setCurrentHint(hints[newCount - 1]);
      setHintsUsed(newCount);
      toast.info('Hint unlocked! Points reduced to 2.');
    } else {
      toast.info('No more hints available.');
    }
  };

  // ── Shared: call code execution via Supabase Edge Function ───
  // Data science courses route to the Python Runner (NumPy, Pandas, etc.)
  const isDataScienceCourse = (lesson?.title || '').toLowerCase().includes('data science')
    || (lesson?.course_id === 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c'); // DS course ID

  const executeCode = async (sourceCode, languageId) => {
    const { data, error } = await supabase.functions.invoke('execute-code', {
      body: {
        code: sourceCode,
        language_id: languageId,
        use_python_runner: isDataScienceCourse,
      },
    });
    if (error) throw new Error(error.message || 'Edge function error');
    return data; // { stdout, stderr, compile_output, status, status_id, time, memory }
  };

  const runCode = async () => {
    if (!activeChallenge || !code.trim()) return;
    setSubmitting(true);
    setCodeResult(null);
    try {
      const result = await executeCode(code, activeChallenge.language_id ?? 71);
      const hasOutput = !!result.stdout?.trim();
      const hasError = !!(result.stderr?.trim() || result.compile_output?.trim());
      const errorText = (result.compile_output || result.stderr || '').trim();

      setCodeResult({
        type: 'test',
        passed: !hasError && hasOutput,
        output: result.stdout?.trim() || '(No output)',
        error: hasError ? errorText : null,
        time: result.time,
        status: result.status,
      });
    } catch (err) {
      toast.error('Execution failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitSolution = async () => {
    if (!activeChallenge || !code.trim()) return;
    if (completedChallenges.has(activeChallenge?.id)) return;

    setSubmitting(true);
    setCodeResult(null);
    const newAttempt = codeAttemptCount + 1;
    setCodeAttemptCount(newAttempt);

    try {
      const result = await executeCode(code, activeChallenge.language_id ?? 71);

      // Judge0 status IDs: 3 = Accepted, others = various failures
      const hasError = !!(result.stderr?.trim() || result.compile_output?.trim());
      const passed = result.status_id === 3 && !hasError;
      const errorText = (result.compile_output || result.stderr || '').trim();

      if (passed) {
        const marks = getMarksPreview();
        await saveCodeSubmission(marks);
        setCodeResult({
          type: 'submission',
          passed: true,
          marks_earned: marks,
          output: result.stdout?.trim(),
          time: result.time,
          status: result.status,
        });
        toast.success(marks === 4 ? '⚡ +4 Points earned!' : marks === 2 ? '✅ +2 Points earned.' : 'Solution viewed: 0 Points.');
        await onChallengeComplete(marks);
      } else {
        setCodeResult({
          type: 'submission',
          passed: false,
          error: errorText || `Runtime error: ${result.status}`,
          output: result.stdout?.trim() || null,
          time: result.time,
          status: result.status,
        });
        if (newAttempt >= 2) setShowHintOption(true);
      }
    } catch (err) {
      toast.error('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
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
                  src={videoUrl}
                  preload="metadata"
                  playsInline
                  className={`${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-full'} w-full object-contain cursor-pointer`}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => {
                    setIsPlaying(false);
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onSeeked={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onWaiting={() => {
                    clearTimeout(bufferingTimerRef.current);
                    bufferingTimerRef.current = setTimeout(() => setIsBuffering(true), 1500);
                  }}
                  onPlaying={() => {
                    clearTimeout(bufferingTimerRef.current);
                    setIsBuffering(false);
                    setIsPlaying(true);
                  }}
                  onCanPlay={() => {
                    clearTimeout(bufferingTimerRef.current);
                    setIsBuffering(false);
                  }}
                  onError={() => {
                    clearTimeout(bufferingTimerRef.current);
                    setIsBuffering(false);
                    setVideoError(true);
                  }}
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

              {isBuffering && !videoError && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-emerald-900/20 backdrop-blur-sm">
                  <div className="bg-emerald-950/80 p-5 rounded-full backdrop-blur-md shadow-2xl border border-emerald-500/30">
                    <RoundSpinner size="xl" color="green" />
                  </div>
                </div>
              )}

              {videoError && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <XCircle className="w-12 h-12 text-destructive mx-auto" />
                    <p className="text-white font-medium">Video failed to load</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => {
                        setVideoError(false);
                        setIsBuffering(false);
                        if (videoRef.current) videoRef.current.load();
                      }}
                    >
                      Retry
                    </Button>
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
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={togglePlay} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-md transition-colors" data-testid="play-pause-btn">
                      {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                    </button>
                    <button onClick={toggleMute} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-md transition-colors">
                      {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                    </button>
                    <span className="text-xs sm:text-sm text-text-secondary font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      <span className="text-xs sm:text-sm font-semibold text-white">{sessionPoints}</span>
                      <span className="hidden sm:inline text-xs text-text-secondary">points</span>
                    </div>
                    <div className="hidden sm:block w-px h-6 bg-border mx-1" />
                    <button onClick={toggleFullscreen} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-md transition-colors">
                      {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
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
        <div className="lg:w-1/3 bg-surface border-t lg:border-t-0 lg:border-l border-border p-4 sm:p-6 overflow-y-auto">
          <h2 className="text-xl font-outfit font-semibold text-foreground mb-1">Challenges</h2>
          <p className="text-sm text-text-secondary mb-4">
            {lesson.title} · {lesson.duration_minutes} min
          </p>

          {challenges.length > 0 ? (
            <div className="space-y-2">
              {challenges.map((ch, i) => {
                const done = completedChallenges.has(ch.id);
                const isMCQ = ch.challenge_type === 'mcq';

                const isLocked = !done && !hasSpecialAccess && (() => {
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
                              +{isMCQ ? 2 : 4} pts
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
        <DialogContent
          portalContainer={videoContainerRef.current}
          aria-describedby={activeChallenge?.challenge_type === 'coding' ? 'coding-challenge-desc' : undefined}
          className={
            activeChallenge?.challenge_type === 'coding'
              ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0 bg-[#0f111a] p-0 flex flex-col'
              : `${isFullscreen ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0' : 'w-[95vw] sm:max-w-2xl max-h-[92vh]'
              } overflow-hidden bg-surface border-border p-0 flex flex-col`
          }
        >
          {/* Accessible title/description for coding challenges (visually hidden) */}
          {activeChallenge?.challenge_type === 'coding' && (
            <>
              <DialogTitle className="sr-only">{activeChallenge?.title || 'Coding Challenge'}</DialogTitle>
              <DialogDescription id="coding-challenge-desc" className="sr-only">
                {activeChallenge?.description || 'Complete the coding challenge'}
              </DialogDescription>
            </>
          )}

          {/* MCQ Header (Only shown for MCQ) */}
          {activeChallenge?.challenge_type === 'mcq' && (
            <DialogHeader className="p-4 sm:p-6 pb-0 flex-shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs border-secondary/40 text-secondary">
                  MCQ Challenge
                </Badge>
                <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                  🎯 Up to 2 points
                </Badge>
              </div>
              <DialogTitle className="text-foreground font-outfit text-xl">{activeChallenge?.title}</DialogTitle>
              <DialogDescription className="text-text-secondary whitespace-pre-line mt-2">
                {activeChallenge?.description}
              </DialogDescription>
            </DialogHeader>
          )}

          <div className={activeChallenge?.challenge_type === 'coding' ? 'flex-1 overflow-hidden flex flex-col' : 'p-4 sm:p-6 pt-3 sm:pt-4 flex-1 overflow-y-auto space-y-3 sm:space-y-4'}>

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
                        className={`flex items-center gap-3 p-3 sm:p-3.5 min-h-[48px] rounded-xl border cursor-pointer transition-all select-none ${isCorrect ? 'border-accent bg-accent/10 text-accent' :
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
                {mcqResult === 'correct' && (() => {
                  const earnedPts = (mcqAttempts > 2 && activeChallenge.hints?.length > 0) ? 1 : 2;
                  return (
                    <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/30 rounded-xl text-accent">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">✅ Correct! +{earnedPts} {earnedPts === 1 ? 'Point' : 'Points'} Earned</span>
                    </div>
                  );
                })()}
                {mcqResult === 'wrong' && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">❌ Wrong answer. Try again!</span>
                  </div>
                )}

                {/* Action button */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border mt-auto">
                  {hasSpecialAccess && mcqResult !== 'correct' && (
                    <Button variant="outline" onClick={resumeVideo} className="border-warning text-warning hover:bg-warning/10" data-testid="skip-challenge-btn">
                      Skip Challenge
                    </Button>
                  )}
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
              <div className="flex flex-col h-full bg-[#0f111a]">
                {/* Header Navbar */}
                <div className="flex items-center justify-between p-4 border-b border-border/40 bg-[#161b22]">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/10">
                      Coding Challenge
                    </Badge>
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/10">
                      <Target className="w-3 h-3 mr-1 text-accent" />
                      Up to 4 points
                    </Badge>
                  </div>
                  <button onClick={resumeVideo} className="p-2 text-text-secondary hover:text-white transition-colors rounded-md hover:bg-white/10" data-testid="close-challenge-btn">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Resizable Panels */}
                <div className="flex-1 overflow-hidden">
                  <PanelGroup direction={isMobile ? "vertical" : "horizontal"}>
                    {/* Left/Top Panel: Description and Output */}
                    <Panel defaultSize={isMobile ? 50 : 40} minSize={25} className="bg-[#0f111a] flex flex-col p-4">
                      <PanelGroup direction="vertical">
                        {/* Description Panel */}
                        <Panel defaultSize={60} minSize={30} className="flex flex-col pr-2 pb-2 overflow-y-auto">
                          <h2 className="text-2xl font-bold font-outfit text-white mb-4">{activeChallenge?.title}</h2>
                          <div className="text-text-secondary whitespace-pre-line mb-8 text-[15px] leading-relaxed">
                            {activeChallenge?.description}
                          </div>

                          {/* Marks preview */}
                          <div className="flex items-center justify-between p-4 bg-[#161b22] border border-border/40 rounded-xl mb-6">
                            <span className="text-sm text-text-secondary">Potential points:</span>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4].map(pip => (
                                  <div key={pip} className={`w-7 h-7 rounded border flex items-center justify-center text-sm font-mono font-bold ${getMarksPreview() >= pip ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-border text-text-secondary'
                                    }`}>{pip}</div>
                                ))}
                              </div>
                              <span className="text-base font-mono font-bold text-white">{getMarksPreview()} pts</span>
                              {getMarksPreview() === 4
                                ? <Zap className="w-4 h-4 text-primary" />
                                : getMarksPreview() > 0
                                  ? <span className="text-xs text-warning">(reduced)</span>
                                  : <span className="text-xs text-destructive">(no points)</span>}
                            </div>
                          </div>

                          {/* Hint & Solution options */}
                          <div className="space-y-4">
                            {showHintOption && (activeChallenge.hints || []).length > 0 && !currentHint && (
                              <div className="flex items-center justify-between p-4 bg-warning/10 border border-warning/30 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-warning" />
                                  <span className="text-sm text-warning">Struggling? Get a hint (reduces to 1 point)</span>
                                </div>
                                <Button size="sm" variant="outline" onClick={requestHint}
                                  className="border-warning text-warning hover:bg-warning/10" data-testid="request-hint-btn">
                                  <Lightbulb className="w-4 h-4 mr-1" />
                                  Get Hint
                                </Button>
                              </div>
                            )}

                            {currentHint && (
                              <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                  <Lightbulb className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium text-primary">Hint {hintsUsed}</span>
                                </div>
                                <p className="text-sm text-text-secondary leading-relaxed">{currentHint}</p>
                              </div>
                            )}

                            {(codeAttemptCount >= 2 || hintsUsed > 0) && activeChallenge?.solution && (
                              <div className="flex items-center justify-between p-4 bg-secondary/10 border border-secondary/30 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <Code2 className="w-4 h-4 text-secondary" />
                                  <span className="text-sm text-secondary">
                                    {solutionViewed ? 'Solution viewed (0 points)' : 'Warning: Viewing solution reduces to 0 points'}
                                  </span>
                                </div>
                                <Button size="sm" variant="outline" onClick={viewSolution}
                                  className="border-secondary text-secondary hover:bg-secondary/10" data-testid="view-solution-btn">
                                  {showSolution ? 'Hide' : 'View'}
                                </Button>
                              </div>
                            )}

                            {showSolution && activeChallenge?.solution && (
                              <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                  <Code2 className="w-4 h-4 text-secondary" />
                                  <span className="text-sm font-medium text-secondary">Solution</span>
                                </div>
                                <pre className="text-sm font-mono bg-[#0d1017] p-4 rounded-lg overflow-x-auto text-text-secondary border border-border/40">
                                  {activeChallenge.solution}
                                </pre>
                              </div>
                            )}
                          </div>
                        </Panel>

                        <PanelResizeHandle className="h-1.5 bg-border/40 hover:bg-primary/50 transition-colors cursor-row-resize flex items-center justify-center my-2">
                          <div className="w-8 h-1 bg-surface-highlight rounded" />
                        </PanelResizeHandle>

                        {/* Output Panel & Buttons */}
                        <Panel defaultSize={40} minSize={20} className="flex flex-col border border-border/40 rounded-xl overflow-hidden bg-[#161b22]">
                          <div className="bg-[#1e1e1e] p-3 border-b border-border/40 flex items-center justify-between">
                            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider ml-2">Code Output</span>

                            <div className="flex items-center gap-2">
                              {hasSpecialAccess && codeResult?.type !== 'submission' && (
                                <Button size="sm" variant="outline" onClick={resumeVideo} className="text-warning h-8 text-xs">Skip</Button>
                              )}
                              <Button size="sm" variant="outline" onClick={runCode} disabled={submitting} className="h-8 text-xs text-blue-400 border-blue-400 bg-blue-400/10 hover:bg-blue-400/20">
                                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                                Run Code
                              </Button>
                              <Button size="sm" onClick={submitSolution} disabled={submitting} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                                Check Solution
                              </Button>
                            </div>
                          </div>

                          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-black text-white whitespace-pre-wrap">
                            {codeResult ? (
                              <>
                                <div className={`mb-3 pb-2 border-b text-xs font-bold ${codeResult.passed ? 'text-emerald-400 border-emerald-900/50' : 'text-red-400 border-red-900/50'}`}>
                                  STATUS: {codeResult.passed ? 'Accepted' : 'Failed'}
                                  {codeResult.time ? ` (${codeResult.time}s)` : ''}
                                  {codeResult.type === 'submission' && codeResult.passed && ` • Earned +${codeResult.marks_earned} pts`}
                                </div>
                                {codeResult.error ? (
                                  <span className="text-red-400">{codeResult.error}</span>
                                ) : (
                                  <span className="text-gray-300">{codeResult.output || '(No output)'}</span>
                                )}
                                {codeResult.type === 'submission' && codeResult.passed && !completedChallenges.has(activeChallenge?.id) && (
                                  <div className="mt-4 pt-4 border-t border-emerald-900/50">
                                    <Button onClick={resumeVideo} className="bg-emerald-500 hover:bg-emerald-400 text-white w-full">
                                      Continue Video
                                      <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                  </div>
                                )}
                                {codeResult.type === 'submission' && codeResult.passed && completedChallenges.has(activeChallenge?.id) && (
                                  <div className="mt-4 pt-4 border-t border-emerald-900/50">
                                    <Button onClick={resumeVideo} className="bg-emerald-500 hover:bg-emerald-400 text-white w-full">
                                      Close & Continue
                                      <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-text-secondary opacity-50">Run code to see output...</span>
                            )}
                          </div>
                        </Panel>
                      </PanelGroup>
                    </Panel>

                    <PanelResizeHandle className={`${isMobile ? 'h-1.5 cursor-row-resize' : 'w-1.5 cursor-col-resize'} bg-border/40 hover:bg-primary/50 transition-colors flex items-center justify-center`}>
                      <div className={isMobile ? 'w-8 h-1 bg-surface-highlight rounded' : 'h-8 w-1 bg-surface-highlight rounded'} />
                    </PanelResizeHandle>

                    {/* Right/Bottom Panel: Code Editor */}
                    <Panel defaultSize={isMobile ? 50 : 60} minSize={30} className={`flex flex-col ${isMobile ? 'px-4 pb-4 pt-0' : 'pl-4 py-4 pr-6'}`}>
                      <div className="flex flex-col h-full bg-[#161b22] border border-border/40 rounded-xl overflow-hidden">
                        {/* Editor Header */}
                        <div className="bg-[#1e1e1e] p-3 border-b border-border/40 flex items-center justify-between shadow-sm z-10">
                          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider ml-2">Code Editor</span>
                          <div className="flex items-center gap-3 mr-2">
                            <Badge className="bg-primary/10 text-primary border-primary/20 pointer-events-none">
                              {LANGUAGE_MAP[activeChallenge?.language_id]?.name || 'Python'}
                            </Badge>
                            <span className="text-xs text-text-secondary font-mono">Attempt #{codeAttemptCount + 1}</span>
                          </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 relative">
                          <Editor
                            height="100%"
                            language={LANGUAGE_MAP[activeChallenge?.language_id]?.monaco || 'python'}
                            theme="vs-dark"
                            value={code}
                            onChange={(v) => setCode(v || '')}
                            options={{
                              minimap: { enabled: false },
                              fontSize: isMobile ? 13 : 15,
                              fontFamily: 'JetBrains Mono, monospace',
                              padding: { top: 12 },
                              scrollBeyondLastLine: false,
                              lineHeight: isMobile ? 20 : 24,
                              renderLineHighlight: 'all',
                              wordWrap: isMobile ? 'on' : 'off',
                            }}
                            onMount={(editor) => {
                              // Intercept keyboard shortcuts
                              editor.onKeyDown((e) => {
                                // Block Copy (C=33), Paste (V=52), and Cut (X=54) for non-special users
                                if ((e.ctrlKey || e.metaKey) && (e.keyCode === 33 || e.keyCode === 52 || e.keyCode === 54)) {
                                  if (!hasSpecialAccess) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toast.error('Copy & Paste is disabled for challenges!');
                                  }
                                }
                              });
                            }}
                            data-testid="code-editor"
                          />
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
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
        <DialogContent className="w-[92vw] sm:max-w-md bg-surface border-border text-center p-6 sm:p-8" aria-describedby="lesson-complete-desc">
          <DialogTitle className="sr-only">Lesson Complete</DialogTitle>
          <DialogDescription id="lesson-complete-desc" className="sr-only">You have completed all challenges in this lesson.</DialogDescription>
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

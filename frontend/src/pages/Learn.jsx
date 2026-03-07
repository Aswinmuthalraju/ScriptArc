import { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
const Editor = lazy(() => import('@monaco-editor/react'));
import {
  Play, Lightbulb,
  CheckCircle, XCircle, Loader2, ArrowLeft, Code2, AlertTriangle,
  Trophy, ArrowRight, Lock, Target, Zap, X, SkipBack, SkipForward
} from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BUNNY_STREAM_VIDEOS } from '@/lib/bunnyVideos';
import playerjs from 'player.js';
import { LOCK_TOLERANCE_SECONDS, DATA_SCIENCE_COURSE_ID } from '@/lib/constants';

const LANGUAGE_MAP = {
  71: { name: 'Python', monaco: 'python' },
  63: { name: 'JavaScript', monaco: 'javascript' },
  62: { name: 'Java', monaco: 'java' },
  54: { name: 'C++', monaco: 'cpp' },
  50: { name: 'C', monaco: 'c' },
};

// ── MCQ Anti-Cheat: Deterministic per-user option shuffling ──────────────────
// Mulberry32 — fast seedable PRNG with good distribution
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a string → stable 32-bit unsigned integer
function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Fisher-Yates shuffle using seeded RNG.
// Returns { text, originalIndex }[] so we can map the selection back to the DB answer.
// Same userId + challengeId always produces the same order (deterministic),
// but different users see different orders.
function seededShuffle(options, seed) {
  const rng = mulberry32(seed);
  const arr = options.map((text, i) => ({ text, originalIndex: i }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const Learn = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const hasSpecialAccess = authUser?.has_special_access === true;
  const iframeRef = useRef(null);
  const completingRef = useRef(false);

  // ── Lesson data ─────────────────────────────────────────────
  const [lesson, setLesson] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [nextLesson, setNextLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Video state (managed via Bunny player.js postMessages) ───
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const sortedChallengesRef = useRef([]);
  const completedChallengesRef = useRef(new Set());
  const lastTimeRef = useRef(0);

  // ── Player lock state ────────────────────────────────────────
  // isPlayerLocked: drives the overlay that blocks native Bunny controls
  // lockedAtRef:    the exact timestamp we snapped to; enforced on every tick
  // lastSnapRef:    throttle — ms timestamp of the last setCurrentTime call
  // openChallengeRef: stable ref so playerjs timeupdate never has a stale closure
  const [isPlayerLocked, setIsPlayerLocked] = useState(false);
  const lockedAtRef = useRef(null);
  const lastSnapRef = useRef(0);
  const openChallengeRef = useRef(null);

  // ── Bunny Stream IDs ─────────────────────────────────────────
  const BUNNY_LIBRARY_ID = '612832';

  // ── Challenge dialog ─────────────────────────────────────────
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [showChallenge, setShowChallenge] = useState(false);

  // ── MCQ state ────────────────────────────────────────────────
  const [selectedOption, setSelectedOption] = useState(null);
  const [mcqAttempts, setMcqAttempts] = useState(0);
  const [mcqResult, setMcqResult] = useState(null); // 'correct' | 'wrong' | null

  // ── MCQ anti-cheat state ─────────────────────────────────────
  // shuffledMcqOptions: Array<{ text: string, originalIndex: number }>
  // Deterministic per (userId + challengeId) — same user always sees the same order,
  // but different users see different orders, making letter-sharing useless.
  const [shuffledMcqOptions, setShuffledMcqOptions] = useState([]);
  // Track when a challenge was opened to detect suspiciously fast submissions.
  const challengeOpenTimeRef = useRef(null);

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
  const showCompleteRef = useRef(false);
  const lessonCompletionShownRef = useRef(false);
  const sessionPointsRef = useRef(0);

  // ── Mobile detection ─────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Keep refs in sync (avoids stale closures) ──
  useEffect(() => {
    sortedChallengesRef.current = [...challenges].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  }, [challenges]);
  useEffect(() => {
    completedChallengesRef.current = completedChallenges;
  }, [completedChallenges]);
  useEffect(() => {
    showCompleteRef.current = showComplete;
  }, [showComplete]);
  useEffect(() => {
    sessionPointsRef.current = sessionPoints;
  }, [sessionPoints]);

  // ── Bunny video ID for current lesson ────────────────────────
  const bunnyVideoId = useMemo(() => {
    if (!lesson) return null;
    return BUNNY_STREAM_VIDEOS[lesson.order_index] || null;
  }, [lesson]);

  useEffect(() => {
    fetchLessonData();
  }, [lessonId]); // eslint-disable-line

  const fetchLessonData = async () => {
    try {
      // Fetch lesson + authenticated user in parallel
      const [
        { data: lessonData, error: lessonErr },
        { data: { user } },
      ] = await Promise.all([
        supabase.from('lessons').select('*').eq('id', lessonId).single(),
        supabase.auth.getUser(),
      ]);

      if (lessonErr || !lessonData) { setLoading(false); return; }

      // Fetch challenges, next lesson, and existing progress in parallel
      const [
        { data: challengeData },
        { data: nextLessonData },
        { data: prog },
      ] = await Promise.all([
        supabase.from('challenges').select('*')
          .eq('lesson_id', lessonId)
          .order('timestamp_seconds', { ascending: true }),
        supabase.from('lessons').select('id, title, order_index')
          .eq('course_id', lessonData.course_id)
          .eq('order_index', lessonData.order_index + 1)
          .maybeSingle(),
        user
          ? supabase.from('user_progress').select('*')
            .eq('user_id', user.id).eq('lesson_id', lessonId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      // Restore existing progress or auto-enroll on first visit
      if (user) {
        if (prog) {
          setCompletedChallenges(new Set(prog.completed_challenge_ids || []));
          setSessionPoints(prog.stars_earned || 0);
          if (prog.completed) setShowComplete(true);
        } else {
          const { error: insertErr } = await supabase.from('user_progress').upsert({
            user_id: user.id,
            lesson_id: lessonId,
            course_id: lessonData.course_id,
            completed: false,
            stars_earned: 0,
            completed_challenge_ids: [],
          }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
          if (insertErr && process.env.NODE_ENV !== 'production') {
            console.error('Initial progress insert error:', insertErr);
          }
        }
      }

      setLesson(lessonData);
      setChallenges(challengeData || []);
      setNextLesson(nextLessonData || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // ── Bunny Stream playerjs bridge ──────────────────────────────
  // The playerjs library performs the required handshake with Bunny's iframe
  // (sends an init ping, waits for ready) so events actually arrive.
  const playerInstanceRef = useRef(null);

  useEffect(() => {
    if (!bunnyVideoId || !iframeRef.current) return;

    const player = new playerjs.Player(iframeRef.current);
    playerInstanceRef.current = player;

    // Guard so stale callbacks from a previous effect run are no-ops
    let active = true;

    player.on('ready', () => {
      if (!active) return;

      player.on('play', () => { if (active) setIsPlaying(true); });
      player.on('pause', () => { if (active) setIsPlaying(false); });
      player.on('ended', () => {
        if (active) {
          setIsPlaying(false);
          // Only show completion when the video actually finishes AND challenges are done
          const total = sortedChallengesRef.current.length;
          const done = completedChallengesRef.current.size;
          if ((total === 0 || done >= total) && !lessonCompletionShownRef.current) {
            lessonCompletionShownRef.current = true;
            setShowComplete(true);
            saveProgressRef.current(completedChallengesRef.current, sessionPointsRef.current, true);
          }
        }
      });

      player.on('timeupdate', (data) => {
        if (!active) return;

        const time = typeof data === 'object' ? data.seconds : data;
        const dur = typeof data === 'object' ? data.duration : null;
        if (typeof time !== 'number' || isNaN(time)) return;

        setCurrentTime(time);
        if (dur) setDuration(dur);

        // ── 90% Completion Check ──
        if (dur > 0 && time >= dur * 0.9 && !lessonCompletionShownRef.current) {
          const total = sortedChallengesRef.current.length;
          const done = completedChallengesRef.current.size;
          if (total === 0 || done >= total) {
            lessonCompletionShownRef.current = true;
            setShowComplete(true);
            saveProgressRef.current(completedChallengesRef.current, sessionPointsRef.current, true);
          }
        }

        if (!hasSpecialAccess) {
          // ── Enforce lock: snap back to challenge position while locked ──
          if (lockedAtRef.current !== null) {
            if (time > lockedAtRef.current + LOCK_TOLERANCE_SECONDS) {
              // Throttle: only call setCurrentTime/pause at most every 500 ms
              // to avoid hammering the player API on every tick
              const now = Date.now();
              if (now - lastSnapRef.current > 500) {
                lastSnapRef.current = now;
                player.setCurrentTime(lockedAtRef.current);
                player.pause();
              }
            }
            return;
          }

          // ── Detect challenge timestamp and engage the lock ──
          const nextChallenge = sortedChallengesRef.current.find(
            ch => !completedChallengesRef.current.has(ch.id)
          );
          if (nextChallenge && time >= nextChallenge.timestamp_seconds) {
            lockedAtRef.current = nextChallenge.timestamp_seconds;
            lastSnapRef.current = Date.now();
            setIsPlayerLocked(true);
            player.setCurrentTime(nextChallenge.timestamp_seconds);
            player.pause();
            // Use ref to avoid stale closure over openChallenge
            openChallengeRef.current?.(nextChallenge);
          }
        }
      });
    });

    return () => {
      active = false;
      playerInstanceRef.current = null;
    };
  }, [bunnyVideoId, hasSpecialAccess]);

  const getMaxSeekTime = () => {
    if (hasSpecialAccess) return duration || 9999;
    const sorted = [...challenges].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    for (const ch of sorted) {
      if (!completedChallenges.has(ch.id)) return ch.timestamp_seconds;
    }
    return duration || 9999;
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // ── Challenge open / close ───────────────────────────────────
  const openChallenge = (ch) => {
    // If the browser is in fullscreen (like when watching the iframe in fullscreen),
    // exit it so the React challenge dialog is visible above the iframe.
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }

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

    // Compute deterministic shuffle: same user always sees the same option order,
    // different users see different orders — makes letter-sharing useless.
    if (ch.challenge_type === 'mcq' && authUser?.id && ch.options?.length > 0) {
      const seed = hashStr(authUser.id + ch.id);
      setShuffledMcqOptions(seededShuffle(ch.options, seed));
    } else {
      setShuffledMcqOptions([]);
    }

    // Record open time for bot-detection (submission < 1.5s = suspiciously fast)
    challengeOpenTimeRef.current = Date.now();
  };

  // Keep ref in sync on every render so the playerjs timeupdate callback
  // always calls the latest version of openChallenge (avoids stale closure).
  openChallengeRef.current = openChallenge;

  const resumeVideo = () => {
    setShowChallenge(false);
    // Clear the lock so timeupdate stops enforcing position
    lockedAtRef.current = null;
    setIsPlayerLocked(false);

    // Briefly wait for React state to process closing before commanding play,
    // to prevent immediate re-triggering of the challenge lock.
    setTimeout(() => {
      setActiveChallenge(null);
      // Read from ref to avoid stale closure: showComplete may have changed
      // between the resumeVideo call and when this timeout fires.
      if (!showCompleteRef.current) {
        playerInstanceRef.current?.play();
        setIsPlaying(true);
      }
    }, 100);
  };

  // ── Progress save ────────────────────────────────────────────
  const saveProgress = async (newCompleted, newStars, forceComplete = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const allChallengesDone = challenges.length === 0 || newCompleted.size >= challenges.length;
      const watchedEnough = duration > 0 && currentTime >= duration * 0.9;
      const isComplete = forceComplete || (allChallengesDone && watchedEnough);

      await supabase.from('user_progress').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: lesson.course_id,
        completed: isComplete,
        stars_earned: newStars,
        completed_challenge_ids: Array.from(newCompleted),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });
      // Completion dialog is triggered by the video 'ended' event, not here.
    } catch (e) {
      console.error('saveProgress:', e);
      toast.error('Progress could not be saved. Please check your connection.');
    }
  };

  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  const onChallengeComplete = async (pointsEarned) => {
    if (completedChallenges.has(activeChallenge?.id)) return;
    if (completingRef.current) return;
    completingRef.current = true;
    try {
      const newCompleted = new Set([...completedChallenges, activeChallenge.id]);
      const newPoints = sessionPoints + pointsEarned;
      setCompletedChallenges(newCompleted);
      setSessionPoints(newPoints);

      if (newCompleted.size >= challenges.length && duration > 0 && currentTime < duration * 0.9) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm">✔ All Challenges Completed!</span>
            <span className="text-xs opacity-90">Finish watching the video to unlock the next lesson.</span>
          </div>,
          { duration: 6000 }
        );
      }

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

    // Bot detection: log suspiciously fast answers (< 1500 ms) but don't block
    if (challengeOpenTimeRef.current) {
      const elapsed = Date.now() - challengeOpenTimeRef.current;
      if (elapsed < 1500) {
        console.warn('[AntiCheat] Fast MCQ submission:', elapsed, 'ms — challenge:', activeChallenge?.id);
      }
    }

    // Resolve the shuffled selection back to the original options index.
    // If no shuffle (fallback), use selectedOption directly.
    const originalIdx = shuffledMcqOptions.length > 0
      ? (shuffledMcqOptions[selectedOption]?.originalIndex ?? selectedOption)
      : selectedOption;

    if (originalIdx === activeChallenge.correct_option) {
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
    || lesson?.course_id === DATA_SCIENCE_COURSE_ID;

  const MAX_CODE_SIZE = 50_000; // 50 KB limit
  const EXECUTION_TIMEOUT_MS = 20_000; // 20s client-side timeout

  const executeCode = async (sourceCode, languageId) => {
    if (sourceCode.length > MAX_CODE_SIZE) {
      throw new Error(`Code exceeds ${MAX_CODE_SIZE / 1000}KB limit. Please reduce its size.`);
    }

    // Race the Supabase call against a client-side timeout
    const invokePromise = supabase.functions.invoke('execute-code', {
      body: {
        code: sourceCode,
        language_id: languageId,
        use_python_runner: isDataScienceCourse || languageId === 71,
      },
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Execution timed out. Please try again.')), EXECUTION_TIMEOUT_MS)
    );

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
    if (error) throw new Error(error.message || 'Edge function error');
    return data; // { stdout, stderr, compile_output, status, status_id, time, memory }
  };

  const runCode = async () => {
    if (!activeChallenge || !code.trim()) return;
    setSubmitting(true);
    setCodeResult(null);
    try {
      const result = await executeCode(code, activeChallenge.language_id ?? 71);
      const hasCompileError = !!result.compile_output?.trim();
      // For "Run Code", treat as passing if accepted by engine (status_id 3)
      // stderr may contain Python warnings — don't treat those as failures
      const passed = result.status_id === 3 && !hasCompileError;
      const errorText = (result.compile_output || result.stderr || '').trim();

      setCodeResult({
        type: 'test',
        passed,
        output: result.stdout?.trim() || '(No output)',
        error: hasCompileError ? errorText : (result.stderr?.trim() || null),
        time: result.time,
        status: result.status,
      });
    } catch (err) {
      toast.error('Execution failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitSolution = async () => {
    if (!activeChallenge || !code.trim()) return;
    if (completedChallenges.has(activeChallenge?.id)) return;
    // Guard against double-submit (ref-based, not affected by async state delay)
    if (completingRef.current) return;

    setSubmitting(true);
    setCodeResult(null);
    const newAttempt = codeAttemptCount + 1;
    setCodeAttemptCount(newAttempt);

    try {
      // --- Hidden Evaluation Logic ---
      let codeToRun = code;

      // Inject tests for challenges that have hidden test code stored in the challenge
      // (currently hardcoded for the DS Data Structures challenge; future: move to DB field)
      if (activeChallenge.id === 'da6b7c8d-e9f0-4a25-8b25-dc6d7e8f9a0b') {
        const testCode = `
# --- HIDDEN TESTS ---
try:
    assert 'arr0' in locals(), "arr0 is not defined"
    assert hasattr(arr0, 'ndim') and arr0.ndim == 0, "arr0 must be a 0D NumPy array"

    assert 'arr1' in locals(), "arr1 is not defined"
    assert hasattr(arr1, 'ndim') and arr1.ndim == 1, "arr1 must be a 1D NumPy array"

    assert 'arr2' in locals(), "arr2 is not defined"
    assert hasattr(arr2, 'ndim') and arr2.ndim == 2, "arr2 must be a 2D NumPy array"

    assert 'arr3' in locals(), "arr3 is not defined"
    assert hasattr(arr3, 'ndim') and arr3.ndim == 3, "arr3 must be a 3D NumPy array"

    print("__TEST_RESULT__:PASS")
except AssertionError as e:
    print(f"__TEST_RESULT__:FAIL:{e}")
    raise
except Exception as e:
    print(f"__TEST_RESULT__:FAIL:{e}")
    raise
`;
        codeToRun = code + '\n' + testCode;
      }

      const result = await executeCode(codeToRun, activeChallenge.language_id ?? 71);

      // Determine pass/fail:
      // - Compile errors always fail
      // - If tests were injected, check for structured marker in stdout
      // - Otherwise accept if status_id === 3 (Accepted) — stderr may contain warnings
      const hasCompileError = !!result.compile_output?.trim();
      const stdoutText = result.stdout?.trim() || '';
      const stderrText = result.stderr?.trim() || '';
      const errorText = (result.compile_output || '').trim() || stderrText;

      let passed;
      let cleanOutput;
      if (codeToRun !== code) {
        // Injected tests: check for structured marker
        const testPassed = stdoutText.includes('__TEST_RESULT__:PASS');
        const testFailed = stdoutText.includes('__TEST_RESULT__:FAIL');
        passed = testPassed && !testFailed && !hasCompileError;
        // Remove the internal marker from user-visible output
        cleanOutput = stdoutText.replace(/__TEST_RESULT__:[A-Z:]+/g, '').trim();
      } else {
        // No injected tests: status_id 3 = Accepted; allow stderr warnings
        passed = result.status_id === 3 && !hasCompileError;
        cleanOutput = stdoutText;
      }

      if (passed) {
        const marks = getMarksPreview();
        await saveCodeSubmission(marks);
        setCodeResult({
          type: 'submission',
          passed: true,
          marks_earned: marks,
          output: cleanOutput,
          time: result.time,
          status: result.status,
        });
        toast.success(marks === 4 ? '+4 Points earned!' : marks === 2 ? '+2 Points earned.' : 'Solution viewed: 0 Points.');
        await onChallengeComplete(marks);
      } else {
        setCodeResult({
          type: 'submission',
          passed: false,
          error: errorText || `Runtime error: ${result.status}`,
          output: cleanOutput || null,
          time: result.time,
          status: result.status,
        });
        if (newAttempt >= 2) setShowHintOption(true);
      }
    } catch (err) {
      toast.error('Submission failed: ' + (err.message || 'Unknown error'));
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

          {/* Video Player — Bunny Stream */}
          <div className="flex-1 flex flex-col">
            <div className="relative bg-black overflow-hidden aspect-video">
              {bunnyVideoId ? (
                <>
                  <iframe
                    ref={iframeRef}
                    src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyVideoId}?autoplay=false&preload=true&loop=false&muted=false`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen={true}
                    data-testid="bunny-stream-player"
                  />
                  {/* Strict lock overlay: blocks all interaction with the video player when a challenge is active */}
                  {showChallenge && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-[2px] cursor-not-allowed flex items-center justify-center pointer-events-auto">
                      <div className="bg-black/80 px-4 py-2 rounded-lg border border-white/20 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-warning" />
                        <span className="text-white text-sm font-medium">Complete the challenge to continue</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface">
                  <div className="text-center">
                    <Code2 className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-secondary font-medium mb-1">{lesson.title}</p>
                    <p className="text-sm text-text-secondary">Video coming soon — complete challenges below</p>
                  </div>
                </div>
              )}

              {/* Lock overlay — sits above the Bunny iframe and blocks all native
                  player controls (seek bar, play button, etc.) when a challenge is
                  active. Uses pointer-events to intercept clicks without hiding video. */}
              {isPlayerLocked && !hasSpecialAccess && (
                <div
                  className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center cursor-not-allowed"
                  data-testid="player-lock-overlay"
                >
                  <div className="flex items-center gap-2 bg-black/70 border border-warning/40 px-4 py-2 rounded-md">
                    <Lock className="w-4 h-4 text-warning" />
                    <span className="text-sm font-medium text-warning">Complete the challenge to continue</span>
                  </div>
                </div>
              )}
            </div>

            {/* Challenge Progress indicator replacing custom seekbar */}
            <div className="px-4 py-4 bg-surface border-t border-border flex flex-col gap-4 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="text-sm font-medium text-text-secondary">Challenge Progress:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {challenges.map((ch, i) => {
                      const done = completedChallenges.has(ch.id);
                      let state = 'locked';
                      if (done) state = 'completed';
                      else {
                        const sorted = [...challenges].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
                        const firstUncompleted = sorted.find(c => !completedChallenges.has(c.id));
                        if (firstUncompleted && firstUncompleted.id === ch.id) {
                          state = 'current';
                        }
                      }

                      return (
                        <button
                          key={ch.id}
                          onClick={() => {
                            if (done && playerInstanceRef.current && !isPlayerLocked) {
                              playerInstanceRef.current.setCurrentTime(ch.timestamp_seconds);
                              playerInstanceRef.current.play();
                              setIsPlaying(true);
                            }
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${state === 'completed' ? 'bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer pointer-events-auto border border-accent/30' :
                            state === 'current' ? 'bg-primary/20 text-primary border-2 border-primary/50 cursor-default' :
                              'bg-surface-highlight text-text-secondary border border-border opacity-60 cursor-not-allowed pointer-events-none'
                            }`}
                          title={`${ch.title} @ ${formatTime(ch.timestamp_seconds)}`}
                          data-testid={`challenge-progress-${i}`}
                        >
                          {state === 'completed' ? <CheckCircle className="w-3.5 h-3.5" /> :
                            state === 'current' ? <Play className="w-3 h-3 ml-0.5" /> :
                              <span className="text-[10px] font-mono font-bold">{i + 1}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-highlight px-3 py-1.5 rounded-full border border-border shrink-0">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{sessionPoints} pts</span>
                </div>
              </div>

              {/* Progress Bar */}
              {challenges.length > 0 && (
                <div className="space-y-1.5 mt-1">
                  <div className="flex justify-between text-xs text-text-secondary font-medium">
                    <span>Challenges: {completedChallenges.size} / {challenges.length} completed</span>
                    <span className="text-primary">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-highlight rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
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
          aria-describedby={activeChallenge?.challenge_type === 'coding' ? 'coding-challenge-desc' : undefined}
          className={
            activeChallenge?.challenge_type === 'coding'
              ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0 bg-[#0f111a] p-0 flex flex-col [&>button]:hidden'
              : 'w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-hidden bg-surface border-border p-0 flex flex-col [&>button]:hidden'
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
                  Up to 2 points
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
              <div
                className="flex flex-col h-full relative"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                style={{ userSelect: 'none' }}
              >
                {/* Watermark — faint user identifier; helps trace screenshot sharing */}
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center z-0 overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="font-mono text-foreground/[0.04] font-bold text-center whitespace-nowrap leading-loose select-none"
                    style={{ transform: 'rotate(-25deg)', fontSize: '0.65rem' }}
                  >
                    {authUser?.name || authUser?.email}
                    <br />
                    {authUser?.id?.slice(0, 8)}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 flex-1 flex flex-col justify-center relative z-10">
                  {(shuffledMcqOptions.length > 0
                    ? shuffledMcqOptions
                    : (activeChallenge.options || []).map((text, i) => ({ text, originalIndex: i }))
                  ).map(({ text }, i) => {
                    const isSelected = selectedOption === i;
                    // After shuffling, the correct option is wherever the user's selection maps back
                    // correctly — we just highlight the selected option on 'correct' result.
                    const isCorrect = mcqResult === 'correct' && isSelected;
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
                        <span className={`text-sm ${isCorrect ? 'text-accent font-medium' : 'text-foreground'}`}>{text}</span>
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
                    <p className="text-sm text-warning">{activeChallenge.hints[0]}</p>
                  </div>
                )}

                {/* Result feedback */}
                {mcqResult === 'correct' && (() => {
                  const earnedPts = (mcqAttempts > 2 && activeChallenge.hints?.length > 0) ? 1 : 2;
                  return (
                    <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/30 rounded-xl text-accent">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Correct! +{earnedPts} {earnedPts === 1 ? 'Point' : 'Points'} Earned</span>
                    </div>
                  );
                })()}
                {mcqResult === 'wrong' && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Wrong answer. Try again!</span>
                  </div>
                )}

                {/* Action button */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border mt-auto">
                  {completedChallenges.has(activeChallenge?.id) && mcqResult !== 'correct' && (
                    <Button variant="outline" onClick={resumeVideo} className="border-accent text-accent hover:bg-accent/10">
                      Already Completed? Continue
                    </Button>
                  )}
                  {hasSpecialAccess && mcqResult !== 'correct' && !completedChallenges.has(activeChallenge?.id) && (
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
                  <button
                    onClick={() => {
                      const canClose = !isPlayerLocked || completedChallenges.has(activeChallenge?.id) || hasSpecialAccess;
                      if (canClose) {
                        resumeVideo();
                      } else {
                        toast.error('Complete the challenge to continue!');
                      }
                    }}
                    className={`p-2 transition-colors rounded-md ${isPlayerLocked && !completedChallenges.has(activeChallenge?.id) && !hasSpecialAccess
                      ? 'text-text-secondary/30 cursor-not-allowed'
                      : 'text-text-secondary hover:text-white hover:bg-white/10'
                      }`}
                    data-testid="close-challenge-btn"
                  >
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
                                  <span className="text-sm text-warning">Struggling? Get a hint (reduces to 2 points)</span>
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
                            {completedChallenges.has(activeChallenge?.id) && !codeResult && (
                              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                                  <span className="text-emerald-400 font-medium">Challenge Already Completed!</span>
                                </div>
                                <Button onClick={resumeVideo} size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                                  Continue to Video
                                </Button>
                              </div>
                            )}

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
                                {codeResult.type === 'submission' && codeResult.passed && (
                                  <div className="mt-4 pt-4 border-t border-emerald-900/50">
                                    <Button onClick={resumeVideo} className="bg-emerald-500 hover:bg-emerald-400 text-white w-full">
                                      {completedChallenges.has(activeChallenge?.id) ? 'Close & Continue' : 'Continue Video'}
                                      <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            ) : (
                              !completedChallenges.has(activeChallenge?.id) && (
                                <span className="text-text-secondary opacity-50">Run code to see output...</span>
                              )
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
                          <Suspense fallback={
                            <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-text-secondary text-sm">
                              Loading editor...
                            </div>
                          }>
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
                          </Suspense>
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
      <Dialog open={showComplete} onOpenChange={(open) => {
        setShowComplete(open);
        if (!open && playerInstanceRef.current) {
          playerInstanceRef.current.play();
          setIsPlaying(true);
        }
      }}>
        <DialogContent className="w-[92vw] sm:max-w-md bg-surface border-border text-center p-6 sm:p-8" aria-describedby="lesson-complete-desc">
          <DialogTitle className="sr-only">Lesson Complete</DialogTitle>
          <DialogDescription id="lesson-complete-desc" className="sr-only">You have completed all challenges in this lesson.</DialogDescription>
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-outfit font-bold text-foreground">Lesson Complete!</h2>
            <p className="text-text-secondary">{lesson.title}</p>

            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-6 py-3 rounded-full">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{sessionPoints}</span>
              <span className="text-sm text-text-secondary">points earned</span>
            </div>

            <div className="flex flex-col gap-3 w-full pt-2">
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
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-2">
                  <p className="text-sm font-medium text-primary">🎓 You've completed all lessons!</p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setShowComplete(false);
                  if (playerInstanceRef.current) {
                    playerInstanceRef.current.play();
                    setIsPlaying(true);
                  }
                }}
                className="w-full text-foreground hover:text-foreground border-border hover:bg-surface-highlight"
                data-testid="continue-watching-btn"
              >
                Continue Watching
              </Button>

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

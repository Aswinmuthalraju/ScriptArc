import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, XCircle, Loader2, Star, Shield,
  GraduationCap, BookOpen, User, Calendar, Award,
} from 'lucide-react';

// Re-derive the SHA-256 hash client-side and compare with stored value.
// Format must match the SQL function in 007_certificates.sql exactly:
//   name|course|mentor|score|maxScore|date|certId
async function verifyHash(cert) {
  try {
    const dateStr = new Date(cert.completion_date).toISOString().slice(0, 10); // YYYY-MM-DD
    const input   = [
      cert.student_name,
      cert.course_name,
      cert.mentor_name,
      cert.score,
      cert.max_score,
      dateStr,
      cert.certificate_id,
    ].join('|');

    const encoded = new TextEncoder().encode(input);
    const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex === cert.certificate_hash;
  } catch {
    return null; // verification could not run
  }
}

const StarRow = ({ rating }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        className={`w-5 h-5 ${i <= rating ? 'text-warning fill-warning' : 'text-text-secondary/20'}`}
      />
    ))}
    <span className="text-sm text-warning font-semibold ml-2">({rating} Star{rating !== 1 ? 's' : ''})</span>
  </div>
);

const InfoRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-text-secondary uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-foreground font-medium break-all ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  </div>
);

const VerifyCertificate = () => {
  const { certificateId } = useParams();

  const [cert, setCert]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hashValid, setHashValid] = useState(null); // true | false | null (inconclusive)

  useEffect(() => {
    if (!certificateId) { setLoading(false); setNotFound(true); return; }
    fetchCert();
  }, [certificateId]); // eslint-disable-line

  const fetchCert = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_id', certificateId.toUpperCase())
        .maybeSingle();

      if (error || !data) { setNotFound(true); return; }

      setCert(data);

      // Run hash verification asynchronously
      verifyHash(data).then(result => setHashValid(result));

    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const scorePct = cert ? Math.round((cert.score / Math.max(cert.max_score, 1)) * 100) : 0;

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────
  if (notFound || !cert) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-outfit font-bold text-foreground mb-2">Certificate Not Found</h1>
          <p className="text-text-secondary mb-2">
            No certificate with ID <code className="text-primary font-mono text-sm">{certificateId}</code> was found in our records.
          </p>
          <p className="text-sm text-text-secondary mb-6">
            This may indicate a forged or invalid certificate.
          </p>
          <Link to="/" className="text-primary hover:underline text-sm">Return to ScriptArc</Link>
        </div>
      </div>
    );
  }

  // ── Valid certificate ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-8 pb-16 px-4" data-testid="verify-page">
      <div className="max-w-lg mx-auto">

        {/* Verified badge */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-outfit font-bold text-foreground mb-1">Certificate Verified</h1>
          <p className="text-text-secondary text-sm">This certificate was issued by <strong className="text-foreground">ScriptArc</strong></p>
        </div>

        {/* Tamper-detection badge */}
        <div className={`flex items-center gap-2 p-3 rounded-md mb-6 border text-sm ${
          hashValid === true
            ? 'bg-accent/10 border-accent/30 text-accent'
            : hashValid === false
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : 'bg-warning/10 border-warning/30 text-warning'
        }`}>
          <Shield className="w-4 h-4 shrink-0" />
          {hashValid === true
            ? 'Integrity check passed — certificate data is unmodified.'
            : hashValid === false
              ? 'Integrity check FAILED — certificate data may have been tampered with.'
              : 'Integrity check inconclusive — please contact support.'}
        </div>

        {/* Certificate details card */}
        <div className="bg-surface border border-border rounded-md p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium text-foreground uppercase tracking-wider">Certificate Details</span>
          </div>

          <InfoRow icon={User}        label="Student Name"    value={cert.student_name} />
          <InfoRow icon={BookOpen}    label="Course"          value={cert.course_name} />
          <InfoRow icon={GraduationCap} label="Mentored by"  value={cert.mentor_name} />
          <InfoRow icon={Calendar}    label="Completion Date" value={formatDate(cert.completion_date)} />

          {/* Score */}
          <div className="flex items-start gap-3 py-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Score</p>
              <p className="text-foreground font-medium mb-1">
                {cert.score} / {cert.max_score} points
                <span className="text-text-secondary text-sm ml-2">({scorePct}%)</span>
              </p>
              <StarRow rating={cert.star_rating} />
            </div>
          </div>

          <InfoRow icon={Shield} label="Certificate ID" value={cert.certificate_id} mono />
        </div>

        {/* Hash fingerprint (collapsible) */}
        <details className="text-xs text-text-secondary bg-surface border border-border rounded-md overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer hover:bg-surface-highlight transition-colors select-none font-medium">
            Show cryptographic hash (SHA-256)
          </summary>
          <div className="px-4 pb-3 pt-1">
            <p className="font-mono break-all text-primary/80">{cert.certificate_hash}</p>
            <p className="mt-2 text-text-secondary leading-relaxed">
              This hash is computed from the student name, course, mentor, score, date, and certificate ID.
              If any field is altered, the hash will not match and verification will fail.
            </p>
          </div>
        </details>

        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-primary hover:underline">Return to ScriptArc</Link>
        </div>

      </div>
    </div>
  );
};

export default VerifyCertificate;

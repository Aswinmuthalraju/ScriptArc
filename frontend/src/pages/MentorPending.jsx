import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, XCircle, Users, Mail, LogOut } from 'lucide-react';

const MentorPending = () => {
  const { user, logout } = useAuth();
  const status = user?.mentorProfile?.status || 'pending';
  const rejectionReason = user?.mentorProfile?.rejection_reason;

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          status === 'rejected' ? 'bg-destructive/15' : 'bg-primary/10'
        }`}>
          {status === 'rejected'
            ? <XCircle className="w-10 h-10 text-destructive" />
            : <Clock className="w-10 h-10 text-primary" />
          }
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-outfit font-bold text-foreground mb-2">
          {status === 'rejected' ? 'Application Not Approved' : 'Application Under Review'}
        </h1>

        <p className="text-text-secondary mb-6 leading-relaxed">
          {status === 'rejected'
            ? 'Your mentor application was not approved at this time.'
            : 'Your mentor application has been submitted and is awaiting admin review. You will be notified once a decision is made.'
          }
        </p>

        {/* Rejection reason */}
        {status === 'rejected' && rejectionReason && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md text-left mb-6">
            <p className="text-sm font-medium text-destructive mb-1">Reason</p>
            <p className="text-sm text-text-secondary">{rejectionReason}</p>
          </div>
        )}

        {/* Application summary */}
        {status === 'pending' && user?.mentorProfile && (
          <div className="p-4 bg-surface border border-border rounded-md text-left mb-6 space-y-2">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Your Application</p>
            {user.mentorProfile.expertise && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary w-28">Expertise:</span>
                <span className="text-foreground">{user.mentorProfile.expertise}</span>
              </div>
            )}
            {user.mentorProfile.experience_years != null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary w-28">Experience:</span>
                <span className="text-foreground">{user.mentorProfile.experience_years} years</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary w-28">Status:</span>
              <span className="text-warning font-medium capitalize">{status}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {status === 'rejected' && (
            <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-md">
              <Mail className="w-4 h-4 text-text-secondary shrink-0" />
              <p className="text-sm text-text-secondary">
                Contact{' '}
                <a href="mailto:scriptarc.dev@gmail.com" className="text-primary hover:underline">
                  scriptarc.dev@gmail.com
                </a>{' '}
                to appeal or learn more.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-text-secondary">
              Need help? Email{' '}
              <a href="mailto:scriptarc.dev@gmail.com" className="text-primary hover:underline">
                scriptarc.dev@gmail.com
              </a>
            </p>
          </div>

          <Button
            variant="outline"
            onClick={logout}
            className="w-full border-border text-text-secondary hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MentorPending;

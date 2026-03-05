import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AvatarPicker, avatars } from '@/components/ui/avatar-picker';
import { toast } from 'sonner';
import {
  User,
  Star,
  Award,
  Eye,
  EyeOff,
  Save,
  GraduationCap,
  Loader2
} from 'lucide-react';

const BADGE_INFO = {
  'first_try_master': { name: 'First Try Master', icon: '⚡', description: 'Solved on first attempt', color: 'text-cyan' },
  'no_hint_hero': { name: 'No Hint Hero', icon: '🧠', description: 'Solved without hints', color: 'text-accent' },
  'star_collector_100': { name: 'Star Collector', icon: '⭐', description: 'Earned 100 stars', color: 'text-warning' },
  'star_collector_500': { name: 'Star Master', icon: '🌟', description: 'Earned 500 stars', color: 'text-primary' },
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatarId, setAvatarId] = useState(user?.avatar_id || null);
  // Leaderboard is visible if the user is NOT private (default to true/public if undefined)
  const [leaderboardVisible, setLeaderboardVisible] = useState(!(user?.is_private ?? false));

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    if (name.trim().length > 100) {
      toast.error('Name must be 100 characters or less');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name,
          is_private: !leaderboardVisible,
          avatar_id: avatarId
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (data) updateUser(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const certificationTarget = 100;
  const currentStars = user?.total_stars || 0;
  const certProgress = Math.min((currentStars / certificationTarget) * 100, 100);

  const selectedAvatarObj = avatars.find(a => a.id === user?.avatar_id);

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="profile-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Profile Header */}
        <div className="mb-10">
          <div className="flex items-start gap-6">
            {selectedAvatarObj ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-glass bg-background flex items-center justify-center p-1">
                {selectedAvatarObj.svg}
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-outfit font-bold shadow-glass">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 pt-2">
              <h1 className="text-3xl font-outfit font-bold text-foreground mb-1">
                {user?.name}
              </h1>
              <p className="text-muted-foreground mb-3">{user?.email}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md capitalize font-medium">
                  {user?.role}
                </span>
                <span className="text-muted-foreground">
                  Member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Main Area: Progress & Badges */}
          <div className="lg:col-span-2 space-y-8">

            {/* Certification Progress */}
            <Card className="card-glass overflow-hidden" data-testid="cert-progress-card">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <GraduationCap className="w-32 h-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-foreground font-outfit flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Certification Progress
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Earn {certificationTarget} points to become eligible for the ScriptArc Developer Certification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Progress</span>
                  <span className="text-foreground font-mono font-bold">
                    {currentStars} / {certificationTarget} Points
                  </span>
                </div>
                <Progress value={certProgress} className="h-3 bg-muted/50 mb-4" />
                {certProgress >= 100 ? (
                  <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl text-accent text-sm flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    You are eligible for certification! Check your email for details.
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Keep completing courses to earn points. {certificationTarget - currentStars} more points to go.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Badges Collection */}
            <Card className="card-glass" data-testid="badges-section">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit flex items-center gap-2">
                  <Award className="w-5 h-5 text-secondary" />
                  Skill Badges
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Achievements unlocked through your learning journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user?.badges?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {user.badges.map((badge) => {
                      const info = BADGE_INFO[badge] || { name: badge, icon: '🏆', description: '', color: 'text-foreground' };
                      return (
                        <div
                          key={badge}
                          className="p-5 bg-surface-highlight border border-border/40 rounded-xl text-center hover:bg-surface-highlight/80 transition-colors"
                        >
                          <span className="text-4xl mb-3 block drop-shadow-md">{info.icon}</span>
                          <h4 className={`font-medium text-sm ${info.color}`}>{info.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed border-border/50 rounded-xl">
                    <Award className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground text-sm">
                      Complete challenges to earn skill recognition badges.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-8">
            <Card className="card-glass" data-testid="settings-card">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-muted-foreground">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-dark"
                    data-testid="name-input"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-muted-foreground">Profile Avatar</Label>
                  <div className="scale-90 origin-top">
                    <AvatarPicker onSelect={setAvatarId} defaultAvatarId={avatarId} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-highlight border border-border/40 rounded-xl">
                  <div className="flex items-center gap-3">
                    {leaderboardVisible ? (
                      <Eye className="w-4 h-4 text-primary" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">Leaderboard Visibility</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {leaderboardVisible ? 'Visible to others' : 'Hidden from others'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={leaderboardVisible}
                    onCheckedChange={setLeaderboardVisible}
                    data-testid="leaderboard-toggle"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full btn-primary h-11"
                  data-testid="save-profile-btn"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="card-glass">
              <CardHeader>
                <CardTitle className="text-foreground font-outfit text-sm">Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground truncate ml-2 font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-border/40">
                  <span className="text-muted-foreground">Role</span>
                  <span className="text-foreground capitalize font-medium">{user?.role}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-border/40">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="text-muted-foreground font-mono text-xs truncate ml-2">
                    {user?.id?.slice(0, 8)}...
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;

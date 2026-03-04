import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Trophy,
  Star,
  Medal,
  Crown,
  Loader2
} from 'lucide-react';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(50);

      if (!error && data) {
        setLeaderboard(data);
      }
    } catch (error) {
      // Table/view may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-warning" />;
      case 2:
        return <Medal className="w-6 h-6 text-muted-foreground" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-mono text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-warning/10 border-warning/30';
      case 2:
        return 'bg-muted border-muted-foreground/30';
      case 3:
        return 'bg-amber-600/10 border-amber-600/30';
      default:
        return 'bg-surface-highlight/50 border-transparent hover:border-border/40';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="leaderboard-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4 border border-primary/20">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-5xl font-outfit font-bold text-foreground mb-4">
            Global Leaderboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Top performers earning points across all courses
          </p>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            {/* 2nd Place */}
            <div className="pt-8">
              <Card className="card-glass border border-muted-foreground/30 text-center">
                <CardContent className="pt-6 pb-5">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-16 h-16 border-2 border-muted-foreground/50">
                      <AvatarFallback className="bg-muted text-foreground text-xl">
                        {leaderboard[1]?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-muted-foreground rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                      2
                    </div>
                  </div>
                  <h3 className="font-medium text-foreground truncate">{leaderboard[1]?.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 text-warning mt-1">
                    <Star className="w-4 h-4 fill-warning/20" />
                    <span className="font-mono font-bold">{leaderboard[1]?.total_stars}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 1st Place */}
            <div>
              <Card className="card-glass border-warning/30 text-center relative overflow-hidden shadow-glow-primary-sm">
                <div className="absolute inset-0 bg-warning/5" />
                <CardContent className="pt-8 pb-6 relative z-10">
                  <Crown className="w-8 h-8 text-warning mx-auto mb-3 drop-shadow-md" />
                  <div className="relative inline-block mb-4">
                    <Avatar className="w-20 h-20 border-[3px] border-warning">
                      <AvatarFallback className="bg-warning text-white text-2xl font-bold">
                        {leaderboard[0]?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-1 w-8 h-8 bg-warning rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-warning/30">
                      1
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground text-lg truncate mb-1">{leaderboard[0]?.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 text-warning">
                    <Star className="w-5 h-5 fill-warning/20" />
                    <span className="font-mono text-xl font-bold">{leaderboard[0]?.total_stars}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3rd Place */}
            <div className="pt-12">
              <Card className="card-glass border-amber-600/30 text-center">
                <CardContent className="pt-6 pb-4">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-14 h-14 border-2 border-amber-600/50">
                      <AvatarFallback className="bg-amber-600 text-white text-lg">
                        {leaderboard[2]?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">
                      3
                    </div>
                  </div>
                  <h3 className="font-medium text-foreground truncate text-sm">{leaderboard[2]?.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 text-warning mt-1">
                    <Star className="w-4 h-4 fill-warning/20" />
                    <span className="font-mono font-bold text-sm">{leaderboard[2]?.total_stars}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card className="card-glass" data-testid="leaderboard-list">
          <CardHeader>
            <CardTitle className="text-foreground font-outfit">All Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${getRankStyle(player.rank)} ${player.id === user?.id ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                    data-testid={`leaderboard-row-${player.rank}`}
                  >
                    {/* Rank */}
                    <div className="w-12 flex justify-center">
                      {getRankIcon(player.rank)}
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 border border-border/50 shadow-sm">
                        <AvatarFallback className="bg-primary/20 text-primary font-medium">
                          {player.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex items-center gap-3">
                        <span className="font-medium text-foreground truncate">
                          {player.name}
                        </span>
                        {player.id === user?.id && (
                          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-xs border-0">You</Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-warning">
                      <Star className="w-4 h-4 fill-warning/20" />
                      <span className="font-mono font-bold">{player.total_stars || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No rankings yet. Complete challenges to be the first!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Clock,
  BarChart,
  Users,
  Code2,
  Star,
  Filter,
  Loader2
} from 'lucide-react';

const levelColors = {
  beginner: 'bg-accent/20 text-accent border-accent/30',
  intermediate: 'bg-primary/20 text-primary border-primary/30',
  advanced: 'bg-secondary/20 text-secondary border-secondary/30',
};

const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCourses(data);
      }
    } catch (error) {
      // Table may not exist yet — show empty state
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12" data-testid="courses-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-outfit font-bold text-foreground mb-2">
            Explore Courses
          </h1>
          <p className="text-text-secondary">
            Choose your path and start earning points
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark pl-10"
              data-testid="course-search"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
              <Button
                key={level}
                variant={selectedLevel === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel(level)}
                className={selectedLevel === level ? 'btn-primary' : 'btn-cyber'}
                data-testid={`filter-${level}`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="card-glass overflow-hidden cursor-pointer hover:-translate-y-1 transition-all group"
                onClick={() => navigate(`/courses/${course.id}`)}
                data-testid={`course-card-${course.id}`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <Badge
                    className={`absolute top-3 left-3 ${levelColors[course.level]} border`}
                  >
                    {course.level}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <h3 className="text-lg font-outfit font-semibold text-foreground mb-2 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration_hours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <Code2 className="w-3 h-3" />
                        {course.total_challenges || 0} challenges
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-warning">
                      <Star className="w-3 h-3" />
                      {course.rating || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Code2 className="w-16 h-16 text-text-secondary mx-auto mb-4" />
            <h3 className="text-xl text-foreground font-outfit mb-2">No courses found</h3>
            <p className="text-text-secondary">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;

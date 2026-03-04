const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://dktkhwzhlsuahokrsxef.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdGtod3pobHN1YWhva3JzeGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDQ0MDksImV4cCI6MjA4ODE4MDQwOX0.u7UF73gC7_NeaJRZnTBxvcsX7PWQfkMXLCnjl21LZfc'
);

async function test() {
    const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123' // Or we can test without auth first, but user_progress requires auth
    });

    const { data, error } = await supabase.from('user_progress').select('*');
    console.log('Error:', error);
}
test();

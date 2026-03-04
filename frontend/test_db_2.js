const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://dktkhwzhlsuahokrsxef.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdGtod3pobHN1YWhva3JzeGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDQ0MDksImV4cCI6MjA4ODE4MDQwOX0.u7UF73gC7_NeaJRZnTBxvcsX7PWQfkMXLCnjl21LZfc'
);

async function test() {
    const { data, error } = await supabase.from('challenges').select('*');
    console.log('error', error);
    console.log('data length', data ? data.length : 0);
}
test();

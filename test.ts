import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
        id, pin, created_at, finished_at,
        quiz:quizzes(
            id, title, 
            class:classes(name),
            teacher:teachers(institution_name, logo_url, brand_color)
        )
    `)
    .limit(1);

  console.log(JSON.stringify(data, null, 2), error);
}

test();

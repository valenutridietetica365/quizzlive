import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// A simple script to fetch the failing data, I will pass env variables inline
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const sessionId = "DUMMY"; // I will replace this with a real session id later if needed
  
  // Actually, I can just test the syntax of the query without a real ID
  const [answersRes, participantsRes, questionsRes, sessionRes] = await Promise.all([
      supabase.from("answers").select("is_correct, points_awarded, question_id, participant_id").limit(1),
      supabase.from("participants").select("id, nickname").limit(1),
      supabase.from("questions").select("id, question_text, points").order("sort_order", { ascending: true }).limit(1),
      supabase.from("sessions").select(`id, pin, created_at, finished_at, quiz:quizzes(id, title, class:classes(name), teacher:teachers(institution_name, logo_url, brand_color))`).limit(1)
  ]);

  console.log("Answers Error:", answersRes.error);
  console.log("Participants Error:", participantsRes.error);
  console.log("Questions Error:", questionsRes.error);
  console.log("Sessions Error:", sessionRes.error);
}

test();

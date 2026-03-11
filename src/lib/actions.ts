"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// We use the service role key for the admin client to bypass RLS if needed,
// but for sign up we actually just need a client. 
// However, the invitation code check MUST happen here on the server.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function signUpTeacher(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    // Verify if email is in the allowed list
    const { data: allowedEmail, error: checkError } = await supabaseAdmin
        .from('allowed_emails')
        .select('email')
        .eq('email', email)
        .single();

    if (checkError || !allowedEmail) {
        return { error: "invitation_code_invalid" }; // Reusing the error key for UI simplicity, but semantics are "email_not_allowed"
    }

    const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
            // Can't use window.location.origin in Server Action, 
            // but Supabase usually handles the default if not provided
        }
    });

    if (error) return { error: error.message };
    return { success: true, data };
}

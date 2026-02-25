"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const invitationCode = process.env.SIGNUP_INVITATION_CODE || '';

// We use the service role key for the admin client to bypass RLS if needed,
// but for sign up we actually just need a client. 
// However, the invitation code check MUST happen here on the server.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function signUpTeacher(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const code = formData.get('invitationCode') as string;

    if (!invitationCode) {
        return { error: "Ocurrió un error de configuración en el servidor." };
    }

    if (code !== invitationCode) {
        return { error: "invitation_code_invalid" }; // We'll handle this key in the frontend
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

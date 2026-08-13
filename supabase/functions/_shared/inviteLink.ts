import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

export interface InviteResult {
  userId: string | null;
  actionUrl: string | null;
  isNewUser: boolean;
  error?: string;
}

/**
 * Generates a registration ("set your password") link for a user.
 * Creates the auth user when it does not exist yet (invite), otherwise
 * falls back to a recovery link so existing accounts can still set a password.
 */
export async function generateRegistrationLink(
  supabaseAdmin: SupabaseClient,
  opts: { email: string; fullName: string; role: string; redirectTo: string },
): Promise<InviteResult> {
  const { email, fullName, role, redirectTo } = opts;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: { full_name: fullName, role },
    },
  });

  if (!error) {
    return {
      userId: data.user?.id ?? null,
      actionUrl: data.properties?.action_link ?? null,
      isNewUser: true,
    };
  }

  const status = (error as any)?.status;
  const code = (error as any)?.code;
  const isExisting = status === 422 || code === 'email_exists';

  if (!isExisting) {
    return { userId: null, actionUrl: null, isNewUser: false, error: error.message };
  }

  const { data: recovery, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (recoveryError) {
    return { userId: null, actionUrl: null, isNewUser: false, error: recoveryError.message };
  }

  return {
    userId: recovery.user?.id ?? null,
    actionUrl: recovery.properties?.action_link ?? null,
    isNewUser: false,
  };
}

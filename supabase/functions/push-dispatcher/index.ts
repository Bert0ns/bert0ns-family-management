// Supabase Edge Function: push-dispatcher
// Dispatches Expo Push Notifications when records are inserted into public.notifications.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

interface NotificationWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    family_id: string;
    recipient_member_id: string;
    actor_member_id?: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
  };
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: NotificationWebhookPayload = await req.json();
    const record = payload.record;

    if (!record || !record.recipient_member_id) {
      return new Response(JSON.stringify({ message: 'No valid notification record found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase service environment variables' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Resolve recipient user_id from recipient_member_id
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('id', record.recipient_member_id)
      .single();

    if (memberError || !memberData?.user_id) {
      return new Response(
        JSON.stringify({ message: 'Recipient has no associated auth user_id; skipped push' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const userId = memberData.user_id;

    // 2. Query push tokens for this user
    const { data: tokenRows, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (tokenError || !tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens registered for user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Prepare Expo Push messages
    const messages: ExpoPushMessage[] = tokenRows.map((t) => ({
      to: t.token,
      title: record.title,
      body: record.body,
      sound: 'default',
      priority: 'high',
      data: {
        ...(record.data || {}),
        notificationId: record.id,
        notificationType: record.type,
      },
    }));

    // 4. Send payloads to Expo Push Notification API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return new Response(
      JSON.stringify({ success: true, count: messages.length, result: expoResult }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

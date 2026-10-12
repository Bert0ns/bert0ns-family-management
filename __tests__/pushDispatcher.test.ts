describe('Push Dispatcher Edge Function Payload Logic', () => {
  interface PushTokenRecord {
    expo_push_token: string;
  }

  interface NotificationRecord {
    id: string;
    family_id: string;
    recipient_member_id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }

  interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: 'default' | null;
    priority?: 'default' | 'normal' | 'high';
    channelId?: string;
  }

  function formatExpoPushMessages(
    tokenRows: PushTokenRecord[],
    record: NotificationRecord,
  ): ExpoPushMessage[] {
    return tokenRows.map((t) => ({
      to: t.expo_push_token,
      title: record.title,
      body: record.body,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: {
        ...(record.data || {}),
        notificationId: record.id,
        notificationType: record.type,
      },
    }));
  }

  it('correctly maps expo_push_token and attaches default Android channelId', () => {
    const tokens: PushTokenRecord[] = [
      { expo_push_token: 'ExponentPushToken[device-a]' },
      { expo_push_token: 'ExponentPushToken[device-b]' },
    ];

    const notification: NotificationRecord = {
      id: 'notif-123',
      family_id: 'fam-1',
      recipient_member_id: 'mem-1',
      type: 'EXPENSE_ADDED',
      title: 'New Expense Added',
      body: 'Groceries: €45.20',
      data: { expenseId: 'exp-1' },
    };

    const messages = formatExpoPushMessages(tokens, notification);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      to: 'ExponentPushToken[device-a]',
      title: 'New Expense Added',
      body: 'Groceries: €45.20',
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: {
        expenseId: 'exp-1',
        notificationId: 'notif-123',
        notificationType: 'EXPENSE_ADDED',
      },
    });

    expect(messages[1].to).toBe('ExponentPushToken[device-b]');
    expect(messages[1].channelId).toBe('default');
  });

  it('handles empty token lists gracefully', () => {
    const messages = formatExpoPushMessages([], {
      id: 'notif-2',
      family_id: 'fam-1',
      recipient_member_id: 'mem-1',
      type: 'SETTLEMENT',
      title: 'Settlement Settled',
      body: 'Leo paid Sofia €20.00',
    });

    expect(messages).toEqual([]);
  });
});

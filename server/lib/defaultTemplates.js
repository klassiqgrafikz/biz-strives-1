export const DEFAULT_BRAND_NAME = 'Klassiq Grafikz'

export const DEFAULT_TEMPLATES = [
  {
    name: 'Monthly Statement',
    subject: 'Your {month} Financial Statement | {brand}',
    body: `Dear {name},

We are pleased to present your financial statement for {month}.

MONTHLY SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Received:     {total_received}
Total Spent:        {total_spent}
Amount Saved:       {total_saved}
Net Cash Flow:      {net_cash}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A detailed breakdown of all transactions for this period is available in your account. Should you have any questions regarding this statement, please do not hesitate to reply to this message.

Thank you for your continued patronage.

Kind regards,
The {brand} Team`,
    type: 'monthly'
  },
  {
    name: 'Birthday Greeting',
    subject: 'Happy Birthday, {name}! | {brand}',
    body: `Dear {name},

On behalf of everyone at {brand}, we extend our warmest wishes to you on your special day.

Your continued trust and support mean a great deal to us. We hope this new year brings you abundant joy, good health, and continued success in all your endeavours.

Wishing you a most wonderful birthday.

With sincere regards,
The {brand} Team`,
    type: 'birthday'
  },
  {
    name: 'Savings Reminder',
    subject: 'Weekly Savings Reminder | {brand}',
    body: `Dear Valued Customer,

This is a courteous reminder from {brand} that no savings have been recorded for this week.

Consistent saving remains one of the most effective paths toward achieving your financial goals. We encourage you to make a deposit at your earliest convenience to keep your savings plan on track.

You may log your savings through your dashboard at any time.

Thank you for your attention.

Kind regards,
The {brand} Team`,
    type: 'savings_reminder'
  }
]

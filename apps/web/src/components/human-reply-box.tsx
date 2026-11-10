'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export function HumanReplyBox({ conversationId, disabled }: { conversationId: string; disabled?: boolean }) {
  const router = useRouter();
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/conversations/${conversationId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const j = await res.json();
      if (!j.ok) return void setErr(j.reason || 'Could not send.');
      setText('');
      router.refresh();
    } catch {
      setErr('Could not send.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={send} className="mt-4 flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? 'Send a message to the customer…' : 'Human takeover: type a reply that goes out on WhatsApp…'}
        disabled={busy}
        className="h-10 flex-1 rounded-lg border border-line bg-surface/70 px-3 text-sm text-ink outline-none focus:border-cyan disabled:opacity-50"
      />
      <button type="submit" disabled={busy} className="h-10 rounded-lg bg-cyan px-4 font-semibold text-bg hover:shadow-glow disabled:opacity-50">Send</button>
      {err && <span className="text-xs text-magenta">{err}</span>}
    </form>
  );
}

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { getMessages, sendMessage } from '@/app/actions/message';

const POLL_MS = 5_000;
const MAX_BODY_LENGTH = 500;
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 360;

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string | Date;
  userId: string;
  userName: string | null;
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function LeagueChat({
  leagueId,
  currentUserId,
  initialMessages,
}: {
  leagueId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const lastSeenAtRef = useRef<number>(
    initialMessages.length ? new Date(initialMessages[initialMessages.length - 1].createdAt).getTime() : 0
  );

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latest = await getMessages(leagueId);
        const newest = latest.at(-1);
        if (isOpenRef.current) {
          // Actively viewing — treat everything as seen so the count stays
          // at zero and resets cleanly whenever the panel is next closed.
          if (newest) lastSeenAtRef.current = new Date(newest.createdAt).getTime();
        } else {
          const newCount = latest.filter((m) => new Date(m.createdAt).getTime() > lastSeenAtRef.current).length;
          setUnreadCount(newCount);
        }
        setChatMessages(latest);
      } catch {
        // Network/transient errors are fine — we'll try again next tick.
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [leagueId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError(null);

    startTransition(async () => {
      const result = await sendMessage(leagueId, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft('');
      const latest = await getMessages(leagueId);
      const newest = latest.at(-1);
      if (newest) lastSeenAtRef.current = new Date(newest.createdAt).getTime();
      setChatMessages(latest);
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setUnreadCount(0);
          const newest = chatMessages.at(-1);
          if (newest) lastSeenAtRef.current = new Date(newest.createdAt).getTime();
        }}
        className="f-oswald"
        aria-label="Open league chat"
        style={{
          position: 'fixed',
          right: '14px',
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '11px 16px',
          background: 'var(--ink)',
          color: 'var(--gold)',
          border: '2px solid var(--ink)',
          borderRadius: '24px',
          boxShadow: '3px 3px 0 rgba(34,26,16,0.25)',
          fontWeight: 700,
          fontSize: '11px',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          zIndex: 45,
        }}
      >
        <ChatIcon />
        Chat
        {unreadCount > 0 && (
          <span
            className="f-oswald"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              minWidth: '22px',
              height: '22px',
              padding: '0 5px',
              borderRadius: '11px',
              background: 'var(--varsity-red)',
              border: '2px solid var(--paper)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              lineHeight: '18px',
              textAlign: 'center',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: '14px',
        bottom: 'calc(76px + env(safe-area-inset-bottom))',
        width: `min(${PANEL_WIDTH}px, calc(100vw - 28px))`,
        height: `${PANEL_HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper-card)',
        border: '2px solid var(--ink)',
        borderRadius: '8px',
        boxShadow: '4px 4px 0 rgba(34,26,16,0.25)',
        overflow: 'hidden',
        zIndex: 45,
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 8px 8px 12px',
          background: 'var(--ink)',
        }}
      >
        <span
          className="f-oswald"
          style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase' }}
        >
          League Chat
        </span>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close league chat"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            flexShrink: 0,
            background: 'rgba(236,224,196,0.12)',
            border: 'none',
            borderRadius: '6px',
            color: 'var(--gold)',
            fontSize: '26px',
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {chatMessages.length === 0 && (
          <p className="f-spectral" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            No messages yet. Say something.
          </p>
        )}
        {chatMessages.map((m) => {
          const isMine = m.userId === currentUserId;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div>
                <span
                  className="f-oswald"
                  style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: isMine ? 'var(--varsity-red)' : 'var(--ink)' }}
                >
                  {isMine ? 'You' : m.userName ?? 'Unknown'}
                </span>{' '}
                <span className="f-mono" style={{ fontSize: '10px', color: 'var(--mono-muted)' }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <span className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                {m.body}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="f-spectral" style={{ flexShrink: 0, padding: '6px 12px', fontSize: '12px', color: 'var(--varsity-red)', background: 'var(--paper-card)' }}>
          {error}
        </div>
      )}

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: '8px',
          padding: '8px',
          background: 'var(--paper-card)',
          borderTop: '2px solid var(--ink)',
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_BODY_LENGTH}
          placeholder="Message the league…"
          className="f-spectral"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: '14px',
            padding: '9px 11px',
            borderRadius: '4px',
            border: '1.5px solid var(--ink)',
            background: '#FFFFFF',
            color: 'var(--ink)',
          }}
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="f-oswald"
          style={{
            flexShrink: 0,
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: '#FBF5E6',
            background: !draft.trim() ? 'var(--disabled-border)' : 'var(--varsity-red)',
            borderRadius: '4px',
            padding: '0 14px',
            border: 'none',
            cursor: !draft.trim() || isPending ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

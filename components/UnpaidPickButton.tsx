'use client';

import { useState } from 'react';

export function UnpaidPickButton({
  label,
  venmoHandle,
  buyIn,
}: {
  label: string;
  venmoHandle: string;
  buyIn: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary f-oswald"
        style={{ textDecoration: 'none' }}
      >
        {label}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,26,16,0.6)' }}>
          <div style={{ background: 'var(--paper-card)', border: '1.5px solid var(--ink)', borderRadius: '7px', boxShadow: '6px 6px 0 rgba(34,26,16,0.13)', padding: '24px', width: '100%', maxWidth: '360px', margin: '0 16px' }}>
            <h2 className="f-oswald" style={{ fontWeight: 700, fontSize: '22px', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '4px' }}>
              Payment Required
            </h2>
            <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '10px' }}>
              You haven&apos;t been marked as paid yet.
            </p>
            <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '10px' }}>
              If you haven&apos;t sent your payment yet, please send{' '}
              <strong>${buyIn}</strong> to{' '}
              <span className="f-mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{venmoHandle}</span>{' '}
              on Venmo.
            </p>
            <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '20px' }}>
              If you&apos;ve already paid, follow up with{' '}
              <strong>{venmoHandle}</strong> to get marked as paid.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                className="f-oswald"
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: '#FBF5E6',
                  background: 'var(--varsity-red)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0 rgba(34,26,16,0.18)',
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

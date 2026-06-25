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
        className="rounded-full bg-blue-600 px-5 py-2 text-white font-semibold hover:bg-blue-700 text-sm text-center"
      >
        {label}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-2">Payment Required</h2>
            <p className="text-sm text-gray-700 mb-3">
              You haven&apos;t been marked as paid yet.
            </p>
            <p className="text-sm text-gray-700 mb-3">
              If you haven&apos;t sent your payment yet, please send{' '}
              <span className="font-semibold">${buyIn}</span> to{' '}
              <span className="font-semibold">{venmoHandle}</span> on Venmo.
            </p>
            <p className="text-sm text-gray-700 mb-5">
              If you&apos;ve already paid, follow up with{' '}
              <span className="font-semibold">{venmoHandle}</span> on Venmo to
              get marked as paid.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm text-white font-semibold hover:bg-blue-700"
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

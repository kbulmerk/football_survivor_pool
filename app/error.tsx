'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
      <p className="text-gray-500 text-sm">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-full bg-blue-600 px-5 py-2 text-white text-sm hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

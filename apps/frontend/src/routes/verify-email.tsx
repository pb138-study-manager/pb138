import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0px_10px_30px_0px_rgba(0,0,0,0.1)] w-full max-w-sm p-8 flex flex-col gap-6 text-center">

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Check your email</h1>

        <p className="text-gray-600 dark:text-gray-400 text-base">
          We sent a verification link to your email address. Click the link to activate your account.
        </p>

        <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />

        <p className="text-base text-gray-700 dark:text-gray-300">
          Already verified?{' '}
          <Link to="/login" className="underline text-gray-900 dark:text-white font-medium hover:text-gray-600 dark:hover:text-gray-300">
            Log in
          </Link>
        </p>

      </div>
    </div>
  );
}

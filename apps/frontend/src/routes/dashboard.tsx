import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

export function DashboardPage() {
  return <div>Dashboard</div>;
}

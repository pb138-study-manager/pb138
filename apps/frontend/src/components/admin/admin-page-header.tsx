type AdminPageHeaderProps = {
  title: string;
  description?: string;
};

export function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
      {description ? <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{description}</p> : null}
    </header>
  );
}

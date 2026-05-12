type AdminPageHeaderProps = {
  title: string;
  description?: string;
};

export function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      {description ? <p className="mt-1 max-w-2xl text-sm text-gray-600">{description}</p> : null}
    </header>
  );
}

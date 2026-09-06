import { Typography } from "@/components/ui/static";

interface PageHeaderProps {
  title: string;
  description?: string;
}

/** One page title treatment for every screen. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mt-6">
      <Typography.Heading level={1} className="font-display text-3xl tracking-wide">
        {title}
      </Typography.Heading>
      {description ? (
        <Typography type="body-sm" color="muted" className="mt-1">
          {description}
        </Typography>
      ) : null}
    </div>
  );
}

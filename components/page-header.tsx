import { Typography } from "@heroui/react";

interface PageHeaderProps {
  title: string;
  description?: string;
}

/** One page title treatment for every screen. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mt-6">
      <Typography.Heading level={1} className="text-2xl">
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

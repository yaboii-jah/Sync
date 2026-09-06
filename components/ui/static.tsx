/* eslint-disable @next/next/no-img-element */

import {
  cloneElement,
  isValidElement,
  type HTMLAttributes,
  type ComponentProps,
  type ReactElement,
} from "react";

function join(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, variant = "default", ...props }: DivProps & { variant?: "default" | "secondary" | "tertiary" | "transparent" }) {
  return <div className={join("card rounded-2xl bg-surface p-4", variant === "secondary" && "bg-surface-secondary", variant === "tertiary" && "bg-surface-tertiary", variant === "transparent" && "bg-transparent shadow-none", className)} {...props} />;
}
Card.Header = function CardHeader({ className, ...props }: DivProps) { return <div className={join("flex flex-col gap-1", className)} {...props} />; };
Card.Content = function CardContent({ className, ...props }: DivProps) { return <div className={join("flex flex-1 flex-col gap-1", className)} {...props} />; };
Card.Footer = function CardFooter({ className, ...props }: DivProps) { return <div className={join("flex flex-row items-center", className)} {...props} />; };
Card.Title = function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h2 className={join("text-sm font-medium leading-6 text-foreground", className)} {...props} />; };
Card.Description = function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p className={join("text-sm leading-5 text-muted", className)} {...props} />; };

export function Typography({ type = "body", color, weight, truncate, className, ...props }: HTMLAttributes<HTMLElement> & { color?: "muted"; weight?: "medium" | "semibold"; truncate?: boolean; type?: "body" | "body-sm" | "body-xs" | "h5" | "h6" }) {
  const Tag = type === "h5" || type === "h6" ? "h3" : "p";
  return <Tag className={join(type === "body-xs" && "text-xs", type === "body-sm" && "text-sm", type === "h5" && "text-lg font-semibold", type === "h6" && "text-base font-semibold", color === "muted" && "text-muted", weight === "medium" && "font-medium", weight === "semibold" && "font-semibold", truncate && "truncate", className)} {...props} />;
}
Typography.Heading = function Heading({ level, className, ...props }: HTMLAttributes<HTMLHeadingElement> & { level: 1 | 2 | 3 | 4 | 5 | 6 }) { const Tag = `h${level}` as "h1"; return <Tag className={join("text-foreground font-semibold", className)} {...props} />; };

export function Chip({ className, color = "default", variant = "primary", size = "md", ...props }: HTMLAttributes<HTMLSpanElement> & { color?: "accent" | "success" | "warning" | "danger" | "default"; variant?: "primary" | "secondary" | "tertiary" | "soft"; size?: "sm" | "md" | "lg" }) {
  return <span className={join("inline-flex w-fit shrink-0 items-center gap-0.5 rounded-2xl px-2 py-0.5 text-xs font-medium", size === "sm" && "px-1 py-0 text-[11px]", size === "lg" && "px-3 py-1 text-sm", variant === "tertiary" && "bg-transparent", variant !== "tertiary" && color === "default" && "bg-default text-foreground", variant !== "tertiary" && color === "accent" && "bg-accent text-accent-foreground", variant !== "tertiary" && color === "success" && "bg-success text-success-foreground", variant !== "tertiary" && color === "warning" && "bg-warning text-warning-foreground", variant !== "tertiary" && color === "danger" && "bg-danger text-danger-foreground", variant === "soft" && color === "accent" && "bg-accent/20 text-accent", variant === "soft" && color === "success" && "bg-success/20 text-success", variant === "soft" && color === "warning" && "bg-warning/20 text-warning", variant === "soft" && color === "danger" && "bg-danger/20 text-danger", className)} {...props} />;
}

export function Separator({ className, ...props }: HTMLAttributes<HTMLHRElement>) { return <hr className={join("border-border/60 w-full border-0 border-t", className)} {...props} />; }
export function Skeleton({ className, ...props }: DivProps) { return <div className={join("animate-pulse rounded-md bg-default", className)} {...props} />; }

export function Alert({ status = "default", className, ...props }: DivProps & { status?: "success" | "warning" | "danger" | "default" }) {
  return <div role="alert" className={join("flex gap-3 rounded-xl border p-3 text-sm", status === "success" && "border-success bg-success/15 text-success", status === "warning" && "border-warning bg-warning/15 text-warning", status === "danger" && "border-danger bg-danger/15 text-danger", status === "default" && "border-border bg-surface-secondary text-foreground", className)} {...props} />;
}
Alert.Indicator = function AlertIndicator({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={join("mt-1 size-2 shrink-0 rounded-full bg-current", className)} {...props} />; };
Alert.Content = function AlertContent({ className, ...props }: DivProps) { return <div className={join("min-w-0 flex-1", className)} {...props} />; };
Alert.Title = function AlertTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p className={join("font-medium", className)} {...props} />; };
Alert.Description = function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p className={join("leading-5", className)} {...props} />; };

export function Avatar({ size = "md", className, ...props }: DivProps & { size?: "sm" | "md" | "lg" }) { return <span className={join("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-secondary text-sm font-semibold text-foreground", size === "sm" && "size-8", size === "md" && "size-10", size === "lg" && "size-14", className)} {...props} />; }
Avatar.Image = function AvatarImage({ asChild, className, children, ...props }: ComponentProps<"img"> & { asChild?: boolean }) { if (asChild && isValidElement(children)) { const child = children as ReactElement<{ className?: string }>; return cloneElement(child, { className: join("size-full object-cover", child.props.className, className) }); } return <img alt="" className={join("size-full object-cover", className)} {...props} />; };
Avatar.Fallback = function AvatarFallback({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={join("inline-flex size-full items-center justify-center", className)} {...props} />; };

export function Badge({ className, size: _size, ...props }: HTMLAttributes<HTMLSpanElement> & { size?: "sm" | "md" }) { void _size; return <span className={join("absolute -top-1 -right-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-danger-foreground", className)} {...props} />; }
Badge.Anchor = function BadgeAnchor({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={join("relative inline-flex", className)} {...props} />; };

export function Link({ className, ...props }: ComponentProps<"a">) { return <a className={className} {...props} />; }
export function Description({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p className={join("text-sm text-muted", className)} {...props} />; }

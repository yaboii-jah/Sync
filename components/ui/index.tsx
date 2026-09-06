"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Button as AriaButton,
  Checkbox as AriaCheckbox,
  FieldError as AriaFieldError,
  Input as AriaInput,
  Label as AriaLabel,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  ProgressBar as AriaProgressBar,
  SearchField as AriaSearchField,
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  ToggleButton as AriaToggleButton,
  Switch as AriaSwitch,
  Dialog as AriaDialog,
} from "react-aria-components";
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ComponentProps,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { Search, X } from "lucide-react";

function join(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

type DivProps = HTMLAttributes<HTMLDivElement>;
type TextProps = HTMLAttributes<HTMLElement> & {
  color?: "muted";
  weight?: "medium" | "semibold";
  truncate?: boolean;
  type?: "body" | "body-sm" | "body-xs" | "h5" | "h6";
};

export function Card({
  className,
  variant = "default",
  ...props
}: DivProps & { variant?: "default" | "secondary" | "tertiary" | "transparent" }) {
  return (
    <div
      className={join(
        "card rounded-2xl bg-surface p-4",
        variant === "secondary" && "bg-surface-secondary",
        variant === "tertiary" && "bg-surface-tertiary",
        variant === "transparent" && "bg-transparent shadow-none",
        className,
      )}
      {...props}
    />
  );
}

Card.Header = function CardHeader({ className, ...props }: DivProps) {
  return <div className={join("flex flex-col gap-1", className)} {...props} />;
};
Card.Content = function CardContent({ className, ...props }: DivProps) {
  return <div className={join("flex flex-1 flex-col gap-1", className)} {...props} />;
};
Card.Footer = function CardFooter({ className, ...props }: DivProps) {
  return <div className={join("flex flex-row items-center", className)} {...props} />;
};
Card.Title = function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={join("text-sm font-medium leading-6 text-foreground", className)} {...props} />;
};
Card.Description = function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={join("text-sm leading-5 text-muted", className)} {...props} />;
};

export function Typography({
  type = "body",
  color,
  weight,
  truncate,
  className,
  ...props
}: TextProps) {
  const Tag = type === "h5" || type === "h6" ? "h3" : "p";
  return (
    <Tag
      className={join(
        type === "body-xs" && "text-xs",
        type === "body-sm" && "text-sm",
        type === "h5" && "text-lg font-semibold",
        type === "h6" && "text-base font-semibold",
        color === "muted" && "text-muted",
        weight === "medium" && "font-medium",
        weight === "semibold" && "font-semibold",
        truncate && "truncate",
        className,
      )}
      {...props}
    />
  );
}

Typography.Heading = function Heading({
  level,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Tag = `h${level}` as "h1";
  return <Tag className={join("text-foreground font-semibold", className)} {...props} />;
};

type ButtonProps = ComponentProps<typeof AriaButton> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isIconOnly?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  isIconOnly,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      className={join(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-accent bg-accent text-accent-foreground hover:brightness-105",
        variant === "secondary" && "border-border bg-surface-secondary text-foreground hover:bg-default",
        variant === "outline" && "border-border bg-transparent text-foreground hover:bg-default",
        variant === "ghost" && "border-transparent bg-transparent text-foreground hover:bg-default",
        variant === "danger" && "border-danger bg-danger text-danger-foreground hover:brightness-105",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "lg" && "px-5 py-3 text-base",
        fullWidth && "w-full",
        isIconOnly && "size-9 p-0",
        typeof className === "string" && className,
      )}
      {...props}
    />
  );
}

export function Chip({
  className,
  color = "default",
  variant = "primary",
  size = "md",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  color?: "accent" | "success" | "warning" | "danger" | "default";
  variant?: "primary" | "secondary" | "tertiary" | "soft";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={join(
        "inline-flex w-fit shrink-0 items-center gap-0.5 rounded-2xl px-2 py-0.5 text-xs font-medium",
        size === "sm" && "px-1 py-0 text-[11px]",
        size === "lg" && "px-3 py-1 text-sm",
        variant === "tertiary" && "bg-transparent",
        variant !== "tertiary" && color === "default" && "bg-default text-foreground",
        variant !== "tertiary" && color === "accent" && "bg-accent text-accent-foreground",
        variant !== "tertiary" && color === "success" && "bg-success text-success-foreground",
        variant !== "tertiary" && color === "warning" && "bg-warning text-warning-foreground",
        variant !== "tertiary" && color === "danger" && "bg-danger text-danger-foreground",
        variant === "soft" && color === "accent" && "bg-accent/20 text-accent",
        variant === "soft" && color === "success" && "bg-success/20 text-success",
        variant === "soft" && color === "warning" && "bg-warning/20 text-warning",
        variant === "soft" && color === "danger" && "bg-danger/20 text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={join("border-border/60 w-full border-0 border-t", className)} {...props} />;
}

export function Skeleton({ className, ...props }: DivProps) {
  return <div className={join("animate-pulse rounded-md bg-default", className)} {...props} />;
}

export function Alert({
  status = "default",
  className,
  ...props
}: DivProps & { status?: "success" | "warning" | "danger" | "default" }) {
  return (
    <div
      role="alert"
      className={join(
        "flex gap-3 rounded-xl border p-3 text-sm",
        status === "success" && "border-success bg-success/15 text-success",
        status === "warning" && "border-warning bg-warning/15 text-warning",
        status === "danger" && "border-danger bg-danger/15 text-danger",
        status === "default" && "border-border bg-surface-secondary text-foreground",
        className,
      )}
      {...props}
    />
  );
}
Alert.Indicator = function AlertIndicator({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("mt-1 size-2 shrink-0 rounded-full bg-current", className)} {...props} />;
};
Alert.Content = function AlertContent({ className, ...props }: DivProps) {
  return <div className={join("min-w-0 flex-1", className)} {...props} />;
};
Alert.Title = function AlertTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={join("font-medium", className)} {...props} />;
};
Alert.Description = function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={join("leading-5", className)} {...props} />;
};

export function Avatar({
  size = "md",
  className,
  ...props
}: DivProps & { size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={join(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-secondary text-sm font-semibold text-foreground",
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-14",
        className,
      )}
      {...props}
    />
  );
}
Avatar.Image = function AvatarImage({
  asChild,
  className,
  children,
  ...props
}: ComponentProps<"img"> & { asChild?: boolean }) {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: join("size-full object-cover", child.props.className, className),
    });
  }
  return <img alt="" className={join("size-full object-cover", className)} {...props} />;
};
Avatar.Fallback = function AvatarFallback({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("inline-flex size-full items-center justify-center", className)} {...props} />;
};

export function Badge({ className, size: _size, ...props }: HTMLAttributes<HTMLSpanElement> & { size?: "sm" | "md" }) {
  void _size;
  return <span className={join("absolute -top-1 -right-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-danger-foreground", className)} {...props} />;
}
Badge.Anchor = function BadgeAnchor({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("relative inline-flex", className)} {...props} />;
};

const dialogState = createContext<(() => void) | null>(null);
const alertState = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

function ModalBackdrop({
  isOpen,
  isDismissable = true,
  isKeyboardDismissDisabled,
  onOpenChange,
  children,
}: {
  isOpen?: boolean;
  isDismissable?: boolean;
  isKeyboardDismissDisabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const alert = useContext(alertState);
  const open = isOpen ?? alert?.open ?? false;
  function change(next: boolean) {
    alert?.setOpen(next);
    onOpenChange?.(next);
  }
  return (
    <AriaModalOverlay
      isOpen={open}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={isKeyboardDismissDisabled}
      onOpenChange={change}
      className="fixed inset-0 z-50 grid place-items-center bg-backdrop p-4 backdrop-blur-sm"
    >
      <AriaModal className="w-full outline-none">{children}</AriaModal>
    </AriaModalOverlay>
  );
}

function ModalContainer({
  className,
  children,
  size,
}: DivProps & { size?: "sm" | "md"; scroll?: "inside"; placement?: "center" }) {
  return (
    <div
      className={join(
        "mx-auto w-full",
        size === "sm" && "max-w-sm",
        size === "md" && "max-w-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ModalDialog({ className, children, ...props }: ComponentProps<typeof AriaDialog>) {
  return (
    <AriaDialog
      className={join("mx-auto flex w-full max-w-lg flex-col rounded-3xl border border-border !bg-overlay p-5 text-foreground opacity-100 shadow-overlay", className)}
      {...props}
    >
      {({ close }) => (
        <dialogState.Provider value={close}>
          {typeof children === "function" ? children({ close }) : children}
        </dialogState.Provider>
      )}
    </AriaDialog>
  );
}

function ModalCloseTrigger({ className, ...props }: Omit<ComponentProps<typeof Button>, "className"> & { className?: string }) {
  const close = useContext(dialogState);
  return <Button aria-label="Close" variant="ghost" isIconOnly className={join("absolute top-3 right-3", className)} onPress={close ?? undefined} {...props}><X className="size-4" /></Button>;
}

function ModalHeader({ className, ...props }: DivProps) {
  return <div className={join("mb-4 flex items-start gap-3 pr-10", className)} {...props} />;
}
function ModalHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={join("font-display text-2xl tracking-wide", className)} {...props} />;
}
function ModalBody({ className, ...props }: DivProps) {
  return <div className={join("min-h-0 text-sm leading-6", className)} {...props} />;
}
function ModalFooter({ className, ...props }: DivProps) {
  return <div className={join("mt-5 flex items-center justify-end gap-3", className)} {...props} />;
}

export function Modal({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
Modal.Backdrop = ModalBackdrop;
Modal.Container = ModalContainer;
Modal.Dialog = ModalDialog;
Modal.CloseTrigger = ModalCloseTrigger;
Modal.Header = ModalHeader;
Modal.Heading = ModalHeading;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.Icon = function ModalIcon({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-success", className)} {...props} />;
};

export function AlertDialog({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <alertState.Provider value={{ open, setOpen }}>{children}</alertState.Provider>;
}
AlertDialog.Trigger = function AlertDialogTrigger({ children }: { children?: ReactElement }) {
  const state = useContext(alertState);
  if (!children || !isValidElement(children)) return null;
  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    role: "button",
    tabIndex: 0,
    onClick: () => state?.setOpen(true),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") state?.setOpen(true);
    },
  });
};
AlertDialog.Backdrop = ModalBackdrop;
AlertDialog.Container = ModalContainer;
AlertDialog.Dialog = ModalDialog;
AlertDialog.Header = ModalHeader;
AlertDialog.Heading = ModalHeading;
AlertDialog.Body = ModalBody;
AlertDialog.Footer = ModalFooter;

export function Tabs({ className, ...props }: ComponentProps<typeof AriaTabs> & { variant?: "secondary" }) {
  return <AriaTabs className={join("w-full", typeof className === "string" && className)} {...props} />;
}
Tabs.ListContainer = function TabsListContainer({ className, ...props }: DivProps) {
  return <div className={join("rounded-xl bg-default p-1", className)} {...props} />;
};
Tabs.List = function TabsList({ className, ...props }: ComponentProps<typeof AriaTabList>) {
  return <AriaTabList className={join("flex w-full items-center", typeof className === "string" && className)} {...props} />;
};
Tabs.Tab = function TabsTab({ className, ...props }: ComponentProps<typeof AriaTab>) {
  return <AriaTab className={join("relative flex-1 rounded-lg px-3 py-2 text-center text-sm text-muted outline-none transition data-[selected]:bg-surface data-[selected]:text-foreground data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus", typeof className === "string" && className)} {...props} />;
};
Tabs.Panel = function TabsPanel({ className, ...props }: ComponentProps<typeof AriaTabPanel>) {
  return <AriaTabPanel className={join("outline-none", typeof className === "string" && className)} {...props} />;
};
Tabs.Separator = function TabsSeparator({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden className={join("mx-1 h-4 w-px bg-border/60", className)} {...props} />;
};
Tabs.Indicator = function TabsIndicator() { return null; };

export function Switch({ className, ...props }: ComponentProps<typeof AriaSwitch>) {
  return <AriaSwitch className={join("group flex cursor-pointer items-center text-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50", typeof className === "string" && className)} {...props} />;
}
Switch.Content = function SwitchContent({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("flex items-center", className)} {...props} />;
};
Switch.Control = function SwitchControl({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("ml-auto flex h-6 w-10 items-center rounded-full bg-default p-0.5 transition group-data-[selected]:bg-success", className)} {...props} />;
};
Switch.Thumb = function SwitchThumb({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("size-5 rounded-full bg-foreground transition-transform group-data-[selected]:translate-x-4", className)} {...props} />;
};

export function Checkbox({ className, ...props }: ComponentProps<typeof AriaCheckbox>) {
  return <AriaCheckbox className={join("group flex cursor-pointer items-center gap-2 text-sm text-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50", typeof className === "string" && className)} {...props} />;
}
Checkbox.Content = function CheckboxContent({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("flex items-center gap-2", className)} {...props} />;
};
Checkbox.Control = function CheckboxControl({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("flex size-4 items-center justify-center rounded border border-border bg-surface group-data-[selected]:border-success group-data-[selected]:bg-success", className)} {...props} />;
};
Checkbox.Indicator = function CheckboxIndicator({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={join("size-1.5 rounded-full bg-success-foreground opacity-0 group-data-[selected]:opacity-100", className)} {...props} />;
};

export function TextField({ fullWidth, className, ...props }: ComponentProps<typeof AriaTextField> & { fullWidth?: boolean }) {
  return <AriaTextField className={join("flex flex-col gap-1.5", fullWidth && "w-full", typeof className === "string" && className)} {...props} />;
}
export function Label({ className, ...props }: ComponentProps<typeof AriaLabel>) {
  return <AriaLabel className={join("text-sm font-medium text-foreground", typeof className === "string" && className)} {...props} />;
}
export function Input({ className, variant, ...props }: ComponentProps<typeof AriaInput> & { variant?: "secondary" }) {
  void variant;
  return <AriaInput className={join("w-full rounded-lg border border-border bg-field-background px-3 py-2.5 text-sm text-field-foreground outline-none placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/30", typeof className === "string" && className)} {...props} />;
}
export function TextArea({ className, variant, ...props }: ComponentProps<typeof AriaTextArea> & { variant?: "secondary" }) {
  void variant;
  return <AriaTextArea className={join("w-full rounded-lg border border-border bg-field-background px-3 py-2.5 text-sm text-field-foreground outline-none placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/30", typeof className === "string" && className)} {...props} />;
}
export function FieldError({ className, ...props }: ComponentProps<typeof AriaFieldError>) {
  return <AriaFieldError className={join("text-sm text-danger", typeof className === "string" && className)} {...props} />;
}
export function Form({ className, ...props }: ComponentProps<"form">) {
  return <form className={className} {...props} />;
}

export function SearchField({ className, ...props }: ComponentProps<typeof AriaSearchField>) {
  return <AriaSearchField className={join("flex flex-col gap-1.5", typeof className === "string" && className)} {...props} />;
}
SearchField.Group = function SearchFieldGroup({ className, ...props }: DivProps) {
  return <div className={join("flex items-center gap-2 rounded-lg border border-border bg-field-background px-3 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/30", className)} {...props} />;
};
SearchField.SearchIcon = function SearchFieldIcon() { return <Search className="size-4 shrink-0 text-muted" aria-hidden />; };
SearchField.Input = function SearchFieldInput({ className, ...props }: ComponentProps<typeof AriaInput>) {
  return <AriaInput className={join("min-w-0 flex-1 bg-transparent py-2.5 text-sm text-field-foreground outline-none placeholder:text-muted", typeof className === "string" && className)} {...props} />;
};
SearchField.ClearButton = function SearchFieldClearButton() { return <AriaButton slot="clear" className="text-muted hover:text-foreground"><X className="size-4" aria-hidden /></AriaButton>; };

export function ToggleButton({ className, variant = "ghost", size = "md", isIconOnly, ...props }: ComponentProps<typeof AriaToggleButton> & { variant?: "ghost" | "secondary"; size?: "sm" | "md"; isIconOnly?: boolean }) {
  return <AriaToggleButton className={join("inline-flex items-center justify-center rounded-lg border border-transparent text-foreground transition hover:bg-default data-[selected]:bg-default data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus", variant === "secondary" && "border-border bg-surface-secondary", size === "sm" && "size-8", size === "md" && "size-10", isIconOnly && "p-0", typeof className === "string" && className)} {...props} />;
}

const progressValue = createContext<number>(0);
export function ProgressBar({ children, ...props }: Omit<ComponentProps<typeof AriaProgressBar>, "children"> & { children?: ReactNode }) {
  return <AriaProgressBar {...props}>{({ percentage = 0 }) => <progressValue.Provider value={percentage}>{children}</progressValue.Provider>}</AriaProgressBar>;
}
ProgressBar.Track = function ProgressTrack({ className, ...props }: DivProps) { return <div className={join("w-full overflow-hidden", className)} {...props} />; };
ProgressBar.Fill = function ProgressFill({ className, style, ...props }: DivProps) { const value = useContext(progressValue); return <div className={join("h-full", className)} style={{ width: `${value}%`, ...style }} {...props} />; };

export function Link({ className, ...props }: ComponentProps<"a">) {
  return <a className={className} {...props} />;
}

export function Description({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={join("text-sm text-muted", className)} {...props} />;
}

export function CloseButton(props: ButtonProps) {
  return <Button variant="ghost" isIconOnly aria-label="Close" {...props}><X className="size-4" /></Button>;
}

import { ErrorState } from "@/components/error-state";

export default function NotFound() {
  return (
    <ErrorState
      title="Page not found"
      reference="Error 404"
      description="This page does not exist or has moved."
    />
  );
}

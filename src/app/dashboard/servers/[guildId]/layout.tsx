import { ServerWorkspaceProvider } from "@/components/ServerWorkspaceContext";

export default function ServerDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ServerWorkspaceProvider>{children}</ServerWorkspaceProvider>;
}

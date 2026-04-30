import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout(): JSX.Element {
  return (
    <main className="m-auto flex min-h-screen max-w-xl flex-col p-6">
      <Outlet />
    </main>
  );
}

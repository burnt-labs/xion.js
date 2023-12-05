import { Input, Button } from "@burnt-labs/ui";

export default function Page(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-96">
      <Input placeholder={"Email address"} fullWidth />
      <Button fullWidth>LOGIN</Button>
    </main>
  );
}

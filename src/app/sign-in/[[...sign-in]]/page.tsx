import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in · Academics OS",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[80svh] items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "border border-border shadow-none bg-card",
          },
        }}
      />
    </div>
  );
}

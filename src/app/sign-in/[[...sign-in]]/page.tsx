import { SignIn } from "@clerk/nextjs";
import { GradientBackground } from "@/components/ui/gradient-background";

export const metadata = {
  title: "Sign in · Academics OS",
};

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[80svh] items-center justify-center">
      <GradientBackground />
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "border border-border shadow-none bg-card/80 backdrop-blur",
          },
        }}
      />
    </div>
  );
}

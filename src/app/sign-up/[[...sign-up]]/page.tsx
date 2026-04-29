import { SignUp } from "@clerk/nextjs";
import { GradientBackground } from "@/components/ui/gradient-background";

export const metadata = {
  title: "Sign up · Academics OS",
};

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-[80svh] items-center justify-center">
      <GradientBackground />
      <SignUp
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

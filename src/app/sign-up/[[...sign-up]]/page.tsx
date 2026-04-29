import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Sign up · Academics OS",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-[80svh] items-center justify-center">
      <SignUp
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

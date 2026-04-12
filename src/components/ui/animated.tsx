"use client";

import { motion, type Variants } from "framer-motion";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Stagger children on mount
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

export function StaggerList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// Fade-in on mount
export function FadeIn({
  className,
  children,
  delay = 0,
  duration = 0.4,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Number counter animation
export function AnimatedNumber({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {value.toFixed(decimals)}
    </motion.span>
  );
}

// Scale on hover/tap for interactive cards
export function InteractiveCard({
  className,
  children,
  ...props
}: ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Page header with fade-in
export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <FadeIn>
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm hidden sm:block">{description}</p>
    </FadeIn>
  );
}

// Premium gradient border card wrapper
export function GlowCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative group rounded-xl", className)}>
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] pointer-events-none" />
      <div className="relative rounded-xl bg-card p-6">
        {children}
      </div>
    </div>
  );
}

// Pulse glow for critical items
export function PulseGlow({
  className,
  children,
  color = "var(--destructive)",
}: {
  className?: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 0 0 ${color}00`,
          `0 0 0 4px ${color}20`,
          `0 0 0 0 ${color}00`,
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

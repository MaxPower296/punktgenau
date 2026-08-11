import type { Metadata } from "next";
import ScanFlow from "@/components/scan-flow";

export const metadata: Metadata = {
  title: "Punkt erfassen – Punktgenau",
};

export default function ScanPage() {
  return <ScanFlow />;
}

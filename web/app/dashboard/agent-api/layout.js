"use client";

import Web3Provider from "@/components/Web3Provider";

export default function AgentApiLayout({ children }) {
  return <Web3Provider>{children}</Web3Provider>;
}

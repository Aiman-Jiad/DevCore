import React from "react";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-zinc-950 flex flex-col">
      {children}
    </div>
  );
}

"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProjectIndex() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/projects/${projectId}/write`);
  }, [projectId, router]);
  return null;
}

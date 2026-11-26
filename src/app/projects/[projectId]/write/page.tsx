import { Suspense } from "react";
import { WritingStudio } from "@/components/editor/WritingStudio";
import { Loading } from "@/components/ui/misc";

export default function WritePage() {
  return (
    <Suspense fallback={<Loading />}>
      <WritingStudio />
    </Suspense>
  );
}

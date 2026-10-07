import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { getModule } from "@/modules/registry";

export default function Page() {
  return <ModulePlaceholder module={getModule("surfaces")} />;
}

import { Badge } from "@/components/ui/badge";
import { USER_TYPE_LABELS } from "@/lib/constants";
import type { UserType } from "@/types";

export function UserBadge({ userType }: { userType: UserType }) {
  const variant =
    userType === "student"
      ? "default"
      : userType === "applicant"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{USER_TYPE_LABELS[userType]}</Badge>;
}

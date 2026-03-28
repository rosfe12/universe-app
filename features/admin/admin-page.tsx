"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Download,
  MailCheck,
  Megaphone,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldMinus,
  Undo2,
  UserRoundX,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { LoadingState } from "@/components/shared/loading-state";
import { TrustScoreBadge } from "@/components/shared/trust-score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  hideContentInSnapshot,
  confirmReportsForTargetInSnapshot,
  dismissReportsForTargetInSnapshot,
  restoreContentInSnapshot,
  updateReportStatusInSnapshot,
  warnUserInSnapshot,
} from "@/lib/runtime-mutations";
import {
  getAnonymousHandle,
  getAutoHiddenContent,
  getBlockedContentCount,
  getLowTrustUsers,
  getReportedUsersForAdmin,
  getReportTargetLabel,
  getReportTargetUserId,
} from "@/lib/mock-queries";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from "@/lib/constants";
import type {
  AdminAuditLog,
  AdminFeatureFlags,
  AdminMemberDetail,
  AdminMember,
  AdminNotice,
  AdminOpsEvent,
  AdminOverview,
  AdminProfileImageItem,
  AdminPromotion,
  AppRuntimeSnapshot,
  Report,
  StudentVerificationRequest,
} from "@/types";

type MemberSort = "joined_desc" | "joined_asc" | "last_sign_in_desc" | "last_sign_in_asc";
type MemberStatusFilter = "all" | "restricted" | "verified" | "unverified";
type AdminTab =
  | "dashboard"
  | "members"
  | "roles"
  | "verification"
  | "profile-images"
  | "reports"
  | "ops"
  | "settings"
  | "audit"
  | "hidden"
  | "reported-users"
  | "low-trust";

const PROFILE_IMAGE_REJECTION_OPTIONS = [
  "얼굴 노출",
  "개인정보 노출",
  "학생증 포함",
  "SNS 아이디 노출",
  "QR 코드 포함",
] as const;

async function loadAdminVerificationRequests() {
  const response = await fetch("/api/admin/verification-requests", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { requests?: StudentVerificationRequest[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      canManage: false,
      items: [] as StudentVerificationRequest[],
      error: payload?.error ?? "학생 인증 요청을 불러오지 못했습니다.",
    };
  }

  return {
    canManage: true,
    items: payload?.requests ?? [],
    error: "",
  };
}

async function updateAdminVerificationRequest(
  requestId: string,
  action: "approve" | "reject" | "resend",
  options?: {
    reason?: string;
    autoDeleteDocuments?: boolean;
  },
) {
  const response = await fetch("/api/admin/verification-requests", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestId,
      action,
      reason: options?.reason,
      autoDeleteDocuments: options?.autoDeleteDocuments,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        requests?: StudentVerificationRequest[];
        auditLogs?: AdminAuditLog[];
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      canManage: false,
      items: [] as StudentVerificationRequest[],
      auditLogs: [] as AdminAuditLog[],
      error: payload?.error ?? "학생 인증 요청을 처리하지 못했습니다.",
    };
  }

  return {
    canManage: true,
    items: payload?.requests ?? [],
    auditLogs: payload?.auditLogs ?? [],
    error: "",
  };
}

async function loadAdminAuditLogs() {
  const response = await fetch("/api/admin/audit-logs", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { auditLogs?: AdminAuditLog[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      items: [] as AdminAuditLog[],
      error: payload?.error ?? "운영 이력을 불러오지 못했습니다.",
    };
  }

  return {
    items: payload?.auditLogs ?? [],
    error: "",
  };
}

async function loadAdminReports() {
  const response = await fetch("/api/admin/reports", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { reports?: Report[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      items: [] as Report[],
      error: payload?.error ?? "신고 목록을 불러오지 못했습니다.",
    };
  }

  return {
    items: payload?.reports ?? [],
    error: "",
  };
}

async function loadAdminProfileImages(
  status: "all" | "pending" | "approved" | "rejected" = "pending",
) {
  const searchParams = new URLSearchParams();
  if (status !== "all") {
    searchParams.set("status", status);
  }

  const response = await fetch(`/api/admin/profile-images?${searchParams.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { items?: AdminProfileImageItem[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      items: [] as AdminProfileImageItem[],
      error: payload?.error ?? "프로필 사진 목록을 불러오지 못했습니다.",
    };
  }

  return {
    items: payload?.items ?? [],
    error: "",
  };
}

async function updateAdminProfileImage(
  imageId: string,
  action: "approve" | "reject" | "delete",
  reason?: string,
) {
  const response = await fetch("/api/admin/profile-images", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      imageId,
      action,
      reason,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; auditLogs?: AdminAuditLog[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      auditLogs: [] as AdminAuditLog[],
      error: payload?.error ?? "프로필 사진 검토를 처리하지 못했습니다.",
    };
  }

  return {
    auditLogs: payload?.auditLogs ?? [],
    error: "",
  };
}

async function loadAdminOverview() {
  const response = await fetch("/api/admin/overview", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | (AdminOverview & { error?: string })
    | null;

  if (!response.ok || !payload) {
    return {
      item: null as AdminOverview | null,
      error: payload?.error ?? "운영 현황을 불러오지 못했습니다.",
    };
  }

  return {
    item: payload,
    error: "",
  };
}

async function loadAdminSettings() {
  const response = await fetch("/api/admin/settings", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        featureFlags?: AdminFeatureFlags;
        notices?: AdminNotice[];
        promotions?: AdminPromotion[];
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      item: null as
        | { featureFlags: AdminFeatureFlags; notices: AdminNotice[]; promotions: AdminPromotion[] }
        | null,
      error: payload?.error ?? "운영 설정을 불러오지 못했습니다.",
    };
  }

  return {
    item: {
      featureFlags: payload?.featureFlags ?? {
        premiumLimitsEnabled: false,
        adsEnabled: false,
        promotedPostsEnabled: false,
        schoolTargetAdsEnabled: false,
      },
      notices: payload?.notices ?? [],
      promotions: payload?.promotions ?? [],
    },
    error: "",
  };
}

async function updateAdminSettings(
  body:
    | { action: "set_flags"; featureFlags: AdminFeatureFlags }
    | {
        action: "upsert_notice";
        notice: Omit<AdminNotice, "createdAt" | "id"> & {
          id?: string;
          createdAt?: string;
        };
      }
    | { action: "delete_notice"; id: string }
    | {
        action: "upsert_promotion";
        promotion: Omit<AdminPromotion, "createdAt" | "id"> & {
          id?: string;
          createdAt?: string;
        };
      }
    | { action: "delete_promotion"; id: string },
) {
  const response = await fetch("/api/admin/settings", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        featureFlags?: AdminFeatureFlags;
        notices?: AdminNotice[];
        promotions?: AdminPromotion[];
        error?: string;
      }
    | null;
}

async function loadAdminRoles(query = "") {
  const searchParams = new URLSearchParams();
  if (query.trim()) {
    searchParams.set("q", query.trim());
  }

  const response = await fetch(`/api/admin/roles?${searchParams.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        items?: Array<{
          userId: string;
          role: "admin" | "moderator";
          createdAt: string;
          email: string;
          nickname: string;
          department?: string;
          schoolName?: string;
        }>;
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      items: [] as Array<{
        userId: string;
        role: "admin" | "moderator";
        createdAt: string;
        email: string;
        nickname: string;
        department?: string;
        schoolName?: string;
      }>,
      error: payload?.error ?? "권한 목록을 불러오지 못했습니다.",
    };
  }

  return {
    items: payload?.items ?? [],
    error: "",
  };
}

async function updateAdminRole(userId: string, role: "admin" | "moderator" | "none") {
  const response = await fetch("/api/admin/roles", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ userId, role }),
  });

  return (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
}

async function loadAdminOpsEvents(input: {
  query: string;
  level: "all" | "info" | "warn" | "error";
  slowOnly: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (input.query.trim()) {
    searchParams.set("q", input.query.trim());
  }
  if (input.level !== "all") {
    searchParams.set("level", input.level);
  }
  if (input.slowOnly) {
    searchParams.set("slowOnly", "true");
  }

  const response = await fetch(`/api/admin/ops-events?${searchParams.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { items?: AdminOpsEvent[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      items: [] as AdminOpsEvent[],
      error: payload?.error ?? "운영 로그를 불러오지 못했습니다.",
    };
  }

  return {
    items: payload?.items ?? [],
    error: "",
  };
}

async function loadAdminMembers(input: {
  page: number;
  query: string;
  schoolId: string;
  sort: MemberSort;
  status: MemberStatusFilter;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(input.page));
  if (input.query.trim()) {
    searchParams.set("q", input.query.trim());
  }
  if (input.schoolId) {
    searchParams.set("schoolId", input.schoolId);
  }
  searchParams.set("sort", input.sort);
  searchParams.set("status", input.status);

  const response = await fetch(`/api/admin/members?${searchParams.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        members?: AdminMember[];
        total?: number;
        page?: number;
        pageSize?: number;
        hasNext?: boolean;
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      items: [] as AdminMember[],
      total: 0,
      page: input.page,
      pageSize: 20,
      hasNext: false,
      error: payload?.error ?? "회원 목록을 불러오지 못했습니다.",
    };
  }

  return {
    items: payload?.members ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? input.page,
    pageSize: payload?.pageSize ?? 20,
    hasNext: Boolean(payload?.hasNext),
    error: "",
  };
}

async function loadAdminMemberDetail(userId: string) {
  const response = await fetch(`/api/admin/members/${userId}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | (AdminMemberDetail & { error?: string })
    | null;

  if (!response.ok || !payload) {
    return {
      item: null as AdminMemberDetail | null,
      error: payload?.error ?? "회원 상세를 불러오지 못했습니다.",
    };
  }

  return {
    item: payload,
    error: "",
  };
}

async function updateAdminReportStatus(
  reportId: string,
  status: "pending" | "reviewing" | "confirmed" | "dismissed",
) {
  const response = await fetch("/api/admin/reports", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      reportId,
      status,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; auditLogs?: AdminAuditLog[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      auditLogs: [] as AdminAuditLog[],
      error: payload?.error ?? "신고 상태를 변경하지 못했습니다.",
    };
  }

  return {
    auditLogs: payload?.auditLogs ?? [],
    error: "",
  };
}

async function updateAdminModerationAction(
  input:
    | {
        action: "warn_user";
        userId: string;
      }
    | {
        action: "restrict_user" | "unrestrict_user";
        userId: string;
      }
    | {
        action: "hide_content" | "restore_content" | "confirm_content";
        targetType: "post" | "comment" | "review" | "profile";
        targetId: string;
      },
) {
  const response = await fetch("/api/admin/moderation", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; auditLogs?: AdminAuditLog[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      auditLogs: [] as AdminAuditLog[],
      error: payload?.error ?? "관리자 작업을 처리하지 못했습니다.",
    };
  }

  return {
    auditLogs: payload?.auditLogs ?? [],
    error: "",
  };
}

export function AdminPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const {
    loading,
    refresh,
    setSnapshot,
    source,
    isAuthenticated,
  } = useAppRuntime(initialSnapshot);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [reportItems, setReportItems] = useState<Report[]>([]);
  const [reportError, setReportError] = useState("");
  const [profileImageItems, setProfileImageItems] = useState<AdminProfileImageItem[]>([]);
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const [profileImageStatusFilter, setProfileImageStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [rejectProfileImageItem, setRejectProfileImageItem] = useState<AdminProfileImageItem | null>(null);
  const [rejectProfileImageReasons, setRejectProfileImageReasons] = useState<string[]>([]);
  const [rejectProfileImageCustomReason, setRejectProfileImageCustomReason] = useState("");
  const autoHiddenItems = useMemo(() => getAutoHiddenContent(), []);
  const reportedUsers = useMemo(() => getReportedUsersForAdmin(), []);
  const lowTrustUsers = useMemo(() => getLowTrustUsers(), []);
  const [verificationItems, setVerificationItems] = useState<StudentVerificationRequest[]>([]);
  const [canManageVerifications, setCanManageVerifications] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [memberItems, setMemberItems] = useState<AdminMember[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberQueryInput, setMemberQueryInput] = useState("");
  const [memberSchoolFilter, setMemberSchoolFilter] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>("all");
  const [memberSort, setMemberSort] = useState<MemberSort>("joined_desc");
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPageSize, setMemberPageSize] = useState(20);
  const [memberHasNext, setMemberHasNext] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<AdminMemberDetail | null>(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberDetailError, setMemberDetailError] = useState("");
  const [opsItems, setOpsItems] = useState<AdminOpsEvent[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState("");
  const [opsQuery, setOpsQuery] = useState("");
  const [opsQueryInput, setOpsQueryInput] = useState("");
  const [opsLevel, setOpsLevel] = useState<"all" | "info" | "warn" | "error">("all");
  const [opsSlowOnly, setOpsSlowOnly] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [featureFlags, setFeatureFlags] = useState<AdminFeatureFlags>({
    premiumLimitsEnabled: false,
    adsEnabled: false,
    promotedPostsEnabled: false,
    schoolTargetAdsEnabled: false,
  });
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [noticeDraft, setNoticeDraft] = useState({
    title: "",
    body: "",
    startsAt: "",
    endsAt: "",
  });
  const [promotionDraft, setPromotionDraft] = useState({
    title: "",
    description: "",
    placement: "home_feed",
    linkUrl: "",
    targetSchoolId: "",
    targetUserType: "" as "" | "student" | "applicant" | "freshman",
    priority: 0,
  });
  const [roleItems, setRoleItems] = useState<
    Array<{
      userId: string;
      role: "admin" | "moderator";
      createdAt: string;
      email: string;
      nickname: string;
      department?: string;
      schoolName?: string;
    }>
  >([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [roleQueryInput, setRoleQueryInput] = useState("");
  const [verificationPendingId, setVerificationPendingId] = useState<string | null>(null);
  const [reportPendingId, setReportPendingId] = useState<string | null>(null);
  const [profileImagePendingId, setProfileImagePendingId] = useState<string | null>(null);
  const [moderationPendingKey, setModerationPendingKey] = useState<string | null>(null);
  const [adminDenied, setAdminDenied] = useState(false);
  const [adminAccessChecked, setAdminAccessChecked] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [loadedTabs, setLoadedTabs] = useState<Record<AdminTab, boolean>>({
    dashboard: false,
    members: false,
    roles: false,
    verification: false,
    "profile-images": false,
    reports: false,
    ops: false,
    settings: false,
    audit: false,
    hidden: true,
    "reported-users": true,
    "low-trust": true,
  });
  const pendingVerificationCount = verificationItems.filter(
    (item) => item.status === "pending",
  ).length;
  const failedVerificationCount = verificationItems.filter(
    (item) => item.deliveryStatus === "failed",
  ).length;
  const schoolOptions = overview?.schools ?? [];
  const summaryCards = [
    {
      label: "가입 회원",
      value: `${overview?.totalMembers ?? memberTotal}명`,
      icon: ShieldAlert,
    },
    {
      label: "제한 사용자",
      value: `${overview?.restrictedMembers ?? 0}명`,
      icon: Ban,
    },
    {
      label: "학교 인증 대기",
      value: `${overview?.pendingVerificationCount ?? pendingVerificationCount}건`,
      icon: MailCheck,
    },
    {
      label: "숨김 콘텐츠",
      value: `${overview?.hiddenContentCount ?? 0}건`,
      icon: ShieldMinus,
    },
  ];

  function confirmAdminAction(message: string) {
    if (typeof window === "undefined") {
      return false;
    }

    return window.confirm(message);
  }

  function publishAdminFeedback(message: string) {
    setAdminFeedback(message);
  }

  async function refreshMemberList(
    page = memberPage,
    query = memberQuery,
    overrides?: Partial<{
      schoolId: string;
      sort: MemberSort;
      status: MemberStatusFilter;
    }>,
  ) {
    setMemberLoading(true);
    const result = await loadAdminMembers({
      page,
      query,
      schoolId: overrides?.schoolId ?? memberSchoolFilter,
      sort: overrides?.sort ?? memberSort,
      status: overrides?.status ?? memberStatusFilter,
    });
    setMemberItems(result.items);
    setMemberTotal(result.total);
    setMemberPage(result.page);
    setMemberPageSize(result.pageSize);
    setMemberHasNext(result.hasNext);
    setMemberError(result.error);
    setMemberLoading(false);
  }

  async function refreshSelectedMemberDetail(userId = selectedMember?.id) {
    if (!userId) {
      setSelectedMemberDetail(null);
      setMemberDetailError("");
      return;
    }

    setMemberDetailLoading(true);
    const result = await loadAdminMemberDetail(userId);
    if (result.item) {
      setSelectedMember(result.item.member);
      setSelectedMemberDetail(result.item);
    }
    setMemberDetailError(result.error);
    setMemberDetailLoading(false);
  }

  async function refreshOverview() {
    setOverviewLoading(true);
    const result = await loadAdminOverview();
    setOverview(result.item);
    setOverviewError(result.error);
    setOverviewLoading(false);
  }

  async function refreshReports() {
    const result = await loadAdminReports();
    setReportItems(result.items);
    setReportError(result.error);
  }

  async function refreshProfileImages(
    status = profileImageStatusFilter,
  ) {
    setProfileImageLoading(true);
    const result = await loadAdminProfileImages(status);
    setProfileImageItems(result.items);
    setProfileImageError(result.error);
    setProfileImageLoading(false);
  }

  async function refreshOpsLog(
    query = opsQuery,
    level = opsLevel,
    slowOnly = opsSlowOnly,
  ) {
    setOpsLoading(true);
    const result = await loadAdminOpsEvents({
      query,
      level,
      slowOnly,
    });
    setOpsItems(result.items);
    setOpsError(result.error);
    setOpsLoading(false);
  }

  async function refreshSettings() {
    setSettingsLoading(true);
    const result = await loadAdminSettings();
    if (result.item) {
      setFeatureFlags(result.item.featureFlags);
      setNotices(result.item.notices);
      setPromotions(result.item.promotions);
    }
    setSettingsError(result.error);
    setSettingsLoading(false);
  }

  async function refreshRoles(query = roleQuery) {
    setRoleLoading(true);
    const result = await loadAdminRoles(query);
    setRoleItems(result.items);
    setRoleError(result.error);
    setRoleLoading(false);
  }

  useEffect(() => {
    let active = true;

    if (!isAuthenticated) {
      setAdminAccessChecked(true);
      setAdminDenied(false);
      setLoadedTabs((current) => ({
        ...current,
        dashboard: false,
        members: false,
        roles: false,
        verification: false,
        "profile-images": false,
        reports: false,
        ops: false,
        settings: false,
        audit: false,
      }));
      return () => {
        active = false;
      };
    }

    setAdminAccessChecked(false);

    async function loadVerificationRequests() {
      setVerificationLoading(true);
      if (!active) {
        return;
      }
      const result = await loadAdminVerificationRequests();

      if (!active) {
        return;
      }
      setVerificationItems(result.items);
      setCanManageVerifications(result.canManage);
      setVerificationError(result.error ?? "");
      setVerificationLoading(false);
      setAdminDenied(source === "supabase" && !result.canManage);
      setAdminAccessChecked(true);
      setLoadedTabs((current) => ({
        ...current,
        verification: true,
      }));
    }

    async function refreshOverviewData() {
      setOverviewLoading(true);
      const result = await loadAdminOverview();

      if (!active) {
        return;
      }

      setOverview(result.item);
      setOverviewError(result.error);
      setOverviewLoading(false);
      setLoadedTabs((current) => ({
        ...current,
        dashboard: true,
      }));
    }

    void loadVerificationRequests();
    void refreshOverviewData();

    return () => {
      active = false;
    };
  }, [isAuthenticated, source]);

  useEffect(() => {
    if (!isAuthenticated || !adminAccessChecked || adminDenied || loadedTabs[activeTab]) {
      return;
    }

    if (activeTab === "members") {
      void refreshMemberList(1, "");
      setLoadedTabs((current) => ({ ...current, members: true }));
      return;
    }

    if (activeTab === "roles") {
      void refreshRoles("");
      setLoadedTabs((current) => ({ ...current, roles: true }));
      return;
    }

    if (activeTab === "profile-images") {
      void refreshProfileImages("pending");
      setLoadedTabs((current) => ({ ...current, "profile-images": true }));
      return;
    }

    if (activeTab === "reports") {
      void refreshReports();
      setLoadedTabs((current) => ({ ...current, reports: true }));
      return;
    }

    if (activeTab === "ops") {
      void refreshOpsLog("", "all", false);
      setLoadedTabs((current) => ({ ...current, ops: true }));
      return;
    }

    if (activeTab === "settings") {
      void refreshSettings();
      setLoadedTabs((current) => ({ ...current, settings: true }));
      return;
    }

    if (activeTab === "audit") {
      void refreshAuditLogsFromServer();
      setLoadedTabs((current) => ({ ...current, audit: true }));
    }
  }, [activeTab, adminAccessChecked, adminDenied, isAuthenticated, loadedTabs]);

  useEffect(() => {
    if (!selectedMember?.id) {
      setSelectedMemberDetail(null);
      setMemberDetailError("");
      return;
    }

    void refreshSelectedMemberDetail(selectedMember.id);
  }, [selectedMember?.id]);

  async function mutateVerificationRequest(
    requestId: string,
    action: "approve" | "reject" | "resend",
    options?: {
      reason?: string;
      autoDeleteDocuments?: boolean;
    },
  ) {
    setVerificationError("");
    setVerificationPendingId(requestId);
    try {
      const result = await updateAdminVerificationRequest(requestId, action, options);
      setVerificationItems(result.items);
      setCanManageVerifications(result.canManage);
      setVerificationError(result.error ?? "");
      if (result.auditLogs.length > 0) {
        setAuditLogs(result.auditLogs);
        setAuditError("");
      }
      if (!result.error) {
        publishAdminFeedback(
          action === "approve"
            ? "학생 인증을 승인했습니다."
            : action === "reject"
              ? "학생 인증 요청을 반려했습니다."
              : "학생 인증 메일을 다시 보냈습니다.",
        );
        await refresh();
        void refreshMemberList();
        void refreshOverview();
      }
    } finally {
      setVerificationPendingId(null);
    }
  }

  async function mutateReportStatus(
    reportId: string,
    status: "pending" | "reviewing" | "confirmed" | "dismissed",
  ) {
    setAuditError("");
    setReportPendingId(reportId);
    try {
      const result = await updateAdminReportStatus(reportId, status);
      if (result.error) {
        setAuditError(result.error);
        return;
      }
      setReportItems((current) =>
        current.map((item) => (item.id === reportId ? { ...item, status } : item)),
      );
      if (result.auditLogs.length > 0) {
        setAuditLogs(result.auditLogs);
        setAuditError("");
      }
      publishAdminFeedback("신고 상태를 변경했습니다.");
      await refresh();
      void refreshMemberList();
      void refreshOverview();
    } finally {
      setReportPendingId(null);
    }
  }

  async function mutateProfileImage(
    item: AdminProfileImageItem,
    action: "approve" | "reject" | "delete",
    reason?: string,
  ) {
    setProfileImageError("");
    setProfileImagePendingId(item.id);

    try {
      if (action === "approve") {
        if (!confirmAdminAction("프로필 사진을 승인하시겠습니까?")) {
          return;
        }
      }

      if (action === "delete") {
        if (!confirmAdminAction("프로필 사진을 삭제하시겠습니까?")) {
          return;
        }
      }

      const result = await updateAdminProfileImage(item.id, action, reason);
      if (result.error) {
        setProfileImageError(result.error);
        return;
      }
      if (result.auditLogs.length > 0) {
        setAuditLogs(result.auditLogs);
        setAuditError("");
      }
      publishAdminFeedback(
        action === "approve"
          ? "프로필 사진을 승인했습니다."
          : action === "reject"
            ? "프로필 사진을 반려했습니다."
            : "프로필 사진을 삭제했습니다.",
      );
      await refreshProfileImages();
      if (selectedMember?.id === item.userId) {
        void refreshSelectedMemberDetail(item.userId);
      }
    } finally {
      setProfileImagePendingId(null);
    }
  }

  async function submitRejectProfileImage() {
    if (!rejectProfileImageItem) {
      return;
    }

    const reason = [
      ...rejectProfileImageReasons,
      rejectProfileImageCustomReason.trim(),
    ]
      .filter(Boolean)
      .join(", ");

    await mutateProfileImage(
      rejectProfileImageItem,
      "reject",
      reason || "얼굴 또는 개인정보 노출로 반려했습니다.",
    );
    setRejectProfileImageItem(null);
    setRejectProfileImageReasons([]);
    setRejectProfileImageCustomReason("");
  }

  async function mutateModerationAction(
    input:
      | { action: "warn_user"; userId: string }
      | { action: "restrict_user" | "unrestrict_user"; userId: string }
      | {
          action: "hide_content" | "restore_content" | "confirm_content";
          targetType: "post" | "comment" | "review" | "profile";
          targetId: string;
        },
  ) {
    setAuditError("");
    const pendingKey =
      "userId" in input
        ? `${input.action}:${input.userId}`
        : `${input.action}:${input.targetType}:${input.targetId}`;
    setModerationPendingKey(pendingKey);

    try {
      const result = await updateAdminModerationAction(input);
      if (result.error) {
        setAuditError(result.error);
        return;
      }
      if (result.auditLogs.length > 0) {
        setAuditLogs(result.auditLogs);
        setAuditError("");
      }
      publishAdminFeedback(
        input.action === "warn_user"
          ? "경고를 반영했습니다."
          : input.action === "restrict_user"
            ? "활동 정지를 적용했습니다."
            : input.action === "unrestrict_user"
              ? "활동 정지를 해제했습니다."
              : input.action === "hide_content"
                ? "콘텐츠를 숨김 처리했습니다."
                : input.action === "restore_content"
                  ? "숨김 콘텐츠를 복구했습니다."
                  : "자동 숨김 상태를 유지했습니다.",
      );
      await refresh();
      void refreshMemberList();
      void refreshOverview();
      void refreshReports();
      if ("userId" in input && selectedMember?.id === input.userId) {
        void refreshSelectedMemberDetail(input.userId);
      }
    } finally {
      setModerationPendingKey(null);
    }
  }

  async function mutateRole(userId: string, role: "admin" | "moderator" | "none") {
    setRoleError("");
    setModerationPendingKey(`role:${userId}:${role}`);
    try {
      const result = await updateAdminRole(userId, role);
      if (result?.error) {
        setRoleError(result.error);
        return;
      }
      publishAdminFeedback(
        role === "none"
          ? "관리 권한을 해제했습니다."
          : role === "admin"
            ? "관리자 권한으로 변경했습니다."
            : "운영자 권한으로 변경했습니다.",
      );
      void refreshRoles();
      void refreshMemberList();
      void refreshOverview();
      void refreshAuditLogsFromServer();
      if (selectedMember?.id === userId) {
        void refreshSelectedMemberDetail(userId);
      }
    } finally {
      setModerationPendingKey(null);
    }
  }

  async function refreshAuditLogsFromServer() {
    setAuditLoading(true);
    const result = await loadAdminAuditLogs();
    setAuditLogs(result.items);
    setAuditError(result.error);
    setAuditLoading(false);
  }

  async function mutateFeatureFlag(flag: keyof AdminFeatureFlags) {
    setSettingsError("");
    const nextFlags = {
      ...featureFlags,
      [flag]: !featureFlags[flag],
    };
    setFeatureFlags(nextFlags);
    const result = await updateAdminSettings({
      action: "set_flags",
      featureFlags: nextFlags,
    });
    if (result?.error) {
      setSettingsError(result.error);
      setFeatureFlags(featureFlags);
      return;
    }
    publishAdminFeedback("운영 플래그를 변경했습니다.");
    setFeatureFlags(result?.featureFlags ?? nextFlags);
  }

  async function submitNotice() {
    if (!noticeDraft.title.trim() || !noticeDraft.body.trim()) {
      setSettingsError("공지 제목과 내용을 입력해주세요.");
      return;
    }
    setSettingsError("");
    const result = await updateAdminSettings({
      action: "upsert_notice",
      notice: {
        title: noticeDraft.title.trim(),
        body: noticeDraft.body.trim(),
        pinned: false,
        active: true,
        startsAt: noticeDraft.startsAt || undefined,
        endsAt: noticeDraft.endsAt || undefined,
      },
    });
    if (result?.error) {
      setSettingsError(result.error);
      return;
    }
    setNotices(result?.notices ?? []);
    setNoticeDraft({ title: "", body: "", startsAt: "", endsAt: "" });
    publishAdminFeedback("공지사항을 등록했습니다.");
  }

  async function mutateNotice(item: AdminNotice, patch: Partial<AdminNotice>) {
    setSettingsError("");
    const result = await updateAdminSettings({
      action: "upsert_notice",
      notice: {
        id: item.id,
        title: patch.title ?? item.title,
        body: patch.body ?? item.body,
        pinned: patch.pinned ?? item.pinned,
        active: patch.active ?? item.active,
        startsAt: patch.startsAt ?? item.startsAt,
        endsAt: patch.endsAt ?? item.endsAt,
      },
    });
    if (result?.error) {
      setSettingsError(result.error);
      return;
    }
    setNotices(result?.notices ?? []);
    publishAdminFeedback("공지 설정을 변경했습니다.");
  }

  async function removeNotice(id: string) {
    setSettingsError("");
    const result = await updateAdminSettings({
      action: "delete_notice",
      id,
    });
    if (result?.error) {
      setSettingsError(result.error);
      return;
    }
    setNotices(result?.notices ?? []);
    publishAdminFeedback("공지사항을 삭제했습니다.");
  }

  async function submitPromotion() {
    if (!promotionDraft.title.trim() || !promotionDraft.description.trim()) {
      setSettingsError("프로모션 제목과 설명을 입력해주세요.");
      return;
    }
    setSettingsError("");
    const result = await updateAdminSettings({
      action: "upsert_promotion",
      promotion: {
        title: promotionDraft.title.trim(),
        description: promotionDraft.description.trim(),
        placement: promotionDraft.placement,
        linkUrl: promotionDraft.linkUrl || undefined,
        targetSchoolId: promotionDraft.targetSchoolId || undefined,
        targetUserType: promotionDraft.targetUserType || undefined,
        priority: promotionDraft.priority,
        active: true,
        pinned: false,
      },
    });
    if (result?.error) {
      setSettingsError(result.error);
      return;
    }
    setPromotions(result?.promotions ?? []);
    setPromotionDraft({
      title: "",
      description: "",
      placement: "home_feed",
      linkUrl: "",
      targetSchoolId: "",
      targetUserType: "",
      priority: 0,
    });
    publishAdminFeedback("프로모션을 등록했습니다.");
  }

  async function mutatePromotion(item: AdminPromotion, patch: Partial<AdminPromotion>) {
    setSettingsError("");
    const result = await updateAdminSettings({
      action: "upsert_promotion",
      promotion: {
        id: item.id,
        title: patch.title ?? item.title,
        description: patch.description ?? item.description,
        placement: patch.placement ?? item.placement,
        linkUrl: patch.linkUrl ?? item.linkUrl,
        targetSchoolId: patch.targetSchoolId ?? item.targetSchoolId,
        targetUserType: patch.targetUserType ?? item.targetUserType,
        priority: patch.priority ?? item.priority,
        active: patch.active ?? item.active,
        pinned: patch.pinned ?? item.pinned,
      },
    });
    if (result?.error) {
      setSettingsError(result.error);
      return;
    }
    setPromotions(result?.promotions ?? []);
    publishAdminFeedback("프로모션 설정을 변경했습니다.");
  }

  async function removePromotion(id: string) {
    setSettingsError("");
    const result = await updateAdminSettings({
      action: "delete_promotion",
      id,
    });
    if (result?.error) {
      setSettingsError(result.error);
      return;
    }
    setPromotions(result?.promotions ?? []);
    publishAdminFeedback("프로모션을 삭제했습니다.");
  }

  function downloadMembersCsv() {
    const searchParams = new URLSearchParams();
    if (memberQuery.trim()) {
      searchParams.set("q", memberQuery.trim());
    }
    if (memberSchoolFilter) {
      searchParams.set("schoolId", memberSchoolFilter);
    }
    searchParams.set("sort", memberSort);
    searchParams.set("status", memberStatusFilter);
    searchParams.set("format", "csv");
    window.open(`/api/admin/members?${searchParams.toString()}`, "_blank");
  }

  if (loading || (isAuthenticated && !adminAccessChecked)) {
    return (
      <AppShell title="로그인" showTabs={false} showTopNavActions={false}>
        <LoadingState />
      </AppShell>
    );
  }

  if (!isAuthenticated || adminDenied) {
    return (
      <AppShell title="로그인" showTabs={false} showTopNavActions={false}>
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">관리자 로그인 필요</p>
              <p className="text-sm text-muted-foreground">
                관리자 계정으로 로그인 후 이용할 수 있습니다.
              </p>
            </div>
            <Button asChild className="min-w-[180px]">
              <Link href="/login?next=%2Fadmin">로그인하기</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="관리자"
      subtitle="신고, 숨김, 사용자 상태를 한 곳에서 관리합니다"
      showTabs={false}
      desktopWide
      showTopNavActions={false}
      topAction={
        <Button asChild type="button" size="sm" variant="outline">
          <Link href="/home">앱으로 이동</Link>
        </Button>
      }
    >
      {adminFeedback ? (
        <ActionFeedbackBanner message={adminFeedback} onClose={() => setAdminFeedback(null)} />
      ) : null}
      {loading ? <LoadingState /> : null}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="space-y-4">
        <div className="space-y-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="grid grid-cols-2 gap-3">
              {summaryCards.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
              ))}
            </div>

            <Card className="border-amber-200 bg-amber-50/90">
              <CardContent className="space-y-2 py-5 text-sm text-amber-900">
                <p className="font-semibold">운영 기준</p>
                <p>신고 3건 이상 콘텐츠는 자동 숨김 처리됩니다.</p>
                <p>허위 신고로 판단된 신고자는 경고가 누적되고, 3회 이상이면 제한 후보가 됩니다.</p>
                <p>차단한 사용자 콘텐츠는 일반 피드에서 숨김 처리됩니다. 현재 숨김 수 {getBlockedContentCount()}건.</p>
              </CardContent>
            </Card>

            <TabsList className="h-auto w-full justify-start overflow-x-auto md:flex md:flex-wrap md:overflow-visible lg:flex lg:flex-col lg:items-stretch lg:rounded-[28px] lg:p-2">
              <TabsTrigger className="lg:w-full lg:justify-start" value="dashboard">운영 현황</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="members">회원 목록</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="roles">권한 관리</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="verification">학생 인증</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="profile-images">프로필 사진 검토</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="reports">신고 목록</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="ops">운영 로그</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="settings">공지/프로모션</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="audit">운영 이력</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="hidden">자동 숨김</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="reported-users">신고 많은 사용자</TabsTrigger>
              <TabsTrigger className="lg:w-full lg:justify-start" value="low-trust">낮은 신뢰도</TabsTrigger>
            </TabsList>
          </aside>

          <div className="min-w-0 space-y-4">
        <TabsContent value="dashboard" className="space-y-3 lg:mt-0">
          {overviewLoading ? <LoadingState /> : null}
          {overviewError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{overviewError}</CardContent>
            </Card>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">신고 사유별 통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(overview?.reportReasonStats ?? []).map((item) => (
                  <div key={item.reason} className="flex items-center justify-between text-sm">
                    <span>{REPORT_REASON_LABELS[item.reason]}</span>
                    <Badge variant="secondary">{item.count}건</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">오류 / 느린 요청</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">최근 오류</p>
                  {(overview?.recentErrorEvents ?? []).slice(0, 3).map((item) => (
                    <OpsEventCard key={item.id} item={item} compact />
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">느린 요청</p>
                  {(overview?.recentSlowEvents ?? []).slice(0, 3).map((item) => (
                    <OpsEventCard key={item.id} item={item} compact />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">학교별 운영 통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(overview?.schoolStats ?? []).slice(0, 6).map((item) => (
                  <SchoolStatCard key={item.schoolId} item={item} />
                ))}
                {(overview?.schoolStats ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">집계된 학교 데이터가 없습니다.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">게시글/댓글 강제 삭제 내역</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(overview?.moderationHistory ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">최근 강제 조치 내역이 없습니다.</p>
              ) : (
                (overview?.moderationHistory ?? []).slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 px-4 py-3 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{log.summary}</p>
                      <p className="text-xs text-muted-foreground">{log.createdAt.slice(0, 16)}</p>
                    </div>
                    <Badge variant="outline">{log.targetType}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-3 lg:mt-0">
          <Card className="border-slate-200 bg-slate-50/80">
            <CardContent className="space-y-3 py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">가입 회원</p>
                  <p className="text-sm text-slate-900/70">
                    전체 {memberTotal}명 · 페이지 {memberPage}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={memberLoading}
                  onClick={() => {
                    void refreshMemberList(1, memberQuery);
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
                <form
                  className="flex gap-2 md:col-span-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const nextQuery = memberQueryInput.trim();
                    setMemberQuery(nextQuery);
                    void refreshMemberList(1, nextQuery);
                  }}
                >
                  <Input
                    value={memberQueryInput}
                    onChange={(event) => setMemberQueryInput(event.target.value)}
                    placeholder="이메일, 닉네임, 학교, 학과 검색"
                  />
                  <Button type="submit" disabled={memberLoading} size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>
                <Select
                  value={memberSchoolFilter || "all"}
                  onValueChange={(value) => {
                    const nextValue = value === "all" ? "" : value;
                    setMemberSchoolFilter(nextValue);
                    void refreshMemberList(1, memberQuery, { schoolId: nextValue });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학교 전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">학교 전체</SelectItem>
                    {schoolOptions.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={memberStatusFilter}
                  onValueChange={(value) => {
                    const nextValue = value as MemberStatusFilter;
                    setMemberStatusFilter(nextValue);
                    void refreshMemberList(1, memberQuery, { status: nextValue });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">상태 전체</SelectItem>
                    <SelectItem value="restricted">제한 사용자</SelectItem>
                    <SelectItem value="verified">학교 인증 완료</SelectItem>
                    <SelectItem value="unverified">미인증</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={memberSort}
                  onValueChange={(value) => {
                    const nextValue = value as MemberSort;
                    setMemberSort(nextValue);
                    void refreshMemberList(1, memberQuery, { sort: nextValue });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joined_desc">가입일 최신순</SelectItem>
                    <SelectItem value="joined_asc">가입일 오래된순</SelectItem>
                    <SelectItem value="last_sign_in_desc">최근 로그인순</SelectItem>
                    <SelectItem value="last_sign_in_asc">오래 미접속순</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={downloadMembersCsv}>
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMemberQuery("");
                    setMemberQueryInput("");
                    setMemberSchoolFilter("");
                    setMemberStatusFilter("all");
                    setMemberSort("joined_desc");
                    void refreshMemberList(1, "", {
                      schoolId: "",
                      status: "all",
                      sort: "joined_desc",
                    });
                  }}
                >
                  초기화
                </Button>
              </div>
            </CardContent>
          </Card>
          {memberLoading ? <LoadingState /> : null}
          {memberError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{memberError}</CardContent>
            </Card>
          ) : null}
          {!memberLoading && memberItems.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                조회되는 회원이 없습니다.
              </CardContent>
            </Card>
          ) : null}
          <div className="hidden xl:block">
            <MemberDesktopTable
              items={memberItems}
              pendingKey={moderationPendingKey}
              onOpenDetail={(member) => setSelectedMember(member)}
              onRestrict={(member) => {
                void mutateModerationAction({
                  action: "restrict_user",
                  userId: member.id,
                });
              }}
              onUnrestrict={(member) => {
                if (!confirmAdminAction("활동 정지를 해제하시겠습니까?")) {
                  return;
                }
                void mutateModerationAction({
                  action: "unrestrict_user",
                  userId: member.id,
                });
              }}
            />
          </div>
          <div className="space-y-3 xl:hidden">
            {memberItems.map((member) => (
              <MemberCard
                key={member.id}
                item={member}
                pendingKey={moderationPendingKey}
                onOpenDetail={() => setSelectedMember(member)}
                onRestrict={() => {
                  void mutateModerationAction({
                    action: "restrict_user",
                    userId: member.id,
                  });
                }}
                onUnrestrict={() => {
                  if (!confirmAdminAction("활동 정지를 해제하시겠습니까?")) {
                    return;
                  }
                  void mutateModerationAction({
                    action: "unrestrict_user",
                    userId: member.id,
                  });
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={memberLoading || memberPage <= 1}
              onClick={() => {
                const nextPage = Math.max(memberPage - 1, 1);
                void refreshMemberList(nextPage, memberQuery);
              }}
            >
              이전
            </Button>
            <p className="text-sm text-muted-foreground">
              {(memberPage - 1) * memberPageSize + 1}
              {" - "}
              {Math.min(memberPage * memberPageSize, memberTotal)}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={memberLoading || !memberHasNext}
              onClick={() => {
                void refreshMemberList(memberPage + 1, memberQuery);
              }}
            >
              다음
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-3 lg:mt-0">
          <Card className="border-slate-200 bg-slate-50/80">
            <CardContent className="space-y-3 py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">관리자 권한 관리</p>
                  <p className="text-sm text-slate-900/70">
                    관리자 {overview?.adminCount ?? 0}명 · 운영자 {overview?.moderatorCount ?? 0}명
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={roleLoading}
                  onClick={() => {
                    void refreshRoles();
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextQuery = roleQueryInput.trim();
                  setRoleQuery(nextQuery);
                  void refreshRoles(nextQuery);
                }}
              >
                <Input
                  value={roleQueryInput}
                  onChange={(event) => setRoleQueryInput(event.target.value)}
                  placeholder="이메일, 닉네임, 학교 검색"
                />
                <Button type="submit" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
          {roleError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{roleError}</CardContent>
            </Card>
          ) : null}
          {roleLoading ? <LoadingState /> : null}
          {roleItems.map((item) => (
            <RoleCard
              key={item.userId}
              item={item}
              pendingKey={moderationPendingKey}
              onPromoteAdmin={() => {
                void mutateRole(item.userId, "admin");
              }}
              onPromoteModerator={() => {
                void mutateRole(item.userId, "moderator");
              }}
              onClearRole={() => {
                if (!confirmAdminAction("관리 권한을 해제하시겠습니까?")) {
                  return;
                }
                void mutateRole(item.userId, "none");
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="verification" className="space-y-3 lg:mt-0">
          {verificationLoading ? <LoadingState /> : null}
          {verificationError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">
                {verificationError}
              </CardContent>
            </Card>
          ) : null}
          <Card className="border-sky-200 bg-sky-50/80">
            <CardContent className="flex items-center justify-between gap-3 py-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-sky-950">학교 메일 인증 대기</p>
                <p className="text-sm text-sky-900/70">
                  현재 확인이 필요한 요청 {pendingVerificationCount}건 · 발송 실패 {failedVerificationCount}건
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{verificationItems.length}건</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={verificationLoading}
                  onClick={() => {
                    void refresh();
                    setVerificationLoading(true);
                    void loadAdminVerificationRequests().then((result) => {
                      setVerificationItems(result.items);
                      setCanManageVerifications(result.canManage);
                      setVerificationError(result.error ?? "");
                      setVerificationLoading(false);
                    });
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>
          {verificationItems.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                아직 들어온 학교 메일 인증 요청이 없습니다.
              </CardContent>
            </Card>
          ) : null}
          {verificationItems.map((item) => (
            <VerificationRequestCard
              key={item.id}
              item={item}
              canManage={canManageVerifications}
              pendingAction={verificationPendingId === item.id ? "pending" : undefined}
              onApprove={() => {
                if (!confirmAdminAction("학생 인증 요청을 승인하시겠습니까?")) {
                  return;
                }
                const autoDeleteDocuments = confirmAdminAction(
                  "승인 후 업로드된 인증 문서를 자동 삭제하시겠습니까?",
                );
                if (source === "supabase") {
                  void mutateVerificationRequest(item.id, "approve", { autoDeleteDocuments });
                  return;
                }

                setVerificationItems((current) =>
                  current.map((request) =>
                    request.id === item.id
                      ? {
                          ...request,
                          status: "verified",
                          verifiedAt: new Date().toISOString(),
                          studentVerificationStatus: "verified",
                        }
                      : request,
                  ),
                );
              }}
              onReject={() => {
                if (!confirmAdminAction("학생 인증 요청을 반려하시겠습니까?")) {
                  return;
                }
                const reason = window.prompt(
                  "반려 사유를 입력해주세요.",
                  item.rejectionReason ?? "학생 확인 자료가 부족하거나 학교 규칙과 일치하지 않았습니다.",
                );
                if (reason === null) {
                  return;
                }
                const autoDeleteDocuments = confirmAdminAction(
                  "반려 후 업로드된 인증 문서를 자동 삭제하시겠습니까?",
                );
                if (source === "supabase") {
                  void mutateVerificationRequest(item.id, "reject", {
                    reason,
                    autoDeleteDocuments,
                  });
                  return;
                }

                setVerificationItems((current) =>
                  current.map((request) =>
                    request.id === item.id
                      ? {
                          ...request,
                          status: "cancelled",
                          verifiedAt: undefined,
                          studentVerificationStatus: "rejected",
                        }
                      : request,
                  ),
                );
              }}
              onResend={() => {
                if (source === "supabase") {
                  void mutateVerificationRequest(item.id, "resend");
                }
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="profile-images" className="space-y-3 lg:mt-0">
          <Card className="border-slate-200 bg-slate-50/80">
            <CardContent className="space-y-3 py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">프로필 사진 검토</p>
                  <p className="text-sm text-slate-900/70">
                    얼굴 노출, 개인정보 노출 여부를 확인한 뒤 승인 또는 반려합니다.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={profileImageLoading}
                  onClick={() => {
                    void refreshProfileImages();
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={profileImageStatusFilter}
                  onValueChange={(value) => {
                    const nextValue = value as "all" | "pending" | "approved" | "rejected";
                    setProfileImageStatusFilter(nextValue);
                    void refreshProfileImages(nextValue);
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">검토 대기만 보기</SelectItem>
                    <SelectItem value="approved">승인만 보기</SelectItem>
                    <SelectItem value="rejected">반려만 보기</SelectItem>
                    <SelectItem value="all">전체 보기</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">
                  {profileImageItems.length}건
                </Badge>
              </div>
            </CardContent>
          </Card>
          {profileImageLoading ? <LoadingState /> : null}
          {profileImageError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{profileImageError}</CardContent>
            </Card>
          ) : null}
          {!profileImageLoading && profileImageItems.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                검토할 프로필 사진이 없습니다.
              </CardContent>
            </Card>
          ) : null}
          <div className="hidden xl:block">
            <ProfileImageDesktopTable
              items={profileImageItems}
              profileImagePendingId={profileImagePendingId}
              onApprove={(item) => {
                void mutateProfileImage(item, "approve");
              }}
              onReject={(item) => {
                setRejectProfileImageItem(item);
                setRejectProfileImageReasons([]);
                setRejectProfileImageCustomReason("");
              }}
              onDelete={(item) => {
                void mutateProfileImage(item, "delete");
              }}
            />
          </div>
          <div className="space-y-3 xl:hidden">
            {profileImageItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[168px_minmax(0,1fr)_auto]">
                  <div className="aspect-square overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/5">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={`${item.nickname} 프로필 사진`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        미리보기 없음
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold">{item.nickname}</p>
                      {item.schoolName ? <Badge variant="secondary">{item.schoolName}</Badge> : null}
                      <Badge variant={item.moderationStatus === "approved" ? "secondary" : "outline"}>
                        {item.moderationStatus === "approved"
                          ? "승인됨"
                          : item.moderationStatus === "rejected"
                            ? "반려됨"
                            : "검토 중"}
                      </Badge>
                      {item.isPrimary ? <Badge variant="outline">대표 사진</Badge> : null}
                      <Badge variant="outline">슬롯 {item.imageOrder}</Badge>
                    </div>
                    {item.email ? (
                      <p className="text-sm text-muted-foreground">{item.email}</p>
                    ) : null}
                    {item.moderationReason ? (
                      <p className="text-sm text-muted-foreground">{item.moderationReason}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      업로드 {item.createdAt.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={profileImagePendingId === item.id || item.moderationStatus === "approved"}
                      onClick={() => {
                        void mutateProfileImage(item, "approve");
                      }}
                    >
                      승인
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={profileImagePendingId === item.id}
                      onClick={() => {
                        setRejectProfileImageItem(item);
                        setRejectProfileImageReasons([]);
                        setRejectProfileImageCustomReason("");
                      }}
                    >
                      반려
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={profileImagePendingId === item.id}
                      onClick={() => {
                        void mutateProfileImage(item, "delete");
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-3 lg:mt-0">
          {reportError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{reportError}</CardContent>
            </Card>
          ) : null}
          {reportItems.map((item) => {
            const targetUserId = getReportTargetUserId(item.targetType, item.targetId);
            const contentTargetType =
              item.targetType === "user"
                ? null
                : (item.targetType as "post" | "comment" | "review" | "profile");

            return (
              <Card key={item.id}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {getReportTargetLabel(item.targetType, item.targetId)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        신고자 {getAnonymousHandle(item.reporterId)} · {item.createdAt.slice(0, 16)}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(item.status)}>
                      {REPORT_STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{REPORT_REASON_LABELS[item.reason]}</Badge>
                    <Badge variant="secondary">{item.targetType}</Badge>
                    {targetUserId ? (
                      <TrustScoreBadge score={reportedUsers.find((user) => user.id === targetUserId)?.trustScore ?? 0} />
                    ) : null}
                  </div>
                  {item.memo ? (
                    <p className="rounded-[20px] bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                      {item.memo}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(["pending", "reviewing", "confirmed", "dismissed"] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={item.status === status ? "default" : "outline"}
                      disabled={reportPendingId === item.id}
                      onClick={async () => {
                        if (source === "supabase") {
                          await mutateReportStatus(item.id, status);
                          return;
                        }

                        setSnapshot((snapshot) =>
                          updateReportStatusInSnapshot(snapshot, item.id, status),
                        );
                      }}
                    >
                      {REPORT_STATUS_LABELS[status]}
                    </Button>
                  ))}
                  {contentTargetType ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          moderationPendingKey === `hide_content:${contentTargetType}:${item.targetId}`
                        }
                        onClick={() => {
                          if (!confirmAdminAction("콘텐츠를 빠르게 숨김 처리하시겠습니까?")) {
                            return;
                          }
                          if (source === "supabase") {
                            void mutateModerationAction({
                              action: "hide_content",
                              targetType: contentTargetType,
                              targetId: item.targetId,
                            });
                            return;
                          }

                          setSnapshot((snapshot) =>
                            hideContentInSnapshot(snapshot, contentTargetType, item.targetId),
                          );
                        }}
                      >
                        빠른 숨김
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          moderationPendingKey ===
                          `restore_content:${contentTargetType}:${item.targetId}`
                        }
                        onClick={() => {
                          if (!confirmAdminAction("숨김 콘텐츠를 복구하시겠습니까?")) {
                            return;
                          }
                          if (source === "supabase") {
                            void mutateModerationAction({
                              action: "restore_content",
                              targetType: contentTargetType,
                              targetId: item.targetId,
                            });
                            return;
                          }

                          setSnapshot((snapshot) =>
                            restoreContentInSnapshot(snapshot, contentTargetType, item.targetId),
                          );
                        }}
                      >
                        복구
                      </Button>
                    </>
                  ) : null}
                  {targetUserId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={moderationPendingKey === `warn_user:${targetUserId}`}
                      onClick={() => {
                        if (source === "supabase") {
                          void mutateModerationAction({
                            action: "warn_user",
                            userId: targetUserId,
                          });
                          return;
                        }

                        setSnapshot((snapshot) => warnUserInSnapshot(snapshot, targetUserId));
                      }}
                    >
                      경고 상태 표시
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="ops" className="space-y-3 lg:mt-0">
          <Card className="border-slate-200 bg-slate-50/80">
            <CardContent className="space-y-3 py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">운영 로그 검색</p>
                  <p className="text-sm text-slate-900/70">
                    느린 요청과 오류 로그를 검색하고 필터링합니다.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={opsLoading}
                  onClick={() => {
                    void refreshOpsLog();
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-[2fr_1fr_auto_auto]">
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const nextQuery = opsQueryInput.trim();
                    setOpsQuery(nextQuery);
                    void refreshOpsLog(nextQuery, opsLevel, opsSlowOnly);
                  }}
                >
                  <Input
                    value={opsQueryInput}
                    onChange={(event) => setOpsQueryInput(event.target.value)}
                    placeholder="event / message / metadata 검색"
                  />
                  <Button type="submit" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>
                <Select
                  value={opsLevel}
                  onValueChange={(value) => {
                    const nextValue = value as "all" | "info" | "warn" | "error";
                    setOpsLevel(nextValue);
                    void refreshOpsLog(opsQuery, nextValue, opsSlowOnly);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 레벨</SelectItem>
                    <SelectItem value="error">오류</SelectItem>
                    <SelectItem value="warn">경고</SelectItem>
                    <SelectItem value="info">정보</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant={opsSlowOnly ? "default" : "outline"}
                  onClick={() => {
                    const nextValue = !opsSlowOnly;
                    setOpsSlowOnly(nextValue);
                    void refreshOpsLog(opsQuery, opsLevel, nextValue);
                  }}
                >
                  느린 요청만
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpsQuery("");
                    setOpsQueryInput("");
                    setOpsLevel("all");
                    setOpsSlowOnly(false);
                    void refreshOpsLog("", "all", false);
                  }}
                >
                  초기화
                </Button>
              </div>
            </CardContent>
          </Card>
          {opsLoading ? <LoadingState /> : null}
          {opsError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{opsError}</CardContent>
            </Card>
          ) : null}
          <div className="grid gap-3 xl:grid-cols-2">
            {opsItems.map((item) => (
              <OpsEventCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-3 lg:mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기능 플래그</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              <FeatureFlagCard
                title="프리미엄 제한"
                description="쪽지/채팅/매칭 제한 정책"
                enabled={featureFlags.premiumLimitsEnabled}
                loading={settingsLoading}
                onToggle={() => {
                  void mutateFeatureFlag("premiumLimitsEnabled");
                }}
              />
              <FeatureFlagCard
                title="광고 노출"
                description="네이티브 광고 슬롯 활성화"
                enabled={featureFlags.adsEnabled}
                loading={settingsLoading}
                onToggle={() => {
                  void mutateFeatureFlag("adsEnabled");
                }}
              />
              <FeatureFlagCard
                title="프로모션 포스트"
                description="추천/상단 노출 프로모션"
                enabled={featureFlags.promotedPostsEnabled}
                loading={settingsLoading}
                onToggle={() => {
                  void mutateFeatureFlag("promotedPostsEnabled");
                }}
              />
              <FeatureFlagCard
                title="학교 타겟 광고"
                description="학교별 분기 노출"
                enabled={featureFlags.schoolTargetAdsEnabled}
                loading={settingsLoading}
                onToggle={() => {
                  void mutateFeatureFlag("schoolTargetAdsEnabled");
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">공지 작성 / 상단 고정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={noticeDraft.title}
                onChange={(event) =>
                  setNoticeDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="공지 제목"
              />
              <Textarea
                value={noticeDraft.body}
                onChange={(event) =>
                  setNoticeDraft((current) => ({ ...current, body: event.target.value }))
                }
                placeholder="공지 내용을 입력하세요"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="notice-start-at">노출 시작</Label>
                  <Input
                    id="notice-start-at"
                    type="datetime-local"
                    value={noticeDraft.startsAt}
                    onChange={(event) =>
                      setNoticeDraft((current) => ({
                        ...current,
                        startsAt: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notice-end-at">노출 종료</Label>
                  <Input
                    id="notice-end-at"
                    type="datetime-local"
                    value={noticeDraft.endsAt}
                    onChange={(event) =>
                      setNoticeDraft((current) => ({
                        ...current,
                        endsAt: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <Button type="button" onClick={() => void submitNotice()}>
                <Megaphone className="h-4 w-4" />
                공지 등록
              </Button>
              <div className="space-y-2">
                {notices.map((item) => (
                  <NoticeCard
                    key={item.id}
                    item={item}
                    onTogglePinned={() => {
                      void mutateNotice(item, { pinned: !item.pinned });
                    }}
                    onToggleActive={() => {
                      void mutateNotice(item, { active: !item.active });
                    }}
                    onDelete={() => {
                      if (!confirmAdminAction("공지사항을 삭제하시겠습니까?")) {
                        return;
                      }
                      void removeNotice(item.id);
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">프로모션 / 광고 슬롯 관리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={promotionDraft.title}
                  onChange={(event) =>
                    setPromotionDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="프로모션 제목"
                />
                <Input
                  value={promotionDraft.linkUrl}
                  onChange={(event) =>
                    setPromotionDraft((current) => ({ ...current, linkUrl: event.target.value }))
                  }
                  placeholder="링크 URL"
                />
              </div>
              <Textarea
                value={promotionDraft.description}
                onChange={(event) =>
                  setPromotionDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="프로모션 설명"
              />
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  value={promotionDraft.placement}
                  onChange={(event) =>
                    setPromotionDraft((current) => ({ ...current, placement: event.target.value }))
                  }
                  placeholder="placement"
                />
                <Select
                  value={promotionDraft.targetSchoolId || "all"}
                  onValueChange={(value) => {
                    setPromotionDraft((current) => ({
                      ...current,
                      targetSchoolId: value === "all" ? "" : value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학교 전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">학교 전체</SelectItem>
                    {schoolOptions.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={promotionDraft.targetUserType || "all"}
                  onValueChange={(value) => {
                    setPromotionDraft((current) => ({
                      ...current,
                      targetUserType:
                        value === "all"
                          ? ""
                          : (value as "" | "student" | "applicant" | "freshman"),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="유형 전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">유형 전체</SelectItem>
                    <SelectItem value="student">대학생</SelectItem>
                    <SelectItem value="applicant">입시생</SelectItem>
                    <SelectItem value="freshman">예비입학생</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="promotion-priority">우선순위</Label>
                <Input
                  id="promotion-priority"
                  type="number"
                  value={promotionDraft.priority}
                  onChange={(event) =>
                    setPromotionDraft((current) => ({
                      ...current,
                      priority: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
              <Button type="button" onClick={() => void submitPromotion()}>
                프로모션 등록
              </Button>
              <div className="space-y-2">
                {promotions.map((item) => (
                  <PromotionCard
                    key={item.id}
                    item={item}
                    schoolName={schoolOptions.find((school) => school.id === item.targetSchoolId)?.name}
                    onTogglePinned={() => {
                      void mutatePromotion(item, { pinned: !item.pinned });
                    }}
                    onToggleActive={() => {
                      void mutatePromotion(item, { active: !item.active });
                    }}
                    onDelete={() => {
                      if (!confirmAdminAction("프로모션을 삭제하시겠습니까?")) {
                        return;
                      }
                      void removePromotion(item.id);
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          {settingsError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{settingsError}</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="audit" className="space-y-3 lg:mt-0">
          {auditLoading ? <LoadingState /> : null}
          {auditError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{auditError}</CardContent>
            </Card>
          ) : null}
          {auditLogs.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                아직 기록된 운영 이력이 없습니다.
              </CardContent>
            </Card>
          ) : null}
          {auditLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="space-y-2 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{log.summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {getAnonymousHandle(log.adminUserId)} · {log.createdAt.slice(0, 16)}
                    </p>
                  </div>
                  <Badge variant="outline">{log.action}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{log.targetType}</Badge>
                  {log.targetId ? <Badge variant="secondary">{log.targetId.slice(0, 8)}</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hidden" className="space-y-3 lg:mt-0">
          {autoHiddenItems.map((item) => (
            <Card key={`${item.targetType}-${item.id}`}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      신고 누적으로 숨김 처리된 콘텐츠입니다. 현재 신고 {item.reportCount}건
                    </p>
                  </div>
                  <Badge variant="danger">auto_hidden</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={moderationPendingKey === `restore_content:${item.targetType}:${item.id}`}
                  onClick={() => {
                    if (!confirmAdminAction("숨김 콘텐츠를 복구하시겠습니까?")) {
                      return;
                    }
                    if (source === "supabase") {
                      void mutateModerationAction({
                        action: "restore_content",
                        targetType: item.targetType,
                        targetId: item.id,
                      });
                      return;
                    }

                    setSnapshot((snapshot) =>
                      restoreContentInSnapshot(
                        dismissReportsForTargetInSnapshot(snapshot, item.targetType, item.id),
                        item.targetType,
                        item.id,
                      ),
                    );
                  }}
                >
                  복구
                </Button>
                <Button
                  size="sm"
                  disabled={moderationPendingKey === `confirm_content:${item.targetType}:${item.id}`}
                  onClick={() => {
                    if (!confirmAdminAction("자동 숨김 상태를 유지하시겠습니까?")) {
                      return;
                    }
                    if (source === "supabase") {
                      void mutateModerationAction({
                        action: "confirm_content",
                        targetType: item.targetType,
                        targetId: item.id,
                      });
                      return;
                    }

                    setSnapshot((snapshot) =>
                      hideContentInSnapshot(
                        confirmReportsForTargetInSnapshot(snapshot, item.targetType, item.id),
                        item.targetType,
                        item.id,
                      ),
                    );
                  }}
                >
                  유지
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={moderationPendingKey === `warn_user:${item.authorId}`}
                  onClick={() => {
                    if (source === "supabase") {
                      void mutateModerationAction({
                        action: "warn_user",
                        userId: item.authorId,
                      });
                      return;
                    }

                    setSnapshot((snapshot) => warnUserInSnapshot(snapshot, item.authorId));
                  }}
                >
                  경고 상태 표시
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reported-users" className="space-y-3 lg:mt-0">
          {reportedUsers.map((user) => (
            <UserModerationCard
              key={user.id}
              title={getAnonymousHandle(user.id)}
              subtitle={`신고 ${user.reportCount ?? 0}건 · 경고 ${user.warningCount ?? 0}회`}
              trustScore={user.trustScore}
              restricted={Boolean(user.isRestricted)}
              warningPending={moderationPendingKey === `warn_user:${user.id}`}
              onWarn={() => {
                if (source === "supabase") {
                  void mutateModerationAction({
                    action: "warn_user",
                    userId: user.id,
                  });
                  return;
                }

                setSnapshot((snapshot) => warnUserInSnapshot(snapshot, user.id));
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="low-trust" className="space-y-3 lg:mt-0">
          {lowTrustUsers.map((user) => (
            <UserModerationCard
              key={user.id}
              title={getAnonymousHandle(user.id)}
              subtitle={`낮은 신뢰도 사용자 · 신고 ${user.reportCount ?? 0}건`}
              trustScore={user.trustScore}
              restricted={Boolean(user.isRestricted)}
              warningPending={moderationPendingKey === `warn_user:${user.id}`}
              onWarn={() => {
                if (source === "supabase") {
                  void mutateModerationAction({
                    action: "warn_user",
                    userId: user.id,
                  });
                  return;
                }

                setSnapshot((snapshot) => warnUserInSnapshot(snapshot, user.id));
              }}
            />
          ))}
        </TabsContent>
          </div>
        </div>
      </Tabs>
      <Dialog
        open={Boolean(rejectProfileImageItem)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectProfileImageItem(null);
            setRejectProfileImageReasons([]);
            setRejectProfileImageCustomReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로필 사진 반려</DialogTitle>
            <DialogDescription>
              반려 사유를 선택하거나 직접 입력한 뒤 사용자에게 안내합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PROFILE_IMAGE_REJECTION_OPTIONS.map((item) => {
                const selected = rejectProfileImageReasons.includes(item);

                return (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => {
                      setRejectProfileImageReasons((current) =>
                        current.includes(item)
                          ? current.filter((value) => value !== item)
                          : [...current, item],
                      );
                    }}
                  >
                    {item}
                  </Button>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-image-reject-reason">직접 입력</Label>
              <Textarea
                id="profile-image-reject-reason"
                value={rejectProfileImageCustomReason}
                onChange={(event) => setRejectProfileImageCustomReason(event.target.value)}
                placeholder="기타 반려 사유를 입력하세요"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectProfileImageItem(null);
                setRejectProfileImageReasons([]);
                setRejectProfileImageCustomReason("");
              }}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={
                !rejectProfileImageItem ||
                profileImagePendingId === rejectProfileImageItem.id
              }
              onClick={() => {
                void submitRejectProfileImage();
              }}
            >
              반려하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => {
        if (!open) {
          setSelectedMember(null);
          setSelectedMemberDetail(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 상세 보기</DialogTitle>
            <DialogDescription>
              가입일, 학교, 인증 상태, 제재 상태를 확인하고 조치할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedMember ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold">{selectedMember.nickname}</p>
                <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{getUserTypeLabel(selectedMember.userType)}</Badge>
                <Badge variant="secondary">{selectedMember.schoolName ?? "학교 미지정"}</Badge>
                {selectedMember.department ? (
                  <Badge variant="secondary">{selectedMember.department}</Badge>
                ) : null}
                {selectedMember.grade ? (
                  <Badge variant="secondary">{selectedMember.grade}학년</Badge>
                ) : null}
                {selectedMember.role ? <Badge variant="default">{selectedMember.role}</Badge> : null}
                {selectedMember.verified ? <Badge variant="success">학교 인증</Badge> : null}
                {selectedMember.isRestricted ? <Badge variant="danger">활동 정지</Badge> : null}
              </div>
              <div className="grid gap-3 rounded-[24px] border border-white/10 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">가입일</span>
                  <span>{selectedMember.createdAt.slice(0, 16)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">최근 로그인</span>
                  <span>{selectedMember.lastSignInAt?.slice(0, 16) ?? "기록 없음"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">학교 메일</span>
                  <span>{selectedMember.schoolEmail ?? "미입력"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">학생 인증</span>
                  <span>{getVerificationStateLabel(selectedMember.verificationState)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">인증 점수</span>
                  <span>{selectedMember.verificationScore ?? 0}점</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">학번 / 입학년도</span>
                  <span>
                    {selectedMember.studentNumber ?? "미입력"}
                    {selectedMember.admissionYear ? ` · ${selectedMember.admissionYear}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">신뢰 점수</span>
                  <TrustScoreBadge score={selectedMember.trustScore} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">신고 / 경고</span>
                  <span>
                    {selectedMember.reportCount}건 / {selectedMember.warningCount}회
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMember.isRestricted ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!confirmAdminAction("활동 정지를 해제하시겠습니까?")) {
                        return;
                      }
                      void mutateModerationAction({
                        action: "unrestrict_user",
                        userId: selectedMember.id,
                      });
                    }}
                  >
                    <Undo2 className="h-4 w-4" />
                    활동 정지 해제
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void mutateModerationAction({
                        action: "restrict_user",
                        userId: selectedMember.id,
                      });
                    }}
                  >
                    <Ban className="h-4 w-4" />
                    활동 정지
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void mutateRole(selectedMember.id, "moderator");
                  }}
                >
                  운영자 부여
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void mutateRole(selectedMember.id, "admin");
                  }}
                >
                  관리자 부여
                </Button>
              </div>
              {memberDetailLoading ? <LoadingState /> : null}
              {memberDetailError ? (
                <Card className="border-rose-200 bg-rose-50/80">
                  <CardContent className="py-4 text-sm text-rose-700">{memberDetailError}</CardContent>
                </Card>
              ) : null}
              {selectedMemberDetail ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <AdminMemberActivitySection
                    title="학생 인증 이력"
                    emptyLabel="학생 인증 이력이 없습니다."
                    items={(selectedMemberDetail.studentVerifications ?? []).map((item) => ({
                      id: item.id,
                      title: `${getVerificationStateLabel(item.verificationState)} · ${item.score}점`,
                      body: [
                        item.studentNumber ? `학번 ${item.studentNumber}` : null,
                        item.departmentName ?? null,
                        item.admissionYear ? `${item.admissionYear}학번` : null,
                        item.decisionReason ?? item.rejectionReason ?? null,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                      meta: item.requestedAt.slice(0, 16),
                      danger: item.verificationState === "rejected",
                    }))}
                  />
                  <AdminMemberActivitySection
                    title="최근 작성 글"
                    emptyLabel="작성 글이 없습니다."
                    items={selectedMemberDetail.recentPosts.map((item) => ({
                      id: item.id,
                      title: item.title,
                      body: `${item.category}${item.subcategory ? ` · ${item.subcategory}` : ""} · 댓글 ${item.commentCount} · 좋아요 ${item.likeCount}`,
                      meta: item.createdAt.slice(0, 16),
                      danger: item.hidden,
                    }))}
                  />
                  <AdminMemberActivitySection
                    title="최근 댓글"
                    emptyLabel="작성 댓글이 없습니다."
                    items={selectedMemberDetail.recentComments.map((item) => ({
                      id: item.id,
                      title: item.postTitle ?? "원문 없음",
                      body: item.content,
                      meta: item.createdAt.slice(0, 16),
                      danger: item.hidden,
                    }))}
                  />
                  <AdminMemberActivitySection
                    title="받은 신고"
                    emptyLabel="받은 신고가 없습니다."
                    items={selectedMemberDetail.receivedReports.map((item) => ({
                      id: item.id,
                      title: REPORT_REASON_LABELS[item.reason],
                      body: item.memo ?? `${item.targetType} · ${REPORT_STATUS_LABELS[item.status]}`,
                      meta: item.createdAt.slice(0, 16),
                    }))}
                  />
                  <AdminMemberActivitySection
                    title="회원 조치 이력"
                    emptyLabel="회원 조치 이력이 없습니다."
                    items={selectedMemberDetail.auditLogs.map((item) => ({
                      id: item.id,
                      title: item.summary,
                      body: item.action,
                      meta: item.createdAt.slice(0, 16),
                    }))}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function VerificationRequestCard({
  item,
  canManage,
  pendingAction,
  onApprove,
  onReject,
  onResend,
}: {
  item: StudentVerificationRequest;
  canManage: boolean;
  pendingAction?: "pending";
  onApprove: () => void;
  onReject: () => void;
  onResend: () => void;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{item.schoolName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {item.userNickname}
              {item.userDepartment ? ` · ${item.userDepartment}` : ""}
              {item.userGrade ? ` · ${item.userGrade}학년` : ""}
            </p>
          </div>
          <Badge variant={getVerificationStatusVariant(item.status)}>
            {getVerificationStatusLabel(item.status, item.studentVerificationStatus)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{item.schoolEmail}</Badge>
          <Badge variant="secondary">{getVerificationStateLabel(item.verificationState)}</Badge>
          <Badge variant="secondary">점수 {item.verificationScore ?? 0}</Badge>
          {item.studentNumber ? <Badge variant="secondary">학번 {item.studentNumber}</Badge> : null}
          {item.admissionYear ? <Badge variant="secondary">{item.admissionYear}학번</Badge> : null}
          <Badge variant={getDeliveryStatusVariant(item.deliveryStatus)}>
            {getDeliveryStatusLabel(item.deliveryMethod, item.deliveryStatus)}
          </Badge>
          <TrustScoreBadge score={item.trustScore} />
          <Badge variant="secondary">신고 {item.reportCount}건</Badge>
          <Badge variant="secondary">경고 {item.warningCount}회</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          요청 {item.requestedAt.slice(0, 16)} · 만료 {item.expiresAt.slice(0, 16)}
        </p>
        {item.decisionReason ? (
          <p className="text-sm text-muted-foreground">{item.decisionReason}</p>
        ) : null}
        {item.rejectionReason ? (
          <p className="text-sm text-rose-600">{item.rejectionReason}</p>
        ) : null}
        {item.autoChecks?.length ? (
          <div className="space-y-2 rounded-[18px] border border-border/60 bg-secondary/40 px-3 py-3">
            <p className="text-xs font-semibold text-muted-foreground">자동 판정</p>
            <div className="space-y-2">
              {item.autoChecks.map((check) => (
                <div key={check.code} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-medium text-foreground">{check.label}</p>
                    {check.detail ? (
                      <p className="text-muted-foreground">{check.detail}</p>
                    ) : null}
                  </div>
                  <span className={check.passed ? "text-emerald-600" : "text-rose-600"}>
                    {check.passed ? `+${check.weight}` : "실패"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {item.documents?.length ? (
          <div className="space-y-2 rounded-[18px] border border-border/60 bg-secondary/40 px-3 py-3">
            <p className="text-xs font-semibold text-muted-foreground">업로드 문서</p>
            <div className="space-y-2">
              {item.documents
                .filter((document) => document.status !== "deleted")
                .map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-foreground">
                      {document.fileName ?? "추가 인증 자료"}
                    </span>
                    {document.fileUrl ? (
                      <Link
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        보기
                      </Link>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        ) : null}
        {item.deliveryError ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            발송 오류 · {item.deliveryError}
          </div>
        ) : null}
        {item.deliveredAt ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MailCheck className="h-3.5 w-3.5" />
            {item.deliveredAt.slice(0, 16)} 발송 완료
          </div>
        ) : null}
      </CardHeader>
      {canManage ? (
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onResend}
            disabled={pendingAction === "pending"}
          >
            재발송
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={item.status === "verified" || pendingAction === "pending"}
          >
            승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={item.status !== "pending" || pendingAction === "pending"}
          >
            반려
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldAlert;
}) {
  return (
    <Card className="border-none bg-secondary/60 shadow-none">
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-4 w-4" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function MemberDesktopTable({
  items,
  pendingKey,
  onOpenDetail,
  onRestrict,
  onUnrestrict,
}: {
  items: AdminMember[];
  pendingKey: string | null;
  onOpenDetail: (item: AdminMember) => void;
  onRestrict: (item: AdminMember) => void;
  onUnrestrict: (item: AdminMember) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)_220px_220px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-semibold text-muted-foreground">
          <span>회원</span>
          <span>학교/상태</span>
          <span>가입/최근 로그인</span>
          <span className="text-right">관리</span>
        </div>
        <div className="divide-y divide-white/10">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)_220px_220px] gap-4 px-5 py-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{item.nickname}</p>
                  {item.role ? <Badge variant="default">{item.role}</Badge> : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">{item.email}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getUserTypeLabel(item.userType)}</Badge>
                  {item.department ? <Badge variant="secondary">{item.department}</Badge> : null}
                  {item.grade ? <Badge variant="secondary">{item.grade}학년</Badge> : null}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{item.schoolName ?? "학교 미지정"}</Badge>
                  {item.verified ? <Badge variant="success">학교 인증</Badge> : null}
                  {item.isRestricted ? <Badge variant="danger">restricted</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <TrustScoreBadge score={item.trustScore} />
                  <Badge variant="secondary">신고 {item.reportCount}</Badge>
                  <Badge variant="secondary">경고 {item.warningCount}</Badge>
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>가입 {item.createdAt.slice(0, 16)}</p>
                <p>{item.lastSignInAt ? `최근 ${item.lastSignInAt.slice(0, 16)}` : "로그인 이력 없음"}</p>
                {item.schoolEmail ? <p className="truncate">{item.schoolEmail}</p> : null}
              </div>
              <div className="flex flex-wrap items-start justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onOpenDetail(item)}>
                  상세
                </Button>
                {item.isRestricted ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onUnrestrict(item)}
                    disabled={pendingKey === `unrestrict_user:${item.id}`}
                  >
                    해제
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onRestrict(item)}
                    disabled={pendingKey === `restrict_user:${item.id}`}
                  >
                    제한
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MemberCard({
  item,
  pendingKey,
  onOpenDetail,
  onRestrict,
  onUnrestrict,
}: {
  item: AdminMember;
  pendingKey: string | null;
  onOpenDetail: () => void;
  onRestrict: () => void;
  onUnrestrict: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold">{item.nickname}</p>
            <p className="text-sm text-muted-foreground">{item.email}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {item.role ? <Badge variant="default">{item.role}</Badge> : null}
            {item.isRestricted ? <Badge variant="danger">restricted</Badge> : null}
            {item.verified ? <Badge variant="success">학교 인증</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{getUserTypeLabel(item.userType)}</Badge>
          <Badge variant="secondary">{item.schoolName ?? "학교 미지정"}</Badge>
          {item.department ? <Badge variant="secondary">{item.department}</Badge> : null}
          {item.grade ? <Badge variant="secondary">{item.grade}학년</Badge> : null}
          <TrustScoreBadge score={item.trustScore} />
          <Badge variant="secondary">신고 {item.reportCount}건</Badge>
          <Badge variant="secondary">경고 {item.warningCount}회</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          가입 {item.createdAt.slice(0, 16)}
          {item.lastSignInAt ? ` · 최근 로그인 ${item.lastSignInAt.slice(0, 16)}` : ""}
          {item.schoolEmail ? ` · 학교 메일 ${item.schoolEmail}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onOpenDetail}>
            회원 상세 보기
          </Button>
          {item.isRestricted ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onUnrestrict}
              disabled={pendingKey === `unrestrict_user:${item.id}`}
            >
              <Undo2 className="h-4 w-4" />
              활동 정지 해제
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRestrict}
              disabled={pendingKey === `restrict_user:${item.id}`}
            >
              <Ban className="h-4 w-4" />
              활동 정지
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileImageDesktopTable({
  items,
  profileImagePendingId,
  onApprove,
  onReject,
  onDelete,
}: {
  items: AdminProfileImageItem[];
  profileImagePendingId: string | null;
  onApprove: (item: AdminProfileImageItem) => void;
  onReject: (item: AdminProfileImageItem) => void;
  onDelete: (item: AdminProfileImageItem) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[96px_minmax(0,1.4fr)_140px_140px_160px_220px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-semibold text-muted-foreground">
          <span>미리보기</span>
          <span>사용자</span>
          <span>학교</span>
          <span>상태</span>
          <span>업로드</span>
          <span className="text-right">관리</span>
        </div>
        <div className="divide-y divide-white/10">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[96px_minmax(0,1.4fr)_140px_140px_160px_220px] gap-4 px-5 py-4"
            >
              <div className="aspect-square overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/5">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={`${item.nickname} 프로필 사진`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                    없음
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{item.nickname}</p>
                  {item.isPrimary ? <Badge variant="outline">대표</Badge> : null}
                  <Badge variant="outline">슬롯 {item.imageOrder}</Badge>
                </div>
                {item.email ? <p className="truncate text-sm text-muted-foreground">{item.email}</p> : null}
                {item.moderationReason ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.moderationReason}</p>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">{item.schoolName ?? "-"}</div>
              <div className="flex items-start">
                <Badge variant={item.moderationStatus === "approved" ? "secondary" : "outline"}>
                  {item.moderationStatus === "approved"
                    ? "승인됨"
                    : item.moderationStatus === "rejected"
                      ? "반려됨"
                      : "검토 중"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {item.createdAt.slice(0, 16).replace("T", " ")}
              </div>
              <div className="flex flex-wrap items-start justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={profileImagePendingId === item.id || item.moderationStatus === "approved"}
                  onClick={() => onApprove(item)}
                >
                  승인
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={profileImagePendingId === item.id}
                  onClick={() => onReject(item)}
                >
                  반려
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={profileImagePendingId === item.id}
                  onClick={() => onDelete(item)}
                >
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleCard({
  item,
  pendingKey,
  onPromoteAdmin,
  onPromoteModerator,
  onClearRole,
}: {
  item: {
    userId: string;
    role: "admin" | "moderator";
    createdAt: string;
    email: string;
    nickname: string;
    department?: string;
    schoolName?: string;
  };
  pendingKey: string | null;
  onPromoteAdmin: () => void;
  onPromoteModerator: () => void;
  onClearRole: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">{item.nickname}</p>
          <p className="text-sm text-muted-foreground">{item.email}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{item.role}</Badge>
            {item.schoolName ? <Badge variant="outline">{item.schoolName}</Badge> : null}
            {item.department ? <Badge variant="outline">{item.department}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={item.role === "admin" ? "default" : "outline"}
            disabled={pendingKey === `role:${item.userId}:admin`}
            onClick={onPromoteAdmin}
          >
            관리자
          </Button>
          <Button
            type="button"
            size="sm"
            variant={item.role === "moderator" ? "default" : "outline"}
            disabled={pendingKey === `role:${item.userId}:moderator`}
            onClick={onPromoteModerator}
          >
            운영자
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pendingKey === `role:${item.userId}:none`}
            onClick={onClearRole}
          >
            해제
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureFlagCard({
  title,
  description,
  enabled,
  loading,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  loading?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[22px] border border-white/10 px-4 py-4">
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button type="button" size="sm" variant={enabled ? "default" : "outline"} disabled={loading} onClick={onToggle}>
        {enabled ? "ON" : "OFF"}
      </Button>
    </div>
  );
}

function NoticeCard({
  item,
  onTogglePinned,
  onToggleActive,
  onDelete,
}: {
  item: AdminNotice;
  onTogglePinned: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.pinned ? <Badge variant="default">상단 고정</Badge> : null}
          {item.active ? <Badge variant="success">활성</Badge> : <Badge variant="outline">비활성</Badge>}
          {item.startsAt ? <Badge variant="outline">시작 {item.startsAt.slice(0, 16)}</Badge> : null}
          {item.endsAt ? <Badge variant="outline">종료 {item.endsAt.slice(0, 16)}</Badge> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onTogglePinned}>
          {item.pinned ? "고정 해제" : "상단 고정"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onToggleActive}>
          {item.active ? "비활성화" : "활성화"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete}>
          삭제
        </Button>
      </div>
    </div>
  );
}

function SchoolStatCard({
  item,
}: {
  item: AdminOverview["schoolStats"][number];
}) {
  return (
    <div className="rounded-[20px] border border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{item.schoolName}</p>
        <Badge variant="secondary">{item.memberCount}명</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>인증 {item.verifiedCount}</span>
        <span>제한 {item.restrictedCount}</span>
        <span>신고 {item.reportCount}</span>
        <span>글 {item.postCount}</span>
      </div>
    </div>
  );
}

function AdminMemberActivitySection({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{
    id: string;
    title: string;
    body: string;
    meta: string;
    danger?: boolean;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-[18px] border border-white/10 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{item.title}</p>
                {item.danger ? <Badge variant="danger">숨김</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.meta}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PromotionCard({
  item,
  schoolName,
  onTogglePinned,
  onToggleActive,
  onDelete,
}: {
  item: AdminPromotion;
  schoolName?: string;
  onTogglePinned: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 px-4 py-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.pinned ? <Badge variant="default">우선 노출</Badge> : null}
            {item.active ? <Badge variant="success">활성</Badge> : <Badge variant="outline">비활성</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{item.placement}</Badge>
          {schoolName ? <Badge variant="outline">{schoolName}</Badge> : null}
          {item.targetUserType ? <Badge variant="outline">{getUserTypeLabel(item.targetUserType)}</Badge> : null}
          <Badge variant="outline">우선순위 {item.priority}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onTogglePinned}>
            {item.pinned ? "우선 해제" : "우선 노출"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onToggleActive}>
            {item.active ? "비활성화" : "활성화"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDelete}>
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}

function OpsEventCard({
  item,
  compact,
}: {
  item: AdminOpsEvent;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{item.event}</p>
          <p className="text-xs text-muted-foreground">
            {item.source} · {item.createdAt.slice(0, 16)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={item.level === "error" ? "danger" : item.level === "warn" ? "warning" : "outline"}>
            {item.level}
          </Badge>
          {typeof item.metadata?.durationMs === "number" ? (
            <Badge variant="secondary">{Math.round(Number(item.metadata.durationMs))}ms</Badge>
          ) : null}
        </div>
      </div>
      {!compact ? (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
          {JSON.stringify(item.metadata ?? {}, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function UserModerationCard({
  title,
  subtitle,
  trustScore,
  restricted,
  warningPending,
  onWarn,
}: {
  title: string;
  subtitle: string;
  trustScore: number;
  restricted: boolean;
  warningPending?: boolean;
  onWarn: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-5">
        <div className="space-y-2">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <div className="flex items-center gap-2">
            <TrustScoreBadge score={trustScore} />
            {restricted ? <Badge variant="danger">restricted</Badge> : null}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onWarn} disabled={warningPending}>
          경고 상태 표시
        </Button>
      </CardContent>
    </Card>
  );
}

function getStatusVariant(status: keyof typeof REPORT_STATUS_LABELS) {
  if (status === "pending") return "danger";
  if (status === "reviewing") return "warning";
  if (status === "confirmed") return "success";
  return "outline";
}

function getVerificationStatusLabel(
  status: StudentVerificationRequest["status"],
  studentVerificationStatus: StudentVerificationRequest["studentVerificationStatus"],
) {
  if (status === "verified") return "인증 완료";
  if (studentVerificationStatus === "rejected") return "반려";
  if (status === "expired") return "만료";
  if (status === "cancelled") return "취소";
  return "대기";
}

function getVerificationStatusVariant(status: StudentVerificationRequest["status"]) {
  if (status === "verified") return "success";
  if (status === "pending") return "warning";
  if (status === "expired") return "danger";
  return "outline";
}

function getVerificationStateLabel(
  state?: StudentVerificationRequest["verificationState"],
) {
  if (state === "student_verified") return "학생 인증 완료";
  if (state === "email_verified") return "메일 확인";
  if (state === "manual_review") return "수동 검토";
  if (state === "rejected") return "반려";
  return "대기";
}

function getUserTypeLabel(userType: AdminMember["userType"]) {
  if (userType === "student") return "대학생";
  if (userType === "freshman") return "예비입학생";
  return "입시생";
}

function getDeliveryStatusLabel(
  deliveryMethod: StudentVerificationRequest["deliveryMethod"],
  deliveryStatus: StudentVerificationRequest["deliveryStatus"],
) {
  const methodLabel =
    deliveryMethod === "app_smtp"
      ? "앱 SMTP"
      : deliveryMethod === "supabase_auth"
        ? "Supabase 메일"
        : "발송 대기";

  if (deliveryStatus === "sent") return `${methodLabel} 발송 완료`;
  if (deliveryStatus === "failed") return `${methodLabel} 발송 실패`;
  if (deliveryStatus === "rate_limited") return `${methodLabel} 잠시 대기`;
  return methodLabel;
}

function getDeliveryStatusVariant(
  status: StudentVerificationRequest["deliveryStatus"],
) {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "rate_limited") return "warning";
  return "outline";
}

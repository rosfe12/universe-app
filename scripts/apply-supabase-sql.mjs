import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import pg from "pg";

import { loadLocalEnv, requireEnv } from "./_env.mjs";

loadLocalEnv();
if (
  !process.env.SUPABASE_MIGRATION_DB_URL &&
  !process.env.SUPABASE_DB_URL
) {
  requireEnv(["SUPABASE_DB_URL"]);
}

const databaseUrl =
  process.env.SUPABASE_MIGRATION_DB_URL ?? process.env.SUPABASE_DB_URL;
const mode = process.argv[2] ?? "all";
const root = process.cwd();
const careerBoardSeed = JSON.parse(
  fs.readFileSync(path.join(root, "data/career-board-seed.json"), "utf8"),
);
const anonymousBoardSeed = JSON.parse(
  fs.readFileSync(path.join(root, "data/anonymous-board-seed.json"), "utf8"),
);
const files =
  mode === "schema"
    ? ["supabase/schema.sql"]
    : mode === "seed"
      ? ["supabase/seed.sql"]
      : ["supabase/schema.sql", "supabase/seed.sql"];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

const makeDeterministicUuid = (seed) => {
  const hash = crypto.createHash("md5").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

const extractSourceUrl = (content) => {
  const match = content.match(/출처:\s*(https?:\/\/\S+)/);
  return match?.[1] ?? "";
};

const stripSourceLine = (content) =>
  content
    .replace(/\n?출처:\s*https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const shiftIsoMinutes = (value, minutes) => new Date(new Date(value).getTime() + minutes * 60_000).toISOString();

const uniqTags = (...groups) => Array.from(new Set(groups.flat().filter(Boolean)));
const CURATED_CAREER_SEED_SOURCE = "career_curated_v1";
const CURATED_ANONYMOUS_BOARD_SEED_SOURCE = "anonymous_curated_v1";
const LEGACY_CAREER_SEED_POST_IDS = [
  "41111111-1111-4111-8111-111111111129",
  "41111111-1111-4111-8111-111111111130",
  "41111111-1111-4111-8111-111111111131",
  "41111111-1111-4111-8111-111111111132",
  "41111111-1111-4111-8111-111111111133",
  "41111111-1111-4111-8111-111111111134",
];
const LEGACY_CAREER_REFERENCE_POST_IDS = [
  "41111111-1111-4111-8111-111111111156",
  "41111111-1111-4111-8111-111111111157",
  "41111111-1111-4111-8111-111111111158",
  "41111111-1111-4111-8111-111111111159",
];
const LEGACY_DERIVED_CAREER_SUFFIXES = [
  "career-save",
  "career-junior",
  "career-flow",
  "career-link",
  "career-center",
  "career-checklist",
  "career-alumni",
  "career-roadmap",
];

const SCHOOL_LECTURE_BLUEPRINTS = [
  {
    suffix: "writing",
    name: "대학생활글쓰기",
    professor: "김하은",
    section: "01",
    dayTime: "월 10:30 - 12:00",
    credits: 2,
    department: "교양",
  },
  {
    suffix: "data",
    name: "데이터리터러시기초",
    professor: "박지훈",
    section: "01",
    dayTime: "화 13:00 - 14:30",
    credits: 3,
    department: "교양",
  },
  {
    suffix: "career",
    name: "진로탐색세미나",
    professor: "이서윤",
    section: "02",
    dayTime: "수 15:00 - 16:30",
    credits: 2,
    department: "교양",
  },
  {
    suffix: "project",
    name: "문제해결프로젝트",
    professor: "최도윤",
    section: "01",
    dayTime: "목 10:00 - 12:30",
    credits: 3,
    department: "융합교양",
  },
];

const SCHOOL_REVIEW_TEMPLATES = [
  {
    difficulty: "easy",
    workload: "light",
    attendance: "flexible",
    examStyle: "multipleChoice",
    teamProject: false,
    presentation: false,
    gradingStyle: "generous",
    honeyScore: 5,
    shortComment: "부담 적고 만족도 높은 편",
    longComment: "출결 체크가 빡세지 않고 채점 포인트가 명확합니다. 일정이 빡빡한 학기에도 넣기 괜찮은 타입의 강의였어요.",
    helpfulCount: 18,
    semester: "2025-2",
  },
  {
    difficulty: "medium",
    workload: "medium",
    attendance: "medium",
    examStyle: "mixed",
    teamProject: true,
    presentation: true,
    gradingStyle: "medium",
    honeyScore: 4,
    shortComment: "준비한 만큼 확실히 가져가는 구조",
    longComment: "과제와 발표가 적절히 섞여 있어 루틴만 잘 타면 만족도가 높습니다. 교수 피드백이 꽤 구체적이라 얻는 게 있는 강의예요.",
    helpfulCount: 12,
    semester: "2025-1",
  },
  {
    difficulty: "medium",
    workload: "light",
    attendance: "flexible",
    examStyle: "project",
    teamProject: true,
    presentation: false,
    gradingStyle: "generous",
    honeyScore: 4,
    shortComment: "프로젝트 위주라 실전 감각 좋음",
    longComment: "시험 압박이 적고 결과물을 만드는 재미가 있습니다. 팀플은 있지만 난이도가 과하지 않아서 포트폴리오용으로도 괜찮았어요.",
    helpfulCount: 14,
    semester: "2024-2",
  },
];

const SCHOOL_ASK_BLUEPRINTS = [
  {
    suffix: "commute",
    tags: ["무물", "통학"],
    title: () => "통학러는 1교시 있는 날 어떻게 버텨요?",
    content: (_schoolName, sourceUrl) =>
      `1교시가 연속으로 잡히는 날이 있는데, 전날부터 컨디션 관리하는 팁이 궁금합니다. 통학 시간이 길면 아침 루틴을 어떻게 잡는지 묻고 싶어요.\n출처: ${sourceUrl}`,
    comment:
      "전날 가방이랑 옷 미리 챙겨두고 아침엔 무조건 간단히 먹고 나갑니다. 1교시는 루틴이 제일 중요했어요.",
  },
  {
    suffix: "lunch",
    tags: ["무물", "학생식당"],
    title: () => "학생식당은 몇 시쯤 가야 덜 붐비나요?",
    content: (_schoolName, sourceUrl) =>
      `점심시간마다 줄 서는 시간이 꽤 길더라고요. 학생식당이나 교내 카페를 언제 가는 편인지, 붐비는 시간 피하는 루틴 있으면 공유 부탁해요.\n출처: ${sourceUrl}`,
    comment:
      "보통 정시 직전이나 점심 피크 지나고 가면 훨씬 수월했습니다. 인기 메뉴 있는 날은 더 일찍 가는 편이에요.",
  },
  {
    suffix: "laptop",
    tags: ["무물", "기기"],
    title: () => "노트북은 결국 매일 들고 다니게 되나요?",
    content: (_schoolName, sourceUrl) =>
      `강의실 이동이 많은 편이라 노트북을 매일 챙겨야 할지 고민입니다. 태블릿만으로 버티는 사람도 있는지, 과제 많은 수업은 어느 정도까지 가능한지 궁금해요.\n출처: ${sourceUrl}`,
    comment:
      "발표나 팀플 수업 있는 날만 챙기고, 나머지는 태블릿으로 버티는 사람이 생각보다 많았습니다.",
  },
  {
    suffix: "library",
    tags: ["무물", "도서관"],
    title: () => "도서관 자리 잡으려면 몇 시쯤 가는 편이에요?",
    content: (_schoolName, sourceUrl) =>
      `시험기간만 되면 도서관 자리 경쟁이 치열하다고 들어서요. 평소에도 인기 많은 구역이 있는지, 다들 어느 시간대에 가는지 궁금합니다.\n출처: ${sourceUrl}`,
    comment:
      "시험기간엔 오전에 먼저 가는 쪽이 안전했고, 평소엔 저녁 시간대가 오히려 한산한 날도 있었습니다.",
  },
  {
    suffix: "groupwork",
    tags: ["무물", "조별과제"],
    title: () => "팀플 조장은 보통 먼저 손드는 편인가요?",
    content: (_schoolName, sourceUrl) =>
      `전공 수업 팀플이 슬슬 시작되는데, 조장 맡는 분위기가 궁금해요. 무조건 먼저 나서는 게 편한지, 역할만 빨리 정하면 무난한지 실제 경험 듣고 싶습니다.\n출처: ${sourceUrl}`,
    comment:
      "처음에 역할, 마감, 회의 주기까지만 빨리 정하면 생각보다 수월했습니다. 조장은 먼저 손드는 사람이 맡는 경우가 많았어요.",
  },
  {
    suffix: "otlook",
    tags: ["무물", "새내기"],
    title: () => "OT나 개강 첫 주에는 다들 어느 정도 꾸미고 가요?",
    content: (_schoolName, sourceUrl) =>
      `처음 만나는 자리라 너무 편하게 가도 되나 고민됩니다. 새내기 때 너무 힘줘서 간 사람이 많은지, 오히려 편한 복장이 더 많은지 궁금해요.\n출처: ${sourceUrl}`,
    comment:
      "막상 가보면 다들 생각보다 편하게 입고 옵니다. 너무 힘주는 것보다 단정한 쪽이 무난했어요.",
  },
  {
    suffix: "club",
    tags: ["무물", "동아리"],
    title: () => "동아리는 첫 학기에 바로 들어가는 편인가요?",
    content: (_schoolName, sourceUrl) =>
      `새내기 때 동아리를 바로 정하는 게 좋은지, 한 달 정도 학교 분위기 보고 들어가는 게 좋은지 고민입니다. 너무 빨리 들어가서 후회한 경험도 있는지 듣고 싶어요.\n출처: ${sourceUrl}`,
    comment:
      "한두 번 구경해보고 들어가는 게 덜 후회했습니다. 첫 학기에 바로 정착 안 해도 괜찮았어요.",
  },
  {
    suffix: "festival",
    tags: ["무물", "축제"],
    title: () => "축제는 첫날 가는 게 재밌나요 마지막 날이 재밌나요?",
    content: (_schoolName, sourceUrl) =>
      `축제 라인업 발표되면 항상 어느 날 갈지 고민됩니다. 첫날 분위기가 좋은지, 마지막 날이 더 사람 많고 재밌는지 경험담 부탁해요.\n출처: ${sourceUrl}`,
    comment:
      "라인업 따라 다르지만 둘째 날이나 마지막 날이 제일 분위기 좋다는 얘기를 많이 들었습니다.",
  },
  {
    suffix: "elective",
    tags: ["무물", "교양"],
    title: () => "교양은 꿀강 위주로 담는 편인가요 흥미 위주로 담는 편인가요?",
    content: (_schoolName, sourceUrl) =>
      `시간표 짜다 보니 꿀강 평점 좋은 과목과 진짜 듣고 싶은 과목이 갈립니다. 학점 관리 우선으로 가는지, 흥미 과목도 한두 개는 꼭 넣는지 궁금해요.\n출처: ${sourceUrl}`,
    comment:
      "저는 흥미 과목 하나, 부담 적은 과목 하나 섞는 편이었습니다. 꿀강만 넣으면 생각보다 질리더라고요.",
  },
  {
    suffix: "parttime",
    tags: ["무물", "알바"],
    title: () => "다니면서 주중 알바 병행하면 힘든 편인가요?",
    content: (_schoolName, sourceUrl) =>
      `이번 학기에 주중 알바를 병행할지 고민 중입니다. 통학이나 팀플까지 있으면 주중 알바가 너무 빡센지, 주말만 하는 게 나은지 궁금합니다.\n출처: ${sourceUrl}`,
    comment:
      "통학 길면 주중 알바는 생각보다 체력 소모가 큽니다. 첫 학기는 주말이나 짧은 고정 스케줄이 낫더라고요.",
  },
  {
    suffix: "ipad",
    tags: ["무물", "필기"],
    title: () => "아이패드 필기가 많은 편인가요, 종이 노트도 아직 많나요?",
    content: (_schoolName, sourceUrl) =>
      `수업 스타일이 과마다 다르겠지만, 실제로 아이패드 필기가 얼마나 많은지 감이 안 옵니다. 종이 노트로도 충분한 과목이 많은지 궁금해요.\n출처: ${sourceUrl}`,
    comment:
      "PDF 필기 많은 수업은 확실히 편하고, 계산이나 암기 과목은 종이 노트 쓰는 사람도 여전히 많았습니다.",
  },
  {
    suffix: "shuttle",
    tags: ["무물", "캠퍼스생활"],
    title: () => "캠퍼스에서 건물 사이 이동 빡센 편인가요?",
    content: (_schoolName, sourceUrl) =>
      `시간표 짤 때 연강 사이 건물 이동이 얼마나 빡센지 알고 싶어요. 언덕이나 거리 때문에 사실상 10분 쉬는 시간에 뛰어야 하는지 궁금합니다.\n출처: ${sourceUrl}`,
    comment:
      "연강이면 건물 위치를 꼭 보고 짜는 게 좋았습니다. 생각보다 10분 쉬는 시간에 빠듯한 조합이 있더라고요.",
  },
];

const SCHOOL_HOT_BLUEPRINTS = [
  {
    suffix: "cc-rumor",
    tags: ["핫갤", "19+", "과CC"],
    title: () => `핫갤) 과CC 들키면 진짜 바로 소문 도는 편인가요?`,
    content: () =>
      `캠퍼스 생활권이 생각보다 좁다는 얘기를 많이 들어서요. 과CC 시작하면 숨기고 다녀도 금방 소문나는지, 다들 얼마나 조심하는 편인지 궁금합니다.`,
    comment:
      "과방이나 동선 겹치면 생각보다 빨리 퍼지더라고요. 완전히 숨기긴 어렵다는 얘기를 많이 들었습니다.",
  },
  {
    suffix: "after-date",
    tags: ["핫갤", "19+", "썸"],
    title: () => `핫갤) 애프터 두 번 갔으면 가능성 있다고 보나요?`,
    content: () =>
      `두 번째 만남까지는 했는데 연락 텀이 애매해서 감이 안 옵니다. 초반에 텐션 괜찮았던 사람이 갑자기 애매해질 때 다들 어느 정도까지 기다리는지 궁금해요.`,
    comment:
      "두 번 정도면 아예 관심 없는 건 아닌데, 텀이 길면 상대 리듬을 한 번 더 보는 편이 맞더라고요.",
  },
  {
    suffix: "skinship-speed",
    tags: ["핫갤", "19+", "연애"],
    title: () => `핫갤) 또래들은 스킨십 속도감 어느 정도가 자연스럽다고 느껴요?`,
    content: () =>
      `자주 만나게 되는 사람이 있는데 서로 호감은 확실한데 진도가 너무 빠르면 부담스러울까 고민됩니다. 다들 편하다고 느끼는 속도감이 어느 정도인지 무물합니다.`,
    comment:
      "호감이 있어도 속도감이 맞아야 오래 가더라고요. 애매하면 말로 기준 맞추는 게 제일 덜 꼬였습니다.",
  },
  {
    suffix: "same-campus-ex",
    tags: ["핫갤", "19+", "전애인"],
    title: () => `핫갤) 전애인이 같은 생활권이면 다들 어떻게 마주쳐요?`,
    content: () =>
      `생활권이 겹치다 보니 안 마주치기가 더 어렵네요. 헤어진 뒤에도 가끔 보게 되는데 모른 척하는지, 가볍게 인사하는지 다들 기준이 궁금합니다.`,
    comment:
      "처음엔 어색해도 몇 번 지나가면 그냥 인사 정도는 하게 되더라고요. 완전 무시는 오히려 더 티 났습니다.",
  },
  {
    suffix: "room-invite",
    tags: ["핫갤", "19+", "자취"],
    title: () => `핫갤) 자취하는 사람들, 썸 단계에서 집 초대는 언제부터 괜찮다고 봐요?`,
    content: () =>
      `주변 자취하는 친구들은 생각보다 집에서 영화 보거나 밥 먹는 약속을 자연스럽게 잡더라고요. 썸 단계에서 너무 이른 건 아닌지, 다들 어느 정도 만난 뒤에 괜찮다고 보는지 궁금합니다.`,
    comment:
      "분위기보다 서로 안심되는 타이밍인지가 더 중요했어요. 빠르면 오히려 선 넘었다고 느끼는 경우가 있었습니다.",
  },
  {
    suffix: "meeting-followup",
    tags: ["핫갤", "19+", "미팅"],
    title: () => `핫갤) 미팅 끝나고 둘이 따로 보자는 연락 오면 보통 나가요?`,
    content: () =>
      `미팅은 재밌게 끝났는데 그중 한 명이 따로 보자고 해서 고민 중입니다. 자리 분위기가 좋아서 괜찮은 건지, 술자리 텐션일 뿐인지 다들 어떤 기준으로 판단하는지 궁금해요.`,
    comment:
      "미팅 텐션이랑 따로 만나는 텐션은 달라서, 낮에 한 번 더 보자는 제안이면 나쁘지 않다고 느꼈습니다.",
  },
  {
    suffix: "dm-first",
    tags: ["핫갤", "19+", "DM"],
    title: () => `핫갤) 인스타 DM 먼저 보내본 사람 있어요?`,
    content: () =>
      `행사에서 한두 번 본 사람인데 팔로우만 해놓고 대화는 못 시작했습니다. DM 먼저 보내는 게 너무 들이대는 느낌인지, 자연스럽게 시작하는 멘트가 있는지 궁금합니다.`,
    comment:
      "스토리 리액션으로 가볍게 시작하는 사람이 많더라고요. 너무 길게 쓰는 것보다 짧게 여는 편이 부담이 덜했습니다.",
  },
  {
    suffix: "line-drawing",
    tags: ["핫갤", "19+", "관계"],
    title: () => `핫갤) 편하긴 한데 연애는 아닌 관계, 다들 어디서 선 긋나요?`,
    content: () =>
      `자주 보는 사람이 있는데 서로 편하고 끌리긴 합니다. 그런데 연애로 가는 건 아닌 느낌이라 이런 상황에서 다들 어느 순간 선을 긋는지 궁금해요.`,
    comment:
      "기대치가 달라지기 시작하면 빨리 말하는 쪽이 덜 후회하더라고요. 애매하게 오래 가면 더 꼬였습니다.",
  },
  {
    suffix: "library-crush",
    tags: ["핫갤", "19+", "짝사랑"],
    title: () => `핫갤) 도서관에서 자주 마주치는 사람한테 말 걸어본 적 있어요?`,
    content: () =>
      `도서관에서 계속 마주치는 사람이 있는데 먼저 말 걸면 너무 뜬금없을까 고민됩니다. 이런 상황에선 다들 그냥 지나치는지, 핑계를 만들어서라도 말 거는지 궁금해요.`,
    comment:
      "도서관은 조용한 공간이라 더 어렵지만, 시험 끝난 타이밍처럼 자연스러운 순간을 많이 노리더라고요.",
  },
  {
    suffix: "night-walk",
    tags: ["핫갤", "19+", "데이트"],
    title: () => `핫갤) 밤 산책 데이트 좋아하는 사람 많아요?`,
    content: () =>
      `밥 먹고 산책하는 코스가 은근 데이트처럼 느껴지더라고요. 영화나 술보다 산책 데이트 선호하는 사람이 많은지, 너무 애매한 코스는 아닌지 궁금합니다.`,
    comment:
      "분위기 타기엔 산책이 제일 편하다는 얘기를 많이 들었습니다. 대신 너무 늦은 시간은 부담스러워하는 경우가 많았어요.",
  },
  {
    suffix: "friend-boundary",
    tags: ["핫갤", "19+", "친구사이"],
    title: () => `핫갤) 친구였다가 갑자기 텐션 바뀌는 순간 다들 느껴본 적 있어요?`,
    content: () =>
      `모임에서 편하게 지내던 사람이 있는데 어느 순간 분위기가 달라진 느낌이 있습니다. 이럴 때 그냥 모른 척하는지, 한 번쯤은 확실히 이야기하는지 궁금해요.`,
    comment:
      "친구 선 넘는 분위기는 작은 행동에서 티가 나더라고요. 애매하면 괜히 혼자 의미 부여하지 않는 게 낫기도 했습니다.",
  },
  {
    suffix: "secret-dating",
    tags: ["핫갤", "19+", "비밀연애"],
    title: () => `핫갤) 비밀연애 오래 유지한 사람 있어요?`,
    content: () =>
      `생활권이 겹치는 사람과 몰래 만나는 게 생각보다 어렵네요. 학교 안에서는 친구처럼 굴고 밖에서만 만나는 커플도 있는지, 보통 얼마나 가는지 궁금합니다.`,
    comment:
      "완전 비밀은 오래 못 간다는 얘기를 많이 들었습니다. 가까운 친구 한두 명까진 결국 알게 되는 경우가 많았어요.",
  },
];

const SCHOOL_TRADE_AUTHOR_IDS = [
  "a1111111-1111-4111-8111-111111111111",
  "b2222222-2222-4222-8222-222222222222",
  "c3333333-3333-4333-8333-333333333333",
  "d4444444-4444-4444-8444-444444444444",
];

const parseMetadata = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

const classifyReferencePost = (post) => {
  if (post.category === "admission") return "admission";
  if (post.subcategory === "freshman") return "freshman";
  if (post.subcategory === "club" || post.subcategory === "food") return "campus";
  return null;
};

const buildDerivedReferenceRows = (basePosts) => {
  const posts = [];
  const comments = [];

  for (const [index, post] of basePosts.entries()) {
    const schoolName = post.schoolName ?? "우리 학교";
    const sourceUrl = extractSourceUrl(post.content);
    const summary = stripSourceLine(post.content);
    const metadata = parseMetadata(post.metadata);
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
    const kind = classifyReferencePost({ ...post, metadata });

    if (!kind || !sourceUrl) continue;

    const department = metadata.interestDepartment ?? "지원 학과";
    const variants =
      kind === "admission"
        ? [
            {
              suffix: "check",
              title: `[공식 정리] ${schoolName} 지원 전 먼저 본 체크포인트`,
              content: `${schoolName} 공식 자료를 먼저 읽어보니 ${summary}. ${department} 준비 기준으로는 전형 흐름과 학교생활 구조를 같이 파악하는 데 도움이 됐습니다. 입결만 따로 보는 것보다 공식 안내를 먼저 읽고 질문을 정리하면 지원 전략이 훨씬 선명해집니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식정리", "체크포인트"]),
            },
            {
              suffix: "guide",
              title: `${schoolName} 준비할 때 모집요강 말고 같이 봐야 했던 공식 안내`,
              content: `${summary}. 실제로는 설명회, 학과 소개, 신입생 안내 같은 보조 자료를 같이 봐야 학교 분위기와 학과 결이 보였습니다. ${schoolName} 지원 고민 중이면 모집요강만 열어두지 말고 공식 안내 문서까지 같이 보는 걸 추천합니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식자료", "지원전략"]),
            },
            {
              suffix: "memo",
              title: `${schoolName} 지원 전에 공식 자료 보고 바로 메모한 질문들`,
              content: `${schoolName} 자료를 읽다가 ${summary}. 저는 이걸 보고 전형 일정, 학과 적합성, 학교생활 지원 구조를 기준으로 질문 리스트를 따로 정리했습니다. 입시생 입장에선 공식 자료를 먼저 읽고 질문을 남기는 흐름이 생각보다 효율적이었습니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식자료", "질문정리"]),
            },
            {
              suffix: "fit",
              title: `${schoolName} ${department} 준비할 때 공식 자료에서 도움 됐던 포인트`,
              content: `${summary}. ${department} 기준으로는 학과 적합성과 실제 대학생활 맥락을 함께 보는 자료가 특히 유용했습니다. 지원선만 보는 대신 학교 안에서 어떤 경험을 하게 되는지 먼저 감 잡기에 괜찮은 자료였습니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식자료", "학과적합성"]),
            },
            {
              suffix: "timeline",
              title: `${schoolName} 지원 일정 정리할 때 공식 자료에서 먼저 체크한 것`,
              content: `${summary}. 지원 전략을 짤 때는 커뮤니티 후기보다 일정, 제출 서류, 전형별 준비 순서를 먼저 고정하는 게 훨씬 안정적이었습니다. ${schoolName}처럼 공식 안내가 잘 정리된 학교는 일정표만 따로 저장해두는 것만으로도 실수가 많이 줄었습니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식자료", "지원일정"]),
            },
            {
              suffix: "compare",
              title: `${schoolName} 지원 고민할 때 다른 학교와 비교해 보기 좋았던 공식 포인트`,
              content: `${summary}. 학교를 비교할 때는 커뮤니티 분위기보다 공식 자료 안에 있는 학과 소개, 학생지원, 학사 운영 구조를 같이 보는 편이 더 객관적이었습니다. 같은 계열 학과끼리 비교할 때도 공식 설명이 생각보다 판단 기준을 잘 잡아줬습니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식자료", "학교비교"]),
            },
            {
              suffix: "schoollife",
              title: `${schoolName} 지원 전에 학교생활 자료까지 같이 봐야 했던 이유`,
              content: `${summary}. 입시만 보면 숫자 비교에 갇히기 쉬운데, 학교생활 자료까지 함께 보면 내가 이 학교 안에서 실제로 어떤 경험을 하게 될지 감이 더 잘 잡혔습니다. ${schoolName}처럼 공식 안내가 풍부한 학교는 입시생일수록 생활 자료도 같이 읽어볼 가치가 있었습니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식자료", "학교생활"]),
            },
            {
              suffix: "strategy-notes",
              title: `${schoolName} 지원 전략 메모할 때 공식 자료에서 바로 옮겨 적은 부분`,
              content: `${summary}. 저는 지원 대학을 고를 때 학교별 공식 안내에서 핵심 문장을 먼저 메모해두고, 그다음 커뮤니티 후기와 비교했습니다. ${schoolName} 자료는 전형 흐름과 학교 자원을 같이 보여줘서 전략 정리용으로 쓰기 좋았습니다.\n출처: ${sourceUrl}`,
              tags: uniqTags(tags, ["공식자료", "전략메모"]),
            },
          ]
        : kind === "freshman"
          ? [
              {
                suffix: "freshman-check",
                title: `[새내기 체크] ${schoolName} 입학 전 공지에서 먼저 챙길 것 정리`,
                content: `${summary}. 입학 직전에는 일정 자체보다 장소, 신청 순서, 안내 채널을 먼저 정리해두는 게 훨씬 덜 헷갈렸습니다. 새내기존에서는 이런 공식 자료를 먼저 저장해두고 필요한 것만 체크리스트로 바꾸는 편이 좋았습니다.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "체크리스트"]),
              },
              {
                suffix: "freshman-save",
                title: `${schoolName} 새내기라면 OT 전에 저장해둘 공식 안내`,
                content: `${schoolName} 공식 자료를 읽어보니 ${summary}. 학기 시작 직전에는 OT 공지, 수강신청 안내, 학생회 채널처럼 생활 동선에 바로 연결되는 정보를 미리 저장해두는 게 도움이 됐습니다.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "공식자료"]),
              },
              {
                suffix: "freshman-notes",
                title: `${schoolName} 첫 학기 적응할 때 도움 된 공식 자료 메모`,
                content: `${summary}. 새내기 입장에선 학교생활 적응 자료를 읽고 일정표, 장소, 문의처만 따로 메모해두는 방식이 가장 실용적이었습니다. 막상 학기가 시작되면 공지 원문을 다시 찾을 시간이 잘 안 나더라고요.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "적응팁"]),
              },
              {
                suffix: "freshman-route",
                title: `${schoolName} 입학 전 학교생활 감 잡기 좋았던 공식 공지`,
                content: `${summary}. OT나 신입생 안내 자료는 단순 일정표보다 학교 분위기와 운영 방식까지 보여줘서 입학 전 감을 잡는 데 좋았습니다. 예비입학생이면 커뮤니티 후기와 공식 자료를 같이 보는 걸 추천합니다.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "학교생활"]),
              },
              {
                suffix: "freshman-campus",
                title: `${schoolName} 입학 전에 캠퍼스 생활 감 잡기 좋았던 공식 안내`,
                content: `${summary}. 입학 전에는 시간표보다 학교 안에서 어디를 자주 쓰게 되는지, 어떤 채널로 공지가 올라오는지를 먼저 익혀두는 게 적응 속도를 높여줬습니다. 공식 안내를 기준으로 생활 동선을 먼저 그려두면 첫 주가 훨씬 편했습니다.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "캠퍼스적응"]),
              },
              {
                suffix: "freshman-community",
                title: `${schoolName} 새내기라면 오티 전에 커뮤니티랑 같이 보면 좋은 자료`,
                content: `${summary}. 커뮤니티 후기만 보면 분위기는 알 수 있지만, 실제 준비물과 일정은 결국 공식 자료가 가장 정확했습니다. 저는 새내기존 글이랑 공식 공지를 같이 보면서 질문거리를 먼저 정리해두는 방식이 제일 편했습니다.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "질문준비"]),
              },
              {
                suffix: "freshman-registration",
                title: `${schoolName} 새내기 수강신청 전에 공식 공지에서 먼저 체크한 것`,
                content: `${summary}. 예비입학생 때는 수강신청 화면보다 공지 안에 있는 신청 순서, 우선 수강, 오티 안내를 먼저 익혀두는 편이 훨씬 덜 당황스러웠습니다. 학교생활 자료를 먼저 읽고 질문을 모아두는 방식이 실전에서 가장 편했습니다.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "수강신청"]),
              },
              {
                suffix: "freshman-rhythm",
                title: `${schoolName} 입학 전 생활 리듬 잡는 데 도움 된 공식 안내`,
                content: `${summary}. 입학 전에 공지에서 학사 일정, 캠퍼스 공간, 생활 채널을 먼저 익혀두니 학기 초 리듬이 빠르게 잡혔습니다. 새내기존에서는 이런 자료를 기반으로 질문을 주고받는 게 훨씬 실용적이었습니다.\n출처: ${sourceUrl}`,
                tags: uniqTags(tags, ["새내기존", "학기준비"]),
              },
            ]
          : kind === "career"
            ? [
                {
                  suffix: "career-save",
                  title: `[취업 자료] ${schoolName} 취업지원 페이지에서 먼저 저장한 내용`,
                  content: `${summary}. 취업 준비를 막 시작할 때는 공고보다 학교 안 지원 구조를 먼저 보는 편이 훨씬 덜 막막했습니다. ${schoolName}처럼 공식 안내가 정리된 학교는 센터 링크부터 저장해두면 정보를 다시 찾기 편합니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "취업지원"]),
                },
                {
                  suffix: "career-junior",
                  title: `${schoolName} 저학년 때부터 봐두면 좋았던 공식 취업지원 안내`,
                  content: `${summary}. 보통 4학년부터 취업 탭을 열기 쉬운데, 실제로는 1~2학년 때 학교가 어떤 상담과 프로그램을 주는지 먼저 보는 쪽이 준비 속도가 빨랐습니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "저학년준비"]),
                },
                {
                  suffix: "career-flow",
                  title: `${schoolName} 공식 공지 기준으로 본 교내 일경험 흐름`,
                  content: `${summary}. 현장실습, 추천채용, 조교, 학부연구생처럼 학교 안에서 연결되는 일경험 구조를 공식 안내로 먼저 파악해두면 학년별 선택지가 훨씬 선명해집니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "일경험"]),
                },
                {
                  suffix: "career-link",
                  title: `${schoolName} 취업 준비 시작 전에 학교 공식 사이트에서 먼저 본 포인트`,
                  content: `${summary}. 취업 커뮤니티 정보도 중요하지만, 교내에서 어떤 자원을 열어두는지 공식 사이트에서 먼저 보는 편이 준비 루틴을 세우기 좋았습니다. 학교 공지는 생각보다 진로 방향을 잡는 출발점 역할을 해줬습니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "진로설계"]),
                },
                {
                  suffix: "career-center",
                  title: `${schoolName} 취업센터 공지에서 먼저 체크해둘 만한 것`,
                  content: `${summary}. 채용공고만 바로 보는 것보다 학교 취업센터가 제공하는 상담, 현장실습, 추천채용 흐름을 먼저 파악하면 준비 순서를 정하기 쉬웠습니다. 특히 처음 취업 준비를 시작하는 학생에게는 공식 안내가 기준 역할을 해줬습니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "취업센터"]),
                },
                {
                  suffix: "career-checklist",
                  title: `${schoolName} 취업 준비 체크리스트 만들 때 공식 공지로 먼저 본 것`,
                  content: `${summary}. 저는 학교 공식 공지를 읽고 상담, 서류, 면접, 현장실습처럼 준비 단계를 체크리스트로 바꿔서 정리했습니다. 취업 커뮤니티 글만 따라가기보다 교내 지원 구조를 먼저 보는 쪽이 훨씬 체계적이었습니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "체크리스트"]),
                },
                {
                  suffix: "career-alumni",
                  title: `${schoolName} 취업 준비하면서 동문·교내 연결 포인트 먼저 본 기록`,
                  content: `${summary}. 막연하게 공고만 보는 것보다 학교 안에 어떤 네트워크와 프로그램이 연결되는지 먼저 확인하는 편이 훨씬 안정적이었습니다. ${schoolName} 공식 안내는 그런 연결점을 찾는 출발점으로 쓰기 좋았습니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "교내네트워크"]),
                },
                {
                  suffix: "career-roadmap",
                  title: `${schoolName} 학년별 취업 준비 로드맵 짤 때 공식 자료가 도움 된 부분`,
                  content: `${summary}. 취업 준비를 할 때 당장 지원할 것만 찾기보다, 학년별로 어떤 교내 자원을 언제 쓰는지 먼저 정리하는 쪽이 오래 버티기 좋았습니다. 공식 공지를 기준으로 로드맵을 짜면 준비 순서가 훨씬 명확해졌습니다.\n출처: ${sourceUrl}`,
                  tags: uniqTags(tags, ["공식자료", "준비로드맵"]),
                },
              ]
            : post.subcategory === "club"
              ? [
                  {
                    suffix: "club-overview",
                    title: `[공식 참고] ${schoolName} 동아리 정보 먼저 보고 들어가는 편이 좋았습니다`,
                    content: `${summary}. 관심 동아리를 고를 때는 커뮤니티 후기만 보기보다 공식 소개 페이지에서 분과와 운영 규모를 먼저 보는 편이 판단이 빨랐습니다. 모집 시즌에는 특히 학교 공식 소개와 모집 글을 같이 보는 게 안전합니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "동아리"]),
                  },
                  {
                    suffix: "club-save",
                    title: `${schoolName} 동아리 찾을 때 공식 소개 페이지에서 먼저 본 것`,
                    content: `${summary}. 중앙동아리나 학생자치 정보는 공식 소개 페이지에서 기본 구조를 먼저 보고, 그다음에 커뮤니티 모집 글로 분위기를 확인하는 흐름이 제일 편했습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "학생활동"]),
                  },
                  {
                    suffix: "club-guide",
                    title: `${schoolName} 학교생활 적응용으로 저장해둔 공식 학생활동 링크`,
                    content: `${summary}. 신입생이나 복학생 입장에서는 동아리 구조와 학생회 흐름이 같이 보이는 자료를 하나 저장해두면 학교생활 적응 속도가 꽤 빨랐습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "학교생활"]),
                  },
                  {
                    suffix: "club-pick",
                    title: `${schoolName} 중앙동아리 고를 때 커뮤니티보다 먼저 봐야 했던 안내`,
                    content: `${summary}. 후기 글도 도움 되지만, 동아리 수와 분과 구성을 먼저 알아야 내가 찾는 활동군이 어디에 있는지 보이더라고요. 학교 공식 페이지가 그 출발점으로 괜찮았습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "중앙동아리"]),
                  },
                  {
                    suffix: "club-calendar",
                    title: `${schoolName} 동아리 모집 시즌 전에 미리 봐두기 좋았던 공식 정보`,
                    content: `${summary}. 모집 글이 올라오면 분위기만 보고 들어가기 쉬운데, 공식 학생활동 안내를 먼저 보면 어떤 단위의 동아리가 있는지, 학생자치 구조가 어떻게 돌아가는지 먼저 감이 잡혔습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "모집시즌"]),
                  },
                  {
                    suffix: "club-return",
                    title: `${schoolName} 복학생도 학생활동 정보 다시 정리할 때 도움 된 공식 페이지`,
                    content: `${summary}. 복학 직후엔 최신 커뮤니티 글보다 학교가 현재 어떤 학생활동 구조를 운영하는지 공식 페이지에서 먼저 확인하는 편이 덜 헷갈렸습니다. 공백기가 있었던 학생일수록 공식 안내가 기준점이 됐습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "복학생"]),
                  },
                  {
                    suffix: "club-channel",
                    title: `${schoolName} 학생활동 채널 찾을 때 공식 페이지부터 보는 편이 편했습니다`,
                    content: `${summary}. 동아리 모집 글은 시기마다 흩어져 올라오지만, 공식 학생활동 페이지를 먼저 보면 어디에서 모집 공지를 확인해야 하는지 기준이 생겼습니다. 학교생활 적응 단계에서는 이런 안내가 생각보다 큰 차이를 만들었습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "학생채널"]),
                  },
                  {
                    suffix: "club-role",
                    title: `${schoolName} 학생회나 동아리 역할 구조 볼 때 도움 된 공식 소개`,
                    content: `${summary}. 동아리만 보지 말고 학생회나 자치조직 구조까지 함께 보면 학교생활의 큰 흐름이 보였습니다. 동아리를 고를 때도 이런 공식 소개가 판단 기준으로 꽤 유용했습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "자치구조"]),
                  },
                ]
              : [
                  {
                    suffix: "food-overview",
                    title: `[공식 참고] ${schoolName} 학생식당과 편의시설 먼저 익혀두면 편한 포인트`,
                    content: `${summary}. 새 학기에는 맛집 글보다 먼저 학생식당, 편의점, 복사실 같은 기본 편의시설 위치를 익혀두는 게 동선 잡기에 더 실용적이었습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "캠퍼스동선"]),
                  },
                  {
                    suffix: "food-map",
                    title: `${schoolName} 새 학기 동선 잡을 때 공식 캠퍼스 안내가 유용했습니다`,
                    content: `${summary}. 학교 안에서 식당과 생활 편의시설 위치를 먼저 익혀두면 첫 주에 불필요하게 헤매는 시간이 확실히 줄었습니다. 커뮤니티 후기와 공식 캠퍼스 안내를 같이 보는 쪽이 안정적이었습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "학생식당"]),
                  },
                  {
                    suffix: "food-firstweek",
                    title: `${schoolName} 첫 주에 학생식당 위치부터 외워두면 좋은 이유`,
                    content: `${summary}. 수업 동선이 익숙하지 않은 첫 주에는 식당 위치와 운영 건물만 알고 있어도 생활 리듬이 훨씬 빨리 잡혔습니다. 생활권 정보는 공식 안내 기준으로 먼저 외워두는 편이 좋았습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "생활권"]),
                  },
                  {
                    suffix: "food-notes",
                    title: `${schoolName} 학교 안 편의시설 공식 안내 보고 메모한 것`,
                    content: `${summary}. 카페나 외부 맛집도 좋지만, 학교 안 편의시설 위치를 공식 PDF로 먼저 확인해두면 시험기간이나 공강 때 훨씬 효율적으로 움직일 수 있었습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "편의시설"]),
                  },
                  {
                    suffix: "food-route",
                    title: `${schoolName} 점심 동선 잡을 때 공식 캠퍼스 안내가 먼저였던 이유`,
                    content: `${summary}. 식당 후기만 보면 맛은 알 수 있지만, 실제론 수업 사이 이동 시간과 건물 위치가 더 중요했습니다. 공식 캠퍼스 안내를 먼저 보고 생활권을 익혀두면 공강 시간 활용이 쉬워졌습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "점심동선"]),
                  },
                  {
                    suffix: "food-study",
                    title: `${schoolName} 시험기간에 특히 도움 된 학교 안 생활 정보 정리`,
                    content: `${summary}. 시험기간에는 외부 맛집보다 학교 안 식당, 복사실, 편의시설 위치를 알고 있는 게 훨씬 중요했습니다. 공식 안내를 기준으로 메모해두면 급할 때 바로 움직일 수 있었습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "시험기간"]),
                  },
                  {
                    suffix: "food-break",
                    title: `${schoolName} 공강 시간 활용할 때 공식 생활권 안내가 은근 유용했습니다`,
                    content: `${summary}. 공강 때 어디서 밥 먹고 어디서 쉬는지가 정리돼 있으면 생활 만족도가 꽤 달라졌습니다. 커뮤니티 추천글과 별개로 학교 안 생활권을 먼저 아는 게 장기적으로 훨씬 편했습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "공강동선"]),
                  },
                  {
                    suffix: "food-evening",
                    title: `${schoolName} 저녁 수업 많은 학생에게 도움 된 캠퍼스 생활 메모`,
                    content: `${summary}. 늦은 시간까지 학교에 남아 있는 날은 외부 맛집보다 내부 편의시설 위치를 알고 있는 게 훨씬 유용했습니다. 공식 캠퍼스 안내 기준으로 메모해두면 생활이 훨씬 안정적이었습니다.\n출처: ${sourceUrl}`,
                    tags: uniqTags(tags, ["공식자료", "저녁수업"]),
                  },
                ];

    for (const [variantIndex, variant] of variants.entries()) {
      const postId = makeDeterministicUuid(`${post.id}-${variant.suffix}`);
      const createdAt = shiftIsoMinutes(post.created_at, 20 + variantIndex * 17 + index);
      const commentId = makeDeterministicUuid(`${post.id}-${variant.suffix}-comment`);
      const isAdmission = kind === "admission";
      const isCareer = kind === "career";
      const isFreshman = kind === "freshman";
      const isClub = post.subcategory === "club";
      const commentContent = isAdmission
        ? "공식 자료 먼저 읽고 질문 정리하면 상담 받을 때 훨씬 빨리 핵심만 물어볼 수 있더라고요."
        : isCareer
          ? "학교 취업지원 링크는 미리 저장해두면 학기 중에 다시 찾는 시간을 꽤 줄여줍니다."
          : isFreshman
            ? "신입생 일정은 공지 원문보다 캘린더용 체크리스트로 한 번 더 정리해두는 편이 훨씬 덜 헷갈렸어요."
            : isClub
              ? "학생활동은 공식 소개 페이지 먼저 보고 커뮤니티 후기 붙여서 보면 판단이 훨씬 빨랐습니다."
              : "공식 안내 먼저 보고 커뮤니티 후기를 같이 읽는 조합이 실제로 제일 실용적이었습니다.";

      posts.push({
        id: postId,
        author_id: post.author_id,
        category: post.category,
        subcategory: post.subcategory,
        title: variant.title,
        content: variant.content,
        school_id: post.school_id,
        scope: post.scope,
        like_count: Math.max(10, (post.like_count ?? 12) - 1 + variantIndex + (index % 3)),
        comment_count: 1,
        visibility_level: post.visibility_level,
        metadata: {
          ...metadata,
          tags: variant.tags,
        },
        created_at: createdAt,
      });

      comments.push({
        id: commentId,
        post_id: postId,
        author_id: post.author_id,
        content: commentContent,
        accepted: false,
        visibility_level: post.visibility_level === "profile" ? "schoolDepartment" : post.visibility_level,
        created_at: shiftIsoMinutes(createdAt, 42 + (variantIndex % 4) * 9),
      });
    }
  }

  return { posts, comments };
};

const buildSchoolCoverageRows = (schools) => {
  const posts = [];
  const comments = [];

  for (const [index, school] of schools.entries()) {
    const schoolId = school.id;
    const schoolName = school.name;
    const sourceUrl = `https://${school.domain}`;
    const createdAtBase = new Date(Date.UTC(2026, 2, 14 + (index % 8), 0, 0, 0)).toISOString();
    const askVariants = Array.from({ length: 3 }, (_, offset) => {
      const blueprint =
        SCHOOL_ASK_BLUEPRINTS[(index * 3 + offset) % SCHOOL_ASK_BLUEPRINTS.length];
      return {
        suffix: `ask-${blueprint.suffix}`,
        category: "community",
        subcategory: "school",
        title: blueprint.title(),
        content: blueprint.content(schoolName, sourceUrl),
        visibilityLevel: "school",
        tags: ["학교 게시판", ...blueprint.tags],
        comment: blueprint.comment,
      };
    });
    const hotVariants = Array.from({ length: 3 }, (_, offset) => {
      const blueprint =
        SCHOOL_HOT_BLUEPRINTS[(index * 3 + offset) % SCHOOL_HOT_BLUEPRINTS.length];
      return {
        suffix: `hot-${blueprint.suffix}`,
        category: "community",
        subcategory: "hot",
        title: blueprint.title(),
        content: blueprint.content(),
        visibilityLevel: "anonymous",
        scope: "global",
        likeBase: 27,
        tags: [...blueprint.tags],
        comment: blueprint.comment,
      };
    });
    const variants = [
      {
        suffix: "admission",
        category: "admission",
        subcategory: null,
        title: `[공식 참고] ${schoolName} 입시 준비할 때 학교 홈페이지부터 저장해둔 이유`,
        content: `${schoolName} 준비할 때 커뮤니티 글만 보지 않고 학교 공식 홈페이지에서 입학처, 학사, 학생지원 메뉴를 먼저 저장해두니 질문을 정리하기 훨씬 편했습니다. 학교별 공지는 결국 공식 채널이 가장 정확해서 지원 전략을 잡을 때 기준점 역할을 해줬습니다.\n출처: ${sourceUrl}`,
        visibilityLevel: "school",
        tags: ["공식자료", "입학", schoolName],
        comment: "입시 준비할 때 학교 홈페이지 기본 메뉴부터 저장해두면 질문 정리 속도가 훨씬 빨라집니다.",
      },
      {
        suffix: "freshman",
        category: "community",
        subcategory: "freshman",
        title: `${schoolName} 새내기라면 공식 홈페이지에서 먼저 확인해둘 것`,
        content: `${schoolName} 입학 직후에는 오티 일정, 학사 공지, 수강신청 안내처럼 학교생활에 바로 연결되는 메뉴를 먼저 저장해두는 게 가장 실용적이었습니다. 새내기존에서도 공식 안내를 먼저 보고 질문을 남기는 편이 훨씬 덜 헤맸습니다.\n출처: ${sourceUrl}`,
        visibilityLevel: "school",
        tags: ["새내기존", "공식자료", "학교생활"],
        comment: "오티나 수강신청 공지는 공식 채널 기준으로 한 번 정리해두면 첫 학기가 정말 편해져요.",
      },
      {
        suffix: "club",
        category: "community",
        subcategory: "club",
        title: `${schoolName} 학생활동 정보는 공식 페이지 먼저 보는 편이 편했습니다`,
        content: `${schoolName} 동아리나 학생활동을 찾을 때는 모집 글만 보기보다 학교 공식 홈페이지에서 학생지원, 학생자치, 학생활동 메뉴를 먼저 확인하는 편이 훨씬 안정적이었습니다. 어떤 활동군이 있는지 먼저 감을 잡고 커뮤니티 글을 보면 판단이 빨랐습니다.\n출처: ${sourceUrl}`,
        visibilityLevel: "schoolDepartment",
        tags: ["공식자료", "동아리", "학생활동"],
        comment: "학생활동은 공식 소개로 큰 구조를 먼저 보고 커뮤니티 모집 글을 보는 흐름이 제일 편했습니다.",
      },
      {
        suffix: "food",
        category: "community",
        subcategory: "food",
        title: `${schoolName} 캠퍼스 생활권은 공식 안내 먼저 익혀두면 편했습니다`,
        content: `${schoolName} 새 학기에는 외부 맛집보다 학교 안 식당, 편의시설, 주요 건물 위치부터 익혀두는 게 훨씬 유용했습니다. 생활권은 공식 홈페이지나 캠퍼스 안내를 기준으로 먼저 정리해두면 공강이나 시험기간 동선이 안정적이었습니다.\n출처: ${sourceUrl}`,
        visibilityLevel: "schoolDepartment",
        tags: ["공식자료", "생활권", "학생식당"],
        comment: "생활권 정보는 공식 안내를 기준으로 먼저 외워두면 공강 동선이 훨씬 안정적이었습니다.",
      },
      {
        suffix: "free",
        category: "community",
        subcategory: "free",
        title: `${schoolName} 학교생활 링크는 학기 초에 한 번 정리해두는 편이 좋았습니다`,
        content: `${schoolName} 포털, 학사 공지, 장학, 학생지원 메뉴를 학교 홈페이지 기준으로 한 번 정리해두면 학기 중 다시 찾는 시간이 크게 줄었습니다. 커뮤니티 글을 보다가도 결국 공식 메뉴를 다시 찾게 되니 처음부터 저장해두는 편이 훨씬 편했습니다.\n출처: ${sourceUrl}`,
        visibilityLevel: "school",
        tags: ["공식자료", "학교생활", "학사"],
        comment: "학기 초에 공식 메뉴를 한 번 정리해두면 커뮤니티 글을 읽다가도 다시 찾는 시간이 크게 줄었습니다.",
      },
      ...hotVariants,
      ...askVariants,
      {
        suffix: "study",
        category: "community",
        subcategory: "free",
        title: `${schoolName} 도서관과 학습지원 메뉴도 미리 저장해두면 편했습니다`,
        content: `${schoolName} 시험기간이 되면 도서관 이용시간, 열람실, 학습지원 공지를 다시 찾게 되는데 공식 홈페이지 기준으로 저장해두면 급할 때 훨씬 빨리 찾을 수 있었습니다. 학교생활에서 자주 보는 메뉴는 결국 공식 사이트가 가장 정확했습니다.\n출처: ${sourceUrl}`,
        visibilityLevel: "schoolDepartment",
        tags: ["공식자료", "학습지원", "도서관"],
        comment: "도서관 이용시간이나 열람실 공지는 시험기간마다 달라질 수 있어서 공식 메뉴를 저장해두는 게 제일 편했습니다.",
      },
    ];

    for (const [variantIndex, variant] of variants.entries()) {
      const postId = makeDeterministicUuid(`coverage-${schoolId}-${variant.suffix}`);
      const createdAt = shiftIsoMinutes(createdAtBase, variantIndex * 57 + index * 11);
      const commentId = makeDeterministicUuid(`coverage-comment-${schoolId}-${variant.suffix}`);
      posts.push({
        id: postId,
        author_id:
          variant.category === "admission"
            ? "2a111111-1111-4111-8111-111111111111"
            : variant.subcategory === "freshman"
              ? "18888888-8888-4888-8888-888888888888"
              : "a1111111-1111-4111-8111-111111111111",
        category: variant.category,
        subcategory: variant.subcategory,
        title: variant.title,
        content: variant.content,
        school_id: schoolId,
        scope: variant.scope ?? "school",
        like_count: (variant.likeBase ?? 8) + variantIndex + (index % 5),
        comment_count: 1,
        visibility_level: variant.visibilityLevel,
        metadata: {
          tags: variant.tags,
          generatedCoverage: true,
        },
        created_at: createdAt,
      });

      comments.push({
        id: commentId,
        post_id: postId,
        author_id:
          variant.category === "admission"
            ? "2c333333-3333-4333-8333-333333333333"
            : variant.subcategory === "freshman"
              ? "19999999-9999-4999-8999-999999999999"
              : "b2222222-2222-4222-8222-222222222222",
        content: variant.comment,
        accepted: false,
        visibility_level: variant.visibilityLevel,
        created_at: shiftIsoMinutes(createdAt, 37 + variantIndex * 9),
      });
    }
  }

  return { posts, comments };
};

const buildSchoolLectureRows = (schools, existingSchoolIds) => {
  const lectures = [];
  const reviews = [];

  for (const [schoolIndex, school] of schools.entries()) {
    if (existingSchoolIds.has(school.id)) continue;

    for (const [lectureIndex, blueprint] of SCHOOL_LECTURE_BLUEPRINTS.entries()) {
      const lectureId = makeDeterministicUuid(`coverage-lecture-${school.id}-${blueprint.suffix}`);
      const createdAt = shiftIsoMinutes(new Date(Date.UTC(2026, 2, 14 + (schoolIndex % 8), 0, 0, 0)).toISOString(), lectureIndex * 43);
      lectures.push({
        id: lectureId,
        school_id: school.id,
        semester: "2026-1",
        name: blueprint.name,
        professor: blueprint.professor,
        section: blueprint.section,
        day_time: blueprint.dayTime,
        credits: blueprint.credits,
        department: lectureIndex === 0 ? `${school.name} 교양` : blueprint.department,
      });

      for (const [reviewIndex, template] of SCHOOL_REVIEW_TEMPLATES.entries()) {
        reviews.push({
          id: makeDeterministicUuid(`coverage-review-${school.id}-${blueprint.suffix}-${reviewIndex}`),
          lecture_id: lectureId,
          author_id: SCHOOL_TRADE_AUTHOR_IDS[(schoolIndex + reviewIndex) % SCHOOL_TRADE_AUTHOR_IDS.length],
          difficulty: template.difficulty,
          workload: template.workload,
          attendance: template.attendance,
          exam_style: template.examStyle,
          team_project: template.teamProject,
          presentation: template.presentation,
          grading_style: template.gradingStyle,
          honey_score: template.honeyScore,
          short_comment: `${blueprint.name} - ${template.shortComment}`,
          long_comment: `${blueprint.name} 기준으로 보면 ${template.longComment}`,
          semester: template.semester,
          helpful_count: template.helpfulCount + lectureIndex,
          visibility_level: "schoolDepartment",
          created_at: shiftIsoMinutes(createdAt, 18 + reviewIndex * 27),
        });
      }
    }
  }

  return { lectures, reviews };
};

const buildSchoolTradeRows = (schools, lecturesBySchool, existingSchoolIds) => {
  const rows = [];

  for (const [schoolIndex, school] of schools.entries()) {
    if (existingSchoolIds.has(school.id)) continue;

    const lectures = lecturesBySchool.get(school.id) ?? [];
    if (lectures.length < 2) continue;

    const [firstLecture, secondLecture, thirdLecture, fourthLecture] = lectures;
    const pairA = thirdLecture ?? secondLecture;
    const pairB = fourthLecture ?? firstLecture;

    rows.push({
      id: makeDeterministicUuid(`coverage-trade-${school.id}-1`),
      author_id: SCHOOL_TRADE_AUTHOR_IDS[schoolIndex % SCHOOL_TRADE_AUTHOR_IDS.length],
      school_id: school.id,
      have_lecture_id: firstLecture.id,
      want_lecture_id: secondLecture.id,
      note: `${firstLecture.name} 보유 중이고 ${secondLecture.name} 자리로 옮기고 싶어요.`,
      status: "open",
      semester: "2026-1",
      professor: firstLecture.professor,
      section: firstLecture.section,
      time_range: firstLecture.day_time,
      visibility_level: "school",
      created_at: shiftIsoMinutes(new Date(Date.UTC(2026, 2, 18 + (schoolIndex % 4), 0, 0, 0)).toISOString(), 30),
    });

    rows.push({
      id: makeDeterministicUuid(`coverage-trade-${school.id}-2`),
      author_id: SCHOOL_TRADE_AUTHOR_IDS[(schoolIndex + 1) % SCHOOL_TRADE_AUTHOR_IDS.length],
      school_id: school.id,
      have_lecture_id: pairA.id,
      want_lecture_id: pairB.id,
      note: `${pairA.name}에서 ${pairB.name}로 교환 희망합니다. 시간 맞는 분 찾고 있어요.`,
      status: schoolIndex % 2 === 0 ? "matched" : "open",
      semester: "2026-1",
      professor: pairA.professor,
      section: pairA.section,
      time_range: pairA.day_time,
      visibility_level: "school",
      created_at: shiftIsoMinutes(new Date(Date.UTC(2026, 2, 18 + (schoolIndex % 4), 0, 0, 0)).toISOString(), 130),
    });
  }

  return rows;
};

const buildCuratedCareerRows = (studentUsers) => {
  const posts = [];
  const comments = [];
  const postMap = new Map();
  const baseCreatedAt = new Date(Date.UTC(2026, 2, 18, 0, 0, 0)).toISOString();

  for (const [index, seed] of careerBoardSeed.posts.entries()) {
    const author = studentUsers[index % studentUsers.length];
    const postId = makeDeterministicUuid(`career-curated-post-${seed.id}`);
    const createdAt = shiftIsoMinutes(baseCreatedAt, index * 53);

    postMap.set(seed.id, {
      id: postId,
      createdAt,
    });

    posts.push({
      id: postId,
      author_id: author.id,
      category: "community",
      subcategory: null,
      title: seed.title,
      content: seed.content,
      school_id: author.school_id,
      scope: "global",
      like_count: seed.likes,
      comment_count: 0,
      visibility_level: "schoolDepartment",
      metadata: {
        tags: seed.tags,
        careerBoard: seed.board,
        seedSource: CURATED_CAREER_SEED_SOURCE,
      },
      created_at: createdAt,
    });
  }

  for (const [index, seed] of careerBoardSeed.comments.entries()) {
    const post = postMap.get(seed.postId);
    if (!post) continue;

    const author = studentUsers[(index + 3) % studentUsers.length];
    comments.push({
      id: makeDeterministicUuid(`career-curated-comment-${seed.postId}-${index}`),
      post_id: post.id,
      author_id: author.id,
      content: seed.content,
      accepted: false,
      visibility_level: "schoolDepartment",
      created_at: shiftIsoMinutes(post.createdAt, 31 + index * 7),
    });
  }

  return { posts, comments, postIds: posts.map((post) => post.id) };
};

const buildCuratedAnonymousRows = (studentUsers) => {
  const posts = [];
  const comments = [];
  const postMap = new Map();
  const baseCreatedAt = new Date(Date.UTC(2026, 2, 20, 0, 0, 0)).toISOString();

  for (const [index, seed] of anonymousBoardSeed.posts.entries()) {
    const author = studentUsers[index % studentUsers.length];
    const postId = makeDeterministicUuid(`anonymous-curated-post-${seed.id}`);
    const createdAt = shiftIsoMinutes(baseCreatedAt, index * 41);

    postMap.set(seed.id, {
      id: postId,
      createdAt,
    });

    posts.push({
      id: postId,
      author_id: author.id,
      category: "community",
      subcategory: "anonymous",
      title: seed.title,
      content: seed.content,
      school_id: author.school_id,
      scope: "global",
      like_count: seed.likes,
      comment_count: 0,
      visibility_level: "anonymous",
      metadata: {
        tags: seed.tags,
        seedSource: CURATED_ANONYMOUS_BOARD_SEED_SOURCE,
      },
      created_at: createdAt,
    });
  }

  for (const [index, seed] of anonymousBoardSeed.comments.entries()) {
    const post = postMap.get(seed.postId);
    if (!post) continue;

    const author = studentUsers[(index + 4) % studentUsers.length];
    comments.push({
      id: makeDeterministicUuid(`anonymous-curated-comment-${seed.postId}-${index}`),
      post_id: post.id,
      author_id: author.id,
      content: seed.content,
      accepted: false,
      visibility_level: "anonymous",
      created_at: shiftIsoMinutes(post.createdAt, 23 + index * 6),
    });
  }

  return { posts, comments, postIds: posts.map((post) => post.id) };
};

const syncCuratedAnonymousBoardContent = async (client) => {
  const { rows: studentUsers } = await client.query(`
    select id::text, school_id::text
    from public.users
    where user_type = 'student'
      and school_id is not null
    order by created_at asc nulls last, id asc
  `);

  if (studentUsers.length === 0) {
    return;
  }

  const { posts, comments, postIds } = buildCuratedAnonymousRows(studentUsers);

  await client.query(
    `
      delete from public.comments
      where post_id in (
        select id
        from public.posts
        where metadata ->> 'seedSource' = $1
          and not (id = any($2::uuid[]))
      )
    `,
    [CURATED_ANONYMOUS_BOARD_SEED_SOURCE, postIds],
  );

  await client.query(
    `
      delete from public.posts
      where metadata ->> 'seedSource' = $1
        and not (id = any($2::uuid[]))
    `,
    [CURATED_ANONYMOUS_BOARD_SEED_SOURCE, postIds],
  );

  for (const post of posts) {
    await client.query(
      `
        insert into public.posts (
          id,
          author_id,
          category,
          subcategory,
          title,
          content,
          school_id,
          scope,
          like_count,
          comment_count,
          visibility_level,
          metadata,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::public.post_category,
          $4::public.post_subcategory,
          $5,
          $6,
          $7::uuid,
          $8::public.content_scope,
          $9,
          $10,
          $11::public.visibility_level,
          $12::jsonb,
          $13::timestamptz
        )
        on conflict (id) do update
        set
          author_id = excluded.author_id,
          category = excluded.category,
          subcategory = excluded.subcategory,
          title = excluded.title,
          content = excluded.content,
          school_id = excluded.school_id,
          scope = excluded.scope,
          like_count = excluded.like_count,
          comment_count = excluded.comment_count,
          visibility_level = excluded.visibility_level,
          metadata = excluded.metadata,
          created_at = excluded.created_at
      `,
      [
        post.id,
        post.author_id,
        post.category,
        post.subcategory,
        post.title,
        post.content,
        post.school_id,
        post.scope,
        post.like_count,
        post.comment_count,
        post.visibility_level,
        JSON.stringify(post.metadata),
        post.created_at,
      ],
    );
  }

  for (const comment of comments) {
    await client.query(
      `
        insert into public.comments (
          id,
          post_id,
          author_id,
          content,
          accepted,
          visibility_level,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4,
          $5,
          $6::public.visibility_level,
          $7::timestamptz
        )
        on conflict (id) do update
        set
          post_id = excluded.post_id,
          author_id = excluded.author_id,
          content = excluded.content,
          accepted = excluded.accepted,
          visibility_level = excluded.visibility_level,
          created_at = excluded.created_at
      `,
      [
        comment.id,
        comment.post_id,
        comment.author_id,
        comment.content,
        comment.accepted,
        comment.visibility_level,
        comment.created_at,
      ],
    );
  }

  await client.query(
    `
      update public.posts p
      set comment_count = coalesce((
        select count(*)::int
        from public.comments c
        where c.post_id = p.id
      ), 0)
      where p.id = any($1::uuid[])
    `,
    [postIds],
  );
};

const upsertGeneratedReferenceContent = async (client) => {
  const { rows } = await client.query(`
    select
      p.id::text,
      p.author_id::text,
      p.category::text,
      p.subcategory::text,
      p.title,
      p.content,
      p.school_id::text,
      p.scope::text,
      p.like_count,
      p.visibility_level::text,
      p.metadata,
      p.created_at,
      s.name as "schoolName"
    from public.posts p
    left join public.schools s on s.id = p.school_id
    where p.title like '[공식]%' and p.content like '%출처:%'
    order by p.created_at asc
  `);

  const { posts, comments } = buildDerivedReferenceRows(rows);

  for (const post of posts) {
    await client.query(
      `
        insert into public.posts (
          id,
          author_id,
          category,
          subcategory,
          title,
          content,
          school_id,
          scope,
          like_count,
          comment_count,
          visibility_level,
          metadata,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::public.post_category,
          $4::public.post_subcategory,
          $5,
          $6,
          $7::uuid,
          $8::public.content_scope,
          $9,
          $10,
          $11::public.visibility_level,
          $12::jsonb,
          $13::timestamptz
        )
        on conflict (id) do update
        set
          author_id = excluded.author_id,
          category = excluded.category,
          subcategory = excluded.subcategory,
          title = excluded.title,
          content = excluded.content,
          school_id = excluded.school_id,
          scope = excluded.scope,
          like_count = excluded.like_count,
          comment_count = excluded.comment_count,
          visibility_level = excluded.visibility_level,
          metadata = excluded.metadata,
          created_at = excluded.created_at
      `,
      [
        post.id,
        post.author_id,
        post.category,
        post.subcategory,
        post.title,
        post.content,
        post.school_id,
        post.scope,
        post.like_count,
        post.comment_count,
        post.visibility_level,
        JSON.stringify(post.metadata ?? {}),
        post.created_at,
      ],
    );
  }

  for (const comment of comments) {
    await client.query(
      `
        insert into public.comments (
          id,
          post_id,
          author_id,
          content,
          accepted,
          visibility_level,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4,
          $5,
          $6::public.visibility_level,
          $7::timestamptz
        )
        on conflict (id) do update
        set
          post_id = excluded.post_id,
          author_id = excluded.author_id,
          content = excluded.content,
          accepted = excluded.accepted,
          visibility_level = excluded.visibility_level,
          created_at = excluded.created_at
      `,
      [
        comment.id,
        comment.post_id,
        comment.author_id,
        comment.content,
        comment.accepted,
        comment.visibility_level,
        comment.created_at,
      ],
    );
  }

  await client.query(`
    update public.posts p
    set comment_count = coalesce((
      select count(*)::int
      from public.comments c
      where c.post_id = p.id
    ), 0)
  `);
};

const upsertSchoolCoverageContent = async (client) => {
  const { rows } = await client.query(`
    select s.id::text, s.name, s.domain
    from public.schools s
    order by s.name asc
  `);

  const { posts, comments } = buildSchoolCoverageRows(rows);

  for (const post of posts) {
    await client.query(
      `
        insert into public.posts (
          id,
          author_id,
          category,
          subcategory,
          title,
          content,
          school_id,
          scope,
          like_count,
          comment_count,
          visibility_level,
          metadata,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::public.post_category,
          $4::public.post_subcategory,
          $5,
          $6,
          $7::uuid,
          $8::public.content_scope,
          $9,
          $10,
          $11::public.visibility_level,
          $12::jsonb,
          $13::timestamptz
        )
        on conflict (id) do update
        set
          author_id = excluded.author_id,
          category = excluded.category,
          subcategory = excluded.subcategory,
          title = excluded.title,
          content = excluded.content,
          school_id = excluded.school_id,
          scope = excluded.scope,
          like_count = excluded.like_count,
          comment_count = excluded.comment_count,
          visibility_level = excluded.visibility_level,
          metadata = excluded.metadata,
          created_at = excluded.created_at
      `,
      [
        post.id,
        post.author_id,
        post.category,
        post.subcategory,
        post.title,
        post.content,
        post.school_id,
        post.scope,
        post.like_count,
        post.comment_count,
        post.visibility_level,
        JSON.stringify(post.metadata ?? {}),
        post.created_at,
      ],
    );
  }

  for (const comment of comments) {
    await client.query(
      `
        insert into public.comments (
          id,
          post_id,
          author_id,
          content,
          accepted,
          visibility_level,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4,
          $5,
          $6::public.visibility_level,
          $7::timestamptz
        )
        on conflict (id) do update
        set
          post_id = excluded.post_id,
          author_id = excluded.author_id,
          content = excluded.content,
          accepted = excluded.accepted,
          visibility_level = excluded.visibility_level,
          created_at = excluded.created_at
      `,
      [
        comment.id,
        comment.post_id,
        comment.author_id,
        comment.content,
        comment.accepted,
        comment.visibility_level,
        comment.created_at,
      ],
    );
  }

  await client.query(`
    update public.posts p
    set comment_count = coalesce((
      select count(*)::int
      from public.comments c
      where c.post_id = p.id
    ), 0)
  `);
};

const syncCuratedCareerBoardContent = async (client) => {
  const { rows: studentUsers } = await client.query(`
    select id::text, school_id::text
    from public.users
    where user_type = 'student'
      and school_id is not null
    order by created_at asc nulls last, id asc
  `);

  if (studentUsers.length === 0) {
    return;
  }

  const { rows: schoolRows } = await client.query(`
    select id::text
    from public.schools
    order by id asc
  `);

  const legacyDerivedCareerIds = LEGACY_CAREER_REFERENCE_POST_IDS.flatMap((postId) =>
    LEGACY_DERIVED_CAREER_SUFFIXES.map((suffix) => makeDeterministicUuid(`${postId}-${suffix}`)),
  );
  const legacyCoverageCareerIds = schoolRows.map((school) =>
    makeDeterministicUuid(`coverage-${school.id}-career`),
  );
  const legacyCareerPostIds = [
    ...LEGACY_CAREER_SEED_POST_IDS,
    ...LEGACY_CAREER_REFERENCE_POST_IDS,
    ...legacyDerivedCareerIds,
    ...legacyCoverageCareerIds,
  ];

  if (legacyCareerPostIds.length > 0) {
    await client.query(
      `
        delete from public.comments
        where post_id = any($1::uuid[])
      `,
      [legacyCareerPostIds],
    );

    await client.query(
      `
        delete from public.posts
        where id = any($1::uuid[])
      `,
      [legacyCareerPostIds],
    );
  }

  await client.query(
    `
      delete from public.comments
      where post_id in (
        select id
        from public.posts
        where category = 'community'
          and (
            (metadata -> 'tags') ? '취업정보'
            or (metadata -> 'tags') ? '채용공고'
          )
          and coalesce(metadata ->> 'seedSource', '') <> $1
      )
    `,
    [CURATED_CAREER_SEED_SOURCE],
  );

  await client.query(
    `
      delete from public.posts
      where category = 'community'
        and (
          (metadata -> 'tags') ? '취업정보'
          or (metadata -> 'tags') ? '채용공고'
        )
        and coalesce(metadata ->> 'seedSource', '') <> $1
    `,
    [CURATED_CAREER_SEED_SOURCE],
  );

  const { posts, comments, postIds } = buildCuratedCareerRows(studentUsers);

  await client.query(
    `
      delete from public.comments
      where post_id in (
        select id
        from public.posts
        where metadata ->> 'seedSource' = $1
          and not (id = any($2::uuid[]))
      )
    `,
    [CURATED_CAREER_SEED_SOURCE, postIds],
  );

  await client.query(
    `
      delete from public.posts
      where metadata ->> 'seedSource' = $1
        and not (id = any($2::uuid[]))
    `,
    [CURATED_CAREER_SEED_SOURCE, postIds],
  );

  for (const post of posts) {
    await client.query(
      `
        insert into public.posts (
          id,
          author_id,
          category,
          subcategory,
          title,
          content,
          school_id,
          scope,
          like_count,
          comment_count,
          visibility_level,
          metadata,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::public.post_category,
          $4::public.post_subcategory,
          $5,
          $6,
          $7::uuid,
          $8::public.content_scope,
          $9,
          $10,
          $11::public.visibility_level,
          $12::jsonb,
          $13::timestamptz
        )
        on conflict (id) do update
        set
          author_id = excluded.author_id,
          category = excluded.category,
          subcategory = excluded.subcategory,
          title = excluded.title,
          content = excluded.content,
          school_id = excluded.school_id,
          scope = excluded.scope,
          like_count = excluded.like_count,
          comment_count = excluded.comment_count,
          visibility_level = excluded.visibility_level,
          metadata = excluded.metadata,
          created_at = excluded.created_at
      `,
      [
        post.id,
        post.author_id,
        post.category,
        post.subcategory,
        post.title,
        post.content,
        post.school_id,
        post.scope,
        post.like_count,
        post.comment_count,
        post.visibility_level,
        JSON.stringify(post.metadata),
        post.created_at,
      ],
    );
  }

  for (const comment of comments) {
    await client.query(
      `
        insert into public.comments (
          id,
          post_id,
          author_id,
          content,
          accepted,
          visibility_level,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4,
          $5,
          $6::public.visibility_level,
          $7::timestamptz
        )
        on conflict (id) do update
        set
          post_id = excluded.post_id,
          author_id = excluded.author_id,
          content = excluded.content,
          accepted = excluded.accepted,
          visibility_level = excluded.visibility_level,
          created_at = excluded.created_at
      `,
      [
        comment.id,
        comment.post_id,
        comment.author_id,
        comment.content,
        comment.accepted,
        comment.visibility_level,
        comment.created_at,
      ],
    );
  }

  await client.query(
    `
      update public.posts p
      set comment_count = coalesce((
        select count(*)::int
        from public.comments c
        where c.post_id = p.id
      ), 0)
      where p.id = any($1::uuid[])
    `,
    [postIds],
  );
};

const upsertSchoolLectureContent = async (client) => {
  const { rows: schools } = await client.query(`
    select s.id::text, s.name
    from public.schools s
    order by s.name asc
  `);
  const { rows: existingSchools } = await client.query(`
    select distinct school_id::text as school_id
    from public.lectures
    where school_id is not null
  `);
  const existingSchoolIds = new Set(existingSchools.map((row) => row.school_id).filter(Boolean));
  const { lectures, reviews } = buildSchoolLectureRows(schools, existingSchoolIds);

  for (const lecture of lectures) {
    await client.query(
      `
        insert into public.lectures (
          id,
          school_id,
          semester,
          name,
          professor,
          section,
          day_time,
          credits,
          department
        ) values (
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        )
        on conflict (id) do update
        set
          school_id = excluded.school_id,
          semester = excluded.semester,
          name = excluded.name,
          professor = excluded.professor,
          section = excluded.section,
          day_time = excluded.day_time,
          credits = excluded.credits,
          department = excluded.department
      `,
      [
        lecture.id,
        lecture.school_id,
        lecture.semester,
        lecture.name,
        lecture.professor,
        lecture.section,
        lecture.day_time,
        lecture.credits,
        lecture.department,
      ],
    );
  }

  for (const review of reviews) {
    await client.query(
      `
        insert into public.lecture_reviews (
          id,
          lecture_id,
          author_id,
          difficulty,
          workload,
          attendance,
          exam_style,
          team_project,
          presentation,
          grading_style,
          honey_score,
          short_comment,
          long_comment,
          semester,
          helpful_count,
          visibility_level,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::public.difficulty_level,
          $5::public.workload_level,
          $6::public.attendance_level,
          $7::public.exam_style_type,
          $8,
          $9,
          $10::public.grading_style_type,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16::public.visibility_level,
          $17::timestamptz
        )
        on conflict (id) do update
        set
          lecture_id = excluded.lecture_id,
          author_id = excluded.author_id,
          difficulty = excluded.difficulty,
          workload = excluded.workload,
          attendance = excluded.attendance,
          exam_style = excluded.exam_style,
          team_project = excluded.team_project,
          presentation = excluded.presentation,
          grading_style = excluded.grading_style,
          honey_score = excluded.honey_score,
          short_comment = excluded.short_comment,
          long_comment = excluded.long_comment,
          semester = excluded.semester,
          helpful_count = excluded.helpful_count,
          visibility_level = excluded.visibility_level,
          created_at = excluded.created_at
      `,
      [
        review.id,
        review.lecture_id,
        review.author_id,
        review.difficulty,
        review.workload,
        review.attendance,
        review.exam_style,
        review.team_project,
        review.presentation,
        review.grading_style,
        review.honey_score,
        review.short_comment,
        review.long_comment,
        review.semester,
        review.helpful_count,
        review.visibility_level,
        review.created_at,
      ],
    );
  }
};

const upsertSchoolTradeContent = async (client) => {
  const { rows: schools } = await client.query(`
    select s.id::text, s.name
    from public.schools s
    order by s.name asc
  `);
  const { rows: existingTradeSchools } = await client.query(`
    select distinct school_id::text as school_id
    from public.trade_posts
    where school_id is not null
  `);
  const { rows: lectureRows } = await client.query(`
    select id::text, school_id::text, name, professor, section, day_time
    from public.lectures
    where school_id is not null
    order by school_id asc, name asc
  `);

  const lecturesBySchool = new Map();
  for (const row of lectureRows) {
    const bucket = lecturesBySchool.get(row.school_id) ?? [];
    bucket.push(row);
    lecturesBySchool.set(row.school_id, bucket);
  }

  const existingSchoolIds = new Set(existingTradeSchools.map((row) => row.school_id).filter(Boolean));
  const rows = buildSchoolTradeRows(schools, lecturesBySchool, existingSchoolIds);

  for (const row of rows) {
    await client.query(
      `
        insert into public.trade_posts (
          id,
          author_id,
          school_id,
          have_lecture_id,
          want_lecture_id,
          note,
          status,
          semester,
          professor,
          section,
          time_range,
          visibility_level,
          created_at
        ) values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5::uuid,
          $6,
          $7::public.trade_post_status,
          $8,
          $9,
          $10,
          $11,
          $12::public.visibility_level,
          $13::timestamptz
        )
        on conflict (id) do update
        set
          author_id = excluded.author_id,
          school_id = excluded.school_id,
          have_lecture_id = excluded.have_lecture_id,
          want_lecture_id = excluded.want_lecture_id,
          note = excluded.note,
          status = excluded.status,
          semester = excluded.semester,
          professor = excluded.professor,
          section = excluded.section,
          time_range = excluded.time_range,
          visibility_level = excluded.visibility_level,
          created_at = excluded.created_at
      `,
      [
        row.id,
        row.author_id,
        row.school_id,
        row.have_lecture_id,
        row.want_lecture_id,
        row.note,
        row.status,
        row.semester,
        row.professor,
        row.section,
        row.time_range,
        row.visibility_level,
        row.created_at,
      ],
    );
  }
};

try {
  await client.connect();

  for (const relativeFile of files) {
    const file = path.join(root, relativeFile);
    const sql = fs.readFileSync(file, "utf8");

    console.log(`Applying ${relativeFile}...`);
    if (relativeFile === "supabase/schema.sql") {
      await client.query(`
        do $$
        begin
          if exists (select 1 from pg_type where typname = 'user_type') then
            alter type public.user_type add value if not exists 'applicant';
            alter type public.user_type add value if not exists 'freshman';
          end if;
          if exists (select 1 from pg_type where typname = 'post_subcategory') then
            alter type public.post_subcategory add value if not exists 'freshman';
            alter type public.post_subcategory add value if not exists 'anonymous';
          end if;
        end
        $$;
      `);
    }
    await client.query(sql);
  }

  if (mode === "seed" || mode === "all") {
    await upsertGeneratedReferenceContent(client);
    await upsertSchoolCoverageContent(client);
    await syncCuratedCareerBoardContent(client);
    await syncCuratedAnonymousBoardContent(client);
    await upsertSchoolLectureContent(client);
    await upsertSchoolTradeContent(client);
    await client.query(`
      update public.posts
      set image_url = null
      where image_url is not null
    `);
    await client.query(`
      delete from public.media_assets
      where owner_type = 'post'
    `);
    await client.query(`
      update public.users
      set avatar_url = null
      where avatar_url is not null
    `);
    await client.query(`
      update public.dating_profiles
      set photo_url = null
      where photo_url is not null
    `);
    await client.query(`
      delete from public.media_assets
      where owner_type in ('post', 'profile')
    `);
  }

  console.log(`Applied ${mode} SQL to Supabase.`);
} finally {
  await client.end().catch(() => {});
}

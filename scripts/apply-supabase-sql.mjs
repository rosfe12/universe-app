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
  const tags = Array.isArray(post.metadata?.tags) ? post.metadata.tags : [];
  if (post.category === "admission") return "admission";
  if (post.subcategory === "freshman") return "freshman";
  if (post.subcategory === "club" || post.subcategory === "food") return "campus";
  if (post.category === "community" && (tags.includes("취업") || tags.includes("취업정보") || tags.includes("채용공고"))) {
    return "career";
  }
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
};

try {
  await client.connect();

  for (const relativeFile of files) {
    const file = path.join(root, relativeFile);
    const sql = fs.readFileSync(file, "utf8");

    console.log(`Applying ${relativeFile}...`);
    if (relativeFile === "supabase/schema.sql") {
      await client.query("alter type public.user_type add value if not exists 'freshman';");
      await client.query("alter type public.post_subcategory add value if not exists 'freshman';");
    }
    await client.query(sql);
  }

  if (mode === "seed" || mode === "all") {
    await upsertGeneratedReferenceContent(client);
  }

  console.log(`Applied ${mode} SQL to Supabase.`);
} finally {
  await client.end().catch(() => {});
}

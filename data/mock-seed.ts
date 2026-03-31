import type {
  AdmissionQuestionMeta,
  Block,
  Comment,
  DatingProfile,
  Lecture,
  LectureReview,
  MediaAsset,
  Notification,
  Post,
  Report,
  School,
  TradePost,
  User,
} from "@/types";
import careerBoardSeed from "./career-board-seed.json";
import anonymousBoardSeed from "./anonymous-board-seed.json";

const BASE_SCHOOL_ID = "school-konkuk";

const at = (day: number, time: string) => {
  const [hour = "00", minute = "00", second = "00"] = time.split(":");

  return `2026-03-${String(day).padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}+09:00`;
};

export const schools: School[] = [
  { id: BASE_SCHOOL_ID, name: "건국대학교", domain: "konkuk.ac.kr", city: "서울" },
  { id: "school-kyunghee", name: "경희대학교", domain: "khu.ac.kr", city: "서울" },
  { id: "school-korea", name: "고려대학교", domain: "korea.ac.kr", city: "서울" },
  { id: "school-kwangwoon", name: "광운대학교", domain: "kw.ac.kr", city: "서울" },
  { id: "school-kookmin", name: "국민대학교", domain: "kookmin.ac.kr", city: "서울" },
  { id: "school-duksung", name: "덕성여자대학교", domain: "duksung.ac.kr", city: "서울" },
  { id: "school-dongguk", name: "동국대학교", domain: "dongguk.edu", city: "서울" },
  { id: "school-dongduk", name: "동덕여자대학교", domain: "dongduk.ac.kr", city: "서울" },
  { id: "school-myongji", name: "명지대학교", domain: "mju.ac.kr", city: "서울" },
  { id: "school-sahmyook", name: "삼육대학교", domain: "syu.ac.kr", city: "서울" },
  { id: "school-sangmyung", name: "상명대학교", domain: "smu.ac.kr", city: "서울" },
  { id: "school-sogang", name: "서강대학교", domain: "sogang.ac.kr", city: "서울" },
  { id: "school-seokyeong", name: "서경대학교", domain: "skuniv.ac.kr", city: "서울" },
  { id: "school-seoultech", name: "서울과학기술대학교", domain: "seoultech.ac.kr", city: "서울" },
  { id: "school-snue", name: "서울교육대학교", domain: "snue.ac.kr", city: "서울" },
  { id: "school-snu", name: "서울대학교", domain: "snu.ac.kr", city: "서울" },
  { id: "school-uos", name: "서울시립대학교", domain: "uos.ac.kr", city: "서울" },
  { id: "school-swu", name: "서울여자대학교", domain: "swu.ac.kr", city: "서울" },
  { id: "school-skku", name: "성균관대학교", domain: "skku.edu", city: "서울" },
  { id: "school-sungshin", name: "성신여자대학교", domain: "sungshin.ac.kr", city: "서울" },
  { id: "school-sejong", name: "세종대학교", domain: "sejong.ac.kr", city: "서울" },
  { id: "school-sookmyung", name: "숙명여자대학교", domain: "sookmyung.ac.kr", city: "서울" },
  { id: "school-soongsil", name: "숭실대학교", domain: "ssu.ac.kr", city: "서울" },
  { id: "school-yonsei", name: "연세대학교", domain: "yonsei.ac.kr", city: "서울" },
  { id: "school-ewha", name: "이화여자대학교", domain: "ewha.ac.kr", city: "서울" },
  { id: "school-cau", name: "중앙대학교", domain: "cau.ac.kr", city: "서울" },
  { id: "school-hufs", name: "한국외국어대학교", domain: "hufs.ac.kr", city: "서울" },
  { id: "school-hansung", name: "한성대학교", domain: "hansung.ac.kr", city: "서울" },
  { id: "school-hanyang", name: "한양대학교", domain: "hanyang.ac.kr", city: "서울" },
  { id: "school-hongik", name: "홍익대학교", domain: "hongik.ac.kr", city: "서울" },
  { id: "school-karts", name: "한국예술종합학교", domain: "karts.ac.kr", city: "서울" },
  { id: "school-knsu", name: "한국체육대학교", domain: "knsu.ac.kr", city: "서울" },
  { id: "school-chongshin", name: "총신대학교", domain: "csu.ac.kr", city: "서울" },
  { id: "school-chugye", name: "추계예술대학교", domain: "chu.ac.kr", city: "서울" },
  { id: "school-kbible", name: "한국성서대학교", domain: "bible.ac.kr", city: "서울" },
  { id: "school-kc", name: "강서대학교", domain: "kc.ac.kr", city: "서울" },
];

export const users: User[] = [
  {
    id: "user-jiyoon",
    email: "jiyoon@konkuk.ac.kr",
    name: "정지윤",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "경영학과",
    grade: 3,
    verified: true,
    trustScore: 93,
    createdAt: at(9, "09:00:00"),
    bio: "건대 강의평이랑 맛집 글 자주 올려요.",
    avatarUrl: undefined,
  },
  {
    id: "user-minjae",
    email: "minjae@konkuk.ac.kr",
    name: "김민재",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "컴퓨터공학부",
    grade: 4,
    verified: true,
    trustScore: 89,
    createdAt: at(8, "11:20:00"),
    bio: "수강신청 매칭과 알고리즘 리뷰 담당.",
    avatarUrl: undefined,
  },
  {
    id: "user-arin",
    email: "arin@konkuk.ac.kr",
    name: "최아린",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "미디어커뮤니케이션학과",
    grade: 2,
    verified: true,
    trustScore: 84,
    createdAt: at(8, "14:40:00"),
    bio: "전시, 브랜드, 사진 취향 글 자주 씁니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-somin",
    email: "somin@konkuk.ac.kr",
    name: "박소민",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "부동산학과",
    grade: 3,
    verified: true,
    trustScore: 81,
    createdAt: at(10, "16:20:00"),
    bio: "학교 안 조용한 공간과 부동산학과 팁 공유.",
    avatarUrl: undefined,
  },
  {
    id: "user-sohee",
    email: "sohee@konkuk.ac.kr",
    name: "한소희",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "산업디자인학과",
    grade: 4,
    verified: true,
    trustScore: 87,
    createdAt: at(11, "12:15:00"),
    bio: "브랜딩, UX, 카페 탐방 좋아해요.",
    avatarUrl: undefined,
  },
  {
    id: "user-dohyun",
    email: "dohyun@konkuk.ac.kr",
    name: "윤도현",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "경제학과",
    grade: 2,
    verified: true,
    trustScore: 78,
    createdAt: at(12, "09:45:00"),
    bio: "교양 꿀강 수집하는 편.",
    avatarUrl: undefined,
  },
  {
    id: "user-seungmin",
    email: "seungmin@konkuk.ac.kr",
    name: "이승민",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "영상영화학과",
    grade: 4,
    verified: true,
    trustScore: 83,
    createdAt: at(12, "18:10:00"),
    bio: "전시, 영화, 미팅 글 둘 다 봐요.",
    avatarUrl: undefined,
  },
  {
    id: "user-chaeeun",
    email: "chaeeun@konkuk.ac.kr",
    name: "오채은",
    userType: "student",
    schoolId: BASE_SCHOOL_ID,
    department: "동물자원과학과",
    grade: 3,
    verified: true,
    trustScore: 86,
    createdAt: at(13, "10:35:00"),
    bio: "동아리 운영과 입시 답변을 자주 해요.",
    avatarUrl: undefined,
  },
  {
    id: "user-yujin",
    email: "yujin@sejong.ac.kr",
    name: "정유진",
    userType: "student",
    schoolId: "school-sejong",
    department: "호텔관광경영학과",
    grade: 3,
    verified: true,
    trustScore: 76,
    createdAt: at(13, "16:55:00"),
    bio: "타학교 친구도 자연스럽게 만나는 편.",
    avatarUrl: undefined,
  },
  {
    id: "user-woojin",
    email: "woojin@hongik.ac.kr",
    name: "장우진",
    userType: "student",
    schoolId: "school-hongik",
    department: "경영학부",
    grade: 4,
    verified: true,
    trustScore: 38,
    warningCount: 2,
    createdAt: at(14, "11:50:00"),
    bio: "전시 좋아해서 건대/성수 자주 와요.",
    avatarUrl: undefined,
  },
  {
    id: "user-yeji",
    email: "yeji@ewha.ac.kr",
    name: "서예지",
    userType: "student",
    schoolId: "school-ewha",
    department: "경영학과",
    grade: 2,
    verified: true,
    trustScore: 71,
    createdAt: at(13, "18:10:00"),
    bio: "이화 공지와 진로 프로그램 요약을 자주 올립니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-junseo",
    email: "junseo@uos.ac.kr",
    name: "박준서",
    userType: "student",
    schoolId: "school-uos",
    department: "행정학과",
    grade: 3,
    verified: true,
    trustScore: 68,
    createdAt: at(13, "19:20:00"),
    bio: "서울시립대 학사/입학 공지 정리 글을 주로 봅니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-eunsol",
    email: "eunsol@hanyang.ac.kr",
    name: "최은솔",
    userType: "student",
    schoolId: "school-hanyang",
    department: "산업공학과",
    grade: 3,
    verified: true,
    trustScore: 73,
    createdAt: at(13, "20:05:00"),
    bio: "한양대 프로그램과 실무형 공지를 요약합니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-taemin",
    email: "taemin@skku.edu",
    name: "김태민",
    userType: "student",
    schoolId: "school-skku",
    department: "글로벌경영학과",
    grade: 4,
    verified: true,
    trustScore: 75,
    createdAt: at(13, "20:45:00"),
    bio: "성균관대 채용/조교 공지 정리를 종종 올립니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-nari",
    email: "nari@snu.ac.kr",
    name: "강나리",
    userType: "student",
    schoolId: "school-snu",
    department: "경제학부",
    grade: 2,
    verified: true,
    trustScore: 74,
    createdAt: at(13, "21:10:00"),
    bio: "서울대 교과과정과 신입생 이수 규정을 자주 정리합니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-hyobin",
    email: "hyobin@korea.ac.kr",
    name: "정효빈",
    userType: "student",
    schoolId: "school-korea",
    department: "미디어학부",
    grade: 2,
    verified: true,
    trustScore: 72,
    createdAt: at(13, "21:25:00"),
    bio: "고려대 OT와 학교 적응 공지를 요약해서 보는 편입니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-yonji",
    email: "yonji@yonsei.ac.kr",
    name: "이연지",
    userType: "student",
    schoolId: "school-yonsei",
    department: "교육학과",
    grade: 3,
    verified: true,
    trustScore: 73,
    createdAt: at(13, "21:40:00"),
    bio: "연세 전공안내서와 대학생활 자료를 주기적으로 확인합니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-danbi",
    email: "danbi@hufs.ac.kr",
    name: "윤단비",
    userType: "student",
    schoolId: "school-hufs",
    department: "국제통상학과",
    grade: 2,
    verified: true,
    trustScore: 69,
    createdAt: at(13, "21:55:00"),
    bio: "외대 안전가이드와 대학일자리플러스센터 공지를 챙겨봅니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-jieun",
    email: "jieun@sookmyung.ac.kr",
    name: "손지은",
    userType: "student",
    schoolId: "school-sookmyung",
    department: "문화관광학전공",
    grade: 3,
    verified: true,
    trustScore: 70,
    createdAt: at(13, "22:05:00"),
    bio: "숙명 생활 편의시설과 학생식당 위치 정보를 자주 공유합니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-jaeho",
    email: "jaeho@ssu.ac.kr",
    name: "한재호",
    userType: "student",
    schoolId: "school-soongsil",
    department: "소프트웨어학부",
    grade: 4,
    verified: true,
    trustScore: 72,
    createdAt: at(13, "22:20:00"),
    bio: "숭실 입학처 브로슈어와 진로취업센터 자료를 정리합니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-yubin",
    email: "yubin@seoultech.ac.kr",
    name: "오유빈",
    userType: "student",
    schoolId: "school-seoultech",
    department: "기계시스템디자인공학과",
    grade: 3,
    verified: true,
    trustScore: 71,
    createdAt: at(13, "22:35:00"),
    bio: "서울과기대 현장실습과 취업진로본부 공지를 먼저 체크합니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-sejin",
    email: "sejin@hongik.ac.kr",
    name: "김세진",
    userType: "student",
    schoolId: "school-hongik",
    department: "시각디자인과",
    grade: 2,
    verified: true,
    trustScore: 68,
    createdAt: at(13, "22:50:00"),
    bio: "홍익대 학생활동, 동아리, 창업기관 소개 페이지를 자주 봅니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-sua",
    email: "sua@student.hs.kr",
    name: "이다솜",
    userType: "applicant",
    verified: false,
    trustScore: 55,
    createdAt: at(15, "08:10:00"),
    bio: "KU자기추천과 논술 사이에서 고민 중.",
    avatarUrl: undefined,
  },
  {
    id: "user-hajin",
    email: "hajin@student.hs.kr",
    name: "정하진",
    userType: "applicant",
    verified: false,
    trustScore: 57,
    createdAt: at(16, "07:30:00"),
    bio: "건국대 컴공, 미디어 쪽 관심 많아요.",
    avatarUrl: undefined,
  },
  {
    id: "user-yeonwoo",
    email: "yeonwoo@student.hs.kr",
    name: "서연우",
    userType: "applicant",
    verified: false,
    trustScore: 59,
    createdAt: at(16, "13:10:00"),
    bio: "수의예와 생명계열 준비 중.",
    avatarUrl: undefined,
  },
  {
    id: "user-hs-sujin",
    email: "sujin.hs@example.com",
    name: "박수진",
    userType: "applicant",
    verified: false,
    trustScore: 63,
    grade: 12,
    createdAt: at(14, "18:20:00"),
    bio: "건국대 생활권과 학과 분위기까지 같이 보는 편입니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-hs-minseo",
    email: "minseo.hs@example.com",
    name: "오민서",
    userType: "applicant",
    verified: false,
    trustScore: 66,
    grade: 12,
    createdAt: at(13, "08:40:00"),
    bio: "재학생 후기와 생활권 정보를 같이 보는 편입니다.",
    avatarUrl: undefined,
  },
  {
    id: "user-fresh-yerin",
    email: "yerin.pre@univers.app",
    name: "김예린",
    userType: "freshman",
    schoolId: BASE_SCHOOL_ID,
    department: "경영학과",
    grade: 1,
    verified: false,
    trustScore: 61,
    createdAt: at(17, "09:20:00"),
    bio: "합격 직후 오티랑 기숙사 정보 제일 궁금해요.",
    avatarUrl: undefined,
  },
  {
    id: "user-fresh-joon",
    email: "joon.pre@univers.app",
    name: "박준",
    userType: "freshman",
    schoolId: BASE_SCHOOL_ID,
    department: "컴퓨터공학부",
    grade: 1,
    verified: false,
    trustScore: 58,
    createdAt: at(17, "10:15:00"),
    bio: "시간표, 새내기 OT, 수강신청 감 잡는 중입니다.",
    avatarUrl: undefined,
  },
];

const baseLectures: Lecture[] = [
  {
    id: "lecture-1",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "경영데이터분석",
    professor: "김서현",
    section: "01",
    dayTime: "월 10:30 - 12:00",
    credits: 3,
    department: "경영학과",
  },
  {
    id: "lecture-2",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "소비자행동론",
    professor: "박정우",
    section: "02",
    dayTime: "화 13:00 - 14:30",
    credits: 3,
    department: "경영학과",
  },
  {
    id: "lecture-3",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "알고리즘",
    professor: "김태성",
    section: "01",
    dayTime: "수 09:00 - 10:30",
    credits: 3,
    department: "컴퓨터공학부",
  },
  {
    id: "lecture-4",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "운영체제",
    professor: "이수연",
    section: "02",
    dayTime: "수 15:00 - 16:30",
    credits: 3,
    department: "컴퓨터공학부",
  },
  {
    id: "lecture-5",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "미디어브랜딩전략",
    professor: "윤혜진",
    section: "01",
    dayTime: "목 10:30 - 12:00",
    credits: 3,
    department: "미디어커뮤니케이션학과",
  },
  {
    id: "lecture-6",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "영상콘텐츠기획",
    professor: "정민호",
    section: "02",
    dayTime: "금 13:30 - 15:00",
    credits: 3,
    department: "영상영화학과",
  },
  {
    id: "lecture-7",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "도시와부동산시장",
    professor: "최경석",
    section: "01",
    dayTime: "화 09:00 - 10:30",
    credits: 3,
    department: "부동산학과",
  },
  {
    id: "lecture-8",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "캠퍼스창업실습",
    professor: "한지수",
    section: "03",
    dayTime: "목 16:00 - 18:30",
    credits: 3,
    department: "창업융합학과",
  },
  {
    id: "lecture-9",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "UX리서치스튜디오",
    professor: "조아라",
    section: "01",
    dayTime: "월 15:00 - 17:30",
    credits: 3,
    department: "산업디자인학과",
  },
  {
    id: "lecture-10",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "경제통계학",
    professor: "박세현",
    section: "02",
    dayTime: "금 09:00 - 10:30",
    credits: 3,
    department: "경제학과",
  },
  {
    id: "lecture-11",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "글쓰기와프레젠테이션",
    professor: "김유림",
    section: "04",
    dayTime: "화 16:00 - 17:30",
    credits: 2,
    department: "교양",
  },
  {
    id: "lecture-12",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    courseName: "디자인씽킹프로젝트",
    professor: "송하늘",
    section: "01",
    dayTime: "수 18:00 - 20:30",
    credits: 3,
    department: "교양",
  },
];

const SCHOOL_COVERAGE_LECTURE_BLUEPRINTS = [
  {
    suffix: "writing",
    courseName: "대학생활글쓰기",
    professor: "김하은",
    section: "01",
    dayTime: "월 10:30 - 12:00",
    credits: 2,
    department: "교양",
  },
  {
    suffix: "data",
    courseName: "데이터리터러시기초",
    professor: "박지훈",
    section: "01",
    dayTime: "화 13:00 - 14:30",
    credits: 3,
    department: "교양",
  },
  {
    suffix: "career",
    courseName: "진로탐색세미나",
    professor: "이서윤",
    section: "02",
    dayTime: "수 15:00 - 16:30",
    credits: 2,
    department: "교양",
  },
  {
    suffix: "project",
    courseName: "문제해결프로젝트",
    professor: "최도윤",
    section: "01",
    dayTime: "목 10:00 - 12:30",
    credits: 3,
    department: "융합교양",
  },
] as const;

const schoolIdsWithLectureContent = new Set(baseLectures.map((lecture) => lecture.schoolId));

const generatedSchoolCoverageLectures: Lecture[] = schools.flatMap((school) => {
  if (schoolIdsWithLectureContent.has(school.id)) {
    return [];
  }

  return SCHOOL_COVERAGE_LECTURE_BLUEPRINTS.map((blueprint, blueprintIndex) => ({
    id: `lecture-${school.id}-${blueprint.suffix}`,
    schoolId: school.id,
    semester: "2026-1",
    courseName: blueprint.courseName,
    professor: blueprint.professor,
    section: blueprint.section,
    dayTime: blueprint.dayTime,
    credits: blueprint.credits,
    department:
      blueprintIndex === 0
        ? `${school.name} 교양`
        : blueprint.department,
  }));
});

export const lectures: Lecture[] = [...baseLectures, ...generatedSchoolCoverageLectures];

const collegeReviewerIds = users
  .filter((user) => user.userType === "student")
  .map((user) => user.id);

const reviewTemplates: Omit<
  LectureReview,
  "id" | "lectureId" | "reviewerId" | "semester" | "createdAt"
>[] = [
  {
    difficulty: "easy",
    workload: "light",
    attendance: "flexible",
    examStyle: "multipleChoice",
    teamProject: false,
    presentation: false,
    gradingStyle: "generous",
    honeyScore: 5,
    helpfulCount: 38,
    shortComment: "부담 적고 만족도 높은 편",
    longComment:
      "출결 체크가 빡세지 않고 채점 포인트가 명확합니다. 일정이 빡빡한 학기에도 넣기 괜찮은 타입의 강의였어요.",
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
    helpfulCount: 24,
    shortComment: "준비한 만큼 확실히 가져가는 구조",
    longComment:
      "과제와 발표가 적절히 섞여 있어 루틴만 잘 타면 만족도가 높습니다. 교수 피드백이 꽤 구체적이라 얻는 게 있는 강의예요.",
  },
  {
    difficulty: "hard",
    workload: "heavy",
    attendance: "strict",
    examStyle: "essay",
    teamProject: false,
    presentation: false,
    gradingStyle: "tough",
    honeyScore: 2,
    helpfulCount: 17,
    shortComment: "체감 난이도 높지만 실력은 남음",
    longComment:
      "매주 읽기나 과제가 꾸준히 나오고 시험도 단답형보다 서술형 비중이 큽니다. 학점만 보면 힘들 수 있지만 전공 이해는 확실히 늘어요.",
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
    helpfulCount: 29,
    shortComment: "프로젝트 위주라 실전 감각 좋음",
    longComment:
      "시험 압박이 적고 결과물을 만드는 재미가 있습니다. 팀플은 있지만 난이도가 과하지 않아서 포트폴리오용으로도 괜찮았어요.",
  },
  {
    difficulty: "medium",
    workload: "heavy",
    attendance: "medium",
    examStyle: "mixed",
    teamProject: false,
    presentation: true,
    gradingStyle: "medium",
    honeyScore: 3,
    helpfulCount: 14,
    shortComment: "시간은 들어가지만 커리큘럼은 탄탄",
    longComment:
      "강의 자체는 촘촘하고 얻어가는 건 많은데 학기 중 중간중간 몰아치는 일정이 있습니다. 미리미리 챙기는 타입이면 버틸 만합니다.",
  },
  {
    difficulty: "easy",
    workload: "medium",
    attendance: "flexible",
    examStyle: "project",
    teamProject: false,
    presentation: true,
    gradingStyle: "generous",
    honeyScore: 5,
    helpfulCount: 32,
    shortComment: "발표 부담만 넘기면 만족도 높음",
    longComment:
      "평가 기준이 투명하고 교수님이 사례를 많이 보여주셔서 발표 준비가 수월합니다. 대외활동 병행하는 학생들에게 추천할 만해요.",
  },
];

export const lectureReviews: LectureReview[] = lectures.flatMap((lecture, lectureIndex) =>
  [0, 1, 2].map((reviewIndex) => {
    const template = reviewTemplates[(lectureIndex + reviewIndex) % reviewTemplates.length];

    return {
      id: `review-${lectureIndex * 3 + reviewIndex + 1}`,
      lectureId: lecture.id,
      reviewerId: collegeReviewerIds[(lectureIndex + reviewIndex) % collegeReviewerIds.length],
      semester: reviewIndex === 0 ? "2025-2" : reviewIndex === 1 ? "2025-1" : "2024-2",
      createdAt: at(6 + ((lectureIndex + reviewIndex) % 10), `${10 + reviewIndex}:1${lectureIndex % 6}:00`),
      ...template,
      shortComment: `${lecture.courseName} - ${template.shortComment}`,
      longComment: `${lecture.courseName} 기준으로 보면 ${template.longComment}`,
    };
  }),
);

type SeedPost = Omit<Post, "commentCount"> & { meta?: AdmissionQuestionMeta };

const admissionSeeds = [
  ["KU자기추천으로 건국대 경영학과 준비할 때 세특 방향 어떻게 잡아야 하나요?", "서울", "문과", "내신 2.4 / 모의 2등급", "경영학과", 31, "학생부에서 경영 관련 탐구를 어떤 식으로 이어야 할지 고민입니다. 실제 합격생 기준으로 어떤 흐름이 설득력 있었는지 궁금해요.", "user-sua"],
  ["건국대 논술전형에서 수능 최저 부담 어느 정도인가요?", "경기", "문과", "국영수 평균 2.3", "국제무역학과", 27, "논술은 준비 중인데 최저 충족 가능성을 같이 봐야 할 것 같아요. 실제 준비 체감과 병행 팁 부탁드립니다.", "user-hajin"],
  ["건국대 컴퓨터공학부 정시 지원 시 수학 체감 비중이 많이 큰가요?", "인천", "이과", "수학 2 / 과탐 2", "컴퓨터공학부", 24, "국어와 영어는 안정적인데 수학 성적이 오락가락합니다. 건국대 컴공 기준으로 어느 정도까지 안정권인지 알고 싶어요.", "user-yeonwoo"],
  ["건국대 미디어커뮤니케이션학과 면접형 전형은 어떤 답변이 좋아 보였나요?", "서울", "문과", "내신 2.1", "미디어커뮤니케이션학과", 22, "학교 활동은 방송부와 기사 작성 위주인데 면접에서 어떤 질문이 자주 나오는지 궁금합니다.", "user-sua"],
  ["부동산학과 준비 중인데 건국대 학생부종합에서 수학 세특 중요할까요?", "대전", "문과", "내신 2.6", "부동산학과", 20, "경제/사회 쪽 활동은 많은데 수학 세특은 평이한 편입니다. 학과 특성상 어느 정도까지 챙겨야 하는지 궁금합니다.", "user-hs-sujin"],
  ["건국대 수의예과 논술 준비하는 학생들은 보통 어느 정도 성적대인가요?", "부산", "이과", "내신 1.7 / 수학 1", "수의예과", 29, "상향 카드로 고민 중인데 현실적인 지원선이 궁금합니다. 모의논술 체감도 같이 알고 싶어요.", "user-hs-minseo"],
  ["건국대 KU자기추천에서 비교과가 약하면 면접 준비로 만회 가능할까요?", "광주", "문과", "내신 2.3", "경제학과", 18, "교과 성적은 괜찮지만 활동이 많지 않습니다. 면접 답변 구조를 잘 만들면 보완이 가능한지 궁금합니다.", "user-hajin"],
  ["건국대 영상영화학과 학생부종합 준비 시 교내 활동은 어느 정도가 적당한가요?", "서울", "예체능", "내신 2.9", "영상영화학과", 17, "영상 제작 동아리 활동은 있는데 학과 적합성을 더 보여주려면 무엇을 추가해야 할지 고민입니다.", "user-sua"],
  ["건국대 산업디자인학과는 포트폴리오보다 학생부 스토리가 더 중요한가요?", "경기", "예체능", "내신 2.5", "산업디자인학과", 15, "실기보다 학생부 전형 위주로 보려 하는데 디자인 전공 적합성을 학교 활동에서 어떻게 드러내야 할지 궁금합니다.", "user-yeonwoo"],
  ["건국대 생명계열 학과 준비 시 탐구 과목 선택이 많이 중요할까요?", "울산", "이과", "생명 1 / 지구 1", "동물자원과학과", 16, "생명계열 진학 희망인데 탐구 선택이 학교에서 권장하는 방향과 달라서 고민입니다.", "user-hs-sujin"],
  ["건국대 글로컬과 서울캠 전형 정보가 헷갈리는데 기준을 어떻게 봐야 하나요?", "전북", "문과", "내신 3.0", "행정학과", 14, "캠퍼스별 차이를 어떻게 이해해야 할지 모르겠습니다. 모집단위와 경쟁률 비교 팁 있으면 부탁드립니다.", "user-hs-minseo"],
  ["건국대 창업 관련 학과나 비교과는 어디서 차별화가 되나요?", "서울", "문과", "내신 2.8", "경영학과", 19, "교내에서 창업 동아리를 하고 있는데 입시에서 이 활동을 어떻게 정리해야 할지 궁금합니다.", "user-sua"],
  ["건국대 교과전형은 내신 2점대 초반이면 어느 학과까지 노려볼 수 있을까요?", "경기", "문과", "내신 2.2", "정치외교학과", 21, "모의지원 사이트마다 결과가 달라서 감이 안 옵니다. 최근 입결 체감 공유 부탁드려요.", "user-hs-sujin"],
  ["건국대 경제학과 정시에서 영어 영향 체감 큰 편인가요?", "대구", "문과", "국어 2 / 수학 2 / 영어 2", "경제학과", 18, "국수 중심으로 생각했는데 영어 반영 방식 때문에 고민입니다. 실제 합격선 체감 궁금합니다.", "user-hajin"],
  ["건국대 미디어 계열은 학생부 독서 기록이 꽤 중요하게 보이나요?", "서울", "문과", "내신 2.5", "미디어커뮤니케이션학과", 13, "독서 기록이 많지는 않은 편이라 기사 작성 활동과 연결해서 보완할 수 있을지 알고 싶습니다.", "user-sua"],
  ["건국대 컴공 학종 준비할 때 코딩 대회 실적이 꼭 있어야 하나요?", "인천", "이과", "내신 2.4", "컴퓨터공학부", 26, "동아리 프로젝트는 있지만 대회 실적은 없습니다. 세특과 활동만으로도 충분할지 궁금합니다.", "user-yeonwoo"],
  ["건국대 부동산학과는 문과생이 지원하기에 어떤 준비가 가장 중요할까요?", "충남", "문과", "내신 2.7", "부동산학과", 17, "경제 기사 읽기와 통계 탐구를 하고 있는데 학과 적합성을 더 보여줄 방법이 있을까요?", "user-hs-minseo"],
  ["건국대 논술은 인문계열에서도 수리논술 체감이 있나요?", "서울", "문과", "수학 3", "경영학과", 23, "문과라 수학이 약한 편인데 논술 준비할 때 수리 파트 비중이 어느 정도인지 궁금합니다.", "user-hajin"],
  ["건국대 입학 후 학교 분위기나 팀플 문화까지 고려하면 추천 학과가 있나요?", "경북", "문과", "내신 2.6", "경영학과", 12, "입시만이 아니라 실제 재학생 분위기도 함께 보고 싶습니다. 수업 분위기나 과제 문화 궁금해요.", "user-hs-sujin"],
  ["건국대와 세종대 사이에서 고민 중인데 캠퍼스 생활 만족도 차이가 큰가요?", "서울", "문과", "내신 2.3", "미디어커뮤니케이션학과", 14, "학과만 보면 둘 다 괜찮아서요. 통학, 학교 분위기, 커뮤니티 활성도까지 비교해보고 싶습니다.", "user-sua"],
] as const;

const communitySeeds = [
  ["club", "상허기념도서관 새벽 러닝 크루, 아침 7시 4명만", "일감호 한 바퀴 뛰고 상허기념도서관 카페에서 간단히 공부까지 이어가는 모임입니다. 과하게 빡세지 않게 꾸준히만 가고 싶어요.", 42, "user-jiyoon"],
  ["club", "건국대 창업동아리 2기 팀원 모집", "프론트 / 디자인 / 마케팅 포지션 열려 있습니다. 새천년관 근처에서 주 1회 오프라인 미팅 예정이에요.", 51, "user-minjae"],
  ["club", "KU 브랜딩 스터디, 포트폴리오 같이 만들 사람", "인스타 브랜딩, 카드뉴스, 피그마 작업물까지 같이 정리하는 스터디입니다. 산업디자인 / 미디어 모두 환영.", 33, "user-sohee"],
  ["club", "건대 영상 촬영 소모임에서 주말 촬영 멤버 구해요", "건대입구와 성수 쪽에서 브이로그나 인터뷰 촬영해볼 사람 구합니다. 편집 가능한 분이면 더 좋아요.", 28, "user-seungmin"],
  ["club", "일감호 피크닉 사진동아리 봄 멤버 모집", "카메라 없어도 괜찮고 휴대폰 촬영도 환영입니다. 이번 학기엔 건대 주변 풍경과 인물 스냅 위주로 찍을 예정입니다.", 26, "user-arin"],
  ["club", "건국대 취준 스터디: 대기업 자소서 루틴 만들 사람", "경영 / 경제 / 부동산 계열 위주로 매주 한 번 합평합니다. 자소서랑 인적성 루틴 같이 잡을 분 환영해요.", 24, "user-dohyun"],
  ["club", "반려동물 봉사 동아리 신입 모집", "주말에 유기동물 보호소 봉사 가는 동아리입니다. 생명계열 아니어도 괜찮고 진짜 꾸준히 갈 분만 받습니다.", 31, "user-chaeeun"],
  ["meetup", "시험 끝나고 건대입구역 앞에서 치맥 번개", "타과 친구 사귀고 싶어서 여는 번개예요. 6명 정도만 받을 예정이고 과한 술 강요 없는 분위기로 갑니다.", 37, "user-minjae"],
  ["meetup", "어린이대공원 산책 + 카페 갈 사람", "주말 오후에 너무 빡센 일정 말고 가볍게 걷고 이야기할 사람 구해요. 사진 좋아하는 사람도 환영.", 29, "user-arin"],
  ["meetup", "상허기념도서관 각자 공부 모임, 쉬는 시간만 대화", "말 많이 하는 스터디 말고 각자 공부하다가 쉬는 시간에만 정보 공유하는 모임입니다. 시험기간 루틴 잡기 좋아요.", 34, "user-somin"],
  ["meetup", "성수 팝업 다녀오고 건대입구까지 같이 올 사람", "패션 / 브랜드 팝업 같이 돌고 가볍게 밥 먹을 사람 구합니다. 동행 감각 비슷한 분이면 좋아요.", 27, "user-sohee"],
  ["meetup", "일감호 야간 산책 메이트 구해요", "수업 끝나고 30분 정도만 걸으며 하루 정리할 사람 있나요. 너무 과한 친목보다 편한 대화 선호합니다.", 25, "user-jiyoon"],
  ["meetup", "건대 축제 라인업 같이 볼 사람 미리 모집", "혼자 보기 애매해서 미리 사람 모아봐요. 공연 보고 푸드트럭까지 같이 돌면 좋겠습니다.", 45, "user-seungmin"],
  ["meetup", "새천년관 앞 점심 번개, 혼밥 탈출용", "점심 시간마다 같이 밥 먹을 사람 구해요. 과도한 친목보다 수업 끝나고 가볍게 만나는 정도 원합니다.", 23, "user-dohyun"],
  ["food", "건대입구역 2번 출구 바로 앞 마라탕, 시험기간에도 안정적", "맵기 조절 잘 되고 회전 빨라서 공강 짧을 때 자주 갑니다. 1인으로 가도 부담 없는 편이에요.", 44, "user-arin"],
  ["food", "건대입구 브런치 카페 중 대화하기 제일 무난했던 곳", "조용하고 좌석 간격 넓어서 소개팅이나 팀플 미팅 잡기에도 괜찮았습니다. 브런치 메뉴 실패 확률도 낮아요.", 39, "user-jiyoon"],
  ["food", "일감호 근처 카공 가능한 베이글집 추천", "콘센트 있고 좌석 오래 앉기 괜찮습니다. 오전 일찍 가면 훨씬 여유 있어요.", 32, "user-sohee"],
  ["food", "건국대 후문 쪽 가성비 제육 맛집 공유", "양 넉넉하고 혼밥하기도 편합니다. 수업 사이 빨리 먹고 가기 좋아서 후문 수업 있는 날 자주 갑니다.", 28, "user-dohyun"],
  ["food", "성수까지 안 가도 되는 건대 디저트 카페 추천", "너무 핫플 느낌 아니라 편하게 앉아 있기 좋고, 크로플이 생각보다 괜찮아요. 시험 끝나고 자주 갑니다.", 22, "user-arin"],
  ["food", "건대입구 술집 말고 조용한 와인바 찾는 사람?", "소개팅, 팀플 뒤풀이 둘 다 가능한 수준으로 무난한 곳입니다. 안주 퀄리티도 나쁘지 않았어요.", 21, "user-jiyoon"],
  ["food", "어린이대공원 근처 혼밥 국수집, 늦게까지 열어요", "도서관 늦게 있다가 가기 좋고 부담 없이 먹기 좋습니다. 비 오는 날 특히 자주 갑니다.", 19, "user-chaeeun"],
  ["food", "건대 치킨집 중 축구 보기 좋은 곳 추천합니다", "단체석 넓고 시끄럽긴 한데 경기나 과 모임 보기엔 오히려 좋아요. 가격도 생각보다 무난합니다.", 18, "user-seungmin"],
  ["hot", "19금) 소개팅 뒤 선 넘는 질문 어디까지 받아줘요?", "첫 만남 뒤 바로 너무 사적인 질문이 이어지면 선을 어떻게 긋는 편인지 궁금해요. 예의는 지키되 확실하게 끊는 문장 있으면 공유해주세요.", 31, "user-minjae"],
  ["hot", "19금) 자취방 초대 이야기 나올 때 보통 어느 선에서 끊어요?", "관계 초반인데 너무 빠르게 집 얘기 나오면 분위기 안 깨고 거절하는 기준이 다들 있는지 궁금합니다.", 28, "user-seungmin"],
  ["hot", "19금) 술자리 끝나고 단둘이 남자고 할 때 제일 불편했던 포인트", "늦은 시간에 단둘이 더 보자는 식으로 흘러갈 때 애매하게 말고 깔끔하게 거절하는 방식이 있으면 듣고 싶어요.", 24, "user-sohee"],
  ["hot", "19금) 연애 초반 스킨십 속도 차이 나면 어떻게 맞춰요?", "좋아하는 마음이 있어도 속도가 다르면 계속 신경 쓰이더라고요. 대화를 먼저 꺼내는 타이밍이 궁금합니다.", 27, "user-arin"],
  ["hot", "19금) FWB 제안 받았을 때 선 긋는 문장 추천", "가볍게 넘기기 어려운 제안이 와서 불편했는데 감정 상하지 않게 정리하는 표현이 필요합니다.", 22, "user-chaeeun"],
  ["hot", "19금) 관계 전에 꼭 확인하는 기준 있나요?", "술자리 분위기에 끌려가기보다 미리 이야기해야 하는 기준이 있는지, 다들 어디까지 분명하게 말하는 편인지 궁금해요.", 26, "user-somin"],
  ["freshman", "새내기 OT 때 다들 어느 정도 꾸미고 가나요?", "첫 만남이라 너무 힘주긴 싫은데 너무 편하게 가도 튈까 봐 고민입니다. 건대 오티 분위기 아는 예비입학생 있나요?", 21, "user-fresh-yerin"],
  ["freshman", "기숙사 신청 전에 꼭 알아둘 팁 있으면 공유해주세요", "합격 직후라 서류 챙기는 중인데 일정이 생각보다 촘촘하네요. 실수하기 쉬운 포인트 알려주면 도움 될 것 같아요.", 18, "user-fresh-joon"],
  ["freshman", "새내기 시간표는 공강 길게 만드는 편이 나을까요?", "아직 수강신청 감이 없어서요. 이동 시간이나 학교 적응 생각하면 어떤 패턴이 괜찮은지 궁금합니다.", 16, "user-fresh-yerin"],
  ["freshman", "입학 전에 단톡방에서 먼저 친해지는 분위기인가요?", "너무 빠르게 친목하는 건 조금 부담스러운데 다들 어느 정도 텐션으로 시작하는지 궁금합니다.", 15, "user-fresh-joon"],
] as const;

const datingSeeds = [
  ["건대입구에서 2:2 미팅 구해요, 대화 잘 통하는 팀이면 좋겠어요", "술보다 카페나 전시 선호합니다. 너무 과한 텐션보다 자연스럽게 친해지는 분위기면 좋겠어요.", "차분한 대화", 46, "user-jiyoon"],
  ["같이 어린이대공원 산책할 사람 구해요", "주말 낮 시간에 산책하고 디저트 정도 먹을 사람 있으면 좋겠습니다. 연락 텐션 부담 없는 분 선호해요.", "공원 산책", 33, "user-arin"],
  ["건대 / 성수 전시 같이 볼 타학교 친구 구해요", "사진전이나 브랜드 팝업 좋아하면 잘 맞을 것 같아요. 일정 맞는 날 한 번 가볍게 만나보는 정도를 생각 중입니다.", "전시 취향", 29, "user-seungmin"],
  ["같이 브런치 먹고 카페 갈 사람, 낮 약속 선호", "밤 약속보다 낮에 편하게 만나는 스타일입니다. 대화 핑퐁 잘 되는 분이면 좋겠어요.", "브런치", 31, "user-sohee"],
  ["건대 축제 같이 볼 사람 미리 구해봐요", "공연 라인업 보고 관심 생겨서요. 축제 하루 같이 다니고 분위기 맞으면 다음에도 편하게 보면 좋겠습니다.", "축제 메이트", 27, "user-dohyun"],
  ["성수 팝업 같이 볼 동갑 친구 구해요", "건대에서 출발해서 성수까지 같이 가실 분 구합니다. 과한 소개팅보다 취향 맞는 사람 만나고 싶어요.", "팝업 탐방", 26, "user-arin"],
  ["건국대 근처 조용한 카페 데이트처럼 가실 분", "주말에 책 조금 읽다가 이야기하는 편안한 만남 원합니다. 술자리보다 카페 선호해요.", "조용한 카페", 24, "user-chaeeun"],
  ["건대입구에서 타학교 친구 구해요, 2번 정도 편하게 볼 사람", "처음부터 너무 진지한 분위기보다 서로 일정 맞을 때 편하게 볼 수 있으면 좋겠어요.", "가벼운 친분", 22, "user-yujin"],
  ["영화 보고 늦지 않게 헤어지는 담백한 약속 원해요", "평일 저녁 한 번 정도 가볍게 영화 보고 귀가하는 정도의 안정적인 만남 선호합니다.", "영화", 19, "user-woojin"],
  ["건대입구 술집보다 디저트 좋아하는 사람 구합니다", "무리하게 텐션 올리는 자리보다 디저트 먹으면서 천천히 대화하는 편이 좋아요.", "디저트", 21, "user-jiyoon"],
  ["건대입구 야식 산책 + 편의점 디저트 같이 갈 사람", "시험기간 끝나고 텐션 낮게 한 바퀴 걷고 이야기할 사람 있으면 좋겠어요. 부담 없는 첫 만남 선호합니다.", "야간 산책", 18, "user-chaeeun"],
  ["새천년관 수업 끝나고 브런치 말고 저녁 같이 먹을 사람", "평일 저녁에 가볍게 저녁 먹고 카페 한 군데 더 가는 정도의 담백한 약속을 원해요.", "저녁 약속", 20, "user-sohee"],
  ["건대입구에서 전시보다 영화 취향 맞는 사람 찾습니다", "대화 텐션보다 취향이 맞는 게 더 중요해서요. 좋아하는 감독이나 장르 비슷하면 더 좋겠습니다.", "영화 취향", 17, "user-seungmin"],
] as const;

type CareerBoardSeedPost = {
  id: string;
  board: "careerInfo" | "jobPosting";
  title: string;
  content: string;
  likes: number;
  tags: string[];
};

type CareerBoardSeedComment = {
  postId: string;
  content: string;
};

const curatedCareerSeed = careerBoardSeed as {
  posts: CareerBoardSeedPost[];
  comments: CareerBoardSeedComment[];
};

const curatedAnonymousBoardSeed = anonymousBoardSeed as {
  posts: Array<{
    id: string;
    title: string;
    content: string;
    likes: number;
    tags: string[];
  }>;
  comments: Array<{
    postId: string;
    content: string;
  }>;
};

const referenceAdmissionPosts: SeedPost[] = [
  {
    id: "admission-ref-1",
    category: "admission",
    authorId: "user-hs-sujin",
    schoolId: "school-uos",
    title: "[공식] 서울시립대 2026 입학 프로그램 공지 먼저 본 사람 있어요?",
    content:
      "서울시립대 공식 공지에서 2026학년도 스쿨어택 프로그램을 운영한다고 안내했고, 입학처 홈페이지와 인스타그램 공지를 함께 확인하라고 적혀 있었습니다. 설명회형 프로그램 먼저 보는 게 좋을지 궁금해서 정리해둡니다.",
    createdAt: at(21, "09:10:00"),
    likes: 18,
    tags: ["공식자료", "서울시립대", "입학처"],
    meta: {
      region: "서울",
      track: "문과",
      scoreType: "학생부종합 준비",
      interestUniversity: "서울시립대학교",
      interestDepartment: "행정학과",
    },
  },
  {
    id: "admission-ref-2",
    category: "admission",
    authorId: "user-hajin",
    schoolId: "school-ewha",
    title: "[공식] 이화여대 모집요강 PDF에서 체크해야 할 부분 뭐부터 보나요?",
    content:
      "이화여대 입학처 PDF 공지 기준으로 전형별 제출서류와 수학기간 예외사항이 상세하게 정리돼 있었습니다. 재외국민 전형 자료지만 서류 안내 방식이 꽤 촘촘해서 다른 전형 준비할 때도 참고가 되더라고요.",
    createdAt: at(21, "10:25:00"),
    likes: 16,
    tags: ["공식자료", "이화여대", "모집요강"],
    meta: {
      region: "서울",
      track: "문과",
      scoreType: "내신 2.3",
      interestUniversity: "이화여자대학교",
      interestDepartment: "경영학과",
    },
  },
  {
    id: "admission-ref-3",
    category: "admission",
    authorId: "user-hs-minseo",
    schoolId: "school-cau",
    title: "[공식] 중앙대 신입생 학사가이드 보니 다빈치인재개발센터가 같이 보이네요",
    content:
      "중앙대 공식 학사가이드 자료를 보다 보니 신입생용 안내 안에 다빈치인재개발센터, 추천채용, 취업지원 안내까지 같이 정리돼 있었습니다. 입학 직후부터 취업지원 연결되는 구조인지 재학생 체감이 궁금합니다.",
    createdAt: at(21, "11:40:00"),
    likes: 14,
    tags: ["공식자료", "중앙대", "학사가이드"],
    meta: {
      region: "서울",
      track: "문과",
      scoreType: "내신 2.8",
      interestUniversity: "중앙대학교",
      interestDepartment: "경영경제대학",
    },
  },
  {
    id: "admission-ref-4",
    category: "admission",
    authorId: "user-sua",
    schoolId: "school-sejong",
    title: "[공식] 세종대 새로배움터 공지 보신 분, 신입생 때 어디부터 챙기셨어요?",
    content:
      "세종대 공식 공지에서 새로배움터 개최 안내를 올리면서 수강신청, 특별강연, 신입생 대학생활 안내를 같이 묶어서 소개했습니다. 합격 직후에는 이런 오리엔테이션형 자료가 실제로 제일 도움이 되는지 궁금합니다.",
    createdAt: at(21, "13:00:00"),
    likes: 13,
    tags: ["공식자료", "세종대", "새로배움터"],
    meta: {
      region: "서울",
      track: "문과",
      scoreType: "내신 2.9",
      interestUniversity: "세종대학교",
      interestDepartment: "호텔관광경영학과",
    },
  },
  {
    id: "admission-ref-5",
    category: "admission",
    authorId: "user-yeonwoo",
    schoolId: "school-snu",
    title: "[공식] 서울대 교과과정 해설 PDF 먼저 보면 학과 감이 더 잘 오네요",
    content:
      "서울대 공식 교과과정 해설 PDF를 보니 신입생세미나, 대학영어, 학과별 기초 이수 규정이 한 파일에 정리돼 있었습니다. 전형 정보만 보다가 실제 커리큘럼까지 같이 보니 학과 선택 감이 훨씬 빨리 오더라고요.",
    createdAt: at(21, "13:40:00"),
    likes: 21,
    tags: ["공식자료", "서울대", "교과과정"],
    meta: {
      region: "서울",
      track: "이과",
      scoreType: "학생부종합 준비",
      interestUniversity: "서울대학교",
      interestDepartment: "경제학부",
    },
  },
  {
    id: "admission-ref-6",
    category: "admission",
    authorId: "user-sua",
    schoolId: "school-soongsil",
    title: "[공식] 숭실대 입학처 S-STAR 브로슈어가 학과·취업 흐름까지 정리돼 있어요",
    content:
      "숭실대 입학처 브로슈어를 보니 학과 소개뿐 아니라 캠퍼스 핫플레이스, 취업 밀착 프로그램, 창업 지원까지 같이 정리돼 있었습니다. 지원 학과를 고를 때 학교 생활과 취업 분위기를 한 번에 보기 좋았습니다.",
    createdAt: at(21, "14:20:00"),
    likes: 19,
    tags: ["공식자료", "숭실대", "입학처"],
    meta: {
      region: "서울",
      track: "이과",
      scoreType: "내신 2.6",
      interestUniversity: "숭실대학교",
      interestDepartment: "소프트웨어학부",
    },
  },
  {
    id: "admission-ref-7",
    category: "admission",
    authorId: "user-hs-minseo",
    schoolId: "school-yonsei",
    title: "[공식] 연세 전공안내서 보니까 대학생활·글로벌 프로그램 설명이 한 번에 정리돼 있네요",
    content:
      "연세대 공식 전공안내서에서 전공 소개뿐 아니라 대학생활, 글로벌 프로그램, 진로 탐색 흐름이 같이 정리돼 있었습니다. 학과 설명만 보는 것보다 학교 안에서 어떤 경험을 할 수 있는지 먼저 잡기에 좋았습니다.",
    createdAt: at(21, "15:05:00"),
    likes: 18,
    tags: ["공식자료", "연세대", "전공안내서"],
    meta: {
      region: "서울",
      track: "문과",
      scoreType: "내신 2.4",
      interestUniversity: "연세대학교",
      interestDepartment: "교육학과",
    },
  },
];

const admissionPosts: SeedPost[] = admissionSeeds.map((seed, index) => ({
  id: `admission-${index + 1}`,
  category: "admission",
  authorId: seed[7],
  schoolId: BASE_SCHOOL_ID,
  title: seed[0],
  content: seed[6],
  createdAt: at(20 - Math.floor(index / 2), `${8 + (index % 6)}:${index % 2 === 0 ? "10" : "40"}:00`),
  likes: seed[5],
  tags: ["건국대", seed[4], index % 2 === 0 ? "KU자기추천" : "논술"],
  meta: {
    region: seed[1],
    track: seed[2] as AdmissionQuestionMeta["track"],
    scoreType: seed[3],
    interestUniversity: "건국대학교",
    interestDepartment: seed[4],
  },
}));

const communityPosts: SeedPost[] = communitySeeds.map((seed, index) => ({
  id: `community-${index + 1}`,
  category: "community",
  subcategory: seed[0],
  authorId: seed[4],
  schoolId: BASE_SCHOOL_ID,
  title: seed[1],
  content: seed[2],
  createdAt: at(20 - Math.floor(index / 3), `${9 + (index % 7)}:${index % 2 === 0 ? "05" : "35"}:00`),
  likes: seed[3],
  tags: [
    seed[0] === "food"
      ? "건대입구"
      : seed[0] === "club"
        ? "모집"
        : seed[0] === "hot"
          ? "19+"
          : "번개",
    "건국대",
  ],
}));

const advicePosts: SeedPost[] = [
  {
    id: "community-advice-1",
    category: "community",
    subcategory: "advice",
    authorId: "user-jieun",
    schoolId: "school-sookmyung",
    title: "휴학 생각이 계속 드는데 바로 결정하는 게 맞을까요?",
    content:
      "학기 초인데도 수업이 손에 잘 안 잡히고 진로 방향도 흐릿해서 휴학 생각이 자꾸 납니다. 비슷한 시기 지나본 사람들은 보통 어떤 기준으로 결정했는지 궁금해요.",
    createdAt: at(21, "20:10:00"),
    likes: 26,
    tags: ["고민상담", "휴학"],
  },
  {
    id: "community-advice-2",
    category: "community",
    subcategory: "advice",
    authorId: "user-yeji",
    schoolId: "school-ewha",
    title: "과 친구들이랑 멀어졌을 때 다시 다가가는 편인가요?",
    content:
      "2학년 올라오면서 자연스럽게 멀어진 친구들이 있는데 억지로 다시 붙으려니 어색하고 그냥 두자니 학교가 너무 좁게 느껴집니다. 보통 어떻게 정리하는지 듣고 싶어요.",
    createdAt: at(21, "20:40:00"),
    likes: 22,
    tags: ["고민상담", "인간관계"],
  },
  {
    id: "community-advice-3",
    category: "community",
    subcategory: "advice",
    authorId: "user-hyobin",
    schoolId: "school-korea",
    title: "첫 인턴 불합격 후 멘탈 회복은 어떻게 했나요?",
    content:
      "나름 열심히 준비했다고 생각했는데 서류에서 떨어지고 나니까 다음 지원을 바로 넣는 것도 겁납니다. 텐션 다시 올릴 때 실제로 도움 된 루틴 있으면 공유 부탁해요.",
    createdAt: at(21, "21:05:00"),
    likes: 24,
    tags: ["고민상담", "취업"],
  },
  {
    id: "community-advice-4",
    category: "community",
    subcategory: "advice",
    authorId: "user-yonji",
    schoolId: "school-yonsei",
    title: "자취 시작하고 생활비 통제가 안 될 때 어떻게 잡았나요?",
    content:
      "학기 시작하고 식비, 카페, 교통비가 생각보다 빨리 나가서 한 달 예산이 계속 깨집니다. 앱으로 관리하는지, 카테고리를 나누는지 현실적인 방법이 궁금해요.",
    createdAt: at(21, "21:30:00"),
    likes: 19,
    tags: ["고민상담", "생활비"],
  },
  {
    id: "community-advice-5",
    category: "community",
    subcategory: "advice",
    authorId: "user-jaeho",
    schoolId: "school-soongsil",
    title: "팀플 무임승차를 또 만나면 수업을 바꾸는 게 맞나요?",
    content:
      "이번 학기도 팀플에서 역할 분배가 계속 꼬이는데, 전공 특성상 피하기가 어렵네요. 다음 학기엔 교수님 스타일이나 평가 방식까지 보고 수업을 골라야 하는지 고민입니다.",
    createdAt: at(21, "21:55:00"),
    likes: 21,
    tags: ["고민상담", "팀플"],
  },
  {
    id: "community-advice-6",
    category: "community",
    subcategory: "advice",
    authorId: "user-yubin",
    schoolId: "school-seoultech",
    title: "취업 준비 시작 시점이 늦은 것 같을 때 뭐부터 정리했나요?",
    content:
      "4학년인데 대외활동이나 인턴이 많지 않아서 늦었다는 생각이 큽니다. 자소서, 포트폴리오, 직무 정리 중 어디부터 손대는 게 가장 현실적인지 궁금합니다.",
    createdAt: at(21, "22:20:00"),
    likes: 23,
    tags: ["고민상담", "취업"],
  },
];

const freePosts: SeedPost[] = [
  {
    id: "community-free-1",
    category: "community",
    subcategory: "free",
    authorId: "user-sejin",
    schoolId: "school-hongik",
    title: "요즘 학교 다니면서 제일 의외였던 점 하나씩 말해보자",
    content:
      "전 고등학교 때보다 오히려 학교 안에서 혼자 있는 시간이 훨씬 편해졌어요. 수업, 동아리, 과제 말고 다들 사소하게 느낀 변화 있으면 궁금합니다.",
    createdAt: at(21, "18:05:00"),
    likes: 29,
    tags: ["자유", "대학생활"],
  },
  {
    id: "community-free-2",
    category: "community",
    subcategory: "free",
    authorId: "user-yonji",
    schoolId: "school-yonsei",
    title: "수업 끝나고 집 갈 때 듣는 플레이리스트 추천받아요",
    content:
      "요즘 등하교 루틴이 너무 똑같아서요. 너무 잔잔한 것보다 텐션 적당히 올라가는 곡 있으면 공유 부탁합니다.",
    createdAt: at(21, "18:40:00"),
    likes: 24,
    tags: ["자유", "플레이리스트"],
  },
  {
    id: "community-free-3",
    category: "community",
    subcategory: "free",
    authorId: "user-danbi",
    schoolId: "school-hufs",
    title: "팀플 끝난 날 다들 혼자 쉬는 편이에요, 바로 약속 잡는 편이에요?",
    content:
      "전 진이 빠져서 바로 귀가하는 편인데 주변은 오히려 그날 밥 약속 더 잘 잡더라고요. 다들 팀플 끝난 날 루틴이 궁금합니다.",
    createdAt: at(21, "19:20:00"),
    likes: 18,
    tags: ["자유", "팀플"],
  },
  {
    id: "community-free-4",
    category: "community",
    subcategory: "free",
    authorId: "user-jieun",
    schoolId: "school-sookmyung",
    title: "이번 학기 목표 하나만 적고 가요",
    content:
      "거창한 거 말고 진짜 지킬 수 있는 걸로요. 전 이번엔 결석 0번이 목표입니다. 서로 적어두면 조금은 덜 미룰 것 같아서 올려봐요.",
    createdAt: at(21, "20:15:00"),
    likes: 22,
    tags: ["자유", "학기목표"],
  },
];

const askPosts: SeedPost[] = [
  {
    id: "community-ask-1",
    category: "community",
    subcategory: "ask",
    authorId: "user-yeji",
    schoolId: "school-ewha",
    title: "무물) 공강 2시간 생기면 다들 뭐 해요?",
    content:
      "도서관 가기엔 애매하고 집 가기엔 더 애매한 시간이 자주 생겨요. 학교 안팎에서 공강 보내는 루틴 추천받습니다.",
    createdAt: at(21, "20:35:00"),
    likes: 17,
    tags: ["무물", "공강"],
  },
  {
    id: "community-ask-2",
    category: "community",
    subcategory: "ask",
    authorId: "user-jaeho",
    schoolId: "school-soongsil",
    title: "무물) 에어팟 한쪽 잃어버리면 다시 사나요 그냥 버티나요",
    content:
      "왼쪽만 잃어버렸는데 다시 사자니 돈 아깝고, 그냥 쓰자니 너무 불편합니다. 실제로 다들 어떻게 처리했는지 궁금해요.",
    createdAt: at(21, "21:05:00"),
    likes: 14,
    tags: ["무물", "일상"],
  },
  {
    id: "community-ask-3",
    category: "community",
    subcategory: "ask",
    authorId: "user-yubin",
    schoolId: "school-seoultech",
    title: "무물) 전공 책은 다들 중고로 먼저 찾나요?",
    content:
      "이번 학기 교재값이 생각보다 세서요. 새 책이 꼭 필요한 과목 말고는 중고로 버티는 편인지 궁금합니다.",
    createdAt: at(21, "21:40:00"),
    likes: 16,
    tags: ["무물", "교재"],
  },
  {
    id: "community-ask-4",
    category: "community",
    subcategory: "ask",
    authorId: "user-hyobin",
    schoolId: "school-korea",
    title: "무물) 조별과제 첫 모임은 보통 카톡으로만 해도 충분해요?",
    content:
      "굳이 대면으로 한 번 더 모이는 팀도 있고 카톡으로 다 정리하는 팀도 있던데, 처음에 어디까지 정리하면 매끄러운지 알고 싶어요.",
    createdAt: at(21, "22:05:00"),
    likes: 15,
    tags: ["무물", "조별과제"],
  },
];

const anonymousSeedSchoolIds = [
  "school-swu",
  "school-uos",
  "school-yonsei",
  "school-korea",
  "school-sejong",
  "school-sookmyung",
  "school-hongik",
  "school-soongsil",
];

const anonymousPosts: SeedPost[] = curatedAnonymousBoardSeed.posts.map((seed, index) => ({
  id: seed.id,
  category: "community",
  subcategory: "anonymous",
  authorId: collegeReviewerIds[index % collegeReviewerIds.length],
  schoolId: anonymousSeedSchoolIds[index % anonymousSeedSchoolIds.length],
  title: seed.title,
  content: seed.content,
  createdAt: at(21 - Math.floor(index / 4), `${18 + (index % 4)}:${index % 2 === 0 ? "15" : "45"}:00`),
  likes: seed.likes,
  visibilityLevel: "anonymous",
  tags: seed.tags,
}));

const ASK_TOPIC_BLUEPRINTS = [
  {
    key: "commute",
    tags: ["무물", "통학"],
    title: () => "통학러는 1교시 있는 날 어떻게 버텨요?",
    content: () =>
      "1교시가 연속으로 잡히는 날이 있는데, 전날부터 컨디션 관리하는 팁이 궁금합니다. 통학 시간이 길면 아침 루틴을 어떻게 잡는지 묻고 싶어요.",
  },
  {
    key: "lunch",
    tags: ["무물", "학생식당"],
    title: () => "학생식당은 몇 시쯤 가야 덜 붐비나요?",
    content: () =>
      "점심시간마다 줄 서는 시간이 꽤 길더라고요. 학생식당이나 교내 카페를 언제 가는 편인지, 붐비는 시간 피하는 루틴 있으면 공유 부탁해요.",
  },
  {
    key: "laptop",
    tags: ["무물", "기기"],
    title: () => "노트북은 결국 매일 들고 다니게 되나요?",
    content: () =>
      "강의실 이동이 많은 편이라 노트북을 매일 챙겨야 할지 고민입니다. 태블릿만으로 버티는 사람도 있는지, 과제 많은 수업은 어느 정도까지 가능한지 궁금해요.",
  },
  {
    key: "library",
    tags: ["무물", "도서관"],
    title: () => "도서관 자리 잡으려면 몇 시쯤 가는 편이에요?",
    content: () =>
      "시험기간만 되면 도서관 자리 경쟁이 치열하다고 들어서요. 평소에도 인기 많은 구역이 있는지, 다들 어느 시간대에 가는지 궁금합니다.",
  },
  {
    key: "groupwork",
    tags: ["무물", "조별과제"],
    title: () => "팀플 조장은 보통 먼저 손드는 편인가요?",
    content: () =>
      "전공 수업 팀플이 슬슬 시작되는데, 조장 맡는 분위기가 궁금해요. 무조건 먼저 나서는 게 편한지, 역할만 빨리 정하면 무난한지 실제 경험 듣고 싶습니다.",
  },
  {
    key: "otlook",
    tags: ["무물", "새내기"],
    title: () => "OT나 개강 첫 주에는 다들 어느 정도 꾸미고 가요?",
    content: () =>
      "처음 만나는 자리라 너무 편하게 가도 되나 고민됩니다. 새내기 때 너무 힘줘서 간 사람이 많은지, 오히려 편한 복장이 더 많은지 궁금해요.",
  },
  {
    key: "club",
    tags: ["무물", "동아리"],
    title: () => "동아리는 첫 학기에 바로 들어가는 편인가요?",
    content: () =>
      "새내기 때 동아리를 바로 정하는 게 좋은지, 한 달 정도 학교 분위기 보고 들어가는 게 좋은지 고민입니다. 너무 빨리 들어가서 후회한 경험도 있는지 듣고 싶어요.",
  },
  {
    key: "festival",
    tags: ["무물", "축제"],
    title: () => "축제는 첫날 가는 게 재밌나요 마지막 날이 재밌나요?",
    content: () =>
      "축제 라인업 발표되면 항상 어느 날 갈지 고민됩니다. 첫날 분위기가 좋은지, 마지막 날이 더 사람 많고 재밌는지 경험담 부탁해요.",
  },
  {
    key: "elective",
    tags: ["무물", "교양"],
    title: () => "교양은 꿀강 위주로 담는 편인가요 흥미 위주로 담는 편인가요?",
    content: () =>
      "시간표 짜다 보니 꿀강 평점 좋은 과목과 진짜 듣고 싶은 과목이 갈립니다. 학점 관리 우선으로 가는지, 흥미 과목도 한두 개는 꼭 넣는지 궁금해요.",
  },
  {
    key: "parttime",
    tags: ["무물", "알바"],
    title: () => "다니면서 주중 알바 병행하면 힘든 편인가요?",
    content: () =>
      "이번 학기에 주중 알바를 병행할지 고민 중입니다. 통학이나 팀플까지 있으면 주중 알바가 너무 빡센지, 주말만 하는 게 나은지 궁금합니다.",
  },
  {
    key: "ipad",
    tags: ["무물", "필기"],
    title: () => "아이패드 필기가 많은 편인가요, 종이 노트도 아직 많나요?",
    content: () =>
      "수업 스타일이 과마다 다르겠지만, 실제로 아이패드 필기가 얼마나 많은지 감이 안 옵니다. 종이 노트로도 충분한 과목이 많은지 궁금해요.",
  },
  {
    key: "shuttle",
    tags: ["무물", "캠퍼스생활"],
    title: () => "캠퍼스에서 건물 사이 이동 빡센 편인가요?",
    content: () =>
      "시간표 짤 때 연강 사이 건물 이동이 얼마나 빡센지 알고 싶어요. 언덕이나 거리 때문에 사실상 10분 쉬는 시간에 뛰어야 하는지 궁금합니다.",
  },
] as const;

const schoolBoardPosts: SeedPost[] = schools.flatMap((school, schoolIndex) =>
  Array.from({ length: 3 }, (_, offset) => {
    const blueprint =
      ASK_TOPIC_BLUEPRINTS[(schoolIndex * 3 + offset) % ASK_TOPIC_BLUEPRINTS.length];

    return {
      id: `community-ask-${school.id}-${blueprint.key}`,
      category: "community",
      subcategory: "school",
      authorId: collegeReviewerIds[(schoolIndex + offset) % collegeReviewerIds.length],
      schoolId: school.id,
      title: blueprint.title(),
      content: blueprint.content(),
      createdAt: new Date(
        Date.UTC(2026, 2, 18, 9, 0, 0) + (schoolIndex * 3 + offset) * 47 * 60 * 1000,
      ).toISOString(),
      likes: 11 + ((schoolIndex + offset) % 13),
      tags: ["학교 게시판", ...blueprint.tags],
    };
  }),
);

const allAskPosts: SeedPost[] = [...askPosts];

const HOT_TOPIC_BLUEPRINTS = [
  {
    key: "cc",
    tags: ["핫갤", "19+", "과CC"],
    title: () => `핫갤) 과CC 들키면 진짜 바로 소문 도는 편인가요?`,
    content: () =>
      `캠퍼스 안에서 동선이 자주 겹치다 보니 과CC 시작하면 생각보다 빨리 소문나는지 궁금합니다. 숨기고 다녀도 결국 다 알게 되는 분위기인지 무물합니다.`,
  },
  {
    key: "afterdate",
    tags: ["핫갤", "19+", "썸"],
    title: () => `핫갤) 소개받고 애프터까지 갔으면 보통 가능성 있다고 보나요?`,
    content: () =>
      `두 번째까지 만났는데 연락 텀이 애매해서 감이 안 옵니다. 처음엔 잘 맞는 것 같았는데 애프터 이후부터 다들 어느 정도 텐션으로 이어가는지 궁금해요.`,
  },
  {
    key: "touch",
    tags: ["핫갤", "19+", "연애"],
    title: () => `핫갤) 또래들은 스킨십 속도감 보통 어느 정도가 자연스럽다고 느껴요?`,
    content: () =>
      `자주 만나게 되는 사람이 있는데 서로 호감은 분명한데 진도가 너무 빠르면 부담스러울까 고민됩니다. 다들 편하다고 느끼는 속도감이 어느 정도인지 궁금합니다.`,
  },
  {
    key: "exsame",
    tags: ["핫갤", "19+", "전애인"],
    title: () => `핫갤) 전애인이 같은 생활권이면 다들 어떻게 마주쳐요?`,
    content: () =>
      `생활권이 겹치다 보니 안 마주치기가 더 어렵네요. 헤어진 뒤에도 가끔 보게 되는데 모른 척하는지, 가볍게 인사하는지 다들 기준이 궁금합니다.`,
  },
  {
    key: "sleepover",
    tags: ["핫갤", "19+", "자취"],
    title: () => `핫갤) 자취하는 사람들, 썸 단계에서 집 초대는 언제부터 괜찮다고 봐요?`,
    content: () =>
      `주변 자취하는 친구들은 생각보다 집에서 영화 보거나 밥 먹는 약속을 자연스럽게 잡더라고요. 썸 단계에서 너무 이른 건 아닌지, 다들 어느 정도 만난 뒤에 괜찮다고 보는지 궁금합니다.`,
  },
  {
    key: "meetingafter",
    tags: ["핫갤", "19+", "미팅"],
    title: () => `핫갤) 미팅 끝나고 둘이 따로 보자는 연락 오면 보통 나가요?`,
    content: () =>
      `미팅은 재밌게 끝났는데 그중 한 명이 따로 보자고 해서 고민 중입니다. 자리 분위기가 좋아서 괜찮은 건지, 술자리 텐션일 뿐인지 다들 어떤 기준으로 판단하는지 궁금해요.`,
  },
  {
    key: "dm",
    tags: ["핫갤", "19+", "DM"],
    title: () => `핫갤) 인스타 DM 먼저 보내본 사람 있어요?`,
    content: () =>
      `행사에서 한두 번 본 사람인데 팔로우만 해놓고 대화는 못 시작했습니다. DM 먼저 보내는 게 너무 들이대는 느낌인지, 자연스럽게 시작하는 멘트가 있는지 무물합니다.`,
  },
  {
    key: "fwbline",
    tags: ["핫갤", "19+", "관계"],
    title: () => `핫갤) 관계는 편한데 연애는 아닌 상황, 다들 어디서 선 긋나요?`,
    content: () =>
      `자주 보게 되는 사람이 있는데 서로 편하고 끌리긴 합니다. 그런데 연애로 가는 건 아닌 느낌이라 이런 상황에서 다들 어느 순간 선을 긋는지 궁금해요.`,
  },
  {
    key: "jealous",
    tags: ["핫갤", "19+", "질투"],
    title: () => `핫갤) 아직 사귀는 건 아닌데 질투나면 티 내는 편이에요?`,
    content: () =>
      `자주 보는 사이라 미묘하게 신경 쓰이는데, 아직 관계를 정의한 건 아니라 괜히 티 냈다가 부담 줄까 고민됩니다. 다들 이런 때는 그냥 모른 척하는 편인지 궁금해요.`,
  },
  {
    key: "confession",
    tags: ["핫갤", "19+", "고백"],
    title: () => `핫갤) 같은 생활권이면 고백 실패 후에도 얼굴 볼 각오하고 하는 편인가요?`,
    content: () =>
      `매일 마주칠 수도 있는 사이라 마음 표현이 더 어렵네요. 거절당하면 계속 어색할까 봐 망설여지는데, 다들 이런 경우에도 그냥 질러보는지 궁금합니다.`,
  },
  {
    key: "drunkcall",
    tags: ["핫갤", "19+", "술자리"],
    title: () => `핫갤) 술 마신 날만 연락 오는 사람은 다들 바로 거르나요?`,
    content: () =>
      `술자리 뒤에만 연락 오는 사람이 있는데 평소엔 또 멀쩡해서 애매합니다. 그냥 심심풀이인지, 술 마시면 솔직해지는 타입인지 다들 어떻게 구분하는지 궁금해요.`,
  },
  {
    key: "trip",
    tags: ["핫갤", "19+", "여행"],
    title: () => `핫갤) 사귀기 전 여행 제안 받으면 다들 선 넘었다고 느껴요?`,
    content: () =>
      `친해진 사람이 갑자기 근교 드라이브나 1박 쪽 얘기를 꺼내서 당황했습니다. 아직 확실한 관계도 아닌데 이런 제안은 보통 어떻게 받아들이는지 무물합니다.`,
  },
] as const;

const generatedHotPosts: SeedPost[] = schools.flatMap((school, schoolIndex) =>
  Array.from({ length: 3 }, (_, offset) => {
    const blueprint =
      HOT_TOPIC_BLUEPRINTS[(schoolIndex * 3 + offset) % HOT_TOPIC_BLUEPRINTS.length];

    return {
      id: `community-hot-${school.id}-${blueprint.key}`,
      category: "community",
      subcategory: "hot",
      authorId: collegeReviewerIds[(schoolIndex + offset + 5) % collegeReviewerIds.length],
      schoolId: school.id,
      title: blueprint.title(),
      content: blueprint.content(),
      createdAt: new Date(
        Date.UTC(2026, 2, 17, 21, 0, 0) + (schoolIndex * 3 + offset) * 41 * 60 * 1000,
      ).toISOString(),
      likes: 27 + ((schoolIndex + offset) % 19),
      tags: [...blueprint.tags],
    };
  }),
);

const allHotPosts: SeedPost[] = generatedHotPosts;

const datingPosts: SeedPost[] = datingSeeds.map((seed, index) => ({
  id: `dating-${index + 1}`,
  category: "dating",
  subcategory:
    seed[0].includes("미팅") || seed[0].includes("2:2") || seed[0].includes("친구 구해요")
      ? "meeting"
      : "dating",
  authorId: seed[4],
  schoolId: getSchoolIdByUser(seed[4]),
  title: seed[0],
  content: seed[1],
  createdAt: at(20 - Math.floor(index / 2), `${11 + (index % 5)}:${index % 2 === 0 ? "20" : "50"}:00`),
  likes: seed[3],
  tags: [
    seed[2],
    index % 2 === 0 ? "건대입구" : "성수",
    seed[0].includes("미팅") || seed[0].includes("2:2") ? "미팅" : "연애",
  ],
}));

const careerPosts: SeedPost[] = curatedCareerSeed.posts.map((seed, index) => {
  const authorId = collegeReviewerIds[index % collegeReviewerIds.length];

  return {
    id: seed.id,
    category: "community",
    authorId,
    schoolId: getSchoolIdByUser(authorId),
    title: seed.title,
    content: seed.content,
    createdAt: at(12 + (index % 10), `${9 + (index % 7)}:${index % 2 === 0 ? "18" : "46"}:00`),
    likes: seed.likes,
    tags: seed.tags,
  };
});

const referenceCommunityPosts: SeedPost[] = [
  {
    id: "community-ref-1",
    category: "community",
    subcategory: "freshman",
    authorId: "user-fresh-yerin",
    schoolId: BASE_SCHOOL_ID,
    title: "[공식] 건국대 오리엔테이션 공지 먼저 뜬 곳 체크해봤어요",
    content:
      "건국대 공식 공지에서 학기 시작 전 오리엔테이션을 학생회관과 해봉부동산학관에서 나눠 진행한 사례가 있었습니다. 새내기 일정도 보통 공간과 안내 채널이 따로 열리니 공지 게시판을 자주 보는 게 안전해 보여요.",
    createdAt: at(21, "08:20:00"),
    likes: 19,
    tags: ["새내기존", "공식자료", "오리엔테이션"],
  },
  {
    id: "community-ref-2",
    category: "community",
    subcategory: "freshman",
    authorId: "user-yujin",
    schoolId: "school-sejong",
    title: "[공식] 세종대 새로배움터에서 수강신청이랑 대학생활 안내 같이 한다네요",
    content:
      "세종대 공식 공지 기준으로 새로배움터에서 수강신청, 신입생 대학생활 안내, 특별강연이 한 번에 묶여 있었습니다. 세종대 예비입학생이면 오티만 기다리기보다 공지에서 학사 흐름 먼저 보는 게 좋아 보여요.",
    createdAt: at(21, "09:45:00"),
    likes: 17,
    tags: ["새내기존", "공식자료", "수강신청"],
  },
  {
    id: "community-ref-3",
    category: "community",
    subcategory: "freshman",
    authorId: "user-yeji",
    schoolId: "school-ewha",
    title: "[공식] 이화 신입생 진로 설계 부스가 생각보다 크네요",
    content:
      "이화 공식 공지 자료를 보니 신입생 대상 미래설계 행사에서 진로탐색, 취창업, 학교생활 부스를 총 37개 운영했다고 안내했습니다. 새내기 때부터 학교생활이랑 진로 정보 같이 보는 구조가 괜찮아 보여요.",
    createdAt: at(21, "11:10:00"),
    likes: 15,
    tags: ["새내기존", "공식자료", "학교생활"],
  },
  {
    id: "community-ref-4",
    category: "community",
    subcategory: "freshman",
    authorId: "user-eunsol",
    schoolId: "school-hanyang",
    title: "[공식] 한양대는 신입생 우선수강신청 도우미 지원을 따로 받았어요",
    content:
      "한양대 공식 자료를 보면 연간 지원계획 안에 신입생 우선수강신청과 도우미 지원 안내가 따로 들어가 있었습니다. 학기 시작 직전에는 학교 공식 PDF 먼저 보는 습관이 정말 중요해 보여요.",
    createdAt: at(21, "12:15:00"),
    likes: 16,
    tags: ["새내기존", "공식자료", "우선수강신청"],
  },
  {
    id: "community-ref-5",
    category: "community",
    subcategory: "freshman",
    authorId: "user-hyobin",
    schoolId: "school-korea",
    title: "[공식] 고려대 문과대 OT 자료 첨부 공지면 신입생 일정 파악이 빨라요",
    content:
      "고려대 문과대 공식 공지에 신입생 OT 자료가 첨부돼 있어서 아주홀 위치, 학사 일정, 첫 학기 체크포인트를 한 번에 볼 수 있었습니다. 새내기 때는 학과 단위 OT 자료를 먼저 챙기는 게 확실히 빠르더라고요.",
    createdAt: at(21, "12:55:00"),
    likes: 18,
    tags: ["새내기존", "공식자료", "OT"],
  },
  {
    id: "community-ref-6",
    category: "community",
    subcategory: "freshman",
    authorId: "user-danbi",
    schoolId: "school-hufs",
    title: "[공식] 한국외대 서울캠퍼스 OT 안전가이드에 필수 체크포인트가 다 있네요",
    content:
      "한국외대 서울캠퍼스 공식 안전가이드 PDF에 OT 운영 원칙, 안전수칙, 성희롱 예방, 비용 징수 금지 같은 기본선이 명확하게 정리돼 있었습니다. 새내기존에서도 이런 체크리스트를 먼저 공유해두면 도움 될 것 같아요.",
    createdAt: at(21, "13:25:00"),
    likes: 17,
    tags: ["새내기존", "공식자료", "안전가이드"],
  },
  {
    id: "community-ref-7",
    category: "community",
    subcategory: "club",
    authorId: "user-sejin",
    schoolId: "school-hongik",
    title: "[공식] 홍익대 총동아리연합회 소개 페이지에서 중앙동아리 규모가 한눈에 보여요",
    content:
      "홍익대 공식 학생활동 페이지를 보니 서울캠퍼스 중앙동아리 수와 분과 구성이 자세히 정리돼 있었습니다. 동아리 찾을 때 커뮤니티 후기만 보기보다 학교 공식 소개를 먼저 보면 결이 빨리 잡혀요.",
    createdAt: at(21, "14:05:00"),
    likes: 16,
    tags: ["동아리", "공식자료", "중앙동아리"],
  },
  {
    id: "community-ref-8",
    category: "community",
    subcategory: "freshman",
    authorId: "user-yonji",
    schoolId: "school-yonsei",
    title: "[공식] 연세 전공안내서에 대학생활·글로벌 프로그램 흐름이 같이 정리돼 있어요",
    content:
      "연세대 공식 전공안내서 안에 전공 소개뿐 아니라 대학생활, 해외교환, 진로 탐색, 학업 적응 정보가 같이 묶여 있었습니다. 입학 전에는 학과별 커리큘럼과 학교생활 지원 구조를 함께 보는 데 유용했습니다.",
    createdAt: at(21, "14:40:00"),
    likes: 18,
    tags: ["새내기존", "공식자료", "대학생활"],
  },
  {
    id: "community-ref-9",
    category: "community",
    subcategory: "food",
    authorId: "user-jieun",
    schoolId: "school-sookmyung",
    title: "[공식] 숙명 캠퍼스 안내 PDF에 학생식당 위치가 한 번에 정리돼 있어요",
    content:
      "숙명여대 공식 캠퍼스 안내 PDF를 보니 건물별 편의시설과 함께 미소찬 학생식당 위치가 같이 정리돼 있었습니다. 새 학기엔 식당 위치부터 익혀두면 이동 동선 잡기가 훨씬 편하더라고요.",
    createdAt: at(21, "15:10:00"),
    likes: 17,
    tags: ["맛집", "공식자료", "학생식당"],
  },
  {
    id: "community-ref-10",
    category: "community",
    subcategory: "freshman",
    authorId: "user-sejin",
    schoolId: "school-hongik",
    title: "[공식] 홍익 총학생회 소개 페이지에 신입생 OT랑 대동제 흐름이 같이 보여요",
    content:
      "홍익대 공식 총학생회 소개 페이지를 보니 연간 학생자치 일정 안에 신입생 오리엔테이션과 대동제 흐름이 같이 정리돼 있었습니다. 새내기 때는 학생회/동아리 일정 구조를 먼저 보는 게 적응에 도움 되더라고요.",
    createdAt: at(21, "15:45:00"),
    likes: 15,
    tags: ["새내기존", "공식자료", "학생회"],
  },
];

const referenceCareerPosts: SeedPost[] = [];

const stripSourceLine = (content: string) =>
  content
    .replace(/\n?출처:\s*https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const shiftIsoMinutes = (value: string, minutes: number) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};

const getSchoolNameById = (schoolId?: string | null) =>
  schools.find((school) => school.id === schoolId)?.name ?? "우리 학교";

const uniqTags = (...groups: Array<string[] | undefined>) =>
  Array.from(new Set(groups.flatMap((group) => group ?? []).filter(Boolean)));

const buildDerivedAdmissionPosts = (base: SeedPost, index: number): SeedPost[] => {
  const schoolName = getSchoolNameById(base.schoolId);
  const department = base.meta?.interestDepartment ?? "지원 학과";
  const summary = stripSourceLine(base.content);
  const baseTags = base.tags ?? [];
  const variants = [
    {
      suffix: "check",
      title: `[공식 정리] ${schoolName} 지원 전 먼저 본 체크포인트`,
      content: `${schoolName} 공식 자료를 먼저 읽어보니 ${summary}. ${department} 준비 기준으로는 전형 흐름과 학교생활 구조를 같이 파악하는 데 도움이 됐습니다. 입결만 따로 보는 것보다 공식 안내를 먼저 읽고 질문을 정리하면 지원 전략이 훨씬 선명해집니다.`,
      tags: uniqTags(baseTags, ["공식정리", "체크포인트"]),
    },
    {
      suffix: "guide",
      title: `${schoolName} 준비할 때 모집요강 말고 같이 봐야 했던 공식 안내`,
      content: `${summary}. 실제로는 설명회, 학과 소개, 신입생 안내 같은 보조 자료를 같이 봐야 학교 분위기와 학과 결이 보였습니다. ${schoolName} 지원 고민 중이면 모집요강만 열어두지 말고 공식 안내 문서까지 같이 보는 걸 추천합니다.`,
      tags: uniqTags(baseTags, ["공식자료", "지원전략"]),
    },
    {
      suffix: "memo",
      title: `${schoolName} 지원 전에 공식 자료 보고 바로 메모한 질문들`,
      content: `${schoolName} 자료를 읽다가 ${summary}. 저는 이걸 보고 전형 일정, 학과 적합성, 학교생활 지원 구조를 기준으로 질문 리스트를 따로 정리했습니다. 입시생 입장에선 공식 자료를 먼저 읽고 질문을 남기는 흐름이 생각보다 효율적이었습니다.`,
      tags: uniqTags(baseTags, ["공식자료", "질문정리"]),
    },
    {
      suffix: "fit",
      title: `${schoolName} ${department} 준비할 때 공식 자료에서 도움 됐던 포인트`,
      content: `${summary}. ${department} 기준으로는 학과 적합성과 실제 대학생활 맥락을 함께 보는 자료가 특히 유용했습니다. 지원선만 보는 대신 학교 안에서 어떤 경험을 하게 되는지 먼저 감 잡기에 괜찮은 자료였습니다.`,
      tags: uniqTags(baseTags, ["공식자료", "학과적합성"]),
    },
    {
      suffix: "timeline",
      title: `${schoolName} 지원 일정 정리할 때 공식 자료에서 먼저 체크한 것`,
      content: `${summary}. 지원 전략을 짤 때는 커뮤니티 후기보다 일정, 제출 서류, 전형별 준비 순서를 먼저 고정하는 게 훨씬 안정적이었습니다. ${schoolName}처럼 공식 안내가 잘 정리된 학교는 일정표만 따로 저장해두는 것만으로도 실수가 많이 줄었습니다.`,
      tags: uniqTags(baseTags, ["공식자료", "지원일정"]),
    },
    {
      suffix: "compare",
      title: `${schoolName} 지원 고민할 때 다른 학교와 비교해 보기 좋았던 공식 포인트`,
      content: `${summary}. 학교를 비교할 때는 커뮤니티 분위기보다 공식 자료 안에 있는 학과 소개, 학생지원, 학사 운영 구조를 같이 보는 편이 더 객관적이었습니다. 같은 계열 학과끼리 비교할 때도 공식 설명이 생각보다 판단 기준을 잘 잡아줬습니다.`,
      tags: uniqTags(baseTags, ["공식자료", "학교비교"]),
    },
    {
      suffix: "schoollife",
      title: `${schoolName} 지원 전에 학교생활 자료까지 같이 봐야 했던 이유`,
      content: `${summary}. 입시만 보면 숫자 비교에 갇히기 쉬운데, 학교생활 자료까지 함께 보면 내가 이 학교 안에서 실제로 어떤 경험을 하게 될지 감이 더 잘 잡혔습니다. ${schoolName}처럼 공식 안내가 풍부한 학교는 입시생일수록 생활 자료도 같이 읽어볼 가치가 있었습니다.`,
      tags: uniqTags(baseTags, ["공식자료", "학교생활"]),
    },
    {
      suffix: "strategy-notes",
      title: `${schoolName} 지원 전략 메모할 때 공식 자료에서 바로 옮겨 적은 부분`,
      content: `${summary}. 저는 지원 대학을 고를 때 학교별 공식 안내에서 핵심 문장을 먼저 메모해두고, 그다음 커뮤니티 후기와 비교했습니다. ${schoolName} 자료는 전형 흐름과 학교 자원을 같이 보여줘서 전략 정리용으로 쓰기 좋았습니다.`,
      tags: uniqTags(baseTags, ["공식자료", "전략메모"]),
    },
  ];

  return variants.map((variant, variantIndex) => ({
    ...base,
    id: `${base.id}-${variant.suffix}`,
    title: variant.title,
    content: variant.content,
    tags: variant.tags,
    likes: Math.max(10, (base.likes ?? 12) - 2 + variantIndex + (index % 3)),
    createdAt: shiftIsoMinutes(base.createdAt, 35 + variantIndex * 21 + index),
  }));
};

const buildDerivedFreshmanPosts = (base: SeedPost, index: number): SeedPost[] => {
  const schoolName = getSchoolNameById(base.schoolId);
  const summary = stripSourceLine(base.content);
  const baseTags = base.tags ?? [];
  const variants = [
    {
      suffix: "freshman-check",
      title: `[새내기 체크] ${schoolName} 입학 전 공지에서 먼저 챙길 것 정리`,
      content: `${summary}. 입학 직전에는 일정 자체보다 장소, 신청 순서, 안내 채널을 먼저 정리해두는 게 훨씬 덜 헷갈렸습니다. 새내기존에서는 이런 공식 자료를 먼저 저장해두고 필요한 것만 체크리스트로 바꾸는 편이 좋았습니다.`,
      tags: uniqTags(baseTags, ["새내기존", "체크리스트"]),
    },
    {
      suffix: "freshman-save",
      title: `${schoolName} 새내기라면 OT 전에 저장해둘 공식 안내`,
      content: `${schoolName} 공식 자료를 읽어보니 ${summary}. 학기 시작 직전에는 오티 공지, 수강신청 안내, 학생회 채널처럼 생활 동선에 바로 연결되는 정보를 미리 저장해두는 게 도움이 됐습니다.`,
      tags: uniqTags(baseTags, ["새내기존", "공식자료"]),
    },
    {
      suffix: "freshman-notes",
      title: `${schoolName} 첫 학기 적응할 때 도움 된 공식 자료 메모`,
      content: `${summary}. 새내기 입장에선 학교생활 적응 자료를 읽고 일정표, 장소, 문의처만 따로 메모해두는 방식이 가장 실용적이었습니다. 막상 학기가 시작되면 공지 원문을 다시 찾을 시간이 잘 안 나더라고요.`,
      tags: uniqTags(baseTags, ["새내기존", "적응팁"]),
    },
    {
      suffix: "freshman-route",
      title: `${schoolName} 입학 전 학교생활 감 잡기 좋았던 공식 공지`,
      content: `${summary}. OT나 신입생 안내 자료는 단순 일정표보다 학교 분위기와 운영 방식까지 보여줘서 입학 전 감을 잡는 데 좋았습니다. 예비입학생이면 커뮤니티 후기와 공식 자료를 같이 보는 걸 추천합니다.`,
      tags: uniqTags(baseTags, ["새내기존", "학교생활"]),
    },
    {
      suffix: "freshman-campus",
      title: `${schoolName} 입학 전에 캠퍼스 생활 감 잡기 좋았던 공식 안내`,
      content: `${summary}. 입학 전에는 시간표보다 학교 안에서 어디를 자주 쓰게 되는지, 어떤 채널로 공지가 올라오는지를 먼저 익혀두는 게 적응 속도를 높여줬습니다. 공식 안내를 기준으로 생활 동선을 먼저 그려두면 첫 주가 훨씬 편했습니다.`,
      tags: uniqTags(baseTags, ["새내기존", "캠퍼스적응"]),
    },
    {
      suffix: "freshman-community",
      title: `${schoolName} 새내기라면 오티 전에 커뮤니티랑 같이 보면 좋은 자료`,
      content: `${summary}. 커뮤니티 후기만 보면 분위기는 알 수 있지만, 실제 준비물과 일정은 결국 공식 자료가 가장 정확했습니다. 저는 새내기존 글이랑 공식 공지를 같이 보면서 질문거리를 먼저 정리해두는 방식이 제일 편했습니다.`,
      tags: uniqTags(baseTags, ["새내기존", "질문준비"]),
    },
    {
      suffix: "freshman-registration",
      title: `${schoolName} 새내기 수강신청 전에 공식 공지에서 먼저 체크한 것`,
      content: `${summary}. 예비입학생 때는 수강신청 화면보다 공지 안에 있는 신청 순서, 우선 수강, 오티 안내를 먼저 익혀두는 편이 훨씬 덜 당황스러웠습니다. 학교생활 자료를 먼저 읽고 질문을 모아두는 방식이 실전에서 가장 편했습니다.`,
      tags: uniqTags(baseTags, ["새내기존", "수강신청"]),
    },
    {
      suffix: "freshman-rhythm",
      title: `${schoolName} 입학 전 생활 리듬 잡는 데 도움 된 공식 안내`,
      content: `${summary}. 입학 전에 공지에서 학사 일정, 캠퍼스 공간, 생활 채널을 먼저 익혀두니 학기 초 리듬이 빠르게 잡혔습니다. 새내기존에서는 이런 자료를 기반으로 질문을 주고받는 게 훨씬 실용적이었습니다.`,
      tags: uniqTags(baseTags, ["새내기존", "학기준비"]),
    },
  ];

  return variants.map((variant, variantIndex) => ({
    ...base,
    id: `${base.id}-${variant.suffix}`,
    title: variant.title,
    content: variant.content,
    tags: variant.tags,
    likes: Math.max(9, (base.likes ?? 12) - 1 + variantIndex + (index % 2)),
    createdAt: shiftIsoMinutes(base.createdAt, 28 + variantIndex * 19 + index),
  }));
};

const buildDerivedCampusPosts = (base: SeedPost, index: number): SeedPost[] => {
  const schoolName = getSchoolNameById(base.schoolId);
  const summary = stripSourceLine(base.content);
  const baseTags = base.tags ?? [];
  const isClub = base.subcategory === "club";
  const variants = isClub
    ? [
        {
          suffix: "club-overview",
          title: `[공식 참고] ${schoolName} 동아리 정보 먼저 보고 들어가는 편이 좋았습니다`,
          content: `${summary}. 관심 동아리를 고를 때는 커뮤니티 후기만 보기보다 공식 소개 페이지에서 분과와 운영 규모를 먼저 보는 편이 판단이 빨랐습니다. 모집 시즌에는 특히 학교 공식 소개와 모집 글을 같이 보는 게 안전합니다.`,
          tags: uniqTags(baseTags, ["공식자료", "동아리"]),
        },
        {
          suffix: "club-save",
          title: `${schoolName} 동아리 찾을 때 공식 소개 페이지에서 먼저 본 것`,
          content: `${summary}. 중앙동아리나 학생자치 정보는 공식 소개 페이지에서 기본 구조를 먼저 보고, 그다음에 커뮤니티 모집 글로 분위기를 확인하는 흐름이 제일 편했습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "학생활동"]),
        },
        {
          suffix: "club-guide",
          title: `${schoolName} 학교생활 적응용으로 저장해둔 공식 학생활동 링크`,
          content: `${summary}. 신입생이나 복학생 입장에서는 동아리 구조와 학생회 흐름이 같이 보이는 자료를 하나 저장해두면 학교생활 적응 속도가 꽤 빨랐습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "학교생활"]),
        },
        {
          suffix: "club-pick",
          title: `${schoolName} 중앙동아리 고를 때 커뮤니티보다 먼저 봐야 했던 안내`,
          content: `${summary}. 후기 글도 도움 되지만, 동아리 수와 분과 구성을 먼저 알아야 내가 찾는 활동군이 어디에 있는지 보이더라고요. 학교 공식 페이지가 그 출발점으로 괜찮았습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "중앙동아리"]),
        },
        {
          suffix: "club-calendar",
          title: `${schoolName} 동아리 모집 시즌 전에 미리 봐두기 좋았던 공식 정보`,
          content: `${summary}. 모집 글이 올라오면 분위기만 보고 들어가기 쉬운데, 공식 학생활동 안내를 먼저 보면 어떤 단위의 동아리가 있는지, 학생자치 구조가 어떻게 돌아가는지 먼저 감이 잡혔습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "모집시즌"]),
        },
        {
          suffix: "club-return",
          title: `${schoolName} 복학생도 학생활동 정보 다시 정리할 때 도움 된 공식 페이지`,
          content: `${summary}. 복학 직후엔 최신 커뮤니티 글보다 학교가 현재 어떤 학생활동 구조를 운영하는지 공식 페이지에서 먼저 확인하는 편이 덜 헷갈렸습니다. 공백기가 있었던 학생일수록 공식 안내가 기준점이 됐습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "복학생"]),
        },
        {
          suffix: "club-channel",
          title: `${schoolName} 학생활동 채널 찾을 때 공식 페이지부터 보는 편이 편했습니다`,
          content: `${summary}. 동아리 모집 글은 시기마다 흩어져 올라오지만, 공식 학생활동 페이지를 먼저 보면 어디에서 모집 공지를 확인해야 하는지 기준이 생겼습니다. 학교생활 적응 단계에서는 이런 안내가 생각보다 큰 차이를 만들었습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "학생채널"]),
        },
        {
          suffix: "club-role",
          title: `${schoolName} 학생회나 동아리 역할 구조 볼 때 도움 된 공식 소개`,
          content: `${summary}. 동아리만 보지 말고 학생회나 자치조직 구조까지 함께 보면 학교생활의 큰 흐름이 보였습니다. 동아리를 고를 때도 이런 공식 소개가 판단 기준으로 꽤 유용했습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "자치구조"]),
        },
      ]
    : [
        {
          suffix: "food-overview",
          title: `[공식 참고] ${schoolName} 학생식당과 편의시설 먼저 익혀두면 편한 포인트`,
          content: `${summary}. 새 학기에는 맛집 글보다 먼저 학생식당, 편의점, 복사실 같은 기본 편의시설 위치를 익혀두는 게 동선 잡기에 더 실용적이었습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "캠퍼스동선"]),
        },
        {
          suffix: "food-map",
          title: `${schoolName} 새 학기 동선 잡을 때 공식 캠퍼스 안내가 유용했습니다`,
          content: `${summary}. 학교 안에서 식당과 생활 편의시설 위치를 먼저 익혀두면 첫 주에 불필요하게 헤매는 시간이 확실히 줄었습니다. 커뮤니티 후기와 공식 캠퍼스 안내를 같이 보는 쪽이 안정적이었습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "학생식당"]),
        },
        {
          suffix: "food-firstweek",
          title: `${schoolName} 첫 주에 학생식당 위치부터 외워두면 좋은 이유`,
          content: `${summary}. 수업 동선이 익숙하지 않은 첫 주에는 식당 위치와 운영 건물만 알고 있어도 생활 리듬이 훨씬 빨리 잡혔습니다. 생활권 정보는 공식 안내 기준으로 먼저 외워두는 편이 좋았습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "생활권"]),
        },
        {
          suffix: "food-notes",
          title: `${schoolName} 학교 안 편의시설 공식 안내 보고 메모한 것`,
          content: `${summary}. 카페나 외부 맛집도 좋지만, 학교 안 편의시설 위치를 공식 PDF로 먼저 확인해두면 시험기간이나 공강 때 훨씬 효율적으로 움직일 수 있었습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "편의시설"]),
        },
        {
          suffix: "food-route",
          title: `${schoolName} 점심 동선 잡을 때 공식 캠퍼스 안내가 먼저였던 이유`,
          content: `${summary}. 식당 후기만 보면 맛은 알 수 있지만, 실제론 수업 사이 이동 시간과 건물 위치가 더 중요했습니다. 공식 캠퍼스 안내를 먼저 보고 생활권을 익혀두면 공강 시간 활용이 쉬워졌습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "점심동선"]),
        },
        {
          suffix: "food-study",
          title: `${schoolName} 시험기간에 특히 도움 된 학교 안 생활 정보 정리`,
          content: `${summary}. 시험기간에는 외부 맛집보다 학교 안 식당, 복사실, 편의시설 위치를 알고 있는 게 훨씬 중요했습니다. 공식 안내를 기준으로 메모해두면 급할 때 바로 움직일 수 있었습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "시험기간"]),
        },
        {
          suffix: "food-break",
          title: `${schoolName} 공강 시간 활용할 때 공식 생활권 안내가 은근 유용했습니다`,
          content: `${summary}. 공강 때 어디서 밥 먹고 어디서 쉬는지가 정리돼 있으면 생활 만족도가 꽤 달라졌습니다. 커뮤니티 추천글과 별개로 학교 안 생활권을 먼저 아는 게 장기적으로 훨씬 편했습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "공강동선"]),
        },
        {
          suffix: "food-evening",
          title: `${schoolName} 저녁 수업 많은 학생에게 도움 된 캠퍼스 생활 메모`,
          content: `${summary}. 늦은 시간까지 학교에 남아 있는 날은 외부 맛집보다 내부 편의시설 위치를 알고 있는 게 훨씬 유용했습니다. 공식 캠퍼스 안내 기준으로 메모해두면 생활이 훨씬 안정적이었습니다.`,
          tags: uniqTags(baseTags, ["공식자료", "저녁수업"]),
        },
      ];

  return variants.map((variant, variantIndex) => ({
    ...base,
    id: `${base.id}-${variant.suffix}`,
    title: variant.title,
    content: variant.content,
    tags: variant.tags,
    likes: Math.max(8, (base.likes ?? 12) - 1 + variantIndex + (index % 2)),
    createdAt: shiftIsoMinutes(base.createdAt, 22 + variantIndex * 18 + index),
  }));
};

const generatedReferencePosts: SeedPost[] = [
  ...referenceAdmissionPosts.flatMap(buildDerivedAdmissionPosts),
  ...referenceCommunityPosts.flatMap((post, index) =>
    post.subcategory === "freshman"
      ? buildDerivedFreshmanPosts(post, index)
      : buildDerivedCampusPosts(post, index),
  ),
];

const buildSchoolCoveragePosts = (school: School, index: number): SeedPost[] => {
  const createdDay = 14 + (index % 8);
  return [
    {
      id: `coverage-${school.id}-admission`,
      category: "admission",
      authorId: "user-hs-sujin",
      schoolId: school.id,
      title: `[공식 참고] ${school.name} 입시 준비할 때 학교 홈페이지부터 저장해둔 이유`,
      content: `${school.name} 준비할 때 커뮤니티 글만 보지 않고 학교 공식 홈페이지에서 입학처, 학사, 학생지원 메뉴를 먼저 저장해두니 질문을 정리하기 훨씬 편했습니다. 학교별 공지는 결국 공식 채널이 가장 정확해서 지원 전략을 잡을 때 기준점 역할을 해줬습니다.`,
      createdAt: at(createdDay, "09:20:00"),
      likes: 11 + (index % 5),
      visibilityLevel: "school",
      tags: ["공식자료", "입학", school.name],
      meta: {
        region: "서울",
        track: "기타",
        scoreType: "공식 정보 참고",
        interestUniversity: school.name,
        interestDepartment: "지원 학과",
      },
    },
    {
      id: `coverage-${school.id}-freshman`,
      category: "community",
      subcategory: "freshman",
      authorId: "user-fresh-yerin",
      schoolId: school.id,
      title: `${school.name} 새내기라면 공식 홈페이지에서 먼저 확인해둘 것`,
      content: `${school.name} 입학 직후에는 오티 일정, 학사 공지, 수강신청 안내처럼 학교생활에 바로 연결되는 메뉴를 먼저 저장해두는 게 가장 실용적이었습니다. 새내기존에서도 공식 안내를 먼저 보고 질문을 남기는 편이 훨씬 덜 헤맸습니다.`,
      createdAt: at(createdDay, "10:40:00"),
      likes: 9 + (index % 4),
      visibilityLevel: "school",
      tags: ["새내기존", "공식자료", "학교생활"],
    },
    {
      id: `coverage-${school.id}-club`,
      category: "community",
      subcategory: "club",
      authorId: "user-dohyun",
      schoolId: school.id,
      title: `${school.name} 학생활동 정보는 공식 페이지 먼저 보는 편이 편했습니다`,
      content: `${school.name} 동아리나 학생활동을 찾을 때는 모집 글만 보기보다 학교 공식 홈페이지에서 학생지원, 학생자치, 학생활동 메뉴를 먼저 확인하는 편이 훨씬 안정적이었습니다. 어떤 활동군이 있는지 먼저 감을 잡고 커뮤니티 글을 보면 판단이 빨랐습니다.`,
      createdAt: at(createdDay, "13:10:00"),
      likes: 8 + (index % 4),
      visibilityLevel: "schoolDepartment",
      tags: ["공식자료", "동아리", "학생활동"],
    },
    {
      id: `coverage-${school.id}-food`,
      category: "community",
      subcategory: "food",
      authorId: "user-jiyoon",
      schoolId: school.id,
      title: `${school.name} 캠퍼스 생활권은 공식 안내 먼저 익혀두면 편했습니다`,
      content: `${school.name} 새 학기에는 외부 맛집보다 학교 안 식당, 편의시설, 주요 건물 위치부터 익혀두는 게 훨씬 유용했습니다. 생활권은 공식 홈페이지나 캠퍼스 안내를 기준으로 먼저 정리해두면 공강이나 시험기간 동선이 안정적이었습니다.`,
      createdAt: at(createdDay, "15:30:00"),
      likes: 10 + (index % 5),
      visibilityLevel: "schoolDepartment",
      tags: ["공식자료", "생활권", "학생식당"],
    },
    {
      id: `coverage-${school.id}-free`,
      category: "community",
      subcategory: "free",
      authorId: "user-minjae",
      schoolId: school.id,
      title: `${school.name} 학교생활 링크는 학기 초에 한 번 정리해두는 편이 좋았습니다`,
      content: `${school.name} 포털, 학사 공지, 장학, 학생지원 메뉴를 학교 홈페이지 기준으로 한 번 정리해두면 학기 중 다시 찾는 시간이 크게 줄었습니다. 커뮤니티 글을 보다가도 결국 공식 메뉴를 다시 찾게 되니 처음부터 저장해두는 편이 훨씬 편했습니다.`,
      createdAt: at(createdDay, "17:00:00"),
      likes: 12 + (index % 4),
      visibilityLevel: "school",
      tags: ["공식자료", "학교생활", "학사"],
    },
    {
      id: `coverage-${school.id}-ask`,
      category: "community",
      subcategory: "school",
      authorId: "user-chaeeun",
      schoolId: school.id,
      title: "공식 홈페이지에서 제일 먼저 보는 메뉴 다들 어디인가요?",
      content: `입학처, 학사, 학생지원, 장학 메뉴를 돌아보다 보니 학교마다 정보가 묶이는 방식이 꽤 다르더라고요. 저는 공식 홈페이지 기준으로 자주 보는 메뉴를 정리해두는 편인데, 재학생이나 예비입학생은 어떤 순서로 보는지 궁금합니다.`,
      createdAt: at(createdDay, "18:10:00"),
      likes: 9 + (index % 4),
      visibilityLevel: "school",
      tags: ["학교 게시판", "공식자료", "학교생활"],
    },
    {
      id: `coverage-${school.id}-study`,
      category: "community",
      subcategory: "free",
      authorId: "user-sohee",
      schoolId: school.id,
      title: `${school.name} 도서관과 학습지원 메뉴도 미리 저장해두면 편했습니다`,
      content: `${school.name} 시험기간이 되면 도서관 이용시간, 열람실, 학습지원 공지를 다시 찾게 되는데 공식 홈페이지 기준으로 저장해두면 급할 때 훨씬 빨리 찾을 수 있었습니다. 학교생활에서 자주 보는 메뉴는 결국 공식 사이트가 가장 정확했습니다.`,
      createdAt: at(createdDay, "20:00:00"),
      likes: 11 + (index % 4),
      visibilityLevel: "schoolDepartment",
      tags: ["공식자료", "학습지원", "도서관"],
    },
  ];
};

const baseSchoolSeedPosts = [
  ...admissionPosts,
  ...referenceAdmissionPosts,
  ...communityPosts,
  ...advicePosts,
  ...freePosts,
  ...anonymousPosts,
  ...allAskPosts,
  ...schoolBoardPosts,
  ...referenceCommunityPosts,
  ...datingPosts,
  ...careerPosts,
  ...referenceCareerPosts,
  ...generatedReferencePosts,
];

const schoolIdsWithSeedContent = new Set(
  baseSchoolSeedPosts.map((post) => post.schoolId).filter(Boolean),
);

const generatedSchoolCoveragePosts: SeedPost[] = schools.flatMap((school, index) =>
  schoolIdsWithSeedContent.has(school.id) ? [] : buildSchoolCoveragePosts(school, index),
);

let commentId = 1;
const nextCommentId = () => `comment-${commentId++}`;

const admissionComments: Comment[] = admissionPosts.slice(0, 12).flatMap((post, index) => [
  {
    id: nextCommentId(),
    postId: post.id,
    authorId: collegeReviewerIds[index % collegeReviewerIds.length],
    content: `${post.meta?.interestDepartment} 기준으로는 학생부 맥락을 한 줄로 설명할 수 있는지가 중요합니다. 건국대 기준 답변 구조를 먼저 정리해보세요.`,
    accepted: index % 3 === 0,
    createdAt: at(20 - Math.floor(index / 2), "19:10:00"),
  },
  {
    id: nextCommentId(),
    postId: post.id,
    authorId: collegeReviewerIds[(index + 2) % collegeReviewerIds.length],
    content: "수능 최저나 면접 준비 시간을 같이 계산하면 지원 조합이 훨씬 선명해집니다. 상향 / 적정 / 안정 카드로 나눠서 보시는 걸 추천해요.",
    accepted: false,
    createdAt: at(20 - Math.floor(index / 2), "20:25:00"),
  },
]);

const communityComments: Comment[] = communityPosts.slice(0, 14).map((post, index) => ({
  id: nextCommentId(),
  postId: post.id,
  authorId: collegeReviewerIds[(index + 1) % collegeReviewerIds.length],
  content:
    post.subcategory === "food"
      ? "여기 저도 자주 가요. 공강 사이에 가기 좋아서 저장해뒀습니다."
      : post.subcategory === "hot"
        ? "선 넘는 상황 정리할 때 이런 기준 공유가 제일 도움 돼요."
        : post.subcategory === "club"
        ? "관심 있는데 모집 폼이나 오픈채팅 있으면 알려주세요."
        : "일정 맞으면 같이 가고 싶어요. 너무 큰 모임 아니면 좋겠네요.",
  accepted: false,
  createdAt: at(19 - Math.floor(index / 3), "18:10:00"),
}));

const getAdviceComment = (post: SeedPost) => {
  if (post.title.includes("휴학")) {
    return "휴학계 넣기 전에 이번 학기에서 제일 버거운 지점 하나만 적어보면 결정이 훨씬 쉬워졌어요. 상담 한 번 받아보는 것도 꽤 도움 됩니다.";
  }

  if (post.title.includes("과 친구")) {
    return "예전처럼 다시 붙으려 하기보다 수업 끝나고 밥 한 번만 먼저 제안해보는 편이 덜 어색했습니다. 그 정도만 해도 분위기가 조금 풀리더라고요.";
  }

  if (post.title.includes("인턴 불합격")) {
    return "불합격 메일 본 날엔 지원서 다시 열지 말고 하루 쉬고, 다음 날 공고 하나만 다시 보는 루틴이 저는 제일 효과 있었습니다.";
  }

  if (post.title.includes("생활비")) {
    return "식비, 카페, 교통비만 먼저 주간 한도로 끊어두면 체감이 빨리 옵니다. 처음부터 전부 세분화하면 오래 못 가더라고요.";
  }

  if (post.title.includes("팀플")) {
    return "다음 학기는 팀플 비중이랑 중간 피드백 방식부터 보고 넣으니 스트레스가 훨씬 줄었습니다. 수강후기 먼저 보는 걸 추천해요.";
  }

  if (post.title.includes("취업 준비")) {
    return "직무 하나만 먼저 정하고 자소서 재료 정리부터 시작하는 게 제일 현실적이었습니다. 포트폴리오는 그다음에 붙여도 안 늦더라고요.";
  }

  return "한 번에 다 풀려고 하기보다 다음 한 단계만 정해도 숨통이 좀 트이더라고요.";
};

const adviceComments: Comment[] = advicePosts.map((post, index) => ({
  id: nextCommentId(),
  postId: post.id,
  authorId: collegeReviewerIds[(index + 2) % collegeReviewerIds.length],
  content: getAdviceComment(post),
  accepted: false,
  createdAt: at(21, `22:${10 + index * 4}:00`),
}));

const getFreeComment = (post: SeedPost) => {
  if (post.title.includes("의외였던 점")) {
    return "저도 혼자 있는 시간이 더 편해진 쪽이었어요. 학교에서 혼밥하는 부담이 생각보다 빨리 사라지더라고요.";
  }

  if (post.title.includes("플레이리스트")) {
    return "등하교용이면 너무 잔잔한 곡보다 리듬 있는 인디 쪽이 오래 듣기 좋더라고요. 전 혁오나 실리카겔 자주 듣습니다.";
  }

  if (post.title.includes("팀플 끝난 날")) {
    return "저는 무조건 바로 귀가파인데 주변은 끝나고 밥 약속 잡는 쪽이 더 많더라고요. 진짜 케바케인 것 같아요.";
  }

  if (post.title.includes("학기 목표")) {
    return "결석 0번 좋네요. 전 이번 학기 목표를 과제 안 미루기로 잡았는데 이런 글 보니까 조금 정신 듭니다.";
  }

  return "이런 가벼운 글이 오히려 자주 들어오게 되는 것 같아요.";
};

const freeComments: Comment[] = freePosts.map((post, index) => ({
  id: nextCommentId(),
  postId: post.id,
  authorId: collegeReviewerIds[(index + 1) % collegeReviewerIds.length],
  content: getFreeComment(post),
  accepted: false,
  createdAt: at(21, `22:${36 + index * 3}:00`),
}));

const getAskComment = (post: SeedPost) => {
  if (post.title.includes("공강")) {
    return "공강 2시간이면 도서관 짧게 갔다가 카페 한 군데 들르는 루틴이 제일 무난했어요. 멀리 나가면 돌아오기 애매하더라고요.";
  }

  if (post.title.includes("에어팟")) {
    return "한쪽만 중고로 구하거나 교체 비용 먼저 확인해보세요. 그냥 버티면 생각보다 오래 불편합니다.";
  }

  if (post.title.includes("전공 책")) {
    return "전공 핵심 과목만 새 책 사고 나머지는 중고부터 찾는 편입니다. 판본 차이만 확인하면 큰 문제 없었어요.";
  }

  if (post.title.includes("조별과제")) {
    return "첫 모임은 카톡으로 역할, 마감, 회의 주기까지만 정해도 대부분 괜찮았습니다. 대면은 일정 안 맞을 때만 추가했어요.";
  }

  if (post.title.includes("통학")) {
    return "전날 가방이랑 옷 미리 챙겨두고 아침엔 무조건 간단히 먹고 나갑니다. 1교시는 루틴이 제일 중요했어요.";
  }

  if (post.title.includes("학생식당")) {
    return "보통 정시 직전이나 점심 피크 지나고 가면 훨씬 수월했습니다. 인기 메뉴 있는 날은 더 일찍 가는 편이에요.";
  }

  if (post.title.includes("노트북")) {
    return "발표나 팀플 수업 있는 날만 챙기고, 나머지는 태블릿으로 버티는 사람이 생각보다 많았습니다.";
  }

  if (post.title.includes("도서관")) {
    return "시험기간엔 오전에 먼저 가는 쪽이 안전했고, 평소엔 저녁 시간대가 오히려 한산한 날도 있었습니다.";
  }

  if (post.title.includes("OT") || post.title.includes("개강 첫 주")) {
    return "막상 가보면 다들 생각보다 편하게 입고 옵니다. 너무 힘주는 것보다 단정한 쪽이 무난했어요.";
  }

  if (post.title.includes("동아리")) {
    return "한두 번 구경해보고 들어가는 게 덜 후회했습니다. 첫 학기에 바로 정착 안 해도 괜찮았어요.";
  }

  if (post.title.includes("축제")) {
    return "라인업 따라 다르지만 둘째 날이나 마지막 날이 제일 분위기 좋다는 얘기를 많이 들었습니다.";
  }

  if (post.title.includes("교양")) {
    return "저는 흥미 과목 하나, 부담 적은 과목 하나 섞는 편이었습니다. 꿀강만 넣으면 생각보다 질리더라고요.";
  }

  if (post.title.includes("알바")) {
    return "통학 길면 주중 알바는 생각보다 체력 소모가 큽니다. 첫 학기는 주말이나 짧은 고정 스케줄이 낫더라고요.";
  }

  if (post.title.includes("아이패드")) {
    return "PDF 필기 많은 수업은 확실히 편하고, 계산이나 암기 과목은 종이 노트 쓰는 사람도 여전히 많았습니다.";
  }

  if (post.title.includes("건물 사이 이동")) {
    return "연강이면 건물 위치를 꼭 보고 짜는 게 좋았습니다. 생각보다 10분 쉬는 시간에 빠듯한 조합이 있더라고요.";
  }

  return "댓글 조금만 모여도 실제로 바로 써먹을 팁이 꽤 나오더라고요.";
};

const askComments: Comment[] = allAskPosts.map((post, index) => ({
  id: nextCommentId(),
  postId: post.id,
  authorId: collegeReviewerIds[(index + 3) % collegeReviewerIds.length],
  content: getAskComment(post),
  accepted: false,
  createdAt: new Date(Date.UTC(2026, 2, 22, 10, 0, 0) + index * 31 * 60 * 1000).toISOString(),
}));

const anonymousComments: Comment[] = curatedAnonymousBoardSeed.comments.reduce<Comment[]>((acc, seed, index) => {
  const post = anonymousPosts.find((item) => item.id === seed.postId);
  if (!post) {
    return acc;
  }

  acc.push({
    id: nextCommentId(),
    postId: post.id,
    authorId: collegeReviewerIds[(index + 5) % collegeReviewerIds.length],
    content: seed.content,
    accepted: false,
    visibilityLevel: "anonymous",
    createdAt: shiftIsoMinutes(post.createdAt, 28 + index * 5),
  });

  return acc;
}, []);

const schoolBoardComments: Comment[] = schoolBoardPosts.map((post, index) => ({
  id: nextCommentId(),
  postId: post.id,
  authorId: collegeReviewerIds[(index + 1) % collegeReviewerIds.length],
  content: getAskComment(post),
  accepted: false,
  createdAt: new Date(Date.UTC(2026, 2, 22, 14, 0, 0) + index * 29 * 60 * 1000).toISOString(),
}));

const getHotComment = (post: SeedPost) => {
  if (post.title.includes("과CC")) {
    return "숨겨도 결국 팀플이나 술자리 한 번 겹치면 금방 퍼지는 편이더라고요. 같은 과면 생각보다 더 빨랐습니다.";
  }

  if (post.title.includes("애프터")) {
    return "애프터까지 갔으면 아예 관심 없는 건 아닌데, 그다음 텐션이 더 중요하더라고요. 연락 텀이 길면 기대를 조금 낮추는 편이 낫습니다.";
  }

  if (post.title.includes("스킨십")) {
    return "호감이 있어도 속도가 안 맞으면 바로 식는 사람도 많아서, 말로 먼저 분위기 확인하는 쪽이 편했습니다.";
  }

  if (post.title.includes("전애인")) {
    return "같은 생활권이면 너무 어색하게 피하는 것도 티 나서, 저는 그냥 가볍게 인사하는 쪽이 덜 피곤했습니다.";
  }

  if (post.title.includes("집 초대")) {
    return "썸 단계면 집 초대는 사람마다 해석이 달라서 조심하는 게 맞는 것 같아요. 밖에서 몇 번 더 보는 쪽이 덜 오해 생겼습니다.";
  }

  if (post.title.includes("미팅")) {
    return "따로 보자는 연락은 가능성은 있는데, 자리 텐션인지 아닌지는 일상 얘기로도 이어지는지 보면 감이 오더라고요.";
  }

  if (post.title.includes("DM")) {
    return "행사나 수업 얘기 한 줄 섞어서 보내면 생각보다 덜 부담스럽습니다. 갑자기 사적인 톤이면 상대도 경계하더라고요.";
  }

  if (post.title.includes("선 긋나요")) {
    return "편한데 애매한 관계일수록 기대치가 달라서, 서로 원하는 게 다르면 빨리 선 긋는 게 덜 피곤했습니다.";
  }

  if (post.title.includes("질투")) {
    return "티를 너무 내기보단 질문 하나 던져보는 정도가 무난했습니다. 아직 관계가 아니면 상대는 부담으로 느낄 수도 있더라고요.";
  }

  if (post.title.includes("고백")) {
    return "같은 학교면 거절당했을 때도 계속 보게 되니까, 최소한 상대 반응은 어느 정도 확인하고 하는 편이 덜 힘들었습니다.";
  }

  if (post.title.includes("술 마신 날")) {
    return "술 마셨을 때만 연락 오면 저는 일단 선 넘지 않게 거리 두는 편입니다. 평소 연락 흐름이 없으면 더더욱요.";
  }

  if (post.title.includes("여행")) {
    return "사귀기 전 여행 제안은 사람에 따라 부담도가 확 높아서, 저는 일단 당일 약속부터 더 보자는 쪽이었습니다.";
  }

  return "핫갤은 재밌어도 선 넘는 관계 얘기까지는 서로 기준이 다르니까, 결국 말로 확인하는 게 제일 덜 꼬이더라고요.";
};

const hotComments: Comment[] = allHotPosts.map((post, index) => ({
  id: nextCommentId(),
  postId: post.id,
  authorId: collegeReviewerIds[(index + 7) % collegeReviewerIds.length],
  content: getHotComment(post),
  accepted: false,
  createdAt: new Date(Date.UTC(2026, 2, 22, 18, 0, 0) + index * 17 * 60 * 1000).toISOString(),
}));

const freshmanZoneComments: Comment[] = communityPosts
  .filter((post) => post.subcategory === "freshman")
  .slice(0, 4)
  .map((post, index) => ({
    id: nextCommentId(),
    postId: post.id,
    authorId: index % 2 === 0 ? "user-fresh-joon" : "user-fresh-yerin",
    content:
      index % 2 === 0
        ? "저도 그 부분 궁금했어요. 분위기 너무 과하게 안 가도 된다는 얘기를 많이 들었습니다."
        : "입학처 일정이랑 기숙사 공지를 같이 체크하면 생각보다 덜 헷갈리더라고요.",
    accepted: false,
    createdAt: at(19 - index, "21:10:00"),
  }));

const datingComments: Comment[] = datingPosts.slice(0, 8).map((post, index) => ({
  id: nextCommentId(),
  postId: post.id,
  authorId: collegeReviewerIds[(index + 3) % collegeReviewerIds.length],
  content:
    index % 2 === 0
      ? "취향이 비슷해서 관심 있어요. 자세한 일정 맞춰보면 좋을 것 같아요."
      : "분위기 설명이 좋아 보여요. 너무 무겁지 않은 만남이면 저도 선호합니다.",
  accepted: false,
  createdAt: at(20 - Math.floor(index / 2), "22:00:00"),
}));

const curatedCareerComments: Comment[] = curatedCareerSeed.comments.reduce<Comment[]>((acc, seed, index) => {
  const post = careerPosts.find((item) => item.id === seed.postId);

  if (!post) {
    return acc;
  }

  acc.push({
    id: nextCommentId(),
    postId: post.id,
    authorId: collegeReviewerIds[(index + 4) % collegeReviewerIds.length],
    content: seed.content,
    accepted: false,
    createdAt: new Date(Date.UTC(2026, 2, 21, 3, 0, 0) + index * 19 * 60 * 1000).toISOString(),
  });

  return acc;
}, []);

const referenceComments: Comment[] = [
  {
    id: nextCommentId(),
    postId: "admission-ref-1",
    authorId: "user-junseo",
    content: "서울시립대는 입학처 행사 공지랑 모집요강 공지가 따로 올라오는 편이라 둘 다 보는 게 안전합니다.",
    accepted: false,
    createdAt: at(21, "10:05:00"),
  },
  {
    id: nextCommentId(),
    postId: "admission-ref-2",
    authorId: "user-yeji",
    content: "이화 입학처 PDF는 서류 예외 조항이 자세해서 전형 준비할 때 처음부터 같이 보는 편이 좋았어요.",
    accepted: false,
    createdAt: at(21, "11:00:00"),
  },
  {
    id: nextCommentId(),
    postId: "admission-ref-3",
    authorId: "user-dohyun",
    content: "중앙대는 입학 후 진로지원까지 한 자료에 묶여 있어서 학과 선택할 때 의외로 참고가 됩니다.",
    accepted: false,
    createdAt: at(21, "12:00:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-2",
    authorId: "user-yujin",
    content: "세종대는 새로배움터 공지에 수강신청이 같이 묶여 있어서 예비입학생 때부터 보는 편이 좋습니다.",
    accepted: false,
    createdAt: at(21, "10:20:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-4",
    authorId: "user-eunsol",
    content: "우선수강신청 안내는 학기 시작 직전 다시 확인하는 게 좋아요. 공지 PDF가 제일 정확합니다.",
    accepted: false,
    createdAt: at(21, "12:40:00"),
  },
  {
    id: nextCommentId(),
    postId: "admission-ref-5",
    authorId: "user-nari",
    content: "서울대는 전형만 보지 말고 교양 이수 규정도 같이 보는 게 좋습니다. 입학 뒤 시간표 감이 빨리 잡혀요.",
    accepted: false,
    createdAt: at(21, "14:05:00"),
  },
  {
    id: nextCommentId(),
    postId: "admission-ref-6",
    authorId: "user-jaeho",
    content: "숭실 브로슈어는 학과 소개와 취업 프로그램이 같이 정리돼 있어서 지원 학과 고를 때 꽤 도움이 됩니다.",
    accepted: false,
    createdAt: at(21, "14:45:00"),
  },
  {
    id: nextCommentId(),
    postId: "admission-ref-7",
    authorId: "user-yonji",
    content: "연세 전공안내서는 대학생활 정보가 같이 들어 있어서 학과 분위기랑 학교 경험을 같이 보기 좋습니다.",
    accepted: false,
    createdAt: at(21, "15:25:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-5",
    authorId: "user-hyobin",
    content: "OT 자료에 들어 있는 학사 일정표는 캘린더에 먼저 넣어두면 신입생 때 덜 헷갈립니다.",
    accepted: false,
    createdAt: at(21, "13:15:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-6",
    authorId: "user-danbi",
    content: "외대 OT 가이드는 안전수칙이 꽤 자세해서 과 단위 행사 보기 전에 한 번 읽어두는 편이 좋아요.",
    accepted: false,
    createdAt: at(21, "13:45:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-7",
    authorId: "user-sejin",
    content: "홍익은 중앙동아리 분과가 다양해서 공식 소개 페이지 먼저 보고 커뮤니티 후기 붙여서 보는 편이 좋습니다.",
    accepted: false,
    createdAt: at(21, "14:25:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-8",
    authorId: "user-yonji",
    content: "글로벌 프로그램과 학과 커리큘럼이 같이 정리돼 있어서 새내기 때 학교 자원을 한눈에 보기 편합니다.",
    accepted: false,
    createdAt: at(21, "15:00:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-9",
    authorId: "user-jieun",
    content: "학생식당이나 편의시설 위치를 먼저 익혀두면 첫 주 동선이 훨씬 편해집니다.",
    accepted: false,
    createdAt: at(21, "15:30:00"),
  },
  {
    id: nextCommentId(),
    postId: "community-ref-10",
    authorId: "user-sejin",
    content: "총학생회 소개 페이지에 연간 일정이 같이 보여서 대동제나 OT 흐름 잡기 좋습니다.",
    accepted: false,
    createdAt: at(21, "16:00:00"),
  },
];

const generatedReferenceComments: Comment[] = generatedReferencePosts.map((post, index) => {
  const isAdmission = post.category === "admission";
  const isCareer = post.category === "community" && post.tags?.includes("취업");
  const isFreshman = post.subcategory === "freshman";
  const isClub = post.subcategory === "club";
  const content = isAdmission
    ? "공식 자료 먼저 읽고 질문 정리하면 상담 받을 때 훨씬 빨리 핵심만 물어볼 수 있더라고요."
    : isCareer
      ? "학교 취업지원 링크는 미리 저장해두면 학기 중에 다시 찾는 시간을 꽤 줄여줍니다."
      : isFreshman
        ? "신입생 일정은 공지 원문보다 캘린더용 체크리스트로 한 번 더 정리해두는 편이 훨씬 덜 헷갈렸어요."
        : isClub
          ? "학생활동은 공식 소개 페이지 먼저 보고 커뮤니티 후기 붙여서 보면 판단이 훨씬 빨랐습니다."
          : "공식 안내 먼저 보고 커뮤니티 후기를 같이 읽는 조합이 실제로 제일 실용적이었습니다.";

  return {
    id: nextCommentId(),
    postId: post.id,
    authorId: collegeReviewerIds[index % collegeReviewerIds.length],
    content,
    accepted: false,
    createdAt: shiftIsoMinutes(post.createdAt, 42 + (index % 4) * 9),
  };
});

const generatedSchoolCoverageComments: Comment[] = generatedSchoolCoveragePosts.map((post, index) => ({
  id: `coverage-comment-${post.id}`,
  postId: post.id,
  authorId:
    post.category === "admission"
      ? "user-junseo"
      : post.subcategory === "freshman"
        ? "user-fresh-joon"
        : "user-minjae",
  content:
    post.category === "admission"
      ? "입시 준비할 때 학교 홈페이지 기본 메뉴부터 저장해두면 질문 정리 속도가 훨씬 빨라집니다."
      : post.subcategory === "freshman"
        ? "오티나 수강신청 공지는 공식 채널 기준으로 한 번 정리해두면 첫 학기가 정말 편해져요."
        : post.subcategory === "club"
          ? "학생활동은 공식 소개로 큰 구조를 먼저 보고 커뮤니티 모집 글을 보는 흐름이 제일 편했습니다."
          : "생활권 정보는 공식 안내를 기준으로 먼저 외워두면 공강 동선이 훨씬 안정적이었습니다.",
  accepted: false,
  createdAt: shiftIsoMinutes(post.createdAt, 39 + (index % 4) * 11),
}));

const generatedSchoolCoverageFollowupComments: Comment[] = generatedSchoolCoveragePosts
  .filter((post) => post.subcategory === "free" || post.subcategory === "school")
  .map((post, index) => ({
    id: `coverage-followup-comment-${post.id}`,
    postId: post.id,
    authorId: collegeReviewerIds[(index + 3) % collegeReviewerIds.length],
    content:
      post.tags?.includes("취업정보")
        ? "저도 학기 초에 학교 취업지원 메뉴부터 저장해두는 편인데, 막상 필요할 때 찾는 시간이 확실히 줄었습니다."
        : post.tags?.includes("도서관")
          ? "도서관 이용시간이나 열람실 공지는 시험기간마다 달라질 수 있어서 공식 메뉴를 저장해두는 게 제일 편했습니다."
          : post.subcategory === "school"
            ? "저는 학교 공식 홈페이지에서 입학·학사·학생지원 순으로 보는 편입니다. 학교마다 메뉴가 다르게 묶여 있어서 처음에 한 번 정리해두면 편해요."
            : "학기 초에 공식 메뉴를 한 번 정리해두면 커뮤니티 글을 읽다가도 다시 찾는 시간이 크게 줄었습니다.",
    accepted: false,
    createdAt: shiftIsoMinutes(post.createdAt, 88 + (index % 5) * 13),
  }));

export const comments: Comment[] = [
  ...admissionComments,
  ...communityComments,
  ...adviceComments,
  ...freeComments,
  ...anonymousComments,
  ...askComments,
  ...schoolBoardComments,
  ...hotComments,
  ...freshmanZoneComments,
  ...datingComments,
  ...curatedCareerComments,
  ...referenceComments,
  ...generatedReferenceComments,
  ...generatedSchoolCoverageComments,
  ...generatedSchoolCoverageFollowupComments,
];

export const posts: Post[] = [
  ...admissionPosts,
  ...referenceAdmissionPosts,
  ...communityPosts,
  ...advicePosts,
  ...freePosts,
  ...anonymousPosts,
  ...allAskPosts,
  ...allHotPosts,
  ...referenceCommunityPosts,
  ...datingPosts,
  ...careerPosts,
  ...referenceCareerPosts,
  ...generatedReferencePosts,
  ...generatedSchoolCoveragePosts,
].map((post) => ({
  ...post,
  imageUrl: undefined,
  viewCount: Math.max(32, post.likes * 12 + comments.filter((comment) => comment.postId === post.id).length * 18 + 24),
  commentCount: comments.filter((comment) => comment.postId === post.id).length,
}));

const baseTradePosts: TradePost[] = [
  {
    id: "trade-1",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-jiyoon",
    haveLectureId: "lecture-1",
    wantLectureId: "lecture-3",
    professor: "김태성",
    section: "01",
    timeRange: "수 오전",
    note: "경영데이터분석 보유, 알고리즘 자리 필요해요.",
    status: "open",
    createdAt: at(20, "07:20:00"),
  },
  {
    id: "trade-2",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-minjae",
    haveLectureId: "lecture-3",
    wantLectureId: "lecture-1",
    professor: "김서현",
    section: "01",
    timeRange: "월 오전",
    note: "알고리즘에서 경영데이터분석으로 옮기고 싶습니다.",
    status: "matching",
    createdAt: at(20, "06:45:00"),
  },
  {
    id: "trade-3",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-arin",
    haveLectureId: "lecture-5",
    wantLectureId: "lecture-6",
    professor: "정민호",
    section: "02",
    timeRange: "금 오후",
    note: "미디어브랜딩전략 보유, 영상콘텐츠기획으로 이동 원해요.",
    status: "open",
    createdAt: at(19, "17:10:00"),
  },
  {
    id: "trade-4",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-seungmin",
    haveLectureId: "lecture-6",
    wantLectureId: "lecture-5",
    professor: "윤혜진",
    section: "01",
    timeRange: "목 오전",
    note: "영상콘텐츠기획 자리 보유, 미디어브랜딩전략 교환 희망.",
    status: "matching",
    createdAt: at(19, "16:10:00"),
  },
  {
    id: "trade-5",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-somin",
    haveLectureId: "lecture-7",
    wantLectureId: "lecture-10",
    professor: "박세현",
    section: "02",
    timeRange: "금 오전",
    note: "도시와부동산시장 대신 경제통계학 필요합니다.",
    status: "open",
    createdAt: at(18, "12:30:00"),
  },
  {
    id: "trade-6",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-dohyun",
    haveLectureId: "lecture-10",
    wantLectureId: "lecture-7",
    professor: "최경석",
    section: "01",
    timeRange: "화 오전",
    note: "경제통계학 보유, 부동산시장 수업으로 바꾸고 싶어요.",
    status: "matching",
    createdAt: at(18, "11:50:00"),
  },
  {
    id: "trade-7",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-sohee",
    haveLectureId: "lecture-9",
    wantLectureId: "lecture-12",
    professor: "송하늘",
    section: "01",
    timeRange: "수 야간",
    note: "UX리서치스튜디오에서 디자인씽킹프로젝트로 교환 희망.",
    status: "open",
    createdAt: at(18, "09:40:00"),
  },
  {
    id: "trade-8",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-chaeeun",
    haveLectureId: "lecture-12",
    wantLectureId: "lecture-9",
    professor: "조아라",
    section: "01",
    timeRange: "월 오후",
    note: "디자인씽킹프로젝트 보유, UX리서치 자리 원해요.",
    status: "open",
    createdAt: at(18, "08:50:00"),
  },
  {
    id: "trade-9",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-jiyoon",
    haveLectureId: "lecture-2",
    wantLectureId: "lecture-8",
    professor: "한지수",
    section: "03",
    timeRange: "목 오후",
    note: "소비자행동론 대신 캠퍼스창업실습으로 옮기고 싶어요.",
    status: "open",
    createdAt: at(17, "16:40:00"),
  },
  {
    id: "trade-10",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-somin",
    haveLectureId: "lecture-8",
    wantLectureId: "lecture-2",
    professor: "박정우",
    section: "02",
    timeRange: "화 오후",
    note: "캠퍼스창업실습 자리 보유, 소비자행동론으로 변경 희망.",
    status: "matching",
    createdAt: at(17, "15:20:00"),
  },
  {
    id: "trade-11",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-minjae",
    haveLectureId: "lecture-4",
    wantLectureId: "lecture-11",
    professor: "김유림",
    section: "04",
    timeRange: "화 오후",
    note: "운영체제 대신 글쓰기와프레젠테이션 넣으려 합니다.",
    status: "closed",
    createdAt: at(16, "19:00:00"),
  },
  {
    id: "trade-12",
    schoolId: BASE_SCHOOL_ID,
    semester: "2026-1",
    userId: "user-arin",
    haveLectureId: "lecture-11",
    wantLectureId: "lecture-4",
    professor: "이수연",
    section: "02",
    timeRange: "수 오후",
    note: "글쓰기와프레젠테이션 자리 있고 운영체제 희망해요.",
    status: "open",
    createdAt: at(16, "18:20:00"),
  },
];

const schoolIdsWithTradeContent = new Set(baseTradePosts.map((tradePost) => tradePost.schoolId));

const generatedSchoolCoverageTradePosts: TradePost[] = schools.flatMap((school, schoolIndex) => {
  if (schoolIdsWithTradeContent.has(school.id)) {
    return [];
  }

  const schoolLectures = lectures.filter((lecture) => lecture.schoolId === school.id).slice(0, 4);
  if (schoolLectures.length < 2) {
    return [];
  }

  const [firstLecture, secondLecture, thirdLecture, fourthLecture] = schoolLectures;
  const pairA = thirdLecture ?? secondLecture;
  const pairB = fourthLecture ?? firstLecture;

  return [
    {
      id: `trade-${school.id}-1`,
      schoolId: school.id,
      semester: "2026-1",
      userId: collegeReviewerIds[schoolIndex % collegeReviewerIds.length],
      haveLectureId: firstLecture.id,
      wantLectureId: secondLecture.id,
      professor: firstLecture.professor,
      section: firstLecture.section,
      timeRange: firstLecture.dayTime,
      note: `${firstLecture.courseName} 보유 중이고 ${secondLecture.courseName} 자리로 옮기고 싶어요.`,
      status: "open",
      createdAt: at(18 - (schoolIndex % 3), "10:20:00"),
    },
    {
      id: `trade-${school.id}-2`,
      schoolId: school.id,
      semester: "2026-1",
      userId: collegeReviewerIds[(schoolIndex + 2) % collegeReviewerIds.length],
      haveLectureId: pairA.id,
      wantLectureId: pairB.id,
      professor: pairA.professor,
      section: pairA.section,
      timeRange: pairA.dayTime,
      note: `${pairA.courseName}에서 ${pairB.courseName}로 교환 희망합니다. 시간 맞는 분 찾고 있어요.`,
      status: schoolIndex % 2 === 0 ? "matching" : "open",
      createdAt: at(17 - (schoolIndex % 3), "16:10:00"),
    },
  ];
});

export const tradePosts: TradePost[] = [...baseTradePosts, ...generatedSchoolCoverageTradePosts];

export const notifications: Notification[] = [
  {
    id: "notification-1",
    userId: "user-jiyoon",
    type: "admissionAnswer",
    category: "activity",
    sourceKind: "activity",
    deliveryMode: "instant",
    title: "입시 질문에 답변이 달렸어요",
    body: "건국대 경영 논술 준비 질문에 새 답변이 도착했습니다.",
    isRead: false,
    href: "/school?tab=admission&post=admission-1",
    targetType: "post",
    targetId: "admission-1",
    createdAt: at(20, "10:10:00"),
  },
  {
    id: "notification-2",
    userId: "user-jiyoon",
    type: "tradeMatch",
    category: "activity",
    sourceKind: "activity",
    deliveryMode: "instant",
    title: "수강신청 매칭 가능 글이 생겼어요",
    body: "경영데이터분석 ↔ 알고리즘 교환 후보 1건이 새로 잡혔습니다.",
    isRead: false,
    href: "/trade?post=trade-1&chat=1",
    targetType: "trade",
    targetId: "trade-1",
    createdAt: at(20, "08:20:00"),
  },
  {
    id: "notification-3",
    userId: "user-jiyoon",
    type: "comment",
    category: "activity",
    sourceKind: "activity",
    deliveryMode: "instant",
    title: "브런치 카페 추천 글에 댓글이 달렸어요",
    body: "건대 브런치 카페 글에 새로운 댓글이 달렸습니다.",
    isRead: false,
    href: "/community?post=community-16",
    targetType: "post",
    targetId: "community-16",
    createdAt: at(20, "07:45:00"),
  },
  {
    id: "notification-4",
    userId: "user-jiyoon",
    type: "reply",
    category: "activity",
    sourceKind: "activity",
    deliveryMode: "instant",
    title: "내 댓글에 답글이 달렸어요",
    body: "새내기존 OT 글에서 내 댓글에 이어서 답이 달렸습니다.",
    isRead: true,
    readAt: at(19, "22:45:00"),
    href: "/school?tab=freshman&post=community-29",
    targetType: "comment",
    targetId: "comment-29",
    metadata: {
      postId: "community-29",
    },
    createdAt: at(19, "22:40:00"),
  },
  {
    id: "notification-5",
    userId: "user-minjae",
    type: "lectureReaction",
    category: "activity",
    sourceKind: "activity",
    deliveryMode: "instant",
    title: "강의평 반응이 늘었어요",
    body: "데이터분석입문 후기 카드에 저장과 댓글이 빠르게 늘고 있습니다.",
    isRead: false,
    href: "/lectures",
    targetType: "lecture",
    createdAt: at(19, "17:30:00"),
  },
  {
    id: "notification-6",
    userId: "user-arin",
    type: "trendingPost",
    category: "activity",
    sourceKind: "activity",
    deliveryMode: "daily",
    title: "내 글이 인기 피드에 올랐어요",
    body: "동아리 모집 글이 반응을 모으면서 커뮤니티 상단에 노출되고 있습니다.",
    isRead: true,
    readAt: at(19, "16:25:00"),
    href: "/community",
    targetType: "post",
    createdAt: at(19, "16:20:00"),
  },
  {
    id: "notification-7",
    userId: "user-sohee",
    type: "reportUpdate",
    category: "notice",
    sourceKind: "system",
    deliveryMode: "instant",
    title: "신고 처리 상태가 바뀌었어요",
    body: "연애 게시글 신고 건이 검토 완료 상태로 업데이트됐습니다.",
    isRead: true,
    readAt: at(18, "21:20:00"),
    href: "/admin",
    targetType: "report",
    createdAt: at(18, "21:15:00"),
  },
  {
    id: "notification-8",
    userId: "user-jiyoon",
    type: "verificationApproved",
    category: "notice",
    sourceKind: "system",
    deliveryMode: "instant",
    title: "학교 메일 인증이 승인됐어요",
    body: "대학생 전용 기능이 열렸습니다. 강의평과 수강신청 교환을 바로 이용해보세요.",
    isRead: true,
    readAt: at(18, "13:15:00"),
    href: "/school",
    targetType: "verification",
    metadata: { cta: "우리학교 바로가기" },
    createdAt: at(18, "13:10:00"),
  },
  {
    id: "notification-9",
    userId: "user-jiyoon",
    type: "schoolRecommendation",
    category: "notice",
    sourceKind: "recommendation",
    deliveryMode: "daily",
    title: "우리학교 인기글 추천",
    body: "우리학교에서 저장이 빠르게 늘고 있는 새내기존 글을 확인해보세요.",
    isRead: false,
    href: "/school?tab=freshman",
    targetType: "system",
    recommended: true,
    createdAt: at(18, "10:00:00"),
  },
  {
    id: "notification-10",
    userId: "user-hajin",
    type: "announcement",
    category: "notice",
    sourceKind: "system",
    deliveryMode: "daily",
    title: "운영 공지",
    body: "커뮤니티 신고 처리와 학교 메일 인증 안내가 정리되었습니다.",
    isRead: false,
    href: "/support",
    targetType: "system",
    createdAt: at(18, "13:10:00"),
  },
];

export const reports: Report[] = [
  {
    id: "report-1",
    reporterId: "user-sohee",
    targetType: "post",
    targetId: "dating-8",
    reason: "harassment",
    memo: "개인 연락처를 지나치게 빠르게 요구함",
    status: "pending",
    createdAt: at(20, "00:20:00"),
  },
  {
    id: "report-2",
    reporterId: "user-jiyoon",
    targetType: "comment",
    targetId: "comment-30",
    reason: "abuse",
    memo: "불쾌한 표현 사용",
    status: "reviewing",
    createdAt: at(19, "20:15:00"),
  },
  {
    id: "report-3",
    reporterId: "user-arin",
    targetType: "post",
    targetId: "community-14",
    reason: "spam",
    memo: "상업성 홍보 비중이 너무 큼",
    status: "dismissed",
    createdAt: at(19, "11:30:00"),
  },
  {
    id: "report-4",
    reporterId: "user-hs-minseo",
    targetType: "post",
    targetId: "admission-11",
    reason: "misinformation",
    memo: "근거 없는 정보 반복 게시",
    status: "pending",
    createdAt: at(18, "15:00:00"),
  },
  {
    id: "report-5",
    reporterId: "user-chaeeun",
    targetType: "review",
    targetId: "review-7",
    reason: "misinformation",
    memo: "실제 수강 여부가 의심되는 강의평",
    status: "reviewing",
    createdAt: at(18, "10:30:00"),
  },
  {
    id: "report-6",
    reporterId: "user-yujin",
    targetType: "user",
    targetId: "user-woojin",
    reason: "fraud",
    memo: "지속적인 외부 SNS 유도",
    status: "pending",
    createdAt: at(17, "22:10:00"),
  },
  {
    id: "report-7",
    reporterId: "user-minjae",
    targetType: "post",
    targetId: "dating-8",
    reason: "fraud",
    memo: "금전 제안이 포함된 것처럼 보여 신고합니다.",
    status: "reviewing",
    createdAt: at(20, "00:35:00"),
  },
  {
    id: "report-8",
    reporterId: "user-chaeeun",
    targetType: "post",
    targetId: "dating-8",
    reason: "harassment",
    memo: "불쾌한 접근이 반복된다는 제보를 받았습니다.",
    status: "confirmed",
    createdAt: at(20, "00:42:00"),
  },
  {
    id: "report-9",
    reporterId: "user-somin",
    targetType: "user",
    targetId: "user-woojin",
    reason: "harassment",
    memo: "타 플랫폼 이동 유도가 계속됩니다.",
    status: "reviewing",
    createdAt: at(18, "23:20:00"),
  },
  {
    id: "report-10",
    reporterId: "user-seungmin",
    targetType: "user",
    targetId: "user-woojin",
    reason: "fraud",
    memo: "거래성 접근이 의심됩니다.",
    status: "pending",
    createdAt: at(18, "23:44:00"),
  },
];

export const blocks: Block[] = [
  {
    id: "block-1",
    blockerId: "user-jiyoon",
    blockedUserId: "user-woojin",
    createdAt: at(17, "19:20:00"),
  },
  {
    id: "block-2",
    blockerId: "user-jiyoon",
    blockedUserId: "user-hs-minseo",
    createdAt: at(16, "18:10:00"),
  },
];

export const datingProfiles: DatingProfile[] = [
  {
    id: "profile-1",
    userId: "user-jiyoon",
    intro: "건대입구 브런치, 일감호 산책, 조용한 카페 좋아해요. 지나치게 빠른 연락보다 편한 대화 선호.",
    vibeTag: "차분한 대화",
    photoUrl: undefined,
    isVisible: true,
    schoolId: BASE_SCHOOL_ID,
    department: "경영학과",
    grade: 3,
  },
  {
    id: "profile-2",
    userId: "user-minjae",
    intro: "코딩 얘기도 좋지만 산책, 전시처럼 가볍게 만나는 걸 더 좋아합니다.",
    vibeTag: "센스있는 대화",
    photoUrl: undefined,
    isVisible: true,
    schoolId: BASE_SCHOOL_ID,
    department: "컴퓨터공학부",
    grade: 4,
  },
  {
    id: "profile-3",
    userId: "user-arin",
    intro: "전시, 사진, 브랜드 팝업 취향이 맞으면 금방 친해지는 편이에요.",
    vibeTag: "전시 취향",
    photoUrl: undefined,
    isVisible: true,
    schoolId: BASE_SCHOOL_ID,
    department: "미디어커뮤니케이션학과",
    grade: 2,
  },
  {
    id: "profile-4",
    userId: "user-sohee",
    intro: "브런치, 디자인 전시, 카페 투어 좋아합니다. 늦은 술자리보다 낮 약속 선호.",
    vibeTag: "브런치 무드",
    photoUrl: undefined,
    isVisible: true,
    schoolId: BASE_SCHOOL_ID,
    department: "산업디자인학과",
    grade: 4,
  },
  {
    id: "profile-5",
    userId: "user-dohyun",
    intro: "야구, 디저트, 가벼운 드라이브 좋아합니다. 연락 압박 없는 만남을 선호해요.",
    vibeTag: "유쾌한 텐션",
    photoUrl: undefined,
    isVisible: true,
    schoolId: BASE_SCHOOL_ID,
    department: "경제학과",
    grade: 2,
  },
  {
    id: "profile-6",
    userId: "user-seungmin",
    intro: "영화, 공연, 밤 산책 취향 비슷하면 좋겠어요. 너무 과한 텐션보다 안정적인 대화 선호.",
    vibeTag: "영화 데이트",
    photoUrl: undefined,
    isVisible: true,
    schoolId: BASE_SCHOOL_ID,
    department: "영상영화학과",
    grade: 4,
  },
  {
    id: "profile-7",
    userId: "user-yujin",
    intro: "타학교지만 건대 / 성수 자주 갑니다. 편한 산책이나 카페 약속 좋아해요.",
    vibeTag: "타학교 친구",
    photoUrl: undefined,
    isVisible: true,
    schoolId: "school-sejong",
    department: "호텔관광경영학과",
    grade: 3,
  },
  {
    id: "profile-8",
    userId: "user-woojin",
    intro: "전시, 팝업, 카페 취향 맞으면 좋겠습니다. 답장 템포는 느려도 대화는 길게 하는 편이에요.",
    vibeTag: "성수 동선",
    photoUrl: undefined,
    isVisible: true,
    schoolId: "school-hongik",
    department: "경영학부",
    grade: 4,
  },
];

for (const user of users) {
  user.avatarUrl = undefined;
}

for (const post of posts) {
  post.imageUrl = undefined;
}

for (const profile of datingProfiles) {
  profile.photoUrl = undefined;
}

export const mediaAssets: MediaAsset[] = [
  ...posts
    .filter((post) => post.imageUrl)
    .map((post) => ({
      id: `media-post-${post.id}`,
      ownerType: "post" as const,
      ownerId: post.id,
      mediaType: "image" as const,
      fileUrl: post.imageUrl!,
      createdAt: post.createdAt,
    })),
  ...datingProfiles
    .filter((profile) => profile.photoUrl)
    .map((profile) => ({
      id: `media-profile-${profile.id}`,
      ownerType: "profile" as const,
      ownerId: profile.id,
      mediaType: "image" as const,
      fileUrl: profile.photoUrl!,
      createdAt: at(14, "12:00:00"),
    })),
];

function getSchoolIdByUser(userId: string) {
  return users.find((user) => user.id === userId)?.schoolId ?? BASE_SCHOOL_ID;
}

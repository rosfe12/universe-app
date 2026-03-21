insert into public.schools (id, name, domain, city)
values
  ('11111111-1111-4111-8111-111111111111', '건국대학교', 'konkuk.ac.kr', '서울'),
  ('22222222-2222-4222-8222-222222222222', '중앙대학교', 'cau.ac.kr', '서울')
on conflict (id) do update
set
  name = excluded.name,
  domain = excluded.domain,
  city = excluded.city;

with seeded_auth_users as (
  select *
  from (
    values
      ('a1111111-1111-4111-8111-111111111111'::uuid, 'jiyoon@konkuk.ac.kr', '이지윤'),
      ('b2222222-2222-4222-8222-222222222222'::uuid, 'minsu@konkuk.ac.kr', '박민수'),
      ('c3333333-3333-4333-8333-333333333333'::uuid, 'seoyeon@konkuk.ac.kr', '김서연'),
      ('d4444444-4444-4444-8444-444444444444'::uuid, 'dohyun@cau.ac.kr', '정도현'),
      ('e5555555-5555-4555-8555-555555555555'::uuid, 'hayoon@example.com', '유하윤'),
      ('f6666666-6666-4666-8666-666666666666'::uuid, 'sujin.hs@example.com', '박수진'),
      ('18888888-8888-4888-8888-888888888888'::uuid, 'yerin.pre@example.com', '김예린'),
      ('19999999-9999-4999-8999-999999999999'::uuid, 'joon.pre@example.com', '박준'),
      ('77777777-7777-4777-8777-777777777777'::uuid, 'qa.verification@example.com', 'QA Verification')
  ) as t(id, email, full_name)
)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  id,
  'authenticated',
  'authenticated',
  email,
  crypt('univers123', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', full_name, 'full_name', full_name, 'email', email),
  timezone('utc', now()),
  timezone('utc', now()),
  '',
  '',
  '',
  ''
from seeded_auth_users
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

with seeded_profiles as (
  select *
  from (
    values
      (
        'a1111111-1111-4111-8111-111111111111'::uuid,
        'jiyoon@konkuk.ac.kr',
        'student'::public.user_type,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '경영학과',
        3,
        'jiyoon@konkuk.ac.kr',
        'verified'::public.student_verification_status,
        'KU_익명_21',
        82,
        true,
        'schoolDepartment'::public.visibility_level,
        '건국대 경영대 강의평과 축제 글을 자주 봅니다.'
      ),
      (
        'b2222222-2222-4222-8222-222222222222'::uuid,
        'minsu@konkuk.ac.kr',
        'student'::public.user_type,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '컴퓨터공학과',
        2,
        'minsu@konkuk.ac.kr',
        'verified'::public.student_verification_status,
        'KU_익명_54',
        74,
        true,
        'schoolDepartment'::public.visibility_level,
        '수강신청 교환과 자료구조 강의평을 자주 남깁니다.'
      ),
      (
        'c3333333-3333-4333-8333-333333333333'::uuid,
        'seoyeon@konkuk.ac.kr',
        'student'::public.user_type,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '미디어커뮤니케이션학과',
        4,
        'seoyeon@konkuk.ac.kr',
        'verified'::public.student_verification_status,
        'KU_익명_88',
        91,
        true,
        'schoolDepartment'::public.visibility_level,
        '건대입구 생활권 맛집과 동아리 글을 꾸준히 남깁니다.'
      ),
      (
        'd4444444-4444-4444-8444-444444444444'::uuid,
        'dohyun@cau.ac.kr',
        'student'::public.user_type,
        '22222222-2222-4222-8222-222222222222'::uuid,
        '심리학과',
        3,
        'dohyun@cau.ac.kr',
        'verified'::public.student_verification_status,
        'CAU_익명_32',
        67,
        true,
        'schoolDepartment'::public.visibility_level,
        '중앙대 기준 강의평과 학교 교류 글을 확인합니다.'
      ),
      (
        'e5555555-5555-4555-8555-555555555555'::uuid,
        'hayoon@example.com',
        'highschool'::public.user_type,
        '11111111-1111-4111-8111-111111111111'::uuid,
        null,
        12,
        null,
        'none'::public.student_verification_status,
        '익명_KU_7',
        45,
        false,
        'school'::public.visibility_level,
        '입시 질문 위주로 사용합니다.'
      ),
      (
        'f6666666-6666-4666-8666-666666666666'::uuid,
        'sujin.hs@example.com',
        'highschool'::public.user_type,
        '11111111-1111-4111-8111-111111111111'::uuid,
        null,
        12,
        null,
        'none'::public.student_verification_status,
        '익명_KU_11',
        39,
        false,
        'school'::public.visibility_level,
        '건국대 생활권과 학과 분위기를 함께 보고 있습니다.'
      ),
      (
        '18888888-8888-4888-8888-888888888888'::uuid,
        'yerin.pre@example.com',
        'freshman'::public.user_type,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '경영학과',
        1,
        null,
        'none'::public.student_verification_status,
        'KU_익명_31',
        53,
        false,
        'school'::public.visibility_level,
        '합격 직후 오티와 기숙사 정보를 먼저 보고 있습니다.'
      ),
      (
        '19999999-9999-4999-8999-999999999999'::uuid,
        'joon.pre@example.com',
        'freshman'::public.user_type,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '컴퓨터공학과',
        1,
        null,
        'none'::public.student_verification_status,
        'KU_익명_42',
        49,
        false,
        'school'::public.visibility_level,
        '수강신청 감과 새내기 단톡 분위기를 먼저 익히는 중입니다.'
      ),
      (
        '77777777-7777-4777-8777-777777777777'::uuid,
        'qa.verification@example.com',
        'student'::public.user_type,
        null,
        null,
        null,
        null,
        'unverified'::public.student_verification_status,
        'QA_익명_77',
        28,
        false,
        'anonymous'::public.visibility_level,
        '학교 메일 인증 브라우저 검증용 계정입니다.'
      )
  ) as t(
    id,
    email,
    user_type,
    school_id,
    department,
    grade,
    school_email,
    student_verification_status,
    nickname,
    trust_score,
    verified,
    default_visibility_level,
    bio
  )
)
insert into public.users (
  id,
  email,
  user_type,
  school_id,
  department,
  grade,
  school_email,
  student_verification_status,
  nickname,
  trust_score,
  verified,
  default_visibility_level,
  bio
)
select
  id,
  email,
  user_type,
    school_id,
    department,
    grade,
    school_email,
    student_verification_status,
    nickname,
    trust_score,
    verified,
  default_visibility_level,
  bio
from seeded_profiles
on conflict (id) do update
set
  email = excluded.email,
  user_type = excluded.user_type,
  school_id = excluded.school_id,
  department = excluded.department,
  grade = excluded.grade,
  school_email = excluded.school_email,
  student_verification_status = excluded.student_verification_status,
  nickname = excluded.nickname,
  trust_score = excluded.trust_score,
  verified = excluded.verified,
  default_visibility_level = excluded.default_visibility_level,
  bio = excluded.bio;

insert into public.user_roles (user_id, role)
values
  ('a1111111-1111-4111-8111-111111111111'::uuid, 'admin'::public.app_role)
on conflict (user_id) do update
set role = excluded.role;

with seeded_lectures as (
  select *
  from (
    values
      ('31111111-1111-4111-8111-111111111111'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '마케팅원론', '김민재', '01', '2026-1', '월 10:30-12:00', 3, '경영학과'),
      ('31111111-1111-4111-8111-111111111112'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '자료구조', '박서진', '02', '2026-1', '화 13:30-15:00', 3, '컴퓨터공학과'),
      ('31111111-1111-4111-8111-111111111113'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '브랜딩전략', '이주연', '01', '2026-1', '수 09:00-10:30', 3, '광고홍보학과'),
      ('31111111-1111-4111-8111-111111111114'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '데이터분석입문', '한지수', '03', '2026-1', '목 12:00-13:30', 3, '응용통계학과'),
      ('31111111-1111-4111-8111-111111111115'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '소비자행동론', '오지훈', '01', '2026-1', '금 09:00-10:30', 3, '경영학과'),
      ('31111111-1111-4111-8111-111111111116'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '영상편집기초', '윤태영', '02', '2026-1', '월 15:00-16:30', 3, '미디어커뮤니케이션학과'),
      ('31111111-1111-4111-8111-111111111117'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '알고리즘', '임도윤', '01', '2026-1', '화 16:30-18:00', 3, '컴퓨터공학과'),
      ('32222222-2222-4222-8222-222222222221'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, '회로이론', '최유진', '01', '2026-1', '목 10:30-12:00', 3, '전자전기공학부'),
      ('32222222-2222-4222-8222-222222222222'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, '한국근현대사', '정하늘', '03', '2026-1', '금 13:30-15:00', 3, '역사학과'),
      ('32222222-2222-4222-8222-222222222223'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, '상담심리학개론', '서은비', '01', '2026-1', '수 10:30-12:00', 3, '심리학과')
  ) as t(id, school_id, name, professor, section, semester, day_time, credits, department)
)
insert into public.lectures (
  id,
  school_id,
  name,
  professor,
  section,
  semester,
  day_time,
  credits,
  department
)
select * from seeded_lectures
on conflict (id) do update
set
  school_id = excluded.school_id,
  name = excluded.name,
  professor = excluded.professor,
  section = excluded.section,
  semester = excluded.semester,
  day_time = excluded.day_time,
  credits = excluded.credits,
  department = excluded.department;

with seeded_posts as (
  select *
  from (
    values
      ('41111111-1111-4111-8111-111111111101'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '축제 라인업 체감상 역대급 아님?', '올해 라인업 분위기 좋다는 말이 많던데 실제로는 어느 날이 제일 사람 많을지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 46, 'schoolDepartment'::public.visibility_level, '{"tags":["HOT","축제"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111102'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '새천년관 콘센트 자리 언제 비어요?', '노트북 들고 작업하려는데 점심 이후에 자리 순환이 빠른 층 있으면 알려주세요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 33, 'schoolDepartment'::public.visibility_level, '{"tags":["HOT","도서관"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111103'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '건대입구 2번 출구 저녁마다 왜 이렇게 막혀?', '학원가 끝나는 시간대랑 겹치면 지하철 입구부터 꽉 차는데 우회 동선 추천 부탁해요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 27, 'schoolDepartment'::public.visibility_level, '{"tags":["HOT","통학"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111104'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '기숙사 세탁기 눈치게임 꿀팁 있나요', '평일 밤마다 대기줄이 길어서 시간대 분산 팁이나 예약 패턴 아는 사람 있으면 공유해주세요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 24, 'schoolDepartment'::public.visibility_level, '{"tags":["HOT","기숙사"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111105'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '중앙대에서 건대 축제 놀러 가본 사람 있어?', '학교 교류 느낌으로 갈만한지, 건대입구에서 놀다 돌아오기 좋은 코스가 있으면 알려주세요.', '22222222-2222-4222-8222-222222222222'::uuid, 'global'::public.content_scope, 19, 'schoolDepartment'::public.visibility_level, '{"tags":["HOT","학교교류"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111106'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'dating'::public.post_category, 'meeting'::public.post_subcategory, '건대 경영 2:2 미팅 구해요', '주말 저녁에 건대입구 근처에서 가볍게 밥 먹고 카페 가실 팀 찾습니다. 분위기 편한 쪽 선호해요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 18, 'profile'::public.visibility_level, '{"tags":["미팅","건대입구"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111107'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'dating'::public.post_category, 'dating'::public.post_subcategory, '전시 보고 성수 카페 갈 사람', '이번 주 토요일 오후에 전시 하나 보고 성수나 건대 쪽 카페까지 가볍게 이동할 분 찾습니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 15, 'profile'::public.visibility_level, '{"tags":["연애","전시"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111108'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'dating'::public.post_category, 'meeting'::public.post_subcategory, '타학교랑 3:3 미팅 연결합니다', '건대 쪽 3명 있고 분위기 차분한 팀 원합니다. 술보다는 식사나 카페 위주면 좋겠어요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 14, 'profile'::public.visibility_level, '{"tags":["미팅","타학교"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111109'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'dating'::public.post_category, 'dating'::public.post_subcategory, '같이 러닝하고 브런치 먹을 분', '일요일 오전 아차산 가볍게 뛰고 근처 브런치 먹을 분 찾습니다. 대화 편한 분이면 좋겠어요.', '22222222-2222-4222-8222-222222222222'::uuid, 'global'::public.content_scope, 11, 'profile'::public.visibility_level, '{"tags":["연애","러닝"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111110'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'dating'::public.post_category, 'dating'::public.post_subcategory, '카페 투어 같이 할 사람', '건대입구 신상 카페 두 군데 돌고 조용히 얘기할 분 구합니다. 사진 찍는 거 좋아하면 더 좋아요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 13, 'profile'::public.visibility_level, '{"tags":["연애","카페"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111111'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission'::public.post_category, null, '건국대 경영 논술 준비는 어느 정도가 적당할까요?', '논술전형 생각 중인데 내신 3점대 초반이면 비교과보다 논술 비중이 큰 편인지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 9, 'school'::public.visibility_level, '{"region":"서울","track":"문과","scoreType":"내신 3.2","interestUniversity":"건국대학교","interestDepartment":"경영학과","tags":["문과","건국대"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111112'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission'::public.post_category, null, '건국대 컴공 학생부종합 준비 팁이 있나요?', '세특과 동아리 활동을 어떻게 연결해야 컴퓨터공학 관심도를 자연스럽게 보여줄 수 있을지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 7, 'school'::public.visibility_level, '{"region":"경기","track":"이과","scoreType":"내신 2.9","interestUniversity":"건국대학교","interestDepartment":"컴퓨터공학과","tags":["이과","건국대"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111113'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'admission'::public.post_category, null, '지방 학생 기준 건국대 기숙사 경쟁률이 어느 정도인가요?', '지방 학생이라 기숙사 수용 비율과 1학년 우선 배정 체감이 어떤지 실제 재학생 이야기를 듣고 싶습니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 5, 'school'::public.visibility_level, '{"region":"대전","track":"기타","scoreType":"학생부종합 준비중","interestUniversity":"건국대학교","interestDepartment":"자유전공","tags":["기숙사","생활권"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111114'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission'::public.post_category, null, '건국대 미컴 면접 분위기 어떤가요?', '미디어커뮤니케이션학과 면접에서 시사 이슈 질문 비중이 높은지, 포트폴리오가 필요한지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 6, 'school'::public.visibility_level, '{"region":"인천","track":"문과","scoreType":"내신 2.7","interestUniversity":"건국대학교","interestDepartment":"미디어커뮤니케이션학과","tags":["면접","미컴"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111115'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'admission'::public.post_category, null, '수의대 희망인데 건국대 생활권은 어떤가요?', '실습 일정이 많을 때 통학과 생활권이 얼마나 중요한지 듣고 싶습니다. 건대입구 주변에서 생활하는 재학생 후기가 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 4, 'school'::public.visibility_level, '{"region":"부산","track":"이과","scoreType":"수능 중심 준비","interestUniversity":"건국대학교","interestDepartment":"수의예과","tags":["수의대","생활권"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111116'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission'::public.post_category, null, '건국대 광고홍보 전과 분위기 있나요?', '입학 후 전과도 고려 중인데 광고홍보학과는 학점 컷이나 포트폴리오 요구가 있는지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 5, 'school'::public.visibility_level, '{"region":"서울","track":"문과","scoreType":"내신 3.0","interestUniversity":"건국대학교","interestDepartment":"광고홍보학과","tags":["전과","광고홍보"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111117'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'club'::public.post_subcategory, '중앙동아리 영상팀 신규 모집', '축제 영상과 학교 행사 촬영 같이 할 사람 찾습니다. 프리미어 기본만 알아도 금방 적응 가능합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 10, 'schoolDepartment'::public.visibility_level, '{"tags":["동아리","영상"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111118'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'community'::public.post_category, 'club'::public.post_subcategory, '건대 러닝크루 신입 받습니다', '주 2회 건대입구에서 러닝하고 대회도 나가는 크루입니다. 초보도 환영합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 12, 'schoolDepartment'::public.visibility_level, '{"tags":["동아리","러닝"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111119'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'meetup'::public.post_subcategory, '시험 끝나고 자양동 번개 모집', '금요일 저녁에 자양동에서 밥 먹고 간단히 이야기할 사람 4명 정도 모집합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 8, 'schoolDepartment'::public.visibility_level, '{"tags":["번개","식사"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111120'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'food'::public.post_subcategory, '건대입구 파스타집 추천합니다', '새로 생긴 파스타집이 양도 많고 학생 세트가 있어서 시험 기간 점심으로 괜찮았습니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 17, 'schoolDepartment'::public.visibility_level, '{"tags":["맛집","파스타"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111121'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'food'::public.post_subcategory, '화양동 국밥집 새벽까지 하네요', '야작 끝나고 가기 좋은 국밥집 찾았어요. 혼밥하기 편하고 가격도 무난합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 14, 'schoolDepartment'::public.visibility_level, '{"tags":["맛집","국밥"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111122'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'community'::public.post_category, 'meetup'::public.post_subcategory, '아차산 일출 번개 갈 사람', '주말 새벽에 아차산 일출 보고 건대 쪽 브런치까지 가볍게 다녀올 분들 구합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 9, 'schoolDepartment'::public.visibility_level, '{"tags":["번개","아차산"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111123'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'club'::public.post_subcategory, '축제 부스 같이 할 사람 모집', '브랜드 굿즈 판매 부스 같이 준비할 팀원 구해요. 디자인 가능하면 더 좋습니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 11, 'schoolDepartment'::public.visibility_level, '{"tags":["동아리","축제"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111124'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, 'food'::public.post_subcategory, '중앙대 후문 떡볶이집 원정 올 사람', '학교끼리 맛집 교류 느낌으로 중앙대 후문 떡볶이집 같이 가실 분 구합니다.', '22222222-2222-4222-8222-222222222222'::uuid, 'school'::public.content_scope, 6, 'schoolDepartment'::public.visibility_level, '{"tags":["맛집","학교교류"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111125'::uuid, '18888888-8888-4888-8888-888888888888'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '새내기 OT 때 다들 어느 정도 꾸미고 가나요?', '첫 만남이라 너무 힘주긴 싫은데 너무 편하게 가도 튈까 봐 고민입니다. 건대 오티 분위기 아는 예비입학생 있나요?', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 12, 'school'::public.visibility_level, '{"tags":["새내기존","OT"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111126'::uuid, '19999999-9999-4999-8999-999999999999'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '기숙사 신청 전에 꼭 알아둘 팁 있으면 공유해주세요', '합격 직후라 서류 챙기는 중인데 일정이 생각보다 촘촘하네요. 실수하기 쉬운 포인트 알려주면 도움 될 것 같아요.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 10, 'school'::public.visibility_level, '{"tags":["새내기존","기숙사"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111127'::uuid, '18888888-8888-4888-8888-888888888888'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '새내기 시간표는 공강 길게 만드는 편이 나을까요?', '아직 수강신청 감이 없어서요. 이동 시간이나 학교 적응 생각하면 어떤 패턴이 괜찮은지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 9, 'school'::public.visibility_level, '{"tags":["새내기존","시간표"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111128'::uuid, '19999999-9999-4999-8999-999999999999'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '입학 전에 단톡방에서 먼저 친해지는 분위기인가요?', '너무 빠르게 친목하는 건 조금 부담스러운데 다들 어느 정도 텐션으로 시작하는지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 8, 'school'::public.visibility_level, '{"tags":["새내기존","단톡방"]}'::jsonb)
  ) as t(id, author_id, category, subcategory, title, content, school_id, scope, like_count, visibility_level, metadata)
)
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
  visibility_level,
  metadata
)
select * from seeded_posts
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
  visibility_level = excluded.visibility_level,
  metadata = excluded.metadata;

with seeded_comments as (
  select *
  from (
    values
      ('51111111-1111-4111-8111-111111111201'::uuid, '41111111-1111-4111-8111-111111111101'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '금요일이 제일 클 것 같아요. 학생회 홍보도 금요일에 몰려 있습니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111202'::uuid, '41111111-1111-4111-8111-111111111101'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '라인업보다 동선이 더 중요해서 정문보다는 후문 쪽이 덜 붐빕니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111203'::uuid, '41111111-1111-4111-8111-111111111102'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '오후 3시쯤 수업 교체 타임 지나면 4층 자리가 꽤 비는 편입니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111204'::uuid, '41111111-1111-4111-8111-111111111106'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '여자 2명 쪽 분위기 궁금하면 쪽지 대신 댓글로 간단히 남겨주세요.', false, 'profile'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111205'::uuid, '41111111-1111-4111-8111-111111111107'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '전시 보고 성수 넘어가는 코스 괜찮네요. 오후 타임이면 맞춰볼 수 있어요.', false, 'profile'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111206'::uuid, '41111111-1111-4111-8111-111111111111'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '논술은 기출을 꾸준히 보는 게 중요했고, 경영 논술은 자료해석 연습이 꽤 도움이 됐습니다.', true, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111207'::uuid, '41111111-1111-4111-8111-111111111111'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '학생부보다 논술 최저 여부 체크를 먼저 하세요. 해마다 체감 난도가 꽤 다릅니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111208'::uuid, '41111111-1111-4111-8111-111111111112'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '컴공은 세특 연결성이 중요해서 프로젝트 하나를 길게 가져가는 게 좋았습니다.', true, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111209'::uuid, '41111111-1111-4111-8111-111111111113'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '신입생 기준으로는 기숙사 배정 체감이 괜찮은 편인데, 신청 서류는 빨리 챙기셔야 합니다.', true, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111210'::uuid, '41111111-1111-4111-8111-111111111114'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '미컴 면접은 시사 질문보다 지원 동기와 활동 연결을 더 꼼꼼히 보는 느낌이었습니다.', true, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111211'::uuid, '41111111-1111-4111-8111-111111111115'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '수의대는 실습 일정 때문에 통학보다는 학교 근처 거주가 확실히 편합니다.', true, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111212'::uuid, '41111111-1111-4111-8111-111111111116'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '광고홍보 전과는 학점 관리가 제일 중요했고 자기소개서 비슷한 자료를 준비했던 기억이 있어요.', true, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111213'::uuid, '41111111-1111-4111-8111-111111111117'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '영상팀이면 축제 시즌 직전에 많이 바빠지나요? 촬영 경험은 적지만 배우고 싶습니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111214'::uuid, '41111111-1111-4111-8111-111111111118'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '입문 러닝도 가능한지 궁금합니다. 페이스 느린 편인데 같이 뛸 수 있으면 좋겠어요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111215'::uuid, '41111111-1111-4111-8111-111111111119'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '자양동이면 늦게까지 여는 식당 많아서 모임하기 좋습니다. 참여 원해요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111216'::uuid, '41111111-1111-4111-8111-111111111120'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '학생 세트 가격 괜찮으면 팀플 점심 장소로도 좋겠네요. 위치 공유 부탁해요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111217'::uuid, '41111111-1111-4111-8111-111111111121'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '국밥집이면 시험기간 새벽에 진짜 유용합니다. 다음에 같이 가요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111218'::uuid, '41111111-1111-4111-8111-111111111122'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '일출 코스 난이도 높지 않으면 참여하고 싶어요. 모이는 시간 알려주세요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111219'::uuid, '41111111-1111-4111-8111-111111111123'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '디자인 툴은 피그마 정도 다룰 수 있는데 축제 굿즈 기획 같이 해보고 싶습니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111220'::uuid, '41111111-1111-4111-8111-111111111124'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '중앙대 후문 떡볶이집 궁금했는데 주말이면 시간 맞출 수 있어요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111221'::uuid, '41111111-1111-4111-8111-111111111125'::uuid, '19999999-9999-4999-8999-999999999999'::uuid, '저도 너무 꾸민 느낌은 부담이라 깔끔한 캐주얼 정도로 생각 중이에요.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111222'::uuid, '41111111-1111-4111-8111-111111111126'::uuid, '18888888-8888-4888-8888-888888888888'::uuid, '기숙사 일정은 입학처 공지랑 같이 보면 덜 헷갈리더라고요. 신청 마감만 특히 조심하세요.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111223'::uuid, '41111111-1111-4111-8111-111111111127'::uuid, '19999999-9999-4999-8999-999999999999'::uuid, '처음 학기는 공강 너무 길기보다 이동 동선 편한 쪽이 적응하기 쉬운 것 같아요.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111224'::uuid, '41111111-1111-4111-8111-111111111128'::uuid, '18888888-8888-4888-8888-888888888888'::uuid, '단톡은 먼저 보는 편인데 너무 빠르게 친목 강요하는 분위기는 아니라고 들었습니다.', false, 'school'::public.visibility_level)
  ) as t(id, post_id, author_id, content, accepted, visibility_level)
)
insert into public.comments (
  id,
  post_id,
  author_id,
  content,
  accepted,
  visibility_level
)
select * from seeded_comments
on conflict (id) do update
set
  post_id = excluded.post_id,
  author_id = excluded.author_id,
  content = excluded.content,
  accepted = excluded.accepted,
  visibility_level = excluded.visibility_level;

with seeded_reviews as (
  select *
  from (
    values
      ('61111111-1111-4111-8111-111111111301'::uuid, '31111111-1111-4111-8111-111111111111'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'easy'::public.difficulty_level, 'light'::public.workload_level, 'flexible'::public.attendance_level, 'multipleChoice'::public.exam_style_type, false, false, 'generous'::public.grading_style_type, 5, '요약이 깔끔한 마케팅 입문 강의', '교수님 설명이 체계적이고 시험 범위를 명확하게 짚어줘서 입문 강의로 부담이 적었습니다. 발표도 선택형이라 수월했습니다.', '2026-1', 14, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111302'::uuid, '31111111-1111-4111-8111-111111111111'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'medium'::public.difficulty_level, 'medium'::public.workload_level, 'medium'::public.attendance_level, 'mixed'::public.exam_style_type, true, true, 'medium'::public.grading_style_type, 4, '팀플만 잘 넘기면 무난합니다', '중간은 객관식 비중이 높고 기말은 사례형 문항이 조금 섞였습니다. 팀플 비중이 있지만 피드백이 디테일해서 얻어가는 게 많았습니다.', '2025-2', 9, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111303'::uuid, '31111111-1111-4111-8111-111111111112'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'hard'::public.difficulty_level, 'medium'::public.workload_level, 'strict'::public.attendance_level, 'essay'::public.exam_style_type, false, false, 'tough'::public.grading_style_type, 3, '자료구조 개념을 빡세게 잡아줍니다', '코드 구현보다 개념 설명을 깊게 물어보는 서술형 비중이 높았습니다. 출결 체크가 꼼꼼해서 결석 관리가 중요합니다.', '2026-1', 11, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111304'::uuid, '31111111-1111-4111-8111-111111111112'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'medium'::public.difficulty_level, 'heavy'::public.workload_level, 'medium'::public.attendance_level, 'project'::public.exam_style_type, true, false, 'medium'::public.grading_style_type, 3, '프로젝트 비중이 큰 편입니다', '후반부로 갈수록 프로젝트 요구사항이 늘어나서 시간 투자가 필요했습니다. 그래도 수업 자료는 정리돼 있어 복습은 편했습니다.', '2025-2', 7, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111305'::uuid, '31111111-1111-4111-8111-111111111113'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'easy'::public.difficulty_level, 'light'::public.workload_level, 'flexible'::public.attendance_level, 'project'::public.exam_style_type, true, true, 'generous'::public.grading_style_type, 5, '실무 감각 살리기 좋은 강의', '브랜딩 사례를 많이 보여주고 과제도 재미있는 편이라 광고홍보 쪽 학생들이 만족도가 높았습니다. 발표 부담은 있지만 분위기가 좋습니다.', '2026-1', 13, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111306'::uuid, '31111111-1111-4111-8111-111111111113'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'medium'::public.difficulty_level, 'medium'::public.workload_level, 'medium'::public.attendance_level, 'mixed'::public.exam_style_type, true, true, 'medium'::public.grading_style_type, 4, '디자인 감각보다 논리 정리가 중요', '브랜딩 리서치 자료를 많이 읽어야 해서 생각보다 공부량은 있습니다. 그래도 교수님 피드백이 세밀해서 포트폴리오에 도움 됐습니다.', '2025-2', 8, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111307'::uuid, '31111111-1111-4111-8111-111111111114'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'easy'::public.difficulty_level, 'light'::public.workload_level, 'flexible'::public.attendance_level, 'multipleChoice'::public.exam_style_type, false, false, 'generous'::public.grading_style_type, 5, '비전공도 따라가기 쉬운 데이터 강의', '통계 프로그램 사용법을 하나씩 안내해줘서 비전공도 무난했습니다. 퀴즈가 자주 있지만 점수에 크게 부담되지는 않았습니다.', '2026-1', 10, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111308'::uuid, '31111111-1111-4111-8111-111111111114'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'medium'::public.difficulty_level, 'medium'::public.workload_level, 'medium'::public.attendance_level, 'project'::public.exam_style_type, true, false, 'medium'::public.grading_style_type, 4, '실습 비중이 높아 실전에 도움 됩니다', '엑셀과 파이썬 실습을 번갈아 진행해서 복습은 필요하지만 실무감이 있습니다. 과제량은 적당한 편이었습니다.', '2025-2', 6, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111309'::uuid, '31111111-1111-4111-8111-111111111115'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'medium'::public.difficulty_level, 'medium'::public.workload_level, 'medium'::public.attendance_level, 'essay'::public.exam_style_type, false, false, 'medium'::public.grading_style_type, 4, '케이스 읽는 재미가 있습니다', '토론형 수업이라 예습을 하면 훨씬 수월합니다. 시험은 서술형이지만 수업에서 강조한 포인트 위주로 나오는 편입니다.', '2026-1', 9, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111310'::uuid, '31111111-1111-4111-8111-111111111115'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'easy'::public.difficulty_level, 'light'::public.workload_level, 'flexible'::public.attendance_level, 'mixed'::public.exam_style_type, false, false, 'generous'::public.grading_style_type, 5, '부담 없이 듣기 좋은 소비자 수업', '예시가 생활밀착형이라 재미있고 시험도 수업 슬라이드 중심으로 나옵니다. 학점도 후한 편이라 추천합니다.', '2025-2', 12, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111311'::uuid, '31111111-1111-4111-8111-111111111116'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'easy'::public.difficulty_level, 'medium'::public.workload_level, 'flexible'::public.attendance_level, 'project'::public.exam_style_type, true, true, 'generous'::public.grading_style_type, 5, '실습 위주라 결과물이 남습니다', '영상 편집툴을 처음 써도 따라갈 수 있게 수업이 짜여 있습니다. 과제는 있지만 완성물이 남아서 만족도가 높았습니다.', '2026-1', 15, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111312'::uuid, '31111111-1111-4111-8111-111111111116'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'medium'::public.difficulty_level, 'heavy'::public.workload_level, 'medium'::public.attendance_level, 'project'::public.exam_style_type, true, true, 'medium'::public.grading_style_type, 4, '장비 대여 일정만 잘 챙기면 됩니다', '개인 촬영 과제와 팀 프로젝트가 겹치는 주가 조금 빡셉니다. 그래도 조교 피드백이 빨라서 작업 흐름은 좋았습니다.', '2025-2', 7, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111313'::uuid, '31111111-1111-4111-8111-111111111117'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'hard'::public.difficulty_level, 'heavy'::public.workload_level, 'strict'::public.attendance_level, 'essay'::public.exam_style_type, false, false, 'tough'::public.grading_style_type, 2, '기본기 없으면 꽤 힘듭니다', '문제 풀이 속도가 빠르고 구현 과제 난도가 높아 꾸준히 따라가야 합니다. 대신 알고리즘 실력은 확실히 늘었습니다.', '2026-1', 16, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111314'::uuid, '31111111-1111-4111-8111-111111111117'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'medium'::public.difficulty_level, 'medium'::public.workload_level, 'medium'::public.attendance_level, 'mixed'::public.exam_style_type, false, false, 'medium'::public.grading_style_type, 3, '개념 설명은 깔끔하지만 복습 필수', '정리 자료는 좋지만 시험 전에는 문제를 충분히 풀어봐야 합니다. 실습보다는 필기 중심으로 준비하는 느낌입니다.', '2025-2', 8, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111315'::uuid, '32222222-2222-4222-8222-222222222221'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'hard'::public.difficulty_level, 'medium'::public.workload_level, 'strict'::public.attendance_level, 'essay'::public.exam_style_type, false, false, 'tough'::public.grading_style_type, 2, '회로 해석 연습량이 많아야 합니다', '공식 암기보다 회로를 직접 그리며 풀어내는 연습이 중요합니다. 출결과 과제 점수 반영이 꽤 큰 편입니다.', '2026-1', 9, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111316'::uuid, '32222222-2222-4222-8222-222222222221'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'hard'::public.difficulty_level, 'heavy'::public.workload_level, 'strict'::public.attendance_level, 'mixed'::public.exam_style_type, true, false, 'medium'::public.grading_style_type, 2, '비전공 청강은 추천하지 않습니다', '문제 난도가 높고 과제도 꾸준히 나옵니다. 이해는 되지만 시간을 많이 써야 해서 학기 계획이 중요합니다.', '2025-2', 4, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111317'::uuid, '32222222-2222-4222-8222-222222222222'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'easy'::public.difficulty_level, 'light'::public.workload_level, 'flexible'::public.attendance_level, 'essay'::public.exam_style_type, false, true, 'generous'::public.grading_style_type, 5, '역사 흐름 정리가 아주 잘 됩니다', '읽기 자료가 많지 않고 교수님 이야기가 재미있어서 집중이 잘 됩니다. 발표 한 번만 넘기면 전체적으로 여유롭습니다.', '2026-1', 10, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111318'::uuid, '32222222-2222-4222-8222-222222222222'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'easy'::public.difficulty_level, 'light'::public.workload_level, 'flexible'::public.attendance_level, 'multipleChoice'::public.exam_style_type, false, false, 'generous'::public.grading_style_type, 4, '청강으로 들어도 부담 없는 교양', '수업이 친절해서 인문 교양으로 듣기 좋습니다. 시험도 수업 필기 중심이라 준비하기 편한 편입니다.', '2025-2', 5, 'school'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111319'::uuid, '32222222-2222-4222-8222-222222222223'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'medium'::public.difficulty_level, 'medium'::public.workload_level, 'medium'::public.attendance_level, 'essay'::public.exam_style_type, false, true, 'medium'::public.grading_style_type, 4, '상담 사례 토론이 많습니다', '심리학 기본 개념을 사례와 연결해서 설명해줘서 이해가 잘 됩니다. 발표는 있지만 토론 분위기가 부드럽습니다.', '2026-1', 9, 'schoolDepartment'::public.visibility_level),
      ('61111111-1111-4111-8111-111111111320'::uuid, '32222222-2222-4222-8222-222222222223'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'easy'::public.difficulty_level, 'light'::public.workload_level, 'flexible'::public.attendance_level, 'mixed'::public.exam_style_type, false, false, 'generous'::public.grading_style_type, 4, '비전공도 흥미롭게 들을 수 있습니다', '상담 사례를 일상과 연결해 설명해서 이해가 쉬웠습니다. 중간 이후에도 페이스가 일정해 학기 운영이 편했습니다.', '2025-2', 6, 'schoolDepartment'::public.visibility_level)
  ) as t(
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
    visibility_level
  )
)
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
  visibility_level
)
select * from seeded_reviews
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
  visibility_level = excluded.visibility_level;

with seeded_trade_posts as (
  select *
  from (
    values
      ('71111111-1111-4111-8111-111111111401'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111117'::uuid, '마케팅원론 자리 있고 알고리즘 원하는 분 찾습니다.', 'open'::public.trade_post_status, '2026-1', '임도윤', '01', '월 10:30-12:00', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111402'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111112'::uuid, '31111111-1111-4111-8111-111111111115'::uuid, '자료구조 A반 자리 있고 소비자행동론 교환 희망합니다.', 'matched'::public.trade_post_status, '2026-1', '오지훈', '01', '화 13:30-15:00', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111403'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111116'::uuid, '31111111-1111-4111-8111-111111111113'::uuid, '영상편집기초 있는데 브랜딩전략으로 교환 가능하면 좋겠습니다.', 'open'::public.trade_post_status, '2026-1', '이주연', '01', '월 15:00-16:30', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111404'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111114'::uuid, '31111111-1111-4111-8111-111111111112'::uuid, '데이터분석입문 보유, 자료구조 원하는 분이면 확인 빠르게 합니다.', 'open'::public.trade_post_status, '2026-1', '박서진', '02', '목 12:00-13:30', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111405'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111117'::uuid, '31111111-1111-4111-8111-111111111114'::uuid, '알고리즘 있고 데이터분석입문 원하는 분 구해요. 시간대 맞으면 바로 조율 가능합니다.', 'open'::public.trade_post_status, '2026-1', '한지수', '03', '화 16:30-18:00', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111406'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111113'::uuid, '31111111-1111-4111-8111-111111111116'::uuid, '브랜딩전략 분반 교환 원합니다. 발표 일정 때문에 시간만 바꾸고 싶어요.', 'closed'::public.trade_post_status, '2026-1', '윤태영', '02', '수 09:00-10:30', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111407'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111115'::uuid, '31111111-1111-4111-8111-111111111111'::uuid, '소비자행동론 자리 있고 마케팅원론 찾습니다. 공강 맞는 분이면 좋아요.', 'open'::public.trade_post_status, '2026-1', '김민재', '01', '금 09:00-10:30', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111408'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111111'::uuid, '31111111-1111-4111-8111-111111111114'::uuid, '마케팅원론 01 있고 데이터분석입문 03 찾습니다. 시간 겹치지만 않으면 좋겠어요.', 'matched'::public.trade_post_status, '2026-1', '한지수', '03', '월 10:30-12:00', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111409'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, '32222222-2222-4222-8222-222222222221'::uuid, '32222222-2222-4222-8222-222222222223'::uuid, '회로이론 자리 있고 상담심리학개론으로 바꾸고 싶습니다.', 'open'::public.trade_post_status, '2026-1', '서은비', '01', '목 10:30-12:00', 'school'::public.visibility_level),
      ('71111111-1111-4111-8111-111111111410'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, '32222222-2222-4222-8222-222222222222'::uuid, '32222222-2222-4222-8222-222222222221'::uuid, '한국근현대사 분반 변경 원합니다. 회로이론 들어야 졸업요건 맞아서 급하게 찾고 있습니다.', 'open'::public.trade_post_status, '2026-1', '최유진', '01', '금 13:30-15:00', 'school'::public.visibility_level)
  ) as t(id, author_id, school_id, have_lecture_id, want_lecture_id, note, status, semester, professor, section, time_range, visibility_level)
)
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
  visibility_level
)
select * from seeded_trade_posts
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
  visibility_level = excluded.visibility_level;

with seeded_notifications as (
  select *
  from (
    values
      ('81111111-1111-4111-8111-111111111501'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'comment'::public.notification_type, '새 댓글이 달렸습니다', '축제 라인업 글에 새 댓글이 달렸습니다.', false),
      ('81111111-1111-4111-8111-111111111502'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'answer'::public.notification_type, '답변이 채택되었습니다', '입시 질문 답변이 질문자에게 채택되었습니다.', false),
      ('81111111-1111-4111-8111-111111111503'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'trade'::public.notification_type, '매칭 후보가 생겼습니다', '자료구조 교환 글과 맞는 후보가 1건 있습니다.', false),
      ('81111111-1111-4111-8111-111111111504'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'comment'::public.notification_type, '커뮤니티 글에 반응이 늘었습니다', '맛집 추천 글의 댓글이 빠르게 늘고 있습니다.', true),
      ('81111111-1111-4111-8111-111111111505'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'trade'::public.notification_type, '수강신청 교환 문의', '마케팅원론 교환 글을 확인한 사용자가 있습니다.', true),
      ('81111111-1111-4111-8111-111111111506'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'answer'::public.notification_type, '입시 질문에 답변이 달렸습니다', '건국대 경영 논술 준비 질문에 대학생 답변이 달렸습니다.', false),
      ('81111111-1111-4111-8111-111111111507'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'answer'::public.notification_type, '입시 질문에 답변이 도착했습니다', '기숙사 경쟁률 질문에 실제 재학생 답변이 달렸습니다.', false),
      ('81111111-1111-4111-8111-111111111508'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'trade'::public.notification_type, '교환 글 조회가 늘었습니다', '회로이론 교환 글 조회가 빠르게 늘고 있습니다.', true)
  ) as t(id, user_id, type, title, body, is_read)
)
insert into public.notifications (
  id,
  user_id,
  type,
  title,
  body,
  is_read
)
select * from seeded_notifications
on conflict (id) do update
set
  user_id = excluded.user_id,
  type = excluded.type,
  title = excluded.title,
  body = excluded.body,
  is_read = excluded.is_read;

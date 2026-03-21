insert into public.schools (id, name, domain, city)
values
  ('11111111-1111-4111-8111-111111111111', '건국대학교', 'konkuk.ac.kr', '서울'),
  ('22222222-2222-4222-8222-222222222222', '중앙대학교', 'cau.ac.kr', '서울'),
  ('33333333-3333-4333-8333-333333333333', '경희대학교', 'khu.ac.kr', '서울'),
  ('44444444-4444-4444-8444-444444444444', '고려대학교', 'korea.ac.kr', '서울'),
  ('55555555-5555-4555-8555-555555555555', '광운대학교', 'kw.ac.kr', '서울'),
  ('66666666-6666-4666-8666-666666666666', '국민대학교', 'kookmin.ac.kr', '서울'),
  ('77777777-7777-4777-8777-777777777771', '덕성여자대학교', 'duksung.ac.kr', '서울'),
  ('88888888-8888-4888-8888-888888888881', '동국대학교', 'dongguk.edu', '서울'),
  ('99999999-9999-4999-8999-999999999991', '동덕여자대학교', 'dongduk.ac.kr', '서울'),
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '명지대학교', 'mju.ac.kr', '서울'),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '삼육대학교', 'syu.ac.kr', '서울'),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '상명대학교', 'smu.ac.kr', '서울'),
  ('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '서강대학교', 'sogang.ac.kr', '서울'),
  ('aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '서경대학교', 'skuniv.ac.kr', '서울'),
  ('aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6', '서울과학기술대학교', 'seoultech.ac.kr', '서울'),
  ('aaaaaaa7-aaaa-4aaa-8aaa-aaaaaaaaaaa7', '서울교육대학교', 'snue.ac.kr', '서울'),
  ('aaaaaaa8-aaaa-4aaa-8aaa-aaaaaaaaaaa8', '서울대학교', 'snu.ac.kr', '서울'),
  ('aaaaaaa9-aaaa-4aaa-8aaa-aaaaaaaaaaa9', '서울시립대학교', 'uos.ac.kr', '서울'),
  ('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '서울여자대학교', 'swu.ac.kr', '서울'),
  ('bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '성균관대학교', 'skku.edu', '서울'),
  ('bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '성신여자대학교', 'sungshin.ac.kr', '서울'),
  ('bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '세종대학교', 'sejong.ac.kr', '서울'),
  ('bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5', '숙명여자대학교', 'sookmyung.ac.kr', '서울'),
  ('bbbbbbb6-bbbb-4bbb-8bbb-bbbbbbbbbbb6', '숭실대학교', 'ssu.ac.kr', '서울'),
  ('bbbbbbb7-bbbb-4bbb-8bbb-bbbbbbbbbbb7', '연세대학교', 'yonsei.ac.kr', '서울'),
  ('bbbbbbb8-bbbb-4bbb-8bbb-bbbbbbbbbbb8', '이화여자대학교', 'ewha.ac.kr', '서울'),
  ('bbbbbbb9-bbbb-4bbb-8bbb-bbbbbbbbbbb9', '한국외국어대학교', 'hufs.ac.kr', '서울'),
  ('ccccccc1-cccc-4ccc-8ccc-ccccccccccc1', '한성대학교', 'hansung.ac.kr', '서울'),
  ('ccccccc2-cccc-4ccc-8ccc-ccccccccccc2', '한양대학교', 'hanyang.ac.kr', '서울'),
  ('ccccccc3-cccc-4ccc-8ccc-ccccccccccc3', '홍익대학교', 'hongik.ac.kr', '서울'),
  ('ccccccc4-cccc-4ccc-8ccc-ccccccccccc4', '한국예술종합학교', 'karts.ac.kr', '서울'),
  ('ccccccc5-cccc-4ccc-8ccc-ccccccccccc5', '한국체육대학교', 'knsu.ac.kr', '서울'),
  ('ccccccc6-cccc-4ccc-8ccc-ccccccccccc6', '총신대학교', 'csu.ac.kr', '서울'),
  ('ccccccc7-cccc-4ccc-8ccc-ccccccccccc7', '추계예술대학교', 'chu.ac.kr', '서울'),
  ('ccccccc8-cccc-4ccc-8ccc-ccccccccccc8', '한국성서대학교', 'bible.ac.kr', '서울'),
  ('ccccccc9-cccc-4ccc-8ccc-ccccccccccc9', 'KC대학교', 'kc.ac.kr', '서울')
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
      ('77777777-7777-4777-8777-777777777777'::uuid, 'qa.verification@example.com', 'QA Verification'),
      ('2a111111-1111-4111-8111-111111111111'::uuid, 'yeji@ewha.ac.kr', '서예지'),
      ('2b222222-2222-4222-8222-222222222222'::uuid, 'junseo@uos.ac.kr', '박준서'),
      ('2c333333-3333-4333-8333-333333333333'::uuid, 'eunsol@hanyang.ac.kr', '최은솔'),
      ('2d444444-4444-4444-8444-444444444444'::uuid, 'taemin@skku.edu', '김태민'),
      ('2e111111-1111-4111-8111-111111111111'::uuid, 'nari@snu.ac.kr', '강나리'),
      ('2f222222-2222-4222-8222-222222222222'::uuid, 'hyobin@korea.ac.kr', '정효빈'),
      ('3a333333-3333-4333-8333-333333333333'::uuid, 'yonji@yonsei.ac.kr', '이연지'),
      ('3b444444-4444-4444-8444-444444444444'::uuid, 'danbi@hufs.ac.kr', '윤단비'),
      ('3c555555-5555-4555-8555-555555555555'::uuid, 'jieun@sookmyung.ac.kr', '손지은'),
      ('3d666666-6666-4666-8666-666666666666'::uuid, 'jaeho@ssu.ac.kr', '한재호'),
      ('3e777777-7777-4777-8777-777777777777'::uuid, 'yubin@seoultech.ac.kr', '오유빈'),
      ('3f888888-8888-4888-8888-888888888888'::uuid, 'sejin@hongik.ac.kr', '김세진')
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
      ),
      (
        '2a111111-1111-4111-8111-111111111111'::uuid,
        'yeji@ewha.ac.kr',
        'student'::public.user_type,
        'bbbbbbb8-bbbb-4bbb-8bbb-bbbbbbbbbbb8'::uuid,
        '경영학과',
        2,
        'yeji@ewha.ac.kr',
        'verified'::public.student_verification_status,
        'EWHA_익명_12',
        71,
        true,
        'schoolDepartment'::public.visibility_level,
        '이화 공지와 진로 프로그램 요약을 자주 올립니다.'
      ),
      (
        '2b222222-2222-4222-8222-222222222222'::uuid,
        'junseo@uos.ac.kr',
        'student'::public.user_type,
        'aaaaaaa9-aaaa-4aaa-8aaa-aaaaaaaaaaa9'::uuid,
        '행정학과',
        3,
        'junseo@uos.ac.kr',
        'verified'::public.student_verification_status,
        'UOS_익명_18',
        68,
        true,
        'schoolDepartment'::public.visibility_level,
        '서울시립대 학사와 입학 공지를 정리해서 봅니다.'
      ),
      (
        '2c333333-3333-4333-8333-333333333333'::uuid,
        'eunsol@hanyang.ac.kr',
        'student'::public.user_type,
        'ccccccc2-cccc-4ccc-8ccc-ccccccccccc2'::uuid,
        '산업공학과',
        3,
        'eunsol@hanyang.ac.kr',
        'verified'::public.student_verification_status,
        'HYU_익명_27',
        73,
        true,
        'schoolDepartment'::public.visibility_level,
        '한양대 실무형 프로그램과 공식 공지를 자주 확인합니다.'
      ),
      (
        '2d444444-4444-4444-8444-444444444444'::uuid,
        'taemin@skku.edu',
        'student'::public.user_type,
        'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
        '글로벌경영학과',
        4,
        'taemin@skku.edu',
        'verified'::public.student_verification_status,
        'SKKU_익명_44',
        75,
        true,
        'schoolDepartment'::public.visibility_level,
        '성균관대 채용과 조교 공지 요약을 자주 남깁니다.'
      ),
      (
        '2e111111-1111-4111-8111-111111111111'::uuid,
        'nari@snu.ac.kr',
        'student'::public.user_type,
        'aaaaaaa8-aaaa-4aaa-8aaa-aaaaaaaaaaa8'::uuid,
        '경제학부',
        2,
        'nari@snu.ac.kr',
        'verified'::public.student_verification_status,
        'SNU_익명_09',
        74,
        true,
        'schoolDepartment'::public.visibility_level,
        '서울대 교과과정과 신입생 이수 규정을 자주 정리합니다.'
      ),
      (
        '2f222222-2222-4222-8222-222222222222'::uuid,
        'hyobin@korea.ac.kr',
        'student'::public.user_type,
        '44444444-4444-4444-8444-444444444444'::uuid,
        '미디어학부',
        2,
        'hyobin@korea.ac.kr',
        'verified'::public.student_verification_status,
        'KOREA_익명_08',
        72,
        true,
        'schoolDepartment'::public.visibility_level,
        '고려대 OT와 학교 적응 공지를 요약해서 보는 편입니다.'
      ),
      (
        '3a333333-3333-4333-8333-333333333333'::uuid,
        'yonji@yonsei.ac.kr',
        'student'::public.user_type,
        'bbbbbbb7-bbbb-4bbb-8bbb-bbbbbbbbbbb7'::uuid,
        '교육학과',
        3,
        'yonji@yonsei.ac.kr',
        'verified'::public.student_verification_status,
        'YS_익명_16',
        73,
        true,
        'schoolDepartment'::public.visibility_level,
        '연세 전공안내서와 대학생활 자료를 주기적으로 확인합니다.'
      ),
      (
        '3b444444-4444-4444-8444-444444444444'::uuid,
        'danbi@hufs.ac.kr',
        'student'::public.user_type,
        'bbbbbbb9-bbbb-4bbb-8bbb-bbbbbbbbbbb9'::uuid,
        '국제통상학과',
        2,
        'danbi@hufs.ac.kr',
        'verified'::public.student_verification_status,
        'HUFS_익명_22',
        69,
        true,
        'schoolDepartment'::public.visibility_level,
        '외대 안전가이드와 대학일자리플러스센터 공지를 챙겨봅니다.'
      ),
      (
        '3c555555-5555-4555-8555-555555555555'::uuid,
        'jieun@sookmyung.ac.kr',
        'student'::public.user_type,
        'bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5'::uuid,
        '문화관광학전공',
        3,
        'jieun@sookmyung.ac.kr',
        'verified'::public.student_verification_status,
        'SMWU_익명_31',
        70,
        true,
        'schoolDepartment'::public.visibility_level,
        '숙명 생활 편의시설과 학생식당 위치 정보를 자주 공유합니다.'
      ),
      (
        '3d666666-6666-4666-8666-666666666666'::uuid,
        'jaeho@ssu.ac.kr',
        'student'::public.user_type,
        'bbbbbbb6-bbbb-4bbb-8bbb-bbbbbbbbbbb6'::uuid,
        '소프트웨어학부',
        4,
        'jaeho@ssu.ac.kr',
        'verified'::public.student_verification_status,
        'SSU_익명_27',
        72,
        true,
        'schoolDepartment'::public.visibility_level,
        '숭실 입학처 브로슈어와 진로취업센터 자료를 정리합니다.'
      ),
      (
        '3e777777-7777-4777-8777-777777777777'::uuid,
        'yubin@seoultech.ac.kr',
        'student'::public.user_type,
        'aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6'::uuid,
        '기계시스템디자인공학과',
        3,
        'yubin@seoultech.ac.kr',
        'verified'::public.student_verification_status,
        'ST_익명_14',
        71,
        true,
        'schoolDepartment'::public.visibility_level,
        '서울과기대 현장실습과 취업진로본부 공지를 먼저 체크합니다.'
      ),
      (
        '3f888888-8888-4888-8888-888888888888'::uuid,
        'sejin@hongik.ac.kr',
        'student'::public.user_type,
        'ccccccc3-cccc-4ccc-8ccc-ccccccccccc3'::uuid,
        '시각디자인과',
        2,
        'sejin@hongik.ac.kr',
        'verified'::public.student_verification_status,
        'HI_익명_29',
        68,
        true,
        'schoolDepartment'::public.visibility_level,
        '홍익대 학생활동, 동아리, 창업기관 소개 페이지를 자주 봅니다.'
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
      ('41111111-1111-4111-8111-111111111101'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '19금) 소개팅 뒤 선 넘는 질문 어디까지 받아줘요?', '첫 만남 뒤 바로 너무 사적인 질문이 이어지면 선을 어떻게 긋는 편인지 궁금해요. 예의는 지키되 확실하게 끊는 문장 있으면 공유해주세요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 31, 'schoolDepartment'::public.visibility_level, '{"tags":["19+","익명토크"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111102'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '19금) 자취방 초대 이야기 나올 때 보통 어느 선에서 끊어요?', '관계 초반인데 너무 빠르게 집 얘기 나오면 분위기 안 깨고 거절하는 기준이 다들 있는지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 28, 'schoolDepartment'::public.visibility_level, '{"tags":["19+","경계선"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111103'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '19금) 술자리 끝나고 단둘이 남자고 할 때 제일 불편했던 포인트', '늦은 시간에 단둘이 더 보자는 식으로 흘러갈 때 애매하게 말고 깔끔하게 거절하는 방식이 있으면 듣고 싶어요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 24, 'schoolDepartment'::public.visibility_level, '{"tags":["19+","술자리"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111104'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '19금) 연애 초반 스킨십 속도 차이 나면 어떻게 맞춰요?', '좋아하는 마음이 있어도 속도가 다르면 계속 신경 쓰이더라고요. 대화를 먼저 꺼내는 타이밍이 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 27, 'schoolDepartment'::public.visibility_level, '{"tags":["19+","연애"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111105'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, 'hot'::public.post_subcategory, '19금) 관계 전에 꼭 확인하는 기준 있나요?', '술자리 분위기에 끌려가기보다 미리 이야기해야 하는 기준이 있는지, 다들 어디까지 분명하게 말하는 편인지 궁금해요.', '22222222-2222-4222-8222-222222222222'::uuid, 'global'::public.content_scope, 22, 'schoolDepartment'::public.visibility_level, '{"tags":["19+","익명토크"]}'::jsonb),
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
      ('41111111-1111-4111-8111-111111111128'::uuid, '19999999-9999-4999-8999-999999999999'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '입학 전에 단톡방에서 먼저 친해지는 분위기인가요?', '너무 빠르게 친목하는 건 조금 부담스러운데 다들 어느 정도 텐션으로 시작하는지 궁금합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 8, 'school'::public.visibility_level, '{"tags":["새내기존","단톡방"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111129'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, null, '서류 합격률 높였던 자소서 루틴 공유', '지원 직무별로 문항을 매번 새로 쓰기보다 공통 경험을 먼저 묶어놓고, 직무 키워드만 마지막에 얹는 방식이 효율이 좋았습니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 21, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","자소서","취업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111130'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'community'::public.post_category, null, '금융권 인턴 면접에서 반복해서 나온 질문 정리', '지원 동기보다 왜 이 직무를 지금 선택했는지를 더 집요하게 물었습니다. 예상 질문 풀을 같이 맞춰보면 훨씬 편해요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 18, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","면접","취업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111131'::uuid, '18888888-8888-4888-8888-888888888888'::uuid, 'community'::public.post_category, null, '예비입학생도 미리 해두면 좋은 취업 준비', '학과 커리큘럼 보기, 관심 직무 채용 공고 읽기, 링크드인이나 노션 정리 정도만 해둬도 입학 후 훨씬 덜 급합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 14, 'school'::public.visibility_level, '{"tags":["취업정보","새내기","취업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111132'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, null, '건국대 창업지원단 콘텐츠 인턴 모집 공유', '캠퍼스 행사 촬영, 카드뉴스 제작 중심이고 주 3회 근무 기준입니다. 포트폴리오 3개 정도 있으면 지원 가능하다고 안내받았어요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 16, 'schoolDepartment'::public.visibility_level, '{"tags":["채용공고","교내인턴","취업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111133'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'community'::public.post_category, null, '하계 SW 아카데미 모집 공고 정리', '프론트, 백엔드, 데이터 트랙이 나뉘고 과제 제출형입니다. 대학생은 물론 예비입학생도 지원 가능한 오픈 트랙이 있어요.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 19, 'schoolDepartment'::public.visibility_level, '{"tags":["채용공고","개발","취업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111134'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, null, '연구실 학부연구생 모집 공지 공유', '컴퓨터비전 쪽 랩에서 파이썬, 논문 리딩 가능한 학생을 찾고 있습니다. 학점보다 프로젝트 경험을 먼저 본다고 합니다.', '11111111-1111-4111-8111-111111111111'::uuid, 'global'::public.content_scope, 13, 'schoolDepartment'::public.visibility_level, '{"tags":["채용공고","학부연구생","취업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111135'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'admission'::public.post_category, null, '[공식] 서울시립대 2026 입학 프로그램 공지 먼저 본 사람 있어요?', '서울시립대 공식 공지에서 2026학년도 스쿨어택 프로그램을 운영한다고 안내했고, 입학처 홈페이지와 인스타그램 공지를 함께 확인하라고 적혀 있었습니다. 설명회형 프로그램 먼저 보는 게 좋을지 궁금해서 정리해둡니다. 출처: https://cis.uos.ac.kr/korColumn/view.do?identified=anonymous&list_id=about02&menuid=2000001009005000000&seq=801&sort=1', 'aaaaaaa9-aaaa-4aaa-8aaa-aaaaaaaaaaa9'::uuid, 'school'::public.content_scope, 18, 'school'::public.visibility_level, '{"region":"서울","track":"문과","scoreType":"학생부종합 준비","interestUniversity":"서울시립대학교","interestDepartment":"행정학과","tags":["공식자료","서울시립대","입학처"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111136'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission'::public.post_category, null, '[공식] 이화여대 모집요강 PDF에서 체크해야 할 부분 뭐부터 보나요?', '이화여대 입학처 PDF 공지 기준으로 전형별 제출서류와 수학기간 예외사항이 상세하게 정리돼 있었습니다. 재외국민 전형 자료지만 서류 안내 방식이 꽤 촘촘해서 다른 전형 준비할 때도 참고가 되더라고요. 출처: https://admission.ewha.ac.kr/upload/GUIDES/202507040947372XK33M.pdf', 'bbbbbbb8-bbbb-4bbb-8bbb-bbbbbbbbbbb8'::uuid, 'school'::public.content_scope, 16, 'school'::public.visibility_level, '{"region":"서울","track":"문과","scoreType":"내신 2.3","interestUniversity":"이화여자대학교","interestDepartment":"경영학과","tags":["공식자료","이화여대","모집요강"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111137'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'admission'::public.post_category, null, '[공식] 중앙대 신입생 학사가이드 보니 다빈치인재개발센터가 같이 보이네요', '중앙대 공식 학사가이드 자료를 보다 보니 신입생용 안내 안에 다빈치인재개발센터, 추천채용, 취업지원 안내까지 같이 정리돼 있었습니다. 입학 직후부터 취업지원 연결되는 구조인지 재학생 체감이 궁금합니다. 출처: https://nursing.cau.ac.kr/images//main/AcademicGuideforNewStudentsforClassof2023.pdf', '22222222-2222-4222-8222-222222222222'::uuid, 'school'::public.content_scope, 14, 'school'::public.visibility_level, '{"region":"서울","track":"문과","scoreType":"내신 2.8","interestUniversity":"중앙대학교","interestDepartment":"경영경제대학","tags":["공식자료","중앙대","학사가이드"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111138'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission'::public.post_category, null, '[공식] 세종대 새로배움터 공지 보신 분, 신입생 때 어디부터 챙기셨어요?', '세종대 공식 공지에서 새로배움터 개최 안내를 올리면서 수강신청, 특별강연, 신입생 대학생활 안내를 같이 묶어서 소개했습니다. 합격 직후에는 이런 오리엔테이션형 자료가 실제로 제일 도움이 되는지 궁금합니다. 출처: https://www.sejong.ac.kr/kor/intro/notice1.do%3B44007?article.offset=0&articleLimit=10&articleNo=802890&mode=view', 'bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4'::uuid, 'school'::public.content_scope, 13, 'school'::public.visibility_level, '{"region":"서울","track":"문과","scoreType":"내신 2.9","interestUniversity":"세종대학교","interestDepartment":"호텔관광경영학과","tags":["공식자료","세종대","새로배움터"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111139'::uuid, '18888888-8888-4888-8888-888888888888'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '[공식] 건국대 오리엔테이션 공지 먼저 뜬 곳 체크해봤어요', '건국대 공식 공지에서 학기 시작 전 오리엔테이션을 학생회관과 해봉부동산학관에서 나눠 진행한 사례가 있었습니다. 새내기 일정도 보통 공간과 안내 채널이 따로 열리니 공지 게시판을 자주 보는 게 안전해 보여요. 출처: https://www.konkuk.ac.kr/bbs/ciss/1486/1167956/artclView.do', '11111111-1111-4111-8111-111111111111'::uuid, 'school'::public.content_scope, 19, 'school'::public.visibility_level, '{"tags":["새내기존","공식자료","오리엔테이션"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111140'::uuid, '2a111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '[공식] 이화 신입생 진로 설계 부스가 생각보다 크네요', '이화 공식 공지 자료를 보니 신입생 대상 미래설계 행사에서 진로탐색, 취창업, 학교생활 부스를 총 37개 운영했다고 안내했습니다. 새내기 때부터 학교생활이랑 진로 정보 같이 보는 구조가 괜찮아 보여요. 출처: https://fashion.ewha.ac.kr/convergence/info/notice.do?articleNo=132356&attachNo=101916&mode=download', 'bbbbbbb8-bbbb-4bbb-8bbb-bbbbbbbbbbb8'::uuid, 'school'::public.content_scope, 15, 'school'::public.visibility_level, '{"tags":["새내기존","공식자료","학교생활"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111141'::uuid, '2c333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '[공식] 한양대는 신입생 우선수강신청 도우미 지원을 따로 받았어요', '한양대 공식 자료를 보면 연간 지원계획 안에 신입생 우선수강신청과 도우미 지원 안내가 따로 들어가 있었습니다. 학기 시작 직전에는 학교 공식 PDF 먼저 보는 습관이 정말 중요해 보여요. 출처: https://site.hanyang.ac.kr/documents/portlet_file_entry/11085153/2025%EB%85%84%EB%8F%84%2B%EC%97%B0%EA%B0%84%2B%EC%A7%80%EC%9B%90%EA%B3%84%ED%9A%8D%2B%EC%9D%BC%EC%A0%95%ED%91%9Cto%2B%EA%B2%8C%EC%8B%9C%ED%8C%90%2B%EA%B3%B5%EC%A7%80_20250106.pdf/62e17c5b-62ed-1f37-9183-840f73b1c0d9?download=true&status=0', 'ccccccc2-cccc-4ccc-8ccc-ccccccccccc2'::uuid, 'school'::public.content_scope, 16, 'school'::public.visibility_level, '{"tags":["새내기존","공식자료","우선수강신청"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111142'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, null, '[공식] 중앙대 학사가이드에 추천채용, 다빈치인재개발센터가 같이 정리돼 있어요', '중앙대 공식 신입생 학사가이드에서 다빈치인재개발센터, 추천채용, 진로설계 안내가 함께 소개됐습니다. 입학 직후부터 취업지원센터를 먼저 체크하는 게 생각보다 중요해 보여요. 출처: https://nursing.cau.ac.kr/images//main/AcademicGuideforNewStudentsforClassof2023.pdf', '22222222-2222-4222-8222-222222222222'::uuid, 'global'::public.content_scope, 22, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","중앙대","진로설계"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111143'::uuid, '2a111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, null, '[공식] 이화 경력개발센터 자료 보니 신입생 때부터 직무 탐색 부스가 꽤 촘촘하네요', '이화 공식 공지 기준으로 신입생 대상 행사에 경력개발센터 프로그램, EWHACQ, E-Quest, 인턴십, 고시반, 창업 정보까지 같이 배치됐습니다. 진로 탐색을 입학 직후부터 해보려는 분들 참고용으로 남깁니다. 출처: https://fashion.ewha.ac.kr/convergence/info/notice.do?articleNo=132356&attachNo=101916&mode=download', 'bbbbbbb8-bbbb-4bbb-8bbb-bbbbbbbbbbb8'::uuid, 'global'::public.content_scope, 20, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","이화여대","경력개발센터"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111144'::uuid, '2c333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, null, '[공식] 한양대 HY Tech & Startup Fair는 창업·기술 쪽 취업 감 잡기 좋아 보여요', '한양대 산학협력단 공식 페이지에서 HY Tech & Startup Fair를 운영하고 있고, 기술창업과 산학협력 흐름을 함께 소개하고 있습니다. 스타트업/산학 커리어에 관심 있으면 학교 공지부터 보는 편이 빠릅니다. 출처: https://techfair.hanyang.ac.kr/page/introduce01.php', 'ccccccc2-cccc-4ccc-8ccc-ccccccccccc2'::uuid, 'global'::public.content_scope, 18, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","한양대","스타트업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111145'::uuid, '2d444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, null, '[공식] 성균관대 공지에 행정조교 모집 글이 꾸준히 올라와요', '성균관대 공식 공지에서 경제대학 퀀트응용경제학과 행정조교 모집을 확인했습니다. 학교 공지 게시판에 조교·단기근로 형태 공고가 계속 올라오니 교내 일경험 찾는 분들은 주기적으로 체크해보세요. 출처: https://www.skku.edu/skku/mobile/notice.do%3BHOMEPAGE_JSESSIONID%3DSCkS4VzcsOuTogmMrrC9Y-Nls3RK9woWuEaKKAHnpqsELNSU3aQp%21-1906863225?article.offset=10&articleLimit=10&articleNo=114978&mode=view&srSearchVal=%EB%8C%80%ED%95%99%EC%9B%90', 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid, 'global'::public.content_scope, 17, 'schoolDepartment'::public.visibility_level, '{"tags":["채용공고","성균관대","행정조교"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111146'::uuid, '2d444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, null, '[공식] 성균관대 공지에서 인권센터 행정조교 모집도 확인됩니다', '성균관대 공식 공지 목록에서 인권센터 행정조교 모집 같은 학내 공고가 확인됩니다. 교내 채용은 공지 리스트를 검색어로 모아보는 편이 훨씬 빠르더라고요. 출처: https://www.skku.edu/skku/mobile/notice.do%3BHOMEPAGE_JSESSIONID%3DSCkS4VzcsOuTogmMrrC9Y-Nls3RK9woWuEaKKAHnpqsELNSU3aQp%21-1906863225?article.offset=40&articleLimit=10&mode=list&srSearchVal=%EB%8C%80%ED%95%99%EC%9B%90', 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid, 'global'::public.content_scope, 15, 'schoolDepartment'::public.visibility_level, '{"tags":["채용공고","성균관대","교내채용"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111147'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'admission'::public.post_category, null, '[공식] 서울대 교과과정 해설 PDF 먼저 보면 학과 감이 더 잘 오네요', '서울대 공식 교과과정 해설 PDF를 보니 신입생세미나, 대학영어, 학과별 기초 이수 규정이 한 파일에 정리돼 있었습니다. 전형 정보만 보다가 실제 커리큘럼까지 같이 보니 학과 선택 감이 훨씬 빨리 오더라고요. 출처: https://www.snu.ac.kr/webdata/uploads/kor/file/2023/02/Explanation_kor_2022.pdf', 'aaaaaaa8-aaaa-4aaa-8aaa-aaaaaaaaaaa8'::uuid, 'school'::public.content_scope, 21, 'school'::public.visibility_level, '{"region":"서울","track":"이과","scoreType":"학생부종합 준비","interestUniversity":"서울대학교","interestDepartment":"경제학부","tags":["공식자료","서울대","교과과정"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111148'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission'::public.post_category, null, '[공식] 숭실대 입학처 S-STAR 브로슈어가 학과·취업 흐름까지 정리돼 있어요', '숭실대 입학처 브로슈어를 보니 학과 소개뿐 아니라 캠퍼스 핫플레이스, 취업 밀착 프로그램, 창업 지원까지 같이 정리돼 있었습니다. 지원 학과를 고를 때 학교 생활과 취업 분위기를 한 번에 보기 좋았습니다. 출처: https://iphak.ssu.ac.kr/upload/SSU%281%29_191011155918.pdf', 'bbbbbbb6-bbbb-4bbb-8bbb-bbbbbbbbbbb6'::uuid, 'school'::public.content_scope, 19, 'school'::public.visibility_level, '{"region":"서울","track":"이과","scoreType":"내신 2.6","interestUniversity":"숭실대학교","interestDepartment":"소프트웨어학부","tags":["공식자료","숭실대","입학처"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111149'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'admission'::public.post_category, null, '[공식] 연세 전공안내서 보니까 대학생활·글로벌 프로그램 설명이 한 번에 정리돼 있네요', '연세대 공식 전공안내서에서 전공 소개뿐 아니라 대학생활, 글로벌 프로그램, 진로 탐색 흐름이 같이 정리돼 있었습니다. 학과 설명만 보는 것보다 학교 안에서 어떤 경험을 할 수 있는지 먼저 잡기에 좋았습니다. 출처: https://admission.yonsei.ac.kr/seoul/admission/html/data/major/2026/yonsei_allways_251028.pdf', 'bbbbbbb7-bbbb-4bbb-8bbb-bbbbbbbbbbb7'::uuid, 'school'::public.content_scope, 18, 'school'::public.visibility_level, '{"region":"서울","track":"문과","scoreType":"내신 2.4","interestUniversity":"연세대학교","interestDepartment":"교육학과","tags":["공식자료","연세대","전공안내서"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111150'::uuid, '2f222222-2222-4222-8222-222222222222'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '[공식] 고려대 문과대 OT 자료 첨부 공지면 신입생 일정 파악이 빨라요', '고려대 문과대 공식 공지에 신입생 OT 자료가 첨부돼 있어서 아주홀 위치, 학사 일정, 첫 학기 체크포인트를 한 번에 볼 수 있었습니다. 새내기 때는 학과 단위 OT 자료를 먼저 챙기는 게 확실히 빠르더라고요. 출처: https://libart.korea.ac.kr/libart/notice/notice.do%3Bjsessionid%3DVgrhltRS1h5rMQpv4X1XQmSFFNlX0dfppJWYn8Fnh9s82vCGfXrR%21207209210?article.offset=100&articleLimit=10&articleNo=341956&mode=view', '44444444-4444-4444-8444-444444444444'::uuid, 'school'::public.content_scope, 18, 'school'::public.visibility_level, '{"tags":["새내기존","공식자료","OT"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111151'::uuid, '3b444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '[공식] 한국외대 서울캠퍼스 OT 안전가이드에 필수 체크포인트가 다 있네요', '한국외대 서울캠퍼스 공식 안전가이드 PDF에 OT 운영 원칙, 안전수칙, 성희롱 예방, 비용 징수 금지 같은 기본선이 명확하게 정리돼 있었습니다. 새내기존에서도 이런 체크리스트를 먼저 공유해두면 도움 될 것 같아요. 출처: https://safety.hufs.ac.kr/sites/hufssafety/download/safety_seoul.pdf', 'bbbbbbb9-bbbb-4bbb-8bbb-bbbbbbbbbbb9'::uuid, 'school'::public.content_scope, 17, 'school'::public.visibility_level, '{"tags":["새내기존","공식자료","안전가이드"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111152'::uuid, '3f888888-8888-4888-8888-888888888888'::uuid, 'community'::public.post_category, 'club'::public.post_subcategory, '[공식] 홍익대 총동아리연합회 소개 페이지에서 중앙동아리 규모가 한눈에 보여요', '홍익대 공식 학생활동 페이지를 보니 서울캠퍼스 중앙동아리 수와 분과 구성이 자세히 정리돼 있었습니다. 동아리 찾을 때 커뮤니티 후기만 보기보다 학교 공식 소개를 먼저 보면 결이 빨리 잡혀요. 출처: https://www.hongik.ac.kr/kr/life/seoul-society.do', 'ccccccc3-cccc-4ccc-8ccc-ccccccccccc3'::uuid, 'school'::public.content_scope, 16, 'school'::public.visibility_level, '{"tags":["동아리","공식자료","중앙동아리"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111153'::uuid, '3a333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '[공식] 연세 전공안내서에 대학생활·글로벌 프로그램 흐름이 같이 정리돼 있어요', '연세대 공식 전공안내서 안에 전공 소개뿐 아니라 대학생활, 해외교환, 진로 탐색, 학업 적응 정보가 같이 묶여 있었습니다. 입학 전에는 학과별 커리큘럼과 학교생활 지원 구조를 함께 보는 데 유용했습니다. 출처: https://admission.yonsei.ac.kr/seoul/admission/html/data/major/2026/yonsei_allways_251028.pdf', 'bbbbbbb7-bbbb-4bbb-8bbb-bbbbbbbbbbb7'::uuid, 'school'::public.content_scope, 18, 'school'::public.visibility_level, '{"tags":["새내기존","공식자료","대학생활"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111154'::uuid, '3c555555-5555-4555-8555-555555555555'::uuid, 'community'::public.post_category, 'food'::public.post_subcategory, '[공식] 숙명 캠퍼스 안내 PDF에 학생식당 위치가 한 번에 정리돼 있어요', '숙명여대 공식 캠퍼스 안내 PDF를 보니 건물별 편의시설과 함께 미소찬 학생식당 위치가 같이 정리돼 있었습니다. 새 학기엔 식당 위치부터 익혀두면 이동 동선 잡기가 훨씬 편하더라고요. 출처: https://ulearning.sookmyung.ac.kr/sites/sookmyungkr/down/201410_MAP.pdf', 'bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5'::uuid, 'school'::public.content_scope, 17, 'school'::public.visibility_level, '{"tags":["맛집","공식자료","학생식당"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111155'::uuid, '3f888888-8888-4888-8888-888888888888'::uuid, 'community'::public.post_category, 'freshman'::public.post_subcategory, '[공식] 홍익 총학생회 소개 페이지에 신입생 OT랑 대동제 흐름이 같이 보여요', '홍익대 공식 총학생회 소개 페이지를 보니 연간 학생자치 일정 안에 신입생 오리엔테이션과 대동제 흐름이 같이 정리돼 있었습니다. 새내기 때는 학생회와 동아리 일정 구조를 먼저 보는 게 적응에 도움 되더라고요. 출처: https://www.hongik.ac.kr/kr/life/seoul-intro-student-council.do', 'ccccccc3-cccc-4ccc-8ccc-ccccccccccc3'::uuid, 'school'::public.content_scope, 15, 'school'::public.visibility_level, '{"tags":["새내기존","공식자료","학생회"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111156'::uuid, '3e777777-7777-4777-8777-777777777777'::uuid, 'community'::public.post_category, null, '[공식] 서울과기대 취업진로본부는 현장실습까지 한 번에 연결해주네요', '서울과기대 공식 조직도 상세 페이지를 보니 취업진로본부가 취업지원 프로그램뿐 아니라 단기·장기 현장실습까지 함께 운영하고 있었습니다. 취업정보 찾을 때 본부 소개 페이지부터 보는 게 생각보다 빠릅니다. 출처: https://seoultech.ac.kr/intro/uvstat/orga/detail/alljob', 'aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6'::uuid, 'global'::public.content_scope, 21, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","서울과기대","현장실습"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111157'::uuid, '3d666666-6666-4666-8666-666666666666'::uuid, 'community'::public.post_category, null, '[공식] 숭실대 진로취업센터는 재학생·졸업생·지역청년까지 같이 지원하네요', '숭실대 진로취업센터 소개 페이지를 보니 재학생뿐 아니라 졸업생과 지역 청년까지 열린 허브 역할을 한다고 명시돼 있었습니다. 학교 안 취업지원 범위가 넓어서 저학년 때부터 자주 보는 편이 좋아 보여요. 출처: https://job.ssu.ac.kr/service/introduce/introduce.do', 'bbbbbbb6-bbbb-4bbb-8bbb-bbbbbbbbbbb6'::uuid, 'global'::public.content_scope, 19, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","숭실대","진로취업센터"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111158'::uuid, '3f888888-8888-4888-8888-888888888888'::uuid, 'community'::public.post_category, null, '[공식] 홍익 HIVE는 창업교육·멘토링·팀빌딩까지 학교 안에서 이어지네요', '홍익대 공식 학생활동 페이지를 보니 HIVE가 창업 기초 교육, 팀 빌딩, 멘토링, 네트워킹을 꾸준히 운영하고 있었습니다. 취업 탭에서도 창업 쪽 진로를 보는 사람이라면 학교 안 자원을 먼저 확인할 만합니다. 출처: https://www.hongik.ac.kr/kr/life/seoul-hive.do', 'ccccccc3-cccc-4ccc-8ccc-ccccccccccc3'::uuid, 'global'::public.content_scope, 18, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","홍익대","창업"]}'::jsonb),
      ('41111111-1111-4111-8111-111111111159'::uuid, '3b444444-4444-4444-8444-444444444444'::uuid, 'community'::public.post_category, null, '[공식] 한국외대 대학일자리플러스센터가 고용노동부 평가 우수 3회를 받았다고 공지됐어요', '한국외대 공식 메인 공지에서 대학일자리플러스센터가 고용노동부 연차 성과평가에서 우수 등급을 3회 달성했다고 안내했습니다. 취업지원 체계가 실제로 잘 굴러가는 학교인지 볼 때 이런 공식 지표가 꽤 참고됩니다. 출처: https://www.hufs.ac.kr/hufs/index.do', 'bbbbbbb9-bbbb-4bbb-8bbb-bbbbbbbbbbb9'::uuid, 'global'::public.content_scope, 17, 'schoolDepartment'::public.visibility_level, '{"tags":["취업정보","한국외대","대학일자리플러스센터"]}'::jsonb)
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
values
  ('41111111-1111-4111-8111-111111111160'::uuid, '3c555555-5555-4555-8555-555555555555'::uuid, 'community'::public.post_category, 'advice'::public.post_subcategory, '휴학 생각이 계속 드는데 바로 결정하는 게 맞을까요?', '학기 초인데도 수업이 손에 잘 안 잡히고 진로 방향도 흐릿해서 휴학 생각이 자꾸 납니다. 비슷한 시기 지나본 사람들은 보통 어떤 기준으로 결정했는지 궁금해요.', 'bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5'::uuid, 'global'::public.content_scope, 26, 'schoolDepartment'::public.visibility_level, '{"tags":["고민상담","휴학"]}'::jsonb),
  ('41111111-1111-4111-8111-111111111161'::uuid, '2a111111-1111-4111-8111-111111111111'::uuid, 'community'::public.post_category, 'advice'::public.post_subcategory, '과 친구들이랑 멀어졌을 때 다시 다가가는 편인가요?', '2학년 올라오면서 자연스럽게 멀어진 친구들이 있는데 억지로 다시 붙으려니 어색하고 그냥 두자니 학교가 너무 좁게 느껴집니다. 보통 어떻게 정리하는지 듣고 싶어요.', 'bbbbbbb8-bbbb-4bbb-8bbb-bbbbbbbbbbb8'::uuid, 'global'::public.content_scope, 22, 'schoolDepartment'::public.visibility_level, '{"tags":["고민상담","인간관계"]}'::jsonb),
  ('41111111-1111-4111-8111-111111111162'::uuid, '2f222222-2222-4222-8222-222222222222'::uuid, 'community'::public.post_category, 'advice'::public.post_subcategory, '첫 인턴 불합격 후 멘탈 회복은 어떻게 했나요?', '나름 열심히 준비했다고 생각했는데 서류에서 떨어지고 나니까 다음 지원을 바로 넣는 것도 겁납니다. 텐션 다시 올릴 때 실제로 도움 된 루틴 있으면 공유 부탁해요.', '44444444-4444-4444-8444-444444444444'::uuid, 'global'::public.content_scope, 24, 'schoolDepartment'::public.visibility_level, '{"tags":["고민상담","취업"]}'::jsonb),
  ('41111111-1111-4111-8111-111111111163'::uuid, '3a333333-3333-4333-8333-333333333333'::uuid, 'community'::public.post_category, 'advice'::public.post_subcategory, '자취 시작하고 생활비 통제가 안 될 때 어떻게 잡았나요?', '학기 시작하고 식비, 카페, 교통비가 생각보다 빨리 나가서 한 달 예산이 계속 깨집니다. 앱으로 관리하는지, 카테고리를 나누는지 현실적인 방법이 궁금해요.', 'bbbbbbb7-bbbb-4bbb-8bbb-bbbbbbbbbbb7'::uuid, 'global'::public.content_scope, 19, 'schoolDepartment'::public.visibility_level, '{"tags":["고민상담","생활비"]}'::jsonb),
  ('41111111-1111-4111-8111-111111111164'::uuid, '3d666666-6666-4666-8666-666666666666'::uuid, 'community'::public.post_category, 'advice'::public.post_subcategory, '팀플 무임승차를 또 만나면 수업을 바꾸는 게 맞나요?', '이번 학기도 팀플에서 역할 분배가 계속 꼬이는데, 전공 특성상 피하기가 어렵네요. 다음 학기엔 교수님 스타일이나 평가 방식까지 보고 수업을 골라야 하는지 고민입니다.', 'bbbbbbb6-bbbb-4bbb-8bbb-bbbbbbbbbbb6'::uuid, 'global'::public.content_scope, 21, 'schoolDepartment'::public.visibility_level, '{"tags":["고민상담","팀플"]}'::jsonb),
  ('41111111-1111-4111-8111-111111111165'::uuid, '3e777777-7777-4777-8777-777777777777'::uuid, 'community'::public.post_category, 'advice'::public.post_subcategory, '취업 준비 시작 시점이 늦은 것 같을 때 뭐부터 정리했나요?', '4학년인데 대외활동이나 인턴이 많지 않아서 늦었다는 생각이 큽니다. 자소서, 포트폴리오, 직무 정리 중 어디부터 손대는 게 가장 현실적인지 궁금합니다.', 'aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6'::uuid, 'global'::public.content_scope, 23, 'schoolDepartment'::public.visibility_level, '{"tags":["고민상담","취업"]}'::jsonb)
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
      ('51111111-1111-4111-8111-111111111224'::uuid, '41111111-1111-4111-8111-111111111128'::uuid, '18888888-8888-4888-8888-888888888888'::uuid, '단톡은 먼저 보는 편인데 너무 빠르게 친목 강요하는 분위기는 아니라고 들었습니다.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111225'::uuid, '41111111-1111-4111-8111-111111111129'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '공통 경험 먼저 정리해두는 방식 공감합니다. 문항마다 바꾸는 포인트만 따로 메모해두면 편했어요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111226'::uuid, '41111111-1111-4111-8111-111111111130'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '왜 이 직무인가를 정말 많이 물어봤어요. 최근 산업 이슈까지 같이 보면 답변이 훨씬 안정적이었습니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111227'::uuid, '41111111-1111-4111-8111-111111111131'::uuid, '19999999-9999-4999-8999-999999999999'::uuid, '예비입학생이어도 채용공고 먼저 읽어보는 거 좋더라고요. 직무 이름부터 익숙해집니다.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111228'::uuid, '41111111-1111-4111-8111-111111111132'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, '교내 인턴이면 수업 병행 가능한지 궁금합니다. 근무 시간대 정보까지 있으면 더 좋겠어요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111229'::uuid, '41111111-1111-4111-8111-111111111133'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '오픈 트랙이면 저학년이나 예비입학생한테도 진입 장벽이 낮아서 좋네요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111230'::uuid, '41111111-1111-4111-8111-111111111134'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '학부연구생은 프로젝트 경험 위주로 보는 편이라 깃허브 정리도 같이 해두면 좋습니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111231'::uuid, '41111111-1111-4111-8111-111111111135'::uuid, '2b222222-2222-4222-8222-222222222222'::uuid, '서울시립대는 입학처 행사 공지와 모집요강 공지가 따로 올라오는 편이라 둘 다 보는 게 안전합니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111232'::uuid, '41111111-1111-4111-8111-111111111136'::uuid, '2a111111-1111-4111-8111-111111111111'::uuid, '이화 입학처 PDF는 서류 예외 조항이 자세해서 전형 준비할 때 처음부터 같이 보는 편이 좋았어요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111233'::uuid, '41111111-1111-4111-8111-111111111137'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, '중앙대는 입학 후 진로지원까지 한 자료에 묶여 있어서 학과 선택할 때 의외로 참고가 됩니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111234'::uuid, '41111111-1111-4111-8111-111111111140'::uuid, '2a111111-1111-4111-8111-111111111111'::uuid, '이런 행사형 자료는 학사 공지보다 늦게 놓치기 쉬워서 입학 직후부터 저장해두는 편이 좋았습니다.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111235'::uuid, '41111111-1111-4111-8111-111111111141'::uuid, '2c333333-3333-4333-8333-333333333333'::uuid, '우선수강신청 안내는 학기 시작 직전 다시 확인하는 게 좋아요. 공지 PDF가 제일 정확합니다.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111236'::uuid, '41111111-1111-4111-8111-111111111142'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, '진로센터나 추천채용 링크는 입학 직후에 저장해두면 학년 올라갈수록 꽤 도움 됩니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111237'::uuid, '41111111-1111-4111-8111-111111111143'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, '신입생 행사 안에 진로 탐색 부스가 같이 들어가면 학교 적응할 때 확실히 편하더라고요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111238'::uuid, '41111111-1111-4111-8111-111111111144'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '기술창업 관심 있으면 산학협력단 공지부터 보는 게 제일 빠르다는 데 동의합니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111239'::uuid, '41111111-1111-4111-8111-111111111145'::uuid, '2d444444-4444-4444-8444-444444444444'::uuid, '교내 조교 공고는 마감이 빠른 편이라 관심 있으면 키워드 검색 저장해두는 게 편합니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111240'::uuid, '41111111-1111-4111-8111-111111111146'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, '교내 채용은 과사무실이나 센터 단위 공지가 흩어져 있어서 학교 공지 검색이 생각보다 중요합니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111241'::uuid, '41111111-1111-4111-8111-111111111147'::uuid, '2e111111-1111-4111-8111-111111111111'::uuid, '서울대는 전형만 보지 말고 교양 이수 규정도 같이 보는 게 좋습니다. 입학 뒤 시간표 감이 빨리 잡혀요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111242'::uuid, '41111111-1111-4111-8111-111111111148'::uuid, '3d666666-6666-4666-8666-666666666666'::uuid, '숭실 브로슈어는 학과 소개와 취업 프로그램이 같이 정리돼 있어서 지원 학과 고를 때 꽤 도움이 됩니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111243'::uuid, '41111111-1111-4111-8111-111111111149'::uuid, '3a333333-3333-4333-8333-333333333333'::uuid, '연세 전공안내서는 대학생활 정보가 같이 들어 있어서 학과 분위기와 학교 경험을 같이 보기 좋습니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111244'::uuid, '41111111-1111-4111-8111-111111111150'::uuid, '2f222222-2222-4222-8222-222222222222'::uuid, 'OT 자료에 들어 있는 학사 일정표는 캘린더에 먼저 넣어두면 신입생 때 덜 헷갈립니다.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111245'::uuid, '41111111-1111-4111-8111-111111111151'::uuid, '3b444444-4444-4444-8444-444444444444'::uuid, '외대 OT 가이드는 안전수칙이 꽤 자세해서 과 단위 행사 보기 전에 한 번 읽어두는 편이 좋아요.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111246'::uuid, '41111111-1111-4111-8111-111111111152'::uuid, '3f888888-8888-4888-8888-888888888888'::uuid, '홍익은 중앙동아리 분과가 다양해서 공식 소개 페이지 먼저 보고 커뮤니티 후기 붙여서 보는 편이 좋습니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111247'::uuid, '41111111-1111-4111-8111-111111111153'::uuid, '3a333333-3333-4333-8333-333333333333'::uuid, '글로벌 프로그램과 학과 커리큘럼이 같이 정리돼 있어서 새내기 때 학교 자원을 한눈에 보기 편합니다.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111248'::uuid, '41111111-1111-4111-8111-111111111154'::uuid, '3c555555-5555-4555-8555-555555555555'::uuid, '학생식당이나 편의시설 위치를 먼저 익혀두면 첫 주 동선이 훨씬 편해집니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111249'::uuid, '41111111-1111-4111-8111-111111111155'::uuid, '3f888888-8888-4888-8888-888888888888'::uuid, '총학생회 소개 페이지에 연간 일정이 같이 보여서 대동제나 OT 흐름 잡기 좋습니다.', false, 'school'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111250'::uuid, '41111111-1111-4111-8111-111111111156'::uuid, '3e777777-7777-4777-8777-777777777777'::uuid, '서울과기대는 현장실습과 취업지원이 본부 단위로 묶여 있어서 공지 챙기기가 편한 편입니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111251'::uuid, '41111111-1111-4111-8111-111111111157'::uuid, '3d666666-6666-4666-8666-666666666666'::uuid, '숭실 진로취업센터는 저학년 상담도 열려 있어서 첫 학기부터 계정 만들어두는 걸 추천합니다.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111252'::uuid, '41111111-1111-4111-8111-111111111158'::uuid, '3f888888-8888-4888-8888-888888888888'::uuid, '홍익은 창업 쪽도 학교 안 자원이 잘 정리돼 있어서 취업 탭에서 같이 보는 게 맞는 것 같아요.', false, 'schoolDepartment'::public.visibility_level),
      ('51111111-1111-4111-8111-111111111253'::uuid, '41111111-1111-4111-8111-111111111159'::uuid, '3b444444-4444-4444-8444-444444444444'::uuid, '외대는 대학일자리플러스센터 공지가 메인에도 자주 떠서 학교 지원 체감이 괜찮은 편입니다.', false, 'schoolDepartment'::public.visibility_level)
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

insert into public.comments (
  id,
  post_id,
  author_id,
  content,
  accepted,
  visibility_level
)
values
  ('51111111-1111-4111-8111-111111111254'::uuid, '41111111-1111-4111-8111-111111111160'::uuid, '2d444444-4444-4444-8444-444444444444'::uuid, '바로 결론 내리기보다 2주 정도 수업 루틴과 감정 패턴을 적어보면 훨씬 선명해지더라고요.', false, 'schoolDepartment'::public.visibility_level),
  ('51111111-1111-4111-8111-111111111255'::uuid, '41111111-1111-4111-8111-111111111161'::uuid, '2b222222-2222-4222-8222-222222222222'::uuid, '저는 억지로 붙기보다 같이 수업 듣는 한 명이랑만 다시 연결해도 학교 생활이 훨씬 편해졌습니다.', false, 'schoolDepartment'::public.visibility_level),
  ('51111111-1111-4111-8111-111111111256'::uuid, '41111111-1111-4111-8111-111111111162'::uuid, '3d666666-6666-4666-8666-666666666666'::uuid, '불합격 직후에는 지원서 다시 보기보다 일정부터 비우고 다음 공고 하나만 정하는 게 제일 효과 있었습니다.', false, 'schoolDepartment'::public.visibility_level),
  ('51111111-1111-4111-8111-111111111257'::uuid, '41111111-1111-4111-8111-111111111163'::uuid, '3b444444-4444-4444-8444-444444444444'::uuid, '식비를 주간 단위로 끊어서 보면 훨씬 관리하기 쉬웠어요. 월 단위로만 보면 체감이 잘 안 옵니다.', false, 'schoolDepartment'::public.visibility_level),
  ('51111111-1111-4111-8111-111111111258'::uuid, '41111111-1111-4111-8111-111111111164'::uuid, '2c333333-3333-4333-8333-333333333333'::uuid, '다음 학기엔 팀플 비중과 중간평가 방식 먼저 보고 넣으니까 스트레스가 확실히 줄었습니다.', false, 'schoolDepartment'::public.visibility_level),
  ('51111111-1111-4111-8111-111111111259'::uuid, '41111111-1111-4111-8111-111111111165'::uuid, '2a111111-1111-4111-8111-111111111111'::uuid, '늦었다는 생각 들 때는 직무 하나만 정하고 그 기준으로 자소서 재료부터 모으는 게 제일 빨랐습니다.', false, 'schoolDepartment'::public.visibility_level)
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
      ('81111111-1111-4111-8111-111111111501'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'comment'::public.notification_type, '내 글에 새 댓글이 달렸습니다', '축제 후기 글에 새로운 댓글이 달렸습니다.', false, '/community?filter=hot', 'post', null::uuid, '{}'::jsonb),
      ('81111111-1111-4111-8111-111111111502'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'reply'::public.notification_type, '답글이 이어졌습니다', '내가 남긴 댓글에 답글이 달렸습니다.', false, '/community?filter=advice', 'comment', null::uuid, '{}'::jsonb),
      ('81111111-1111-4111-8111-111111111503'::uuid, 'b2222222-2222-4222-8222-222222222222'::uuid, 'trade_match'::public.notification_type, '교환 매칭 후보가 생겼습니다', '원하는 강의를 가진 글이 새로 올라왔습니다.', false, '/trade', 'trade', null::uuid, '{}'::jsonb),
      ('81111111-1111-4111-8111-111111111504'::uuid, 'c3333333-3333-4333-8333-333333333333'::uuid, 'trending_post'::public.notification_type, '내 글이 인기글로 올라왔습니다', '반응이 빠르게 붙어 커뮤니티 인기글에 노출되고 있습니다.', true, '/community?filter=hot', 'post', null::uuid, '{}'::jsonb),
      ('81111111-1111-4111-8111-111111111505'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'lecture_reaction'::public.notification_type, '강의평 반응이 늘고 있습니다', '내가 남긴 강의평을 저장하고 다시 보는 사용자가 많아졌습니다.', true, '/lectures', 'lecture', null::uuid, '{}'::jsonb),
      ('81111111-1111-4111-8111-111111111506'::uuid, 'e5555555-5555-4555-8555-555555555555'::uuid, 'admission_answer'::public.notification_type, '입시 질문에 답변이 달렸습니다', '질문에 대학생 답변이 달렸습니다. 상세에서 바로 확인해보세요.', false, '/admission', 'post', null::uuid, '{}'::jsonb),
      ('81111111-1111-4111-8111-111111111507'::uuid, 'f6666666-6666-4666-8666-666666666666'::uuid, 'school_recommendation'::public.notification_type, '우리학교에서 많이 보는 글을 추천합니다', '같은 학교 학생들이 자주 열어보는 글을 모아봤습니다.', true, '/school', 'system', null::uuid, '{"recommended": true}'::jsonb),
      ('81111111-1111-4111-8111-111111111508'::uuid, 'd4444444-4444-4444-8444-444444444444'::uuid, 'freshman_trending'::public.notification_type, '새내기존 질문이 활발합니다', '예비입학생들이 많이 보는 질문을 확인해보세요.', true, '/school?tab=freshman', 'system', null::uuid, '{"recommended": true}'::jsonb),
      ('81111111-1111-4111-8111-111111111509'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'verification_approved'::public.notification_type, '학교 메일 인증이 승인되었습니다', '이제 대학생 전용 기능을 사용할 수 있습니다.', false, '/profile', 'verification', null::uuid, '{}'::jsonb),
      ('81111111-1111-4111-8111-111111111510'::uuid, 'a1111111-1111-4111-8111-111111111111'::uuid, 'announcement'::public.notification_type, '이번 주 운영 공지', '댓글 반응, 추천 알림, 인증 상태를 알림 탭에서 바로 확인할 수 있습니다.', true, '/community', 'system', null::uuid, '{}'::jsonb)
  ) as t(id, user_id, type, title, body, is_read, href, target_type, target_id, metadata)
)
insert into public.notifications (
  id,
  user_id,
  type,
  title,
  body,
  is_read,
  href,
  target_type,
  target_id,
  metadata
)
select * from seeded_notifications
on conflict (id) do update
set
  user_id = excluded.user_id,
  type = excluded.type,
  title = excluded.title,
  body = excluded.body,
  is_read = excluded.is_read,
  href = excluded.href,
  target_type = excluded.target_type,
  target_id = excluded.target_id,
  metadata = excluded.metadata;

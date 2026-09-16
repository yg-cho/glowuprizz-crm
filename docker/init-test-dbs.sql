-- 테스트 DB 분리: api 와 forms e2e 가 서로의 데이터를 지우거나 세지 않도록 각자 DB 를 쓴다.
-- (postgres-test 는 tmpfs 라 컨테이너가 새로 뜰 때마다 이 스크립트가 다시 실행된다)
CREATE DATABASE glowuprizz_test_forms;

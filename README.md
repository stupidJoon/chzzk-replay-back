# chzzk-replay-back

치지직 실시간 다시보기 서버(database, web server, nodejs recorder) 입니다.

# Setup

## 0. Pre-Requirements
1. TLS 인증서 발급
2. `.env` 파일에 `DB_ROOT_PASSWORD` `DB_HOST` `DB_USER` `DB_PASSWORD` `DB_DATABASE` 입력

## 1. `/mariadb`

1. mariadb 설치
```bash
docker compose up -d
docker exec -it mariadb mariadb -u root -p
```

2. `db.sql` 참고해서 database와 table 생성하기

## 2. `/nginx`

1. `default.conf` 파일에서 `server_name` 서버 도메인으로 변경
2. `default.conf` 파일에서  `ssl_certificate` `ssl_certificate_key` 서버 TLS 인증서, 인증키로 변경
```bash
docker compose up -d
```

## 3. `/server`

```bash
npm ci
node server.js
```

## 4. `/recorder`

```bash
npm ci
node main.js > log
```

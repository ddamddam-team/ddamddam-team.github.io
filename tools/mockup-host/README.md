# 팀 목업 배포

배포 주소: https://oww-team-mockups.oww-team.workers.dev

메인은 GitHub Pages에 유지하고 목업만 별도 Cloudflare Worker로 배포합니다.
`mockups/` 원본은 공개 Git 저장소에 올리지 않습니다. 비공개 저장소 또는 팀 내 별도 전달로 관리하세요.

## 최초 배포

저장소 루트에서 실행합니다. Cloudflare 계정과 Wrangler 로그인이 필요합니다.

```sh
npx wrangler login
node tools/mockup-host/prepare.mjs
npx wrangler secret put MOCKUP_PASSWORD --config tools/mockup-host/wrangler.jsonc
npx wrangler deploy --config tools/mockup-host/wrangler.jsonc
```

비밀값 입력 프롬프트에 팀 공유 비밀번호를 입력하세요. 비밀번호를 소스나 설정 파일에 저장하지 않습니다.
브라우저 인증창의 사용자 이름은 `team`, 비밀번호는 등록한 공유 비밀번호입니다.

`wrangler.jsonc`는 `owwpartners.site/mockups/*` 경로만 Worker에 연결합니다.
도메인 전체를 Worker의 사용자 지정 도메인으로 교체하지 않습니다.
가비아에서 Cloudflare 네임서버로 변경한 뒤 도메인이 활성화되어야 합니다.
Cloudflare의 해당 호스트 DNS 레코드는 프록시가 활성화되어 있어야 합니다.
네임서버 전파 전에도 인증이 적용된 Workers 배포 주소로 공유할 수 있습니다.
`owwapp.site` 메인의 DNS 레코드와 GitHub Pages CNAME은 변경하지 않습니다.

## 목업 추가 및 수정

`mockups/`에 HTML 및 필요한 리소스를 넣고 `prepare.mjs`와 `wrangler deploy`를 다시 실행합니다.
`/mockups/`에서 프로젝트 폴더를 선택하고 `/mockups/<프로젝트>/`에서 HTML을 선택합니다.
프로젝트별 HTML 목록은 배포 준비 시 자동 생성되며 하위 폴더의 HTML도 포함합니다.
목록은 별도 생성하므로 원본 `index.html`을 포함한 목업 파일을 덮어쓰지 않습니다.
배포 주소의 `/mockups/place/장소2차.html`로 접근합니다.
모든 파일은 서버 인증을 통과해야 제공되며, 비밀번호 미설정 시에는 접근이 차단됩니다.
GitHub Pages로 `.assets/`나 `mockups/`를 직접 배포하지 마세요.

## 검증

```sh
node --test tools/mockup-host/worker.test.mjs
```

공유 비밀번호를 아는 사람은 접근할 수 있습니다. 브라우저는 인증 정보를 재사용하므로 공용 기기에서는 사용 후 브라우저를 종료하세요.

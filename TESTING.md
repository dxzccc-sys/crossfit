# 지금 바로 테스트하는 법

## 1. 개발 서버 실행

```bash
npx expo start
```

일반 터미널(대화형)에서 실행하면 QR코드와 `exp://` URL이 자동으로 출력된다.

**주의:** 에이전트/스크립트/파이프로 실행하면(비TTY) Expo CLI의 QR·URL 출력이 생략되고 아래처럼 `Logs for your project will appear below.`까지만 로그에 남는다. Metro 자체는 정상적으로 떠 있는 상태다.

```
Starting project at ...
Using src/app as the root directory for Expo Router.
Starting Metro Bundler
Waiting on http://localhost:8081
Logs for your project will appear below.
```

이 경우 아래 2번 섹션대로 접속 정보를 직접 만든다.

## 2. 수동으로 접속 정보 만들기 (비TTY 환경일 때)

LAN IP 조회 (PowerShell):

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object IPAddress,InterfaceAlias
```

Metro가 떠 있는지 확인:

```bash
curl http://localhost:8081/status   # "packager-status:running" 이면 정상
```

접속 URL 조합: `exp://<LAN IP>:8081` (예: `exp://192.168.219.116:8081`)

QR코드가 필요하면 `qrcode-terminal`이 이미 devDependency로 설치돼 있어서 바로 쓸 수 있다:

```js
const qrcode = require('qrcode-terminal');
qrcode.generate('exp://<LAN IP>:8081', { small: true }, console.log);
```

## 3. 휴대폰에서 스캔하는 법

1. 휴대폰에 **Expo Go** 앱 설치 (App Store / Google Play)
2. 휴대폰이 PC와 **같은 Wi-Fi**에 연결되어 있는지 확인
3. Expo Go로 QR코드 스캔 (iOS는 기본 카메라 앱으로 스캔해도 자동 연결됨)
4. 스캔이 안 되면 Expo Go의 "Enter URL manually"에 위 URL을 직접 입력

## 4. 문제 해결

- **같은 Wi-Fi인데도 안 열림**: Windows 방화벽이 8081 포트를 막고 있을 수 있음 → 방화벽 인바운드 규칙 확인, 또는 PC를 휴대폰 핫스팟에 연결해서 우회
- **포트 충돌** (다른 포트를 쓰겠냐고 물어봄): 기존에 떠 있는 Metro 프로세스가 있는지 `Get-Process node`로 확인 후 정리
- **웹 브라우저로만 빠르게 확인**하고 싶을 때: `npx expo start --web` 또는 실행 중인 터미널에서 `w` 입력

# FlowDesk

FlowDesk는 프로젝트, 노트, 작업, 작업 세션, 파일, 내보내기 기록을 한곳에서 정리하는 데스크톱 워크스페이스입니다.

학생, 연구자, 개발자가 긴 호흡의 프로젝트를 진행할 때 필요한 기록 구조와 작업 흐름에 집중합니다. 거대한 올인원 문서 도구보다 프로젝트 단위의 정리, 추적, 보관에 초점을 둡니다.

## 주요 기능

- 프로젝트 생성, 고정, 보관, 색상 지정
- Markdown 노트 편집과 미리보기
- 작업 생성, 우선순위, 상태 관리
- 작업 세션 시작/종료와 세션 기록
- 파일 가져오기, 열기, Finder/Explorer에서 보기
- 프로젝트 활동 타임라인
- Markdown, JSON 프로젝트 기록 내보내기
- 워크스페이스 백업과 복원
- 진단 정보 내보내기
- macOS/Windows 네이티브 메뉴와 데스크톱 패키징

## 현재 진행 상태

FlowDesk는 데스크톱 워크스페이스의 핵심 흐름을 중심으로 개발되어 있습니다. 프로젝트 생성과 정리, Markdown 노트 작성, 작업과 세션 기록, 파일 관리, 타임라인, 백업/복원, Markdown/JSON 내보내기를 하나의 작업 공간 안에서 사용할 수 있습니다.

macOS와 Windows 환경에서 빌드, 패키징, 설치, 파일 가져오기/열기, 백업/복원, 내보내기 흐름을 검증했습니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Desktop | Tauri 2 |
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS |
| Editor | CodeMirror |
| State | Zustand |
| Routing | React Router |
| Database | SQLite |
| Markdown | react-markdown, remark-gfm |
| Packaging | Tauri bundler |

## 요구 사항

- Node.js 20 이상
- pnpm
- Rust stable toolchain
- macOS 또는 Windows의 Tauri 2 개발 필수 구성 요소

## 빠른 실행

```bash
pnpm install
pnpm tauri:dev
```

프론트엔드만 확인할 때는 Vite 개발 서버를 실행합니다.

```bash
pnpm dev
```

## 검증

기본 테스트와 빌드는 다음 명령으로 확인합니다.

```bash
pnpm test
pnpm test:stress
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
```

릴리스 번들까지 확인하려면 다음 명령을 사용합니다.

```bash
pnpm qa:package
```

장시간 백업/내보내기 반복 검증은 다음 명령으로 실행합니다.

```bash
pnpm qa:soak
```

전체 릴리스 검증 흐름은 다음 명령으로 실행합니다.

```bash
pnpm qa:release
```

## 패키징

```bash
pnpm tauri:build
```

빌드 산출물은 `src-tauri/target/release/bundle/` 아래에 생성됩니다.

- macOS: `FlowDesk.app`, `.dmg`
- Windows: `.msi`, NSIS `.exe`

개발 중에는 Tauri가 Vite 개발 서버를 사용하고, 배포 빌드에서는 React 빌드 결과물인 `dist/`를 데스크톱 앱에 포함합니다.

```json
{
  "devUrl": "http://localhost:5173",
  "frontendDist": "../dist",
  "beforeDevCommand": "pnpm dev",
  "beforeBuildCommand": "pnpm build"
}
```

## 배포 준비

개발 빌드와 내부 검증 빌드는 별도 배포 secret 없이 실행할 수 있습니다. 사용자에게 배포할 산출물을 만들 때는 플랫폼별 신뢰 체계에 맞게 앱을 서명합니다.

- macOS는 Apple Developer ID 서명과 notarization을 사용합니다.
- Windows는 코드 서명 인증서와 SmartScreen 평판을 사용합니다.
- Azure는 필수가 아니라 Windows 서명 자동화를 위한 선택지 중 하나입니다.

환경 변수와 인증서는 로컬 셸 세션, CI secret, macOS Keychain, Windows 인증서 저장소, 1Password 같은 비밀 관리 도구에 보관합니다. GitHub Actions를 사용할 경우 `Repository Settings > Secrets and variables > Actions`에 등록합니다.

실제 secret 값은 `.env`, README, 스크립트, Git 커밋에 남기지 않습니다.

### macOS

macOS 배포는 Apple Developer Program, Developer ID Application 인증서, notarization 흐름을 기준으로 준비합니다.

로컬 Mac에서 서명할 때는 인증서를 Keychain에 설치한 뒤 signing identity를 확인합니다.

```bash
security find-identity -v -p codesigning
```

현재 개발 설정에서는 `src-tauri/tauri.conf.json`의 `bundle.macOS.signingIdentity`가 ad-hoc signing을 의미하는 `"-"`로 되어 있습니다. 실제 배포 시에는 Developer ID Application identity를 사용하거나 CI용 별도 설정으로 교체합니다.

로컬 서명:

| 환경 변수 | 넣는 값 |
| --- | --- |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: 이름 (TEAMID)` 형식의 Keychain signing identity |

예시:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
pnpm tauri:build
```

CI에서 인증서를 설치해 빌드하려면 Developer ID Application `.p12` 인증서를 base64로 변환해 secret에 저장합니다.

```bash
openssl base64 -A -in DeveloperIDApplication.p12 -out DeveloperIDApplication-base64.txt
```

| 환경 변수 | 넣는 값 |
| --- | --- |
| `APPLE_CERTIFICATE` | `.p12` 인증서를 base64로 인코딩한 문자열 |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12`를 export할 때 지정한 비밀번호 |
| `KEYCHAIN_PASSWORD` | CI에서 임시 Keychain을 만들 때 사용할 비밀번호 |

Notarization은 Apple ID 방식 또는 App Store Connect API 키 방식 중 하나를 선택합니다.

Apple ID 방식:

| 환경 변수 | 넣는 값 |
| --- | --- |
| `APPLE_ID` | Apple Developer 계정 이메일 |
| `APPLE_PASSWORD` | Apple app-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

App Store Connect API 키 방식:

| 환경 변수 | 넣는 값 |
| --- | --- |
| `APPLE_API_KEY` | App Store Connect API Key ID |
| `APPLE_API_ISSUER` | App Store Connect Issuer ID |
| `APPLE_API_KEY_PATH` | `AuthKey_<KEY_ID>.p8` 파일 경로 |

### Windows

Windows 배포는 코드 서명 인증서로 `.msi`, NSIS `.exe` 산출물을 서명하는 흐름을 기준으로 준비합니다.

개인 또는 소규모 배포에서는 PFX 인증서를 로컬 Windows 인증서 저장소에 가져오거나, CI secret으로 저장한 뒤 빌드 과정에서 import하는 방식이 단순합니다.

| 환경 변수 | 넣는 값 |
| --- | --- |
| `WINDOWS_CERTIFICATE` | PFX 인증서를 base64로 인코딩한 문자열 |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX 인증서 비밀번호 |
| `TAURI_WINDOWS_SIGNTOOL_PATH` | `signtool.exe` 경로가 자동 탐지되지 않을 때의 명시 경로 |

PFX 인증서를 로컬 Windows 머신에 가져오는 예시는 다음과 같습니다.

```powershell
$env:WINDOWS_CERTIFICATE_PASSWORD="pfx-export-password"
Import-PfxCertificate `
  -FilePath .\DeveloperCertificate.pfx `
  -CertStoreLocation "<certificate-store>" `
  -Password (ConvertTo-SecureString -String $env:WINDOWS_CERTIFICATE_PASSWORD -Force -AsPlainText)
```

`TAURI_WINDOWS_SIGNTOOL_PATH`는 Windows SDK의 `signtool.exe`를 Tauri가 찾지 못할 때만 지정합니다.

```powershell
$env:TAURI_WINDOWS_SIGNTOOL_PATH="<path-to-signtool.exe>"
```

Azure Key Vault 또는 Azure Trusted Signing은 팀 운영, CI 자동화, 인증서 보관 정책이 필요할 때 선택할 수 있는 방식입니다. Azure 기반 서명을 선택하는 경우에는 `src-tauri/tauri.conf.json`의 `bundle.windows.signCommand`에 서명 명령을 연결하고, 다음 값을 CI secret으로 관리합니다.

| 환경 변수 | 넣는 값 |
| --- | --- |
| `AZURE_CLIENT_ID` | Azure App Registration의 client ID |
| `AZURE_CLIENT_SECRET` | Azure App Registration의 client secret |
| `AZURE_TENANT_ID` | Azure Directory tenant ID |

처음 배포를 준비하는 단계라면 Azure부터 도입하기보다 PFX 인증서 방식으로 서명 흐름을 먼저 이해하는 편이 단순합니다.

### 자동 업데이트

Tauri updater를 활성화할 때는 업데이트 산출물을 서명하기 위한 별도 키가 필요합니다. 공개키는 앱 설정에 들어가고, 개인키는 빌드 환경의 secret으로만 보관합니다.

```bash
pnpm tauri signer generate -w ./.local/secrets/flowdesk-updater.key
```

| 환경 변수 | 넣는 값 |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | updater private key 파일 경로 또는 키 내용 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | private key 비밀번호를 설정한 경우의 비밀번호 |

updater private key는 유출되거나 분실되면 기존 설치 사용자를 위한 업데이트 신뢰 체인을 유지하기 어렵습니다. 저장소, 번들 산출물, 프론트엔드 환경 변수에 포함하지 않습니다.

## 저장 구조

FlowDesk의 데스크톱 데이터는 사용자의 앱 데이터 디렉터리 아래에 저장됩니다.

```text
com.flowdesk.desktop/
├─ flowdesk.db
└─ workspace-files/
```

- `flowdesk.db`: 프로젝트, 노트, 작업, 세션, 타임라인, 파일 메타데이터를 저장하는 SQLite 데이터베이스
- `workspace-files/`: 가져온 PDF, 이미지, CSV, 텍스트, Markdown 파일의 관리형 복사본

SQLite에는 파일 본문이 아니라 파일명, 타입, 크기, 경로, 원본 경로, 저장 모드 같은 메타데이터를 저장합니다. 실제 파일은 로컬 파일 시스템에 저장합니다.

## 코드 구조

```text
flowdesk/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ domain/
│  ├─ features/
│  │  └─ workspace/
│  ├─ lib/
│  │  ├─ backup/
│  │  ├─ diagnostics/
│  │  ├─ export/
│  │  ├─ persistence/
│  │  └─ platform/
│  ├─ stores/
│  └─ styles/
├─ src-tauri/
│  ├─ src/
│  ├─ icons/
│  ├─ capabilities/
│  └─ tauri.conf.json
├─ database/
│  └─ migrations/
└─ scripts/
   └─ qa/
```

`src/`는 React 애플리케이션과 프론트엔드 도메인 로직을 담고, `src-tauri/`는 Tauri/Rust 런타임, 메뉴, 데이터베이스 명령, 진단 명령을 담당합니다.

## 설계 원칙

- 데스크톱 앱다운 빠른 실행과 네이티브 흐름
- 프로젝트 중심의 구조화된 기록
- 장기 프로젝트에 적합한 노트, 작업, 세션, 파일 관리
- 독립적으로 보관할 수 있는 Markdown/JSON 내보내기
- 과도한 장식보다 명확한 정보 밀도와 조작감

## 제품 방향

FlowDesk는 클라우드 협업이나 AI 자동화보다 개인 데스크톱에서의 정리, 기록, 회고, 보관에 집중합니다.

프로젝트별로 노트, 작업, 세션, 파일, 내보내기 기록이 자연스럽게 묶이는 흐름을 우선하며, 사용자가 장기 프로젝트의 과정을 잃어버리지 않도록 돕는 것을 목표로 합니다.

## 향후 로드맵

- 검색과 필터링 경험 고도화
- 참고자료 관리 흐름 확장
- 장기 프로젝트 타임라인 개선
- 백업/복구 경험 강화
- 접근성 및 키보드 사용성 개선
- macOS와 Windows 배포 경험 개선

## 참고 문서

- [Tauri macOS code signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri Windows code signing](https://v2.tauri.app/distribute/sign/windows/)
- [Tauri environment variables](https://v2.tauri.app/reference/environment-variables/)
- [Tauri updater](https://v2.tauri.app/plugin/updater/)

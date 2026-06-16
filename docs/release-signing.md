# FlowDesk Release Signing

이 문서는 FlowDesk를 사용자에게 배포할 때 필요한 코드 서명, notarization, GitHub Actions secret 기준을 정리합니다. 자동 업데이트 서명은 updater를 도입할 때 필요한 별도 준비 항목으로 다룹니다.

개발 빌드와 내부 검증 빌드는 별도 배포 secret 없이 실행할 수 있습니다. 공개 배포용 산출물은 플랫폼별 신뢰 체계에 맞게 서명합니다.

## 기본 릴리스 흐름

로컬 패키징:

```bash
pnpm install
pnpm tauri:build
```

전체 릴리스 검증:

```bash
pnpm qa:release
```

GitHub Actions release workflow는 `v0.1.1` 같은 tag를 기준으로 macOS Apple Silicon, macOS Intel, Windows 빌드를 만들고 draft GitHub Release에 파일을 올립니다.

현재 workflow는 릴리스 산출물 생성과 GitHub Release 업로드를 담당합니다. 프로덕션 서명, notarization, Windows 인증서 import, updater 배포는 secret과 서명 절차를 workflow에 추가한 뒤 활성화합니다.

```bash
git tag v0.1.1
git push origin v0.1.1
```

또는 GitHub Actions에서 Release workflow를 수동 실행하고 tag 값을 입력합니다.

## Secret 관리 원칙

인증서, private key, 앱 전용 비밀번호, CI secret은 다음 경로에만 보관합니다.

- 로컬 셸 세션
- macOS Keychain
- Windows 인증서 저장소
- 1Password 같은 비밀 관리 도구
- GitHub Actions `Repository Settings > Secrets and variables > Actions`

실제 secret 값은 `.env`, README, 스크립트, Git 커밋, 릴리스 산출물에 남기지 않습니다.

## macOS 서명

macOS 배포는 Apple Developer Program, Developer ID Application 인증서, notarization 흐름을 기준으로 준비합니다.

로컬 Mac에서 서명할 때는 인증서를 Keychain에 설치한 뒤 signing identity를 확인합니다.

```bash
security find-identity -v -p codesigning
```

현재 개발 설정에서는 `src-tauri/tauri.conf.json`의 `bundle.macOS.signingIdentity`가 ad-hoc signing을 의미하는 `"-"`로 되어 있습니다. 공개 배포 시에는 Developer ID Application identity를 사용하거나 CI용 별도 설정으로 교체합니다.

로컬 서명에 필요한 환경 변수:

| 환경 변수                | 넣는 값                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
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

CI 인증서 설치에 필요한 secret:

| 환경 변수                    | 넣는 값                                        |
| ---------------------------- | ---------------------------------------------- |
| `APPLE_CERTIFICATE`          | `.p12` 인증서를 base64로 인코딩한 문자열       |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12`를 export할 때 지정한 비밀번호           |
| `KEYCHAIN_PASSWORD`          | CI에서 임시 Keychain을 만들 때 사용할 비밀번호 |

## macOS Notarization

Notarization은 Apple ID 방식 또는 App Store Connect API 키 방식 중 하나를 선택합니다.

Apple ID 방식:

| 환경 변수        | 넣는 값                     |
| ---------------- | --------------------------- |
| `APPLE_ID`       | Apple Developer 계정 이메일 |
| `APPLE_PASSWORD` | Apple app-specific password |
| `APPLE_TEAM_ID`  | Apple Developer Team ID     |

App Store Connect API 키 방식:

| 환경 변수            | 넣는 값                         |
| -------------------- | ------------------------------- |
| `APPLE_API_KEY`      | App Store Connect API Key ID    |
| `APPLE_API_ISSUER`   | App Store Connect Issuer ID     |
| `APPLE_API_KEY_PATH` | `AuthKey_<KEY_ID>.p8` 파일 경로 |

## Windows 서명

Windows 배포는 코드 서명 인증서로 `.msi`, NSIS `.exe` 산출물을 서명하는 흐름을 기준으로 준비합니다.

개인 또는 소규모 배포에서는 PFX 인증서를 로컬 Windows 인증서 저장소에 가져오거나 CI secret으로 저장한 뒤 빌드 과정에서 import하는 방식이 단순합니다.

필요한 환경 변수:

| 환경 변수                      | 넣는 값                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `WINDOWS_CERTIFICATE`          | PFX 인증서를 base64로 인코딩한 문자열                   |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX 인증서 비밀번호                                     |
| `TAURI_WINDOWS_SIGNTOOL_PATH`  | `signtool.exe` 경로가 자동 탐지되지 않을 때의 명시 경로 |

PFX 인증서를 로컬 Windows 머신에 가져오는 예시:

```powershell
$env:WINDOWS_CERTIFICATE_PASSWORD="pfx-export-password"
Import-PfxCertificate `
  -FilePath .\DeveloperCertificate.pfx `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -Password (ConvertTo-SecureString -String $env:WINDOWS_CERTIFICATE_PASSWORD -Force -AsPlainText)
```

`TAURI_WINDOWS_SIGNTOOL_PATH`는 Windows SDK의 `signtool.exe`를 Tauri가 찾지 못할 때만 지정합니다.

```powershell
$env:TAURI_WINDOWS_SIGNTOOL_PATH="<path-to-signtool.exe>"
```

Azure Key Vault 또는 Azure Trusted Signing은 팀 운영, CI 자동화, 인증서 보관 정책이 필요할 때 선택할 수 있는 방식입니다. Azure 기반 서명을 선택하는 경우에는 `src-tauri/tauri.conf.json`의 `bundle.windows.signCommand`에 서명 명령을 연결하고 다음 값을 CI secret으로 관리합니다.

| 환경 변수             | 넣는 값                                |
| --------------------- | -------------------------------------- |
| `AZURE_CLIENT_ID`     | Azure App Registration의 client ID     |
| `AZURE_CLIENT_SECRET` | Azure App Registration의 client secret |
| `AZURE_TENANT_ID`     | Azure Directory tenant ID              |

처음 배포를 준비하는 단계라면 Azure부터 도입하기보다 PFX 인증서 방식으로 서명 흐름을 먼저 이해하는 편이 단순합니다.

## 자동 업데이트 서명

현재 FlowDesk에는 Tauri updater plugin이 활성화되어 있지 않습니다. 자동 업데이트를 도입할 때는 업데이트 산출물을 서명하기 위한 별도 키가 필요합니다. 공개키는 앱 설정에 들어가고, 개인키는 빌드 환경의 secret으로만 보관합니다.

```bash
pnpm tauri signer generate -w ./.local/secrets/flowdesk-updater.key
```

필요한 환경 변수:

| 환경 변수                            | 넣는 값                                       |
| ------------------------------------ | --------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | updater private key 파일 경로 또는 키 내용    |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | private key 비밀번호를 설정한 경우의 비밀번호 |

updater private key가 유출되거나 분실되면 기존 설치 사용자를 위한 업데이트 신뢰 체인을 유지하기 어렵습니다. 저장소, 번들 산출물, 프론트엔드 환경 변수에 포함하지 않습니다.

## 참고 문서

- [Tauri macOS code signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri Windows code signing](https://v2.tauri.app/distribute/sign/windows/)
- [Tauri environment variables](https://v2.tauri.app/reference/environment-variables/)
- [Tauri updater](https://v2.tauri.app/plugin/updater/)

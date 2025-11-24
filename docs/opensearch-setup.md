# AWS OpenSearch 설정 가이드

NestJS 애플리케이션에서 AWS OpenSearch Service를 IAM 인증으로 연동하는 완전한 가이드

## 목차

1. [AWS OpenSearch 도메인 생성](#1-aws-opensearch-도메인-생성)
2. [IAM 사용자 및 권한 설정](#2-iam-사용자-및-권한-설정)
3. [Fine-grained Access Control 설정](#3-fine-grained-access-control-설정)
4. [도메인 액세스 정책 설정](#4-도메인-액세스-정책-설정)
5. [NestJS 코드 구성](#5-nestjs-코드-구성)
6. [환경 변수 설정](#6-환경-변수-설정)
7. [테스트 및 검증](#7-테스트-및-검증)
8. [트러블슈팅](#8-트러블슈팅)

---

## 1. AWS OpenSearch 도메인 생성

### 1.1 AWS Console 접속 및 도메인 생성 시작

1. **AWS Console 로그인**
   - https://console.aws.amazon.com 접속
   - IAM 사용자 또는 루트 계정으로 로그인

2. **OpenSearch Service 접속**
   - 상단 검색창에 "OpenSearch" 입력
   - **Amazon OpenSearch Service** 선택
   - 리전: **ap-northeast-2 (서울)** 확인

3. **도메인 생성 시작**
   - 왼쪽 메뉴 **도메인** 클릭
   - 우측 상단 **도메인 생성** 버튼 클릭

### 1.2 도메인 구성 - Step 1: 도메인 설정

**1단계: 도메인 이름 및 생성 방법**

```
도메인 이름: opensearch-datamind
```
- 도메인 이름 입력 (소문자, 숫자, 하이픈만 가능)
- **생성 방법**: "표준 생성" 선택 (빠른 생성 사용 안 함)

**2단계: 템플릿**
- **배포 템플릿**: "프로덕션" 또는 "개발/테스트" 선택
  - 개발: 비용 최소화, 단일 노드 가능
  - 프로덕션: 고가용성, 다중 AZ

**3단계: 배포 옵션**
```
배포 유형: 도메인
가용 영역: 3-AZ (권장)
- 3-AZ 사용: 활성화 (체크)
```

**4단계: 엔진 옵션**
```
엔진: OpenSearch
버전: 3.1 (최신 버전)
```
- 드롭다운에서 **OpenSearch 3.1** 선택

### 1.3 도메인 구성 - Step 2: 데이터 노드

**1단계: 데이터 노드**
```
인스턴스 유형: t3.small.search (개발) 또는 r6g.large.search (프로덕션)
노드 수: 3
```

**인스턴스 유형 선택 가이드**:
- **개발/테스트**: `t3.small.search` (2 vCPU, 2GB RAM)
- **프로덕션 소규모**: `r6g.large.search` (2 vCPU, 16GB RAM)
- **프로덕션 대규모**: `r6g.xlarge.search` 이상

**노드 수**:
- 3-AZ를 선택했다면 최소 3개 노드 (각 AZ당 1개)

**2단계: 스토리지**
```
스토리지 유형: EBS
EBS 볼륨 유형: 범용 SSD(gp3)
EBS 스토리지 크기: 10 GiB (개발) / 100 GiB (프로덕션)
```

**프로비저닝된 IOPS 설정**:
- gp3 선택 시 기본값 사용 (3000 IOPS, 125 MB/s)

### 1.4 도메인 구성 - Step 3: 네트워크

**1단계: 네트워크**
```
퍼블릭 액세스 (개발용 권장)
또는
VPC 액세스 (프로덕션용 권장)
```

**개발 환경 (퍼블릭 액세스)**:
- ✅ **퍼블릭 액세스** 선택
- IP 주소 유형: **IPv4**

**프로덕션 환경 (VPC 액세스)**:
- ✅ **VPC 액세스** 선택
- VPC: 기존 VPC 선택
- 서브넷: 3개 서브넷 선택 (각 AZ당 1개)
- 보안 그룹: OpenSearch용 보안 그룹 선택

### 1.5 도메인 구성 - Step 4: 보안 (가장 중요!)

**1단계: 세분화된 액세스 제어 (Fine-grained access control)**

⚠️ **이 단계가 가장 중요합니다!**

```
세분화된 액세스 제어 활성화: ✅ (체크 필수)
```

**마스터 사용자 생성**:
- ❌ **내부 사용자 데이터베이스에서 마스터 사용자 생성** (사용 안 함!)
- ✅ **IAM ARN을 마스터 사용자로 설정** (반드시 선택!)

```
IAM ARN: arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_USERNAME
```

**IAM ARN 찾는 방법**:
1. 다른 탭에서 IAM Console 열기
2. 왼쪽 메뉴 **사용자** 클릭
3. 사용할 사용자 선택 (예: felix)
4. **요약** 탭에서 **사용자 ARN** 복사
5. 예시: `arn:aws:iam::700526301145:user/felix`

⚠️ **왜 IAM ARN을 선택해야 하나요?**
- "내부 사용자 데이터베이스"를 선택하면 username/password 인증만 가능
- IAM ARN을 선택해야 AWS IAM 자격 증명으로 인증 가능
- 코드에서 IAM Signature V4 인증을 사용하려면 필수!

**2단계: 도메인 액세스 정책**
```
도메인 수준 액세스 정책 구성: 선택
```

**정책 입력** (개발 환경):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:YOUR_ACCOUNT_ID:domain/opensearch-datamind/*"
    }
  ]
}
```

- `YOUR_ACCOUNT_ID`를 실제 AWS 계정 ID로 변경 (예: 700526301145)

**3단계: 암호화**
```
저장 데이터 암호화 활성화: ✅ (체크)
노드 간 암호화 활성화: ✅ (체크)
도메인 엔드포인트에 HTTPS 필요: ✅ (체크)
TLS 보안 정책: TLS 1.2 이상
```

### 1.6 도메인 구성 - Step 5: 태그 (선택사항)

```
키: Environment
값: Development
```

### 1.7 도메인 생성 완료

1. **구성 검토**
   - 모든 설정 확인
   - 특히 **마스터 사용자 유형: IAM ARN** 확인!

2. **생성 버튼 클릭**
   - 우측 하단 **생성** 버튼 클릭
   - 도메인 생성 시작 (10-15분 소요)

3. **생성 상태 확인**
   - 도메인 목록에서 상태 확인
   - 상태: **로드 중...** → **활성**으로 변경 대기

4. **엔드포인트 확인**
   - 상태가 **활성**이 되면
   - **도메인 엔드포인트** 복사
   - 예시: `https://search-opensearch-datamind-rpmrcsawixdiv53f6g4bfskhy4.ap-northeast-2.es.amazonaws.com`
   - 이 엔드포인트를 `.env` 파일의 `OPENSEARCH_ENDPOINT`에 사용

---

## 2. IAM 사용자 및 권한 설정

### 2.1 IAM Console 접속

1. **IAM Console 접속**
   - AWS Console 상단 검색창에 "IAM" 입력
   - **IAM (Identity and Access Management)** 선택

2. **사용자 메뉴 이동**
   - 왼쪽 메뉴에서 **액세스 관리** > **사용자** 클릭

### 2.2 IAM 사용자 생성

1. **사용자 추가 시작**
   - 우측 상단 **사용자 생성** 버튼 클릭

2. **Step 1: 사용자 세부 정보 지정**
   ```
   사용자 이름: felix
   ```
   - 사용자 이름 입력 (OpenSearch 마스터 사용자로 사용할 이름)
   - **다음** 버튼 클릭

3. **Step 2: 권한 설정**

   **옵션 A: 정책 직접 연결 (권장)**
   - ✅ **정책 직접 연결** 선택
   - 검색창에 "OpenSearch" 입력
   - ✅ **AmazonOpenSearchServiceFullAccess** 체크

   **개발 환경에서 추가 권한 필요 시**:
   - 검색창에 "Administrator" 입력
   - ✅ **AdministratorAccess** 체크 (선택사항)

   - **다음** 버튼 클릭

4. **Step 3: 검토 및 생성**
   - 사용자 세부 정보 확인
   - 권한 정책 확인:
     - AmazonOpenSearchServiceFullAccess (필수)
     - AdministratorAccess (선택)
   - **사용자 생성** 버튼 클릭

5. **사용자 ARN 확인 및 복사**
   - 사용자가 생성되면 자동으로 사용자 상세 페이지로 이동
   - **요약** 섹션에서 **사용자 ARN** 찾기
   - ARN 복사 버튼 클릭하여 복사
   - 예시: `arn:aws:iam::700526301145:user/felix`
   - ⚠️ **이 ARN은 OpenSearch 도메인 설정에서 사용됩니다!**

### 2.3 Access Key 생성

1. **보안 자격 증명 탭으로 이동**
   - 사용자 상세 페이지에서 **보안 자격 증명** 탭 클릭

2. **액세스 키 생성 시작**
   - **액세스 키** 섹션 찾기
   - **액세스 키 만들기** 버튼 클릭

3. **Step 1: 액세스 키 모범 사례 및 대안**
   ```
   사용 사례: AWS 외부에서 실행되는 애플리케이션
   ```
   - ✅ **AWS 외부에서 실행되는 애플리케이션** 선택
   - ⚠️ 권장 사항 확인 체크박스: ✅ 체크
   - **다음** 버튼 클릭

4. **Step 2: 설명 태그 설정 (선택사항)**
   ```
   설명 태그 값: OpenSearch datamind backend access
   ```
   - 설명 태그 입력 (나중에 식별하기 쉽게)
   - **액세스 키 만들기** 버튼 클릭

5. **Step 3: 액세스 키 검색**

   ⚠️ **중요: 이 단계에서만 Secret Access Key를 확인할 수 있습니다!**

   **방법 1: 직접 복사**
   - **액세스 키**: 복사 버튼 클릭
   - **비밀 액세스 키**: 표시 버튼 클릭 후 복사

   **방법 2: CSV 파일 다운로드**
   - **.csv 파일 다운로드** 버튼 클릭
   - 파일을 안전한 위치에 저장

   **복사한 정보 저장**:
   ```
   Access Key ID: AKIA2GGU7B7MSM5SBDE5
   Secret Access Key: tySMs9oPER... (실제 키)
   ```

   - **완료** 버튼 클릭

6. **액세스 키 확인**
   - **보안 자격 증명** 탭에서 액세스 키 목록 확인
   - 상태: **활성** 확인
   - 마지막 사용: 최근 사용 시간 표시됨

### 2.4 IAM 정책 상세 내용

**AmazonOpenSearchServiceFullAccess 정책**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "es:*"
      ],
      "Resource": "*"
    }
  ]
}
```

이 정책으로 사용자는:
- ✅ OpenSearch 도메인 생성, 수정, 삭제
- ✅ 인덱스 생성, 조회, 삭제
- ✅ 데이터 검색 및 인덱싱
- ✅ Fine-grained access control 관리

### 2.5 보안 모범 사례

⚠️ **Access Key 보안**:
- ❌ 코드에 하드코딩 금지
- ❌ GitHub 등 퍼블릭 저장소에 커밋 금지
- ✅ `.env` 파일 사용 및 `.gitignore`에 추가
- ✅ AWS Secrets Manager 사용 (프로덕션)
- ✅ 정기적으로 키 로테이션 (90일 권장)

---

## 3. Fine-grained Access Control 설정

### 3.1 OpenSearch Dashboards URL 확인

1. **AWS Console에서 도메인 선택**
   - Amazon OpenSearch Service 콘솔
   - **도메인** 목록에서 `opensearch-datamind` 클릭

2. **Dashboards URL 복사**
   - **일반 정보** 섹션 찾기
   - **OpenSearch Dashboards URL** 복사
   - 예시: `https://search-opensearch-datamind-rpmrcsawixdiv53f6g4bfskhy4.ap-northeast-2.es.amazonaws.com/_dashboards`

### 3.2 OpenSearch Dashboards 첫 접속

⚠️ **마스터 사용자를 IAM ARN으로 설정한 경우**:

1. **Dashboards URL 접속**
   - 브라우저에서 복사한 URL 열기

2. **AWS IAM 인증 선택**
   - 로그인 페이지에서 다음 중 하나 선택:
     - **Sign in with IAM credentials** (있는 경우)
     - 또는 자동으로 AWS SSO 로그인 페이지로 리다이렉트

3. **AWS Console 로그인**
   - IAM 사용자 자격 증명 입력:
     - IAM user name: `felix`
     - Password: IAM 사용자 암호
   - 또는 SSO를 통해 로그인

4. **첫 접속 시 설정**
   - **Explore on my own** 선택 (튜토리얼 건너뛰기)
   - 또는 튜토리얼 진행 후 Skip

### 3.3 Role Mapping 설정

⚠️ **이 단계가 매우 중요합니다!** Role Mapping을 해야 IAM 사용자가 실제로 OpenSearch에 접근할 수 있습니다.

#### Step 1: Security 메뉴 접속

1. **왼쪽 메뉴 열기**
   - 왼쪽 상단 햄버거 메뉴 (☰) 클릭

2. **Security 메뉴 찾기**
   - 메뉴 목록에서 **Security** 찾기
   - **Security** 클릭

3. **Roles 메뉴 선택**
   - Security 하위 메뉴에서 **Roles** 클릭

#### Step 2: all_access 역할 매핑

1. **all_access 역할 찾기**
   - Roles 목록에서 **all_access** 검색 또는 찾기
   - **all_access** 역할 이름 클릭

2. **Mapped users 탭 선택**
   - 역할 상세 페이지 상단 탭 중 **Mapped users** 클릭

3. **Manage mapping 시작**
   - 우측 상단 **Manage mapping** 버튼 클릭

4. **Backend roles 섹션에 IAM ARN 추가**

   ⚠️ **중요: Backend roles 섹션만 사용하세요!**

   **Backend roles 입력**:
   ```
   arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_USERNAME
   ```

   **실제 예시**:
   ```
   arn:aws:iam::700526301145:user/felix
   ```

   **입력 방법**:
   - **Backend roles** 입력 필드 찾기
   - IAM ARN 붙여넣기
   - Enter 키 또는 + 버튼 클릭

   **Users 섹션**:
   - ❌ **비워두세요!**
   - Users는 내부 사용자 데이터베이스용입니다
   - IAM ARN은 Backend roles에만 추가

5. **매핑 저장**
   - 우측 하단 **Map** 또는 **Update** 버튼 클릭
   - 성공 메시지 확인

#### Step 3: security_manager 역할 매핑 (권장)

보안 설정 관리를 위해 `security_manager` 역할에도 매핑:

1. **Roles 목록으로 돌아가기**
   - 좌측 메뉴 **Security** > **Roles** 클릭

2. **security_manager 역할 선택**
   - 목록에서 **security_manager** 클릭

3. **동일한 방법으로 매핑**
   - **Mapped users** 탭
   - **Manage mapping** 버튼
   - **Backend roles**에 동일한 IAM ARN 추가
   - **Map** 버튼 클릭

### 3.4 Role Mapping 검증

#### Dev Tools에서 확인

1. **Dev Tools 접속**
   - 왼쪽 메뉴 (☰) > **Dev Tools** 클릭

2. **콘솔 창 열기**
   - 왼쪽 편집기 창 활성화

3. **Role Mapping 조회 쿼리 실행**
   ```
   GET _plugins/_security/api/rolesmapping/all_access
   ```
   - 쿼리 입력
   - 재생 버튼(▶) 클릭 또는 Ctrl+Enter

4. **결과 확인**

   **올바른 설정 예시**:
   ```json
   {
     "all_access": {
       "users": [],
       "backend_roles": [
         "arn:aws:iam::700526301145:user/felix"
       ],
       "and_backend_roles": []
     }
   }
   ```

   **확인 포인트**:
   - ✅ `users`: 빈 배열 `[]`
   - ✅ `backend_roles`: IAM ARN이 포함된 배열
   - ✅ ARN이 정확히 일치하는지 확인

5. **현재 사용자 정보 확인**
   ```
   GET _plugins/_security/authinfo
   ```

   **예상 결과**:
   ```json
   {
     "user": "User [name=arn:aws:iam::700526301145:user/felix, backend_roles=[arn:aws:iam::700526301145:user/felix], requestedTenant=null]",
     "user_name": "arn:aws:iam::700526301145:user/felix",
     "user_requested_tenant": null,
     "remote_address": "123.456.789.012:12345",
     "backend_roles": [
       "arn:aws:iam::700526301145:user/felix"
     ],
     "custom_attribute_names": [],
     "roles": [
       "all_access",
       "security_manager",
       "own_index"
     ]
   }
   ```

   **확인 포인트**:
   - ✅ `backend_roles`: IAM ARN 포함
   - ✅ `roles`: `all_access`와 `security_manager` 포함

### 3.5 문제 발생 시 대처 방법

**증상: `backend_roles=[]`로 표시됨**

```json
{
  "user": "User [name=arn:aws:iam::...:user/felix, backend_roles=[], requestedTenant=null]"
}
```

**원인**: Role Mapping이 아직 전파되지 않았거나 마스터 사용자 유형이 잘못됨

**해결 방법**:

1. **1-3분 대기 후 재확인**
   - Role Mapping 변경사항 전파에 시간 소요
   - Dev Tools에서 `GET _plugins/_security/authinfo` 재실행

2. **마스터 사용자 유형 확인**
   - AWS Console → OpenSearch 도메인 → **보안 구성** 탭
   - **마스터 사용자 유형**: "IAM ARN" 확인
   - "내부 사용자 데이터베이스"라면:
     - **작업** > **보안 구성 편집**
     - 마스터 사용자를 IAM ARN으로 변경
     - 저장 후 5-10분 대기

3. **Role Mapping 재설정**
   - Security > Roles > all_access
   - Mapped users 탭에서 Backend roles 확인
   - 없거나 잘못되었다면 다시 추가

---

## 4. 도메인 액세스 정책 설정

### 4.1 보안 구성 편집 페이지 접속

1. **AWS Console에서 도메인 선택**
   - Amazon OpenSearch Service 콘솔
   - **도메인** 목록에서 `opensearch-datamind` 클릭

2. **보안 구성 편집 시작**
   - 우측 상단 **작업** 드롭다운 클릭
   - **보안 구성 편집** 선택

### 4.2 도메인 액세스 정책 선택

**도메인 액세스 정책** 섹션에서 다음 중 하나 선택:

1. ❌ **세분화된 액세스 제어만 사용** (권장하지 않음)
   - Fine-grained access control에만 의존
   - 도메인 레벨에서는 모든 접근 허용

2. ❌ **도메인 수준 액세스 정책 설정 안 함** (사용 불가)
   - 모든 요청 거부
   - OpenSearch Dashboards 접근 불가

3. ✅ **도메인 수준 액세스 정책 구성** (권장)
   - 세밀한 접근 제어 가능
   - 이 옵션 선택!

### 4.3 액세스 정책 JSON 편집

**도메인 수준 액세스 정책 구성** 선택 후:

#### 개발 환경 (모든 IAM 사용자 허용)

⚠️ **개발 및 테스트 전용입니다!**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:YOUR_ACCOUNT_ID:domain/opensearch-datamind/*"
    }
  ]
}
```

**YOUR_ACCOUNT_ID 변경 방법**:
1. AWS Console 우측 상단 계정 정보 클릭
2. 계정 ID 확인 및 복사 (예: `700526301145`)
3. JSON에서 `YOUR_ACCOUNT_ID`를 실제 계정 ID로 변경

**완성된 예시**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:700526301145:domain/opensearch-datamind/*"
    }
  ]
}
```

**이 정책의 의미**:
- ✅ 모든 AWS IAM 주체(`"AWS": "*"`)가 접근 가능
- ✅ OpenSearch Dashboards 접근 가능
- ✅ 모든 OpenSearch API 작업 허용
- ⚠️ Fine-grained access control로 세부 권한은 제어됨

#### 프로덕션 환경 (특정 IAM 사용자만 허용)

🔒 **프로덕션 권장 설정**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_USERNAME"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:YOUR_ACCOUNT_ID:domain/opensearch-datamind/*"
    }
  ]
}
```

**변경 사항**:
1. `YOUR_ACCOUNT_ID`: AWS 계정 ID로 변경
2. `YOUR_USERNAME`: IAM 사용자 이름으로 변경 (예: `felix`)

**완성된 예시**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::700526301145:user/felix"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:700526301145:domain/opensearch-datamind/*"
    }
  ]
}
```

**이 정책의 의미**:
- ✅ 특정 IAM 사용자(`felix`)만 접근 가능
- ✅ 다른 AWS 계정이나 사용자는 차단됨
- 🔒 프로덕션 환경에서 더 안전

#### 여러 IAM 사용자 허용 (프로덕션 - 팀 환경)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::700526301145:user/felix",
          "arn:aws:iam::700526301145:user/backend-service",
          "arn:aws:iam::700526301145:role/OpenSearchAdminRole"
        ]
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:700526301145:domain/opensearch-datamind/*"
    }
  ]
}
```

**여러 주체 설정**:
- 배열 형태로 여러 IAM ARN 추가 가능
- IAM 사용자와 역할 모두 포함 가능

### 4.4 변경사항 저장 및 대기

1. **정책 검증**
   - JSON 문법 오류가 있는지 확인
   - AWS Console에서 자동으로 검증됨

2. **저장 버튼 클릭**
   - 페이지 하단 **저장** 버튼 클릭
   - 확인 대화상자: **확인** 클릭

3. **도메인 상태 확인**
   - 상태: **처리 중...** 표시
   - 5-10분 대기
   - 상태: **활성** 으로 변경될 때까지 대기

4. **변경사항 적용 확인**
   - 상태가 **활성**이 되면 설정 완료
   - OpenSearch Dashboards에 접속하여 확인

### 4.5 정책 변경 후 확인

1. **OpenSearch Dashboards 재접속**
   - 브라우저에서 Dashboards URL 새로고침
   - 정상 접속 확인

2. **Dev Tools에서 테스트**
   ```
   GET /
   ```
   - 클러스터 정보가 정상적으로 반환되는지 확인

3. **백엔드 애플리케이션 테스트**
   ```bash
   node scripts/test-opensearch-connection.js
   ```
   - IAM 인증이 정상 작동하는지 확인

### 4.6 정책 선택 가이드

| 환경 | 권장 정책 | 보안 수준 | 용도 |
|------|----------|---------|------|
| **로컬 개발** | 모든 접근 허용 (`"AWS": "*"`) | 낮음 | 빠른 개발, 테스트 |
| **개발 서버** | 특정 사용자만 허용 | 중간 | 팀 개발 환경 |
| **스테이징** | 특정 사용자 + 역할 | 높음 | 프로덕션 준비 |
| **프로덕션** | 최소 권한 원칙 | 최고 | 실제 서비스 |

**권장 사항**:
- 개발 초기: 모든 접근 허용 (빠른 개발)
- 프로덕션 이전: 특정 사용자로 변경 (보안 강화)
- 정기적으로 정책 검토 및 최소 권한 원칙 적용

---

## 5. NestJS 코드 구성

### 5.1 필요한 패키지 설치

```bash
pnpm add @opensearch-project/opensearch @aws-sdk/credential-providers aws4
```

### 5.2 OpenSearch Service 구현

`src/common/opensearch.service.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeClient();
      await this.createIndexIfNotExists();
      this.logger.log('OpenSearch initialization completed');
    } catch (error) {
      this.logger.warn(`Failed to initialize OpenSearch: ${error.message}`);
    }
  }

  private async initializeClient(): Promise<void> {
    const config = this.configService.get('opensearch');
    const region = process.env.AWS_REGION || 'ap-northeast-2';

    this.client = new Client({
      ...AwsSigv4Signer({
        region,
        service: 'es', // OpenSearch는 'es' 서비스 이름 사용
        getCredentials: () => {
          const provider = fromNodeProviderChain();
          return provider();
        },
      }),
      node: config.node,
      ssl: config.ssl,
    });

    this.logger.log(`OpenSearch client initialized: ${config.node}`);
  }

  private async createIndexIfNotExists(): Promise<void> {
    const indexName = 'products';

    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (!exists.body) {
        this.logger.log(`Creating index: ${indexName}`);

        await this.client.indices.create({
          index: indexName,
          body: {
            settings: {
              index: {
                knn: true,
                number_of_shards: 1,
                number_of_replicas: 2, // Zone awareness 3개 AZ 대응
              },
            },
            mappings: {
              properties: {
                product_id: { type: 'keyword' },
                name: { type: 'text' },
                description: { type: 'text' },
                category: { type: 'keyword' },
                market_name: { type: 'text' },
                embedding: {
                  type: 'knn_vector',
                  dimension: 1536, // Titan Embeddings 차원
                  method: {
                    name: 'hnsw',
                    space_type: 'l2',
                    engine: 'lucene', // OpenSearch 3.0+ 호환
                    parameters: {
                      ef_construction: 128,
                      m: 16,
                    },
                  },
                },
              },
            },
          },
        });

        this.logger.log(`Index created: ${indexName}`);
      } else {
        this.logger.log(`Index already exists: ${indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create index: ${error.message}`);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }

  async indexExists(indexName: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index: indexName });
      return response.body;
    } catch (error) {
      this.logger.error(`Failed to check index: ${error.message}`);
      return false;
    }
  }
}
```

### 5.3 설정 파일

`src/config/opensearch.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('opensearch', () => ({
  node: process.env.OPENSEARCH_ENDPOINT,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
}));
```

### 5.4 모듈 등록

`src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import opensearchConfig from './config/opensearch.config';
import { OpenSearchService } from './common/opensearch.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [opensearchConfig],
    }),
  ],
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class AppModule {}
```

---

## 6. 환경 변수 설정

`.env` 파일:

```bash
# AWS 자격 증명
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA2GGU7B7MSM5SBDE5
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# OpenSearch 엔드포인트
OPENSEARCH_ENDPOINT=https://search-opensearch-datamind-XXXXXX.ap-northeast-2.es.amazonaws.com

# 환경
NODE_ENV=development
```

⚠️ **보안 주의사항**:
- `.env` 파일을 `.gitignore`에 추가
- 프로덕션에서는 AWS Secrets Manager 사용 권장

---

## 7. 테스트 및 검증

### 7.1 테스트 스크립트 작성

`scripts/test-opensearch-connection.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// .env 파일 수동 로드
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const { Client } = require('@opensearch-project/opensearch');
const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');

async function testConnection() {
  try {
    console.log('\n=== OpenSearch Connection Test ===');

    const region = process.env.AWS_REGION || 'ap-northeast-2';
    const endpoint = process.env.OPENSEARCH_ENDPOINT;

    console.log('Endpoint:', endpoint);
    console.log('Region:', region);

    const credentialsProvider = fromNodeProviderChain();
    const credentials = await credentialsProvider();

    console.log('\n=== AWS Credentials ===');
    console.log('Access Key ID:', credentials.accessKeyId);

    const client = new Client({
      ...AwsSigv4Signer({
        region,
        service: 'es',
        getCredentials: () => {
          const provider = fromNodeProviderChain();
          return provider();
        },
      }),
      node: endpoint,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    console.log('\n=== Testing OpenSearch Connection ===');

    const info = await client.info();
    console.log('✅ Connection successful!');
    console.log('Cluster name:', info.body.cluster_name);
    console.log('Version:', info.body.version.number);

    const exists = await client.indices.exists({ index: 'products' });
    console.log('\n=== Testing Index Operations ===');
    console.log('Products index exists:', exists.body);

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Connection test failed');
    console.error('Error:', error.message);

    if (error.meta) {
      console.error('Status code:', error.meta.statusCode);
      console.error('Response body:', error.meta.body);
    }

    process.exit(1);
  }
}

testConnection();
```

### 7.2 테스트 실행

```bash
# IAM 자격 증명 확인
node scripts/test-aws-creds.js

# OpenSearch 연결 테스트
node scripts/test-opensearch-connection.js

# NestJS 앱 실행
pnpm run start:dev
```

**예상 결과**:
```
✅ Connection successful!
✅ Cluster name: 700526301145:opensearch-datamind
✅ Version: 3.1.0
✅ Products index exists: true
✅ All tests passed!
```

---

## 8. 트러블슈팅

### 8.1 HTTP 403 Forbidden 에러

**증상**:
```
security_exception: no permissions for [cluster:monitor/main]
User [name=arn:aws:iam::ACCOUNT:user/USERNAME, backend_roles=[], requestedTenant=null]
```

**원인**: `backend_roles=[]` - Role Mapping이 적용되지 않음

**해결 방법**:

1. **마스터 사용자 유형 확인**
   - AWS Console → OpenSearch 도메인 → 세부 정보 탭
   - **마스터 사용자 유형**: "IAM ARN"이어야 함
   - "내부 사용자 데이터베이스"로 설정되어 있다면 **변경 필요**

2. **마스터 사용자 변경**
   - **작업** → **보안 구성 편집**
   - 마스터 사용자 → **IAM ARN** 선택
   - IAM ARN: `arn:aws:iam::ACCOUNT_ID:user/USERNAME`
   - 저장 후 5-10분 대기

3. **Role Mapping 재설정**
   - OpenSearch Dashboards → Security → Roles → all_access
   - Mapped users → Backend roles에 IAM ARN 추가

### 8.2 Zone Awareness 에러

**증상**:
```
illegal_argument_exception: expected total copies needs to be a multiple
of total awareness attributes [3]
```

**원인**: 3-AZ 구성에서 `number_of_replicas`가 올바르지 않음

**해결 방법**:

`number_of_replicas`를 **2**로 설정:
- 1 shard + 2 replicas = 3 total copies (3의 배수)

```typescript
settings: {
  index: {
    number_of_shards: 1,
    number_of_replicas: 2, // 3-AZ 대응
  },
}
```

### 8.3 nmslib 엔진 deprecated 에러

**증상**:
```
mapper_parsing_exception: nmslib engine is deprecated in OpenSearch
and cannot be used for new index creation in OpenSearch from 3.0.0.
```

**원인**: OpenSearch 3.0 이상은 `nmslib` 엔진 미지원

**해결 방법**:

`lucene` 엔진 사용:

```typescript
embedding: {
  type: 'knn_vector',
  dimension: 1536,
  method: {
    name: 'hnsw',
    space_type: 'l2',
    engine: 'lucene', // nmslib 대신 lucene 사용
    parameters: {
      ef_construction: 128,
      m: 16,
    },
  },
}
```

### 8.4 OpenSearch Dashboards 접근 불가

**증상**:
```
User: anonymous is not authorized to perform: es:ESHttpGet
```

**원인**: 도메인 액세스 정책이 OpenSearch Dashboards 접근을 차단

**해결 방법**:

도메인 액세스 정책을 모든 접근 허용으로 변경 (개발 환경):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:REGION:ACCOUNT:domain/DOMAIN_NAME/*"
    }
  ]
}
```

### 8.5 자격 증명 확인

IAM 자격 증명이 올바른지 확인:

```bash
# AWS CLI로 확인
aws sts get-caller-identity

# 또는 테스트 스크립트
node scripts/test-aws-creds.js
```

**예상 결과**:
```json
{
  "UserId": "AIDASAMPLEUSERID",
  "Account": "700526301145",
  "Arn": "arn:aws:iam::700526301145:user/felix"
}
```

---

## 9. 주요 설정 체크리스트

OpenSearch 연동 전 반드시 확인:

- [ ] OpenSearch 도메인 생성 완료 (3.1.0 버전)
- [ ] Fine-grained access control **활성화**
- [ ] 마스터 사용자 유형: **IAM ARN** (내부 사용자 DB 아님!)
- [ ] IAM 사용자 생성 및 Access Key 발급
- [ ] IAM 정책: AmazonOpenSearchServiceFullAccess 연결
- [ ] 도메인 액세스 정책: IAM 사용자 허용
- [ ] Role Mapping: all_access에 IAM ARN 추가 (Backend roles)
- [ ] `number_of_replicas`: 2 (3-AZ 대응)
- [ ] KNN 엔진: `lucene` (nmslib 아님!)
- [ ] 환경 변수 설정 완료 (.env)
- [ ] 테스트 스크립트 실행 성공

---

## 10. 참고 자료

- [AWS OpenSearch Service 문서](https://docs.aws.amazon.com/opensearch-service/)
- [Fine-grained access control](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html)
- [IAM과 OpenSearch 통합](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/security-iam.html)
- [OpenSearch k-NN 플러그인](https://opensearch.org/docs/latest/search-plugins/knn/index/)
- [@opensearch-project/opensearch](https://github.com/opensearch-project/opensearch-js)

---

## 문서 업데이트 이력

- 2025-11-24: 초기 문서 작성 (OpenSearch 3.1.0, IAM 인증, 트러블슈팅 포함)
- 2025-11-24: AWS Console 설정 가이드 상세화 (클릭-바이-클릭 수준으로 업데이트)
  - 도메인 생성 단계별 상세 설명 추가
  - IAM 사용자 및 Access Key 생성 과정 구체화
  - Fine-grained Access Control 설정 방법 명확화
  - 도메인 액세스 정책 선택 가이드 및 환경별 권장 사항 추가

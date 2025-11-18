# Terraform Bootstrap

이 디렉토리는 Terraform State Backend를 설정하기 위한 일회성 bootstrap 구성입니다.

## 목적

Terraform의 원격 상태 저장을 위한 인프라를 생성합니다:
- **S3 Bucket**: Terraform state 파일 저장
- **DynamoDB Table**: State locking (동시 수정 방지)

## 사용 방법

### 1. AWS CLI 구성

```bash
# AWS credentials 설정
aws configure

# 또는 환경 변수 사용
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### 2. Bootstrap 실행 (최초 1회만)

```bash
cd terraform/bootstrap

# Terraform 초기화
terraform init

# 실행 계획 확인
terraform plan

# 리소스 생성
terraform apply
```

### 3. 출력 확인

```bash
# 생성된 리소스 확인
terraform output

# 예시 출력:
# s3_bucket_name = "ndmarket-terraform-state"
# dynamodb_table_name = "ndmarket-terraform-locks"
```

## 생성되는 리소스

### S3 Bucket
- **이름**: `ndmarket-terraform-state`
- **버저닝**: 활성화 (상태 파일 히스토리)
- **암호화**: AES256 서버 측 암호화
- **퍼블릭 액세스**: 차단
- **라이프사이클**: `prevent_destroy = true`

### DynamoDB Table
- **이름**: `ndmarket-terraform-locks`
- **결제 모드**: Pay-per-request (사용량 기반)
- **해시 키**: `LockID` (String)

## 주의사항

1. **한 번만 실행**: 이 구성은 최초 1회만 실행합니다
2. **삭제 방지**: S3 bucket에 `prevent_destroy`가 설정되어 있어 실수로 삭제되지 않습니다
3. **비용**: S3와 DynamoDB 사용량에 따라 소액의 비용이 발생합니다 (~$1-5/month)
4. **리전**: 기본 리전은 `us-east-1`입니다

## Bootstrap 후 작업

Bootstrap이 완료되면 메인 Terraform 구성(`terraform/environments/prod`)에서 다음과 같이 원격 상태를 사용할 수 있습니다:

```hcl
terraform {
  backend "s3" {
    bucket         = "ndmarket-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ndmarket-terraform-locks"
  }
}
```

이미 `terraform/environments/prod/main.tf`에 설정되어 있습니다.

## 문제 해결

### Bucket 이름 충돌
S3 bucket 이름이 이미 사용 중이면 다른 이름을 사용하세요:
```hcl
bucket = "ndmarket-terraform-state-<your-unique-suffix>"
```

### 권한 오류
IAM 사용자/역할에 다음 권한이 필요합니다:
- `s3:CreateBucket`
- `s3:PutBucketVersioning`
- `s3:PutEncryptionConfiguration`
- `dynamodb:CreateTable`
- `dynamodb:DescribeTable`

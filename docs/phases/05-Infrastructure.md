# Phase 5: Infrastructure

## 📋 작업 정의 및 목표 (What & Why)

### What
Terraform을 사용하여 AWS/GCP 멀티 클라우드 인프라를 코드로 관리하고, CI/CD 파이프라인을 구축하여 프로덕션 환경에 자동 배포합니다.

### Why
- 인프라를 코드로 관리하여 재현 가능하고 버전 관리 가능
- 수동 설정 오류 방지 및 일관성 유지
- 자동 배포로 개발 속도 향상
- 모니터링 및 알람으로 안정적 운영
- 프로덕션 환경 보안 강화

### 달성 결과
- Terraform으로 전체 인프라 자동 생성
- GitHub Actions 기반 CI/CD 파이프라인
- CloudWatch 모니터링 및 알람 설정
- 프로덕션 환경 배포 완료

---

## 🔧 기술 스펙 및 제약사항

### 사용 기술 스택
- **IaC**: Terraform 1.6+
- **CI/CD**: GitHub Actions
- **Container**: Docker + Amazon ECS Fargate
- **Monitoring**: AWS CloudWatch, OpenSearch Dashboards
- **Secrets**: AWS Secrets Manager
- **Networking**: AWS VPC, GCP Private Service Connect

### Terraform 모듈
- `vpc/` - AWS VPC, Subnets, NAT Gateway
- `iam/` - IAM Roles, Policies
- `ecs/` - ECS Cluster, Task Definition, Service
- `opensearch/` - OpenSearch Serverless Collection
- `monitoring/` - CloudWatch Logs, Alarms, Dashboards

### 제약사항
- Terraform state는 S3 + DynamoDB로 관리
- 프로덕션은 별도 AWS 계정 권장
- GCP ↔ AWS 네트워킹은 Private Service Connect 사용
- 비용 최적화를 위한 리소스 태깅 필수

---

## 📝 Task 목록

### Task 5.0: 프로젝트 구조 결정 및 설정

#### What & Why
개발 소스코드와 Terraform 인프라 코드를 같은 저장소에 둘지, 분리할지 결정하고 프로젝트 구조를 설정합니다. 팀 규모, 보안 요구사항, 개발 단계에 따라 최적의 구조를 선택합니다.

#### Tech Spec
- **Monorepo**: 애플리케이션 + 인프라 코드 통합
- **Multi-repo**: 애플리케이션과 인프라 저장소 분리
- **권한 관리**: GitHub CODEOWNERS, Branch Protection
- **CI/CD 분리**: Path-based triggers

#### How

**1. 프로젝트 구조 결정 기준**

| 기준 | Monorepo | Multi-repo |
|------|----------|------------|
| 팀 규모 | 1-3명 (MVP 단계) | 3명+ (프로덕션) |
| 보안 요구사항 | 낮음 | 높음 (인프라 접근 제한) |
| 개발 속도 | 빠름 (통합 관리) | 느림 (동기화 필요) |
| 버전 관리 | 간단 (단일 태그) | 복잡 (버전 매핑) |
| 권한 관리 | CODEOWNERS로 가능 | 저장소 수준 분리 |

**2. MVP 단계 권장 구조: Monorepo**

```bash
# 프로젝트 디렉토리 구조 생성
datamind/
├── src/                    # NestJS 애플리케이션
│   ├── agents/
│   ├── modules/
│   ├── common/
│   └── main.ts
├── terraform/              # 인프라 코드
│   ├── modules/
│   │   ├── vpc/
│   │   ├── iam/
│   │   ├── ecs/
│   │   ├── opensearch/
│   │   └── monitoring/
│   └── environments/
│       ├── dev/
│       └── prod/
├── dashboard/              # Streamlit 대시보드
│   └── app.py
├── docs/
│   └── phases/
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       ├── app-deploy.yml
│       ├── infra-deploy.yml
│       └── test.yml
├── package.json
├── Dockerfile
└── README.md
```

**3. CODEOWNERS 설정** (권한 관리)

`.github/CODEOWNERS` 생성:
```
# 애플리케이션 코드 - 모든 개발자
/src/**                    @developers
/dashboard/**              @developers
/docs/**                   @everyone

# 인프라 코드 - DevOps 팀 + 시니어 개발자만
/terraform/**              @devops-team @senior-developers
/.github/workflows/**      @devops-team

# 설정 파일 - 리뷰 필수
package.json               @senior-developers
Dockerfile                 @devops-team
```

**4. CI/CD 파이프라인 분리**

`.github/workflows/app-deploy.yml`:
```yaml
name: Deploy Application

on:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'package.json'
      - 'Dockerfile'
      - '.github/workflows/app-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Run tests
        run: pnpm test

      - name: Build and deploy
        run: |
          # Docker build & push
          # ECS deployment
```

`.github/workflows/infra-deploy.yml`:
```yaml
name: Deploy Infrastructure

on:
  push:
    branches:
      - main
    paths:
      - 'terraform/**'
  workflow_dispatch:  # 수동 실행만 허용 (안전성)

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Terraform Plan
        run: |
          cd terraform/environments/prod
          terraform init
          terraform plan

      - name: Terraform Apply
        if: github.event_name == 'workflow_dispatch'
        run: |
          cd terraform/environments/prod
          terraform apply -auto-approve
```

**5. Branch Protection Rules 설정**

GitHub Settings → Branches → Add rule:

```yaml
Branch name pattern: main

Protection rules:
  ✓ Require a pull request before merging
  ✓ Require approvals: 1
  ✓ Require review from Code Owners
  ✓ Require status checks to pass
    - test
    - lint
  ✓ Require branches to be up to date
  ✓ Do not allow bypassing the above settings

Path-specific rules:
  terraform/**
    ✓ Require approvals: 2
    ✓ Restrict who can push: @devops-team
```

**6. .gitignore 설정**

`.gitignore`:
```
# Dependencies
node_modules/
.pnpm-store/

# Environment variables
.env
.env.local
.env.*.local

# Terraform
terraform/.terraform/
terraform/.terraform.lock.hcl
terraform/**/*.tfstate
terraform/**/*.tfstate.backup
terraform/**/*.tfvars  # 민감 정보 포함 가능

# Build
dist/
build/

# IDE
.vscode/
.idea/

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
```

**7. 프로덕션 이후 Multi-repo 전환 (선택사항)**

팀이 확장되고 프로덕션 배포 시작 시:

```bash
# 새 저장소 생성
datamind-app/          # 애플리케이션
datamind-infra/        # 인프라

# Git subtree로 분리
git subtree split -P terraform -b infra-branch
cd ../datamind-infra
git pull ../datamind infra-branch
```

**8. 프로젝트 README 업데이트**

`README.md`에 구조 설명 추가:
```markdown
# NDMarket AI Insight Platform

## 프로젝트 구조

- `src/` - NestJS 백엔드 애플리케이션
- `terraform/` - AWS/GCP 인프라 코드 (Terraform)
- `dashboard/` - Streamlit 관리자 대시보드
- `docs/` - 프로젝트 문서 및 Phase 가이드

## 권한 관리

- 애플리케이션 코드: 모든 개발자
- 인프라 코드: DevOps 팀 승인 필수
- CI/CD 워크플로우: Path-based triggers로 분리

## 배포

- 애플리케이션: `src/` 변경 시 자동 배포
- 인프라: `terraform/` 변경 시 수동 승인 후 배포
```

#### Acceptance Criteria
- [ ] 프로젝트 디렉토리 구조 생성 (Monorepo)
- [ ] `.github/CODEOWNERS` 파일 설정
- [ ] CI/CD 워크플로우 분리 (app-deploy, infra-deploy)
- [ ] Branch Protection Rules 설정
- [ ] `.gitignore`에 민감 정보 파일 포함
- [ ] Path-based triggers 작동 확인
- [ ] 인프라 변경 시 승인 프로세스 작동
- [ ] README에 프로젝트 구조 문서화

---

### Task 5.2: Terraform 프로젝트 구조 설정

#### What & Why
Terraform 프로젝트 구조를 생성하고 State 관리를 위한 백엔드를 설정합니다.

#### Tech Spec
- Terraform 1.6+
- S3 backend for state
- DynamoDB for state locking
- Module-based structure

#### How

1. 디렉토리 구조 생성:
```bash
mkdir -p terraform/{modules,environments/{dev,prod}}

terraform/
├── modules/
│   ├── vpc/
│   ├── iam/
│   ├── ecs/
│   ├── opensearch/
│   └── monitoring/
└── environments/
    ├── dev/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── prod/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

2. `terraform/backend.tf` 생성:
```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "ndmarket-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ndmarket-terraform-locks"
  }
}
```

3. State 백엔드 리소스 생성 (한 번만 실행):
```hcl
# terraform/bootstrap/main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "ndmarket-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "ndmarket-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

#### Acceptance Criteria
- [ ] Terraform 디렉토리 구조 생성
- [ ] S3 백엔드 버킷 생성
- [ ] DynamoDB 락 테이블 생성
- [ ] `terraform init` 성공
- [ ] State가 S3에 저장됨

---

### Task 5.3: VPC 및 네트워크 모듈

#### What & Why
AWS VPC, 서브넷, NAT Gateway를 생성하여 안전한 네트워크 환경을 구축합니다.

#### Tech Spec
- VPC CIDR: 10.0.0.0/16
- Public Subnets: 2개 (Multi-AZ)
- Private Subnets: 2개 (Multi-AZ)
- NAT Gateway: 1개 (비용 최적화)

#### How

1. `terraform/modules/vpc/main.tf`:
```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project_name}-vpc"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-${count.index + 1}"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-private-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}-nat"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

2. `terraform/modules/vpc/variables.tf`:
```hcl
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.20.0/24"]
}
```

#### Acceptance Criteria
- [ ] VPC 생성 성공
- [ ] Public/Private Subnets 2개씩 생성
- [ ] Internet Gateway 연결
- [ ] NAT Gateway 작동
- [ ] Route Tables 올바르게 연결

---

### Task 5.4: IAM Roles 및 Policies 모듈

#### What & Why
ECS Task, Bedrock 접근, OpenSearch 접근 등을 위한 IAM Roles와 Policies를 생성합니다.

#### Tech Spec
- ECS Task Execution Role
- ECS Task Role (Bedrock, OpenSearch, Secrets Manager 접근)
- Least privilege principle

#### How

1. `terraform/modules/iam/main.tf`:
```hcl
# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (for application)
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# Bedrock Access Policy
resource "aws_iam_policy" "bedrock_access" {
  name = "${var.project_name}-bedrock-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-sonnet*",
          "arn:aws:bedrock:${var.region}::foundation-model/amazon.titan-embed*"
        ]
      }
    ]
  })
}

# OpenSearch Access Policy
resource "aws_iam_policy" "opensearch_access" {
  name = "${var.project_name}-opensearch-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "aoss:APIAccessAll"
        ]
        Resource = "*"
      }
    ]
  })
}

# Secrets Manager Access Policy
resource "aws_iam_policy" "secrets_access" {
  name = "${var.project_name}-secrets-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${var.region}:*:secret:ndmarket/*"
      }
    ]
  })
}

# Attach policies to task role
resource "aws_iam_role_policy_attachment" "task_bedrock" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.bedrock_access.arn
}

resource "aws_iam_role_policy_attachment" "task_opensearch" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.opensearch_access.arn
}

resource "aws_iam_role_policy_attachment" "task_secrets" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.secrets_access.arn
}
```

#### Acceptance Criteria
- [ ] ECS Task Execution Role 생성
- [ ] ECS Task Role 생성
- [ ] Bedrock 접근 정책 연결
- [ ] OpenSearch 접근 정책 연결
- [ ] Secrets Manager 접근 정책 연결
- [ ] Least privilege 원칙 준수

---

### Task 5.5: ECS Fargate 배포 모듈

#### What & Why
Docker 컨테이너를 ECS Fargate에 배포하여 서버리스 컨테이너 실행 환경을 구축합니다.

#### Tech Spec
- ECS Cluster
- Task Definition (NestJS app)
- ECS Service with Auto Scaling
- Application Load Balancer

#### How

1. `terraform/modules/ecs/main.tf`:
```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name  = "app"
    image = var.app_image
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "AWS_REGION", value = var.region }
    ]
    secrets = [
      {
        name      = "DATABASE_PASSWORD"
        valueFrom = "arn:aws:secretsmanager:${var.region}:*:secret:ndmarket/database/credentials:password::"
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "app"
      }
    }
  }])
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name   = "${var.project_name}-ecs-tasks"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.app]
}

# Application Load Balancer
resource "aws_security_group" "alb" {
  name   = "${var.project_name}-alb"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

#### Acceptance Criteria
- [ ] ECS Cluster 생성
- [ ] Task Definition 등록
- [ ] ECS Service 실행 (Fargate)
- [ ] Application Load Balancer 작동
- [ ] Health check 통과
- [ ] 컨테이너 로그가 CloudWatch에 저장됨

---

### Task 5.6: CI/CD 파이프라인 (GitHub Actions)

#### What & Why
GitHub Actions를 사용하여 코드 푸시 시 자동으로 빌드, 테스트, 배포하는 파이프라인을 구축합니다.

#### Tech Spec
- GitHub Actions
- Docker build & push to ECR
- ECS Task Definition update
- Blue-Green deployment (optional)

#### How

1. `.github/workflows/deploy.yml` 생성:
```yaml
name: Deploy to ECS

on:
  push:
    branches:
      - main

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: ndmarket-app
  ECS_CLUSTER: ndmarket-cluster
  ECS_SERVICE: ndmarket-service
  ECS_TASK_DEFINITION: ndmarket-app

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image to ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Download task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition $ECS_TASK_DEFINITION \
            --query taskDefinition > task-definition.json

      - name: Update task definition with new image
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: app
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

2. `Dockerfile` 생성:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install

COPY . .

RUN pnpm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
```

#### Acceptance Criteria
- [ ] GitHub Actions workflow 작동
- [ ] Docker 이미지 빌드 성공
- [ ] ECR에 이미지 푸시 성공
- [ ] ECS Task Definition 업데이트
- [ ] ECS Service 자동 배포
- [ ] Health check 통과 후 배포 완료

---

### Task 5.7: 모니터링 및 알람 설정

#### What & Why
CloudWatch를 사용하여 애플리케이션 메트릭을 모니터링하고 이상 발생 시 알람을 받습니다.

#### Tech Spec
- CloudWatch Logs
- CloudWatch Alarms
- SNS for notifications

#### How

1. `terraform/modules/monitoring/main.tf`:
```hcl
# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 30
}

# SNS Topic for Alarms
resource "aws_sns_topic" "alarms" {
  name = "${var.project_name}-alarms"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
}

# Memory Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${var.project_name}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
}

# Error Rate Alarm
resource "aws_cloudwatch_log_metric_filter" "errors" {
  name           = "${var.project_name}-errors"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "[ERROR]"

  metric_transformation {
    name      = "ErrorCount"
    namespace = "${var.project_name}/App"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${var.project_name}-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorCount"
  namespace           = "${var.project_name}/App"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  alarm_actions = [aws_sns_topic.alarms.arn]
}
```

#### Acceptance Criteria
- [ ] CloudWatch Logs 수집
- [ ] CPU/Memory 알람 작동
- [ ] 에러 로그 필터링 및 알람
- [ ] SNS 이메일 알림 수신
- [ ] 알람 임계값 적절히 설정

---

## ✅ Phase 완료 기준

- [ ] 프로젝트 구조 결정 (Monorepo 선택)
- [ ] CODEOWNERS 및 Branch Protection 설정
- [ ] CI/CD 파이프라인 분리 (app/infra)
- [ ] Terraform 프로젝트 구조 완성
- [ ] S3 백엔드로 State 관리
- [ ] VPC 및 네트워크 인프라 생성
- [ ] IAM Roles 및 Policies 구성
- [ ] ECS Fargate에 NestJS 앱 배포 성공
- [ ] Application Load Balancer 작동
- [ ] GitHub Actions CI/CD 파이프라인 작동
- [ ] 자동 배포 성공 (코드 푸시 → 배포)
- [ ] CloudWatch 모니터링 및 알람 설정
- [ ] 프로덕션 환경에서 안정적 운영
- [ ] 전체 인프라를 `terraform apply` 한 번으로 생성 가능

## 🎉 프로젝트 완료

Phase 5 완료로 NDMarket AI Insight Platform MVP가 완성되었습니다!

**다음 확장 기능**:
- Bedrock Knowledge Base + RAG
- Multi-Agent Collaboration System
- Real-time Analytics Agent
- Fine-tuned Embedding Model
- Multi-Modal Input (이미지 기반 질의)

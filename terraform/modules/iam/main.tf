# IAM Module - Roles and Policies for ECS Tasks

# ECS Task Execution Role
# This role is used by ECS to pull container images and write logs
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-ecs-task-execution-role"
    Project = var.project_name
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for ECR access
resource "aws_iam_role_policy" "ecs_task_execution_ecr" {
  name = "${var.project_name}-ecs-task-execution-ecr-policy"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Task Role
# This role is used by the application running inside the container
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-ecs-task-role"
    Project = var.project_name
  }
}

# Bedrock Access Policy
resource "aws_iam_role_policy" "bedrock_access" {
  name = "${var.project_name}-bedrock-access-policy"
  role = aws_iam_role.ecs_task.id

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
          "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
          "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
          "arn:aws:bedrock:${var.region}::foundation-model/amazon.titan-embed-text-v1"
        ]
      }
    ]
  })
}

# OpenSearch Serverless Access Policy
resource "aws_iam_role_policy" "opensearch_access" {
  name = "${var.project_name}-opensearch-access-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "aoss:APIAccessAll"
        ]
        Resource = "arn:aws:aoss:${var.region}:*:collection/*"
      }
    ]
  })
}

# CloudWatch Logs Access Policy
resource "aws_iam_role_policy" "cloudwatch_logs" {
  name = "${var.project_name}-cloudwatch-logs-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.region}:*:log-group:/aws/ecs/${var.project_name}*:*"
      }
    ]
  })
}

# Secrets Manager Access Policy (for DB credentials)
resource "aws_iam_role_policy" "secrets_manager" {
  name = "${var.project_name}-secrets-manager-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${var.region}:*:secret:${var.project_name}/*"
      }
    ]
  })
}

# SSM Parameter Store Access Policy
resource "aws_iam_role_policy" "ssm_parameters" {
  name = "${var.project_name}-ssm-parameters-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.region}:*:parameter/${var.project_name}/*"
      }
    ]
  })
}

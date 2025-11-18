terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "ndmarket-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ndmarket-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "NDMarket"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# IAM Module
module "iam" {
  source = "../../modules/iam"

  project_name = var.project_name
  region       = var.aws_region
}

# OpenSearch Module
module "opensearch" {
  source = "../../modules/opensearch"

  project_name = var.project_name
  environment  = var.environment
}

# ECS Module
module "ecs" {
  source = "../../modules/ecs"

  project_name         = var.project_name
  environment          = var.environment
  region               = var.aws_region
  vpc_id               = module.vpc.vpc_id
  public_subnet_ids    = module.vpc.public_subnet_ids
  private_subnet_ids   = module.vpc.private_subnet_ids
  execution_role_arn   = module.iam.ecs_task_execution_role_arn
  task_role_arn        = module.iam.ecs_task_role_arn
  app_image            = var.app_image
  task_cpu             = var.task_cpu
  task_memory          = var.task_memory
  desired_count        = var.desired_count
}

# Monitoring Module
module "monitoring" {
  source = "../../modules/monitoring"

  project_name = var.project_name
  cluster_name = module.ecs.cluster_name
  service_name = module.ecs.service_name
  alarm_email  = var.alarm_email
}

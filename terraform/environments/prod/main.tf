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

# Local values for EKS cluster name
locals {
  eks_cluster_name = "${var.project_name}-${var.environment}-cluster"
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  # EKS subnet tags
  enable_eks_tags  = true
  eks_cluster_name = local.eks_cluster_name
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

# EKS Module
module "eks" {
  source = "../../modules/eks"

  project_name        = var.project_name
  environment         = var.environment
  region              = var.aws_region
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids

  # Kubernetes configuration
  kubernetes_version  = var.kubernetes_version
  node_instance_types = var.node_instance_types
  node_desired_size   = var.node_desired_size
  node_min_size       = var.node_min_size
  node_max_size       = var.node_max_size

  # Container images
  backend_image  = var.backend_image
  frontend_image = var.frontend_image
}

# Secrets Module (AWS Secrets Manager)
module "secrets" {
  source = "../../modules/secrets"

  project_name = var.project_name
  environment  = var.environment

  # Database credentials
  db_host     = var.db_host
  db_port     = var.db_port
  db_username = var.db_username
  db_password = var.db_password
  db_database = var.db_database

  # OpenSearch
  opensearch_endpoint = module.opensearch.endpoint

  # EKS OIDC for IRSA
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
}

# Monitoring Module
module "monitoring" {
  source = "../../modules/monitoring"

  project_name = var.project_name
  cluster_name = module.eks.cluster_name
  service_name = "backend"  # K8s deployment name
  alarm_email  = var.alarm_email
}

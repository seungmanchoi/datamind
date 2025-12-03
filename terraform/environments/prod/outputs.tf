output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

# EKS Outputs
output "eks_cluster_name" {
  description = "EKS Cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS Cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_version" {
  description = "EKS Cluster version"
  value       = module.eks.cluster_version
}

output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = module.eks.kubectl_config_command
}

# ALB Outputs
output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.eks.alb_dns_name
}

output "alb_url" {
  description = "Application URL"
  value       = "http://${module.eks.alb_dns_name}"
}

# OpenSearch Outputs
output "opensearch_endpoint" {
  description = "OpenSearch Serverless endpoint"
  value       = module.opensearch.endpoint
}

# Secrets Manager Outputs
output "database_secret_name" {
  description = "Name of the database secret in AWS Secrets Manager"
  value       = module.secrets.database_secret_name
}

output "external_secrets_role_arn" {
  description = "IAM Role ARN for External Secrets Operator"
  value       = module.secrets.external_secrets_role_arn
}

# Monitoring Outputs
output "cloudwatch_log_group" {
  description = "CloudWatch Log Group name"
  value       = module.monitoring.log_group_name
}

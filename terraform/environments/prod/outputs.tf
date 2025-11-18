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

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.ecs.alb_dns_name
}

output "alb_url" {
  description = "Application Load Balancer URL"
  value       = "http://${module.ecs.alb_dns_name}"
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS Service name"
  value       = module.ecs.service_name
}

output "opensearch_endpoint" {
  description = "OpenSearch Serverless endpoint"
  value       = module.opensearch.endpoint
}

output "cloudwatch_log_group" {
  description = "CloudWatch Log Group name"
  value       = module.monitoring.log_group_name
}

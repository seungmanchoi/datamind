# Monitoring Module Variables

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging, dev)"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the ALB target group (optional)"
  type        = string
  default     = null
}

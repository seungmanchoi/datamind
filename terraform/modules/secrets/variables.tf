# Secrets Module Variables

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging, dev)"
  type        = string
}

variable "recovery_window_in_days" {
  description = "Number of days before secret is permanently deleted"
  type        = number
  default     = 7
}

# Database credentials
variable "db_host" {
  description = "Database host"
  type        = string
  sensitive   = true
}

variable "db_port" {
  description = "Database port"
  type        = string
  default     = "3306"
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_database" {
  description = "Database name"
  type        = string
  sensitive   = true
}

# OpenSearch
variable "opensearch_endpoint" {
  description = "OpenSearch endpoint URL"
  type        = string
  sensitive   = true
}

# EKS OIDC
variable "oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider"
  type        = string
}

variable "oidc_provider_url" {
  description = "URL of the EKS OIDC provider"
  type        = string
}

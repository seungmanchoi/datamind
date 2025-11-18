# IAM Module Variables

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

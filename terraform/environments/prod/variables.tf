variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ndmarket"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

# ECS Configuration
variable "app_image" {
  description = "Docker image for the application"
  type        = string
  default     = "ndmarket-app:latest"
}

variable "task_cpu" {
  description = "CPU units for ECS task (256 = 0.25 vCPU)"
  type        = string
  default     = "512"
}

variable "task_memory" {
  description = "Memory for ECS task in MB"
  type        = string
  default     = "1024"
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

# Monitoring Configuration
variable "alarm_email" {
  description = "Email address for CloudWatch alarms"
  type        = string
}

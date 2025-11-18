# Monitoring Module - CloudWatch Alarms and Notifications

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = {
    Name        = "${var.project_name}-${var.environment}-alerts"
    Project     = var.project_name
    Environment = var.environment
  }
}

# SNS Topic Subscription (Email)
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-logs"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ECS Service CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-cpu-high"
  alarm_description   = "Alert when ECS service CPU utilization is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-cpu-high"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ECS Service Memory Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-memory-high"
  alarm_description   = "Alert when ECS service memory utilization is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-memory-high"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ECS Service Running Tasks Count Alarm
resource "aws_cloudwatch_metric_alarm" "ecs_tasks_low" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-tasks-low"
  alarm_description   = "Alert when ECS running tasks count is low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-tasks-low"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ALB Target Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  count               = var.target_group_arn != null ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-alb-response-time-high"
  alarm_description   = "Alert when ALB target response time is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "1.0"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = split(":", var.target_group_arn)[5]
    LoadBalancer = split("/", split(":", var.target_group_arn)[5])[1]
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-response-time-high"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ALB Unhealthy Target Count Alarm
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_targets" {
  count               = var.target_group_arn != null ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-alb-unhealthy-targets"
  alarm_description   = "Alert when there are unhealthy targets in ALB"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = split(":", var.target_group_arn)[5]
    LoadBalancer = split("/", split(":", var.target_group_arn)[5])[1]
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-unhealthy-targets"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ALB 5XX Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  count               = var.target_group_arn != null ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  alarm_description   = "Alert when ALB 5XX error rate is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = split(":", var.target_group_arn)[5]
    LoadBalancer = split("/", split(":", var.target_group_arn)[5])[1]
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-5xx-errors"
    Project     = var.project_name
    Environment = var.environment
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "ECS CPU and Memory Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "RunningTaskCount", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "ECS Running Tasks"
        }
      }
    ]
  })
}

# Data source for current region
data "aws_region" "current" {}

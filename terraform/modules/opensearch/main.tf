# OpenSearch Serverless Module - Vector Database for Embeddings

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}

# Encryption Policy
resource "aws_opensearchserverless_security_policy" "encryption" {
  name        = "${var.project_name}-${var.environment}-encryption-policy"
  type        = "encryption"
  description = "Encryption policy for ${var.project_name} collection"

  policy = jsonencode({
    Rules = [
      {
        Resource = [
          "collection/${var.project_name}-${var.environment}-*"
        ]
        ResourceType = "collection"
      }
    ]
    AWSOwnedKey = true
  })
}

# Network Policy
resource "aws_opensearchserverless_security_policy" "network" {
  name        = "${var.project_name}-${var.environment}-network-policy"
  type        = "network"
  description = "Network policy for ${var.project_name} collection"

  policy = jsonencode([
    {
      Rules = [
        {
          Resource = [
            "collection/${var.project_name}-${var.environment}-*"
          ]
          ResourceType = "collection"
        }
      ]
      AllowFromPublic = true
    }
  ])
}

# OpenSearch Serverless Collection
resource "aws_opensearchserverless_collection" "main" {
  name        = "${var.project_name}-${var.environment}-collection"
  description = "Vector database for ${var.project_name} embeddings"
  type        = "VECTORSEARCH"

  depends_on = [
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-collection"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Data Access Policy
resource "aws_opensearchserverless_access_policy" "data_access" {
  name        = "${var.project_name}-${var.environment}-data-access-policy"
  type        = "data"
  description = "Data access policy for ${var.project_name} collection"

  policy = jsonencode([
    {
      Rules = [
        {
          Resource = [
            "collection/${var.project_name}-${var.environment}-*"
          ]
          Permission = [
            "aoss:CreateCollectionItems",
            "aoss:DeleteCollectionItems",
            "aoss:UpdateCollectionItems",
            "aoss:DescribeCollectionItems"
          ]
          ResourceType = "collection"
        },
        {
          Resource = [
            "index/${var.project_name}-${var.environment}-*/*"
          ]
          Permission = [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
            "aoss:ReadDocument",
            "aoss:WriteDocument"
          ]
          ResourceType = "index"
        }
      ]
      Principal = [
        data.aws_caller_identity.current.arn
      ]
    }
  ])
}

# CloudWatch Log Group for OpenSearch
resource "aws_cloudwatch_log_group" "opensearch" {
  name              = "/aws/opensearch/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-opensearch-logs"
    Project     = var.project_name
    Environment = var.environment
  }
}

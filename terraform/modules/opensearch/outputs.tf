# OpenSearch Module Outputs

output "collection_id" {
  description = "ID of the OpenSearch Serverless collection"
  value       = aws_opensearchserverless_collection.main.id
}

output "collection_arn" {
  description = "ARN of the OpenSearch Serverless collection"
  value       = aws_opensearchserverless_collection.main.arn
}

output "endpoint" {
  description = "OpenSearch Serverless collection endpoint"
  value       = aws_opensearchserverless_collection.main.collection_endpoint
}

output "dashboard_endpoint" {
  description = "OpenSearch Serverless dashboard endpoint"
  value       = aws_opensearchserverless_collection.main.dashboard_endpoint
}

output "collection_name" {
  description = "Name of the OpenSearch Serverless collection"
  value       = aws_opensearchserverless_collection.main.name
}

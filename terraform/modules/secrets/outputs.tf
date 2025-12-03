# Secrets Module Outputs

output "database_secret_arn" {
  description = "ARN of the database secret"
  value       = aws_secretsmanager_secret.database.arn
}

output "database_secret_name" {
  description = "Name of the database secret"
  value       = aws_secretsmanager_secret.database.name
}

output "opensearch_secret_arn" {
  description = "ARN of the OpenSearch secret"
  value       = aws_secretsmanager_secret.opensearch.arn
}

output "opensearch_secret_name" {
  description = "Name of the OpenSearch secret"
  value       = aws_secretsmanager_secret.opensearch.name
}

output "external_secrets_role_arn" {
  description = "ARN of the IAM role for External Secrets Operator"
  value       = aws_iam_role.external_secrets.arn
}

output "secrets_access_policy_arn" {
  description = "ARN of the secrets access policy"
  value       = aws_iam_policy.secrets_access.arn
}

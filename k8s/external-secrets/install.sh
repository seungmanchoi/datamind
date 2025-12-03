#!/bin/bash
# External Secrets Operator 설치 스크립트

set -e

echo "=== External Secrets Operator 설치 ==="

# Helm 설치 확인
if ! command -v helm &> /dev/null; then
    echo "Helm이 설치되어 있지 않습니다. 설치를 진행합니다..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# Helm repo 추가
echo "1. Helm repo 추가..."
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# External Secrets Operator 설치
echo "2. External Secrets Operator 설치..."
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace \
  --set installCRDs=true \
  --wait

# 설치 확인
echo "3. 설치 확인..."
kubectl get pods -n external-secrets

echo ""
echo "=== 설치 완료 ==="
echo ""
echo "다음 단계:"
echo "1. terraform output external_secrets_role_arn 으로 Role ARN 확인"
echo "2. k8s/external-secrets/service-account.yaml의 \${EXTERNAL_SECRETS_ROLE_ARN} 치환"
echo "3. kubectl apply -f k8s/external-secrets/"
echo ""

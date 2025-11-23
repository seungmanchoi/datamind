#!/usr/bin/env python3
"""
AWS IAM Identity 확인 스크립트
현재 사용 중인 IAM 사용자/역할의 ARN과 계정 ID를 출력합니다.
"""

import os
import sys

# .env 파일에서 환경 변수 로드
from pathlib import Path
env_path = Path(__file__).parent.parent / '.env'

if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

try:
    import boto3
except ImportError:
    print("❌ boto3가 설치되어 있지 않습니다.")
    print("설치 방법: pip install boto3")
    sys.exit(1)

try:
    # STS 클라이언트 생성
    sts = boto3.client('sts',
                      region_name=os.environ.get('AWS_REGION', 'ap-northeast-2'),
                      aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                      aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'))

    # Caller Identity 가져오기
    identity = sts.get_caller_identity()

    print("\n" + "="*60)
    print("✅ AWS IAM Identity 정보")
    print("="*60)
    print(f"📋 사용자 ARN: {identity['Arn']}")
    print(f"🔢 AWS 계정 ID: {identity['Account']}")
    print(f"👤 사용자 ID: {identity['UserId']}")
    print("="*60)

    # OpenSearch 액세스 정책 예시
    opensearch_endpoint = os.environ.get('OPENSEARCH_ENDPOINT', '')
    domain_name = ''
    if 'search-' in opensearch_endpoint:
        # URL에서 도메인 이름 추출
        parts = opensearch_endpoint.split('/')
        domain_part = parts[2] if len(parts) > 2 else ''
        domain_name = domain_part.split('.')[0].replace('search-', '')

    print("\n📝 OpenSearch 액세스 정책 (JSON):")
    print("="*60)

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": identity['Arn']
                },
                "Action": "es:*",
                "Resource": f"arn:aws:es:ap-northeast-2:{identity['Account']}:domain/{domain_name}/*"
            }
        ]
    }

    import json
    print(json.dumps(policy, indent=2, ensure_ascii=False))
    print("="*60)
    print("\n💡 위 JSON을 AWS Console → OpenSearch Service → 도메인 → Security configuration → Access policy에 붙여넣으세요.\n")

except Exception as e:
    print(f"\n❌ 오류 발생: {e}")
    print("\n가능한 원인:")
    print("1. AWS 자격 증명이 올바르지 않음")
    print("2. 네트워크 연결 문제")
    print("3. IAM 권한 부족\n")
    sys.exit(1)

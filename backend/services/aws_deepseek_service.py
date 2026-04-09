import datetime as dt
import hashlib
import hmac
import json
import os
import re
from typing import Any
from urllib import error, parse, request

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except Exception:  # pragma: no cover - optional dependency fallback
    boto3 = None
    BotoCoreError = Exception
    ClientError = Exception


def _gateway_url() -> str:
    return os.getenv("API_GATEWAY_URL", "").strip()


def _aws_access_key() -> str:
    return os.getenv("AWS_ACCESS_KEY_ID", "").strip() or os.getenv("access_key", "").strip()


def _aws_secret_key() -> str:
    return os.getenv("AWS_SECRET_ACCESS_KEY", "").strip() or os.getenv("secret_key", "").strip()


def _aws_session_token() -> str:
    return os.getenv("AWS_SESSION_TOKEN", "").strip()


def _aws_region(host: str) -> str:
    configured = os.getenv("AWS_REGION", "").strip()
    if configured:
        return configured
    match = re.search(r"execute-api\.([a-z0-9-]+)\.amazonaws\.com", host)
    if match:
        return match.group(1)
    match = re.search(r"bedrock-runtime\.([a-z0-9-]+)\.amazonaws\.com", host)
    if match:
        return match.group(1)
    return "us-east-1"


def _sign(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def _signing_key(secret_key: str, date_stamp: str, region: str, service: str) -> bytes:
    k_date = _sign(("AWS4" + secret_key).encode("utf-8"), date_stamp)
    k_region = _sign(k_date, region)
    k_service = _sign(k_region, service)
    return _sign(k_service, "aws4_request")


def _canonical_query(query: str) -> str:
    if not query:
        return ""
    params = parse.parse_qsl(query, keep_blank_values=True)
    pairs = [
        (
            parse.quote(str(k), safe="-_.~"),
            parse.quote(str(v), safe="-_.~"),
        )
        for k, v in params
    ]
    pairs.sort(key=lambda item: (item[0], item[1]))
    return "&".join(f"{k}={v}" for k, v in pairs)


def _auth_headers(url: str, body: bytes, access: str, secret: str, token: str, service: str) -> dict[str, str]:
    parsed = parse.urlparse(url)
    host = parsed.netloc
    region = _aws_region(host)
    now = dt.datetime.now(dt.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    canonical_uri = parsed.path or "/"
    canonical_query = _canonical_query(parsed.query)
    payload_hash = hashlib.sha256(body).hexdigest()
    canonical_headers = (
        f"content-type:application/json\n"
        f"host:{host}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    signed_headers = "content-type;host;x-amz-content-sha256;x-amz-date"
    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "Host": host,
        "X-Amz-Date": amz_date,
        "X-Amz-Content-Sha256": payload_hash,
    }
    if token:
        canonical_headers += f"x-amz-security-token:{token}\n"
        signed_headers += ";x-amz-security-token"
        headers["X-Amz-Security-Token"] = token
    canonical_request = "\n".join(
        [
            "POST",
            canonical_uri,
            canonical_query,
            canonical_headers,
            signed_headers,
            payload_hash,
        ]
    )
    scope = f"{date_stamp}/{region}/{service}/aws4_request"
    to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    signature = hmac.new(_signing_key(secret, date_stamp, region, service), to_sign.encode("utf-8"), hashlib.sha256)
    headers["Authorization"] = (
        "AWS4-HMAC-SHA256 "
        f"Credential={access}/{scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature.hexdigest()}"
    )
    return headers


def _signed_post(url: str, body: bytes, service: str, timeout: int) -> tuple[str | None, str]:
    access = _aws_access_key()
    secret = _aws_secret_key()
    token = _aws_session_token()
    if not access or not secret:
        return None, "missing-aws-credentials"
    headers = _auth_headers(url, body, access, secret, token, service)
    req = request.Request(url, method="POST", data=body, headers=headers)
    try:
        with request.urlopen(req, timeout=timeout) as response:
            return response.read().decode("utf-8"), ""
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        return None, f"HTTP {exc.code}: {detail[:240]}"
    except (error.URLError, TimeoutError):
        return None, "network-or-timeout"


def _unwrap_payload(payload: Any) -> Any:
    if not isinstance(payload, dict):
        return payload
    body = payload.get("body")
    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return body
    if isinstance(body, (dict, list)):
        return body
    return payload


def _extract_text(payload: Any) -> str:
    if isinstance(payload, str):
        return payload.strip()
    if not isinstance(payload, dict):
        return ""
    output = payload.get("output", {})
    if isinstance(output, dict):
        message = output.get("message", {})
        if isinstance(message, dict):
            contents = message.get("content", [])
            if isinstance(contents, list):
                chunks = [
                    str(item.get("text", "")).strip()
                    for item in contents
                    if isinstance(item, dict) and str(item.get("text", "")).strip()
                ]
                if chunks:
                    return "\n".join(chunks).strip()
    choices = payload.get("choices", [])
    if isinstance(choices, list) and choices:
        first = choices[0] if isinstance(choices[0], dict) else {}
        message = first.get("message", {}) if isinstance(first, dict) else {}
        content = message.get("content", "") if isinstance(message, dict) else ""
        if content:
            return str(content).strip()
    for key in ["output_text", "answer", "response", "text", "content"]:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _parse_json_dict(value: str) -> dict[str, Any] | None:
    text = value.strip()
    if not text:
        return None
    try:
        payload = json.loads(text)
        return payload if isinstance(payload, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        payload = json.loads(match.group(0))
        return payload if isinstance(payload, dict) else None
    except json.JSONDecodeError:
        return None


def _post_gateway(prompt: str, expect_json: bool, timeout: int = 30) -> tuple[Any | None, str]:
    url = _gateway_url()
    if not url:
        return None, "missing-gateway-config"

    payload = {
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        "messages": [{"role": "user", "content": prompt}],
        "prompt": prompt,
        "temperature": 0.2,
        "max_tokens": int(os.getenv("DEEPSEEK_MAX_TOKENS", "900")),
        "response_format": "json" if expect_json else "text",
    }
    body = json.dumps(payload).encode("utf-8")
    raw, post_error = _signed_post(url, body, service="execute-api", timeout=timeout)
    if post_error:
        return None, post_error
    if raw is None:
        return None, "empty-response"

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return raw, ""
    return _unwrap_payload(parsed), ""


def _deepseek_model_id() -> str:
    return os.getenv("DEEPSEEK_R1_MODEL_ID", "deepseek.r1-v1:0")


def _nova_model_id() -> str:
    return os.getenv("NOVA_LITE_MODEL_ID", "amazon.nova-lite-v1:0")


def _bedrock_converse(prompt: str, model_id: str, timeout: int = 30) -> tuple[dict[str, Any] | None, str]:
    region = os.getenv("AWS_REGION", "us-east-1").strip() or "us-east-1"

    if boto3 is not None:
        kwargs: dict[str, Any] = {"region_name": region}
        access = _aws_access_key()
        secret = _aws_secret_key()
        token = _aws_session_token()
        if access and secret:
            kwargs["aws_access_key_id"] = access
            kwargs["aws_secret_access_key"] = secret
        if token:
            kwargs["aws_session_token"] = token
        try:
            client = boto3.client("bedrock-runtime", **kwargs)
            response = client.converse(
                modelId=model_id,
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={
                    "maxTokens": int(os.getenv("DEEPSEEK_MAX_TOKENS", "900")),
                    "temperature": 0.2,
                },
            )
        except (ClientError, BotoCoreError) as exc:
            return None, str(exc)[:260]
        if isinstance(response, dict):
            return response, ""
        return None, "invalid-json-response"

    encoded_model = parse.quote(model_id, safe="-_.~")
    url = f"https://bedrock-runtime.{region}.amazonaws.com/model/{encoded_model}/converse"
    payload = {
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {
            "maxTokens": int(os.getenv("DEEPSEEK_MAX_TOKENS", "900")),
            "temperature": 0.2,
        },
    }
    body = json.dumps(payload).encode("utf-8")
    raw, post_error = _signed_post(url, body, service="bedrock", timeout=timeout)
    if post_error:
        return None, post_error
    if raw is None:
        return None, "empty-response"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None, "invalid-json-response"
    if isinstance(parsed, dict):
        return parsed, ""
    return None, "invalid-json-response"


def deepseek_text(prompt: str, timeout: int = 30) -> tuple[str | None, str, str]:
    attempts: list[str] = []
    for model_id in [_deepseek_model_id(), _nova_model_id()]:
        payload, err = _bedrock_converse(prompt, model_id, timeout=timeout)
        if payload is None:
            attempts.append(f"bedrock:{model_id} -> {err}")
            continue
        text = _extract_text(payload)
        if text:
            return text, "", f"bedrock:{model_id}"
        attempts.append(f"bedrock:{model_id} -> empty-response")

    payload, gateway_error = _post_gateway(prompt, expect_json=False, timeout=timeout)
    if not gateway_error:
        text = _extract_text(payload)
        if text:
            return text, "", "apigw:deepseek"
        if isinstance(payload, dict):
            return json.dumps(payload, ensure_ascii=True)[:3000], "", "apigw:deepseek"
        if isinstance(payload, str) and payload.strip():
            return payload.strip(), "", "apigw:deepseek"
    elif gateway_error != "missing-gateway-config":
        attempts.append(f"apigw -> {gateway_error}")

    return None, " | ".join(attempts[:3]) if attempts else "unavailable", ""


def deepseek_json(prompt: str, timeout: int = 30) -> tuple[dict[str, Any] | None, str, str]:
    direct_keys = {
        "updated_content",
        "summary",
        "explanation",
        "fix",
        "probable_root_cause",
        "action_items",
    }
    attempts: list[str] = []

    for model_id in [_deepseek_model_id(), _nova_model_id()]:
        payload, err = _bedrock_converse(prompt, model_id, timeout=timeout)
        if payload is None:
            attempts.append(f"bedrock:{model_id} -> {err}")
            continue
        if any(key in payload for key in direct_keys):
            return payload, "", f"bedrock:{model_id}"
        text = _extract_text(payload)
        parsed = _parse_json_dict(text)
        if parsed:
            return parsed, "", f"bedrock:{model_id}"
        attempts.append(f"bedrock:{model_id} -> invalid-json-response")

    payload, gateway_error = _post_gateway(prompt, expect_json=True, timeout=timeout)
    if not gateway_error:
        if isinstance(payload, dict):
            if any(key in payload for key in direct_keys):
                return payload, "", "apigw:deepseek"
            nested_text = _extract_text(payload)
            parsed = _parse_json_dict(nested_text)
            if parsed:
                return parsed, "", "apigw:deepseek"
        if isinstance(payload, str):
            parsed = _parse_json_dict(payload)
            if parsed:
                return parsed, "", "apigw:deepseek"
        attempts.append("apigw -> invalid-json-response")
    elif gateway_error != "missing-gateway-config":
        attempts.append(f"apigw -> {gateway_error}")

    return None, " | ".join(attempts[:3]) if attempts else "invalid-json-response", ""
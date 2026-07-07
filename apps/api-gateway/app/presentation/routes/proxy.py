from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, status

from app.core.service_routes import SERVICE_ROUTES

router = APIRouter()

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


@router.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy_request(full_path: str, request: Request) -> Response:
    target_url = _resolve_target_url(full_path)
    if not target_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    forward_headers = _prepare_forward_headers(request)
    body = await request.body()

    try:
        downstream_response = await request.app.state.http_client.request(
            method=request.method,
            url=target_url,
            params=request.query_params,
            headers=forward_headers,
            content=body,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Downstream service unavailable: {exc}",
        ) from exc

    response_headers = {
        key: value
        for key, value in downstream_response.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length"
    }

    return Response(
        content=downstream_response.content,
        status_code=downstream_response.status_code,
        headers=response_headers,
        media_type=downstream_response.headers.get("content-type"),
    )


def _resolve_target_url(full_path: str) -> str | None:
    if not full_path:
        return None

    segment, _, remainder = full_path.partition("/")
    route_data = SERVICE_ROUTES.get(segment)
    if not route_data:
        return None

    service_base_url, downstream_prefix = route_data
    normalized_remainder = f"/{remainder}" if remainder else ""

    return f"{service_base_url}{downstream_prefix}{normalized_remainder}"


def _prepare_forward_headers(request: Request) -> dict[str, str]:
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() not in {"host", "content-length"}
    }

    if hasattr(request.state, "user_id"):
        headers["X-User-Id"] = request.state.user_id
    if hasattr(request.state, "user_email"):
        headers["X-User-Email"] = request.state.user_email

    return headers

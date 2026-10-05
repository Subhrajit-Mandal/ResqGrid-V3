from dataclasses import dataclass
from datetime import datetime, timezone
import jwt
from functools import lru_cache
from fastapi import HTTPException

@dataclass(frozen=True)
class Actor:
    user_id: str
    roles: frozenset[str]
    agency_id: str | None = None
    expires_at: float | None = None

DEMO_ACTORS = {
    "demo-citizen": Actor("demo-citizen",frozenset({"citizen"})),
    "demo-other": Actor("demo-other",frozenset({"citizen"})),
    "demo-agency": Actor("demo-operator",frozenset({"agency_coordinator"}),"A-01"),
    "demo-intelligence": Actor("demo-analyst",frozenset({"intelligence_operator","publish_alert"})),
    "demo-admin": Actor("demo-admin",frozenset({"platform_admin"})),
}

@lru_cache(maxsize=4)
def jwks_client(url):
    return jwt.PyJWKClient(f"{url.rstrip('/')}/auth/v1/.well-known/jwks.json")

def authenticate(token: str, settings, repository) -> Actor:
    if not isinstance(token,str) or not token or len(token)>16384:raise HTTPException(401,'Invalid session token')
    if settings.mode == "demo":
        actor=DEMO_ACTORS.get(token)
        if actor is None: raise HTTPException(401,"Unknown demo identity")
        return actor
    if token.startswith("demo-"): raise HTTPException(401,"Demo identities are disabled")
    try:
        client=jwks_client(settings.supabase_url)
        signing=client.get_signing_key_from_jwt(token)
        claims=jwt.decode(token,signing.key,algorithms=["RS256","ES256"],audience="authenticated",issuer=f"{settings.supabase_url.rstrip('/')}/auth/v1",options={"require":["exp","sub","iss","aud"]})
        identity=repository.identity(claims["sub"])
        return Actor(claims["sub"],frozenset(identity["roles"]),identity.get("agency_id"),claims["exp"])
    except (jwt.PyJWTError,ValueError,KeyError):
        raise HTTPException(401,"Invalid or expired session") from None

def require(actor: Actor,*roles: str):
    if not actor.roles.intersection(roles): raise HTTPException(403,"Permission denied")
    if actor.expires_at is not None and actor.expires_at <= datetime.now(timezone.utc).timestamp():
        raise HTTPException(401,"Session expired")

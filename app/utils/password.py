import hashlib
import secrets

def hash_password(pw: str) -> str:
    """Hashea una contraseña usando PBKDF2-HMAC-SHA256 y un salt seguro."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        pw.encode('utf-8'),
        bytes.fromhex(salt),
        100000
    )
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"

def verify_password(pw: str, hashed: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con el hash almacenado."""
    try:
        parts = hashed.split('$')
        if len(parts) != 3:
            return False
        _, salt, key_hex = parts
        computed = hashlib.pbkdf2_hmac(
            'sha256',
            pw.encode('utf-8'),
            bytes.fromhex(salt),
            100000
        ).hex()
        return secrets.compare_digest(computed, key_hex)
    except Exception:
        return False

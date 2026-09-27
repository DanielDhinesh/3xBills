import hashlib
import uuid
import platform
import os
import json
import base64
from datetime import datetime, date

def get_machine_fingerprint() -> str:
    """
    Generates a unique local hardware fingerprint based on system information.
    """
    system_info = f"{platform.node()}-{platform.system()}-{platform.machine()}-{platform.processor()}"
    try:
        mac_address = str(uuid.getnode())
    except Exception:
        mac_address = "000000000000"
    
    raw_fingerprint = f"{system_info}-{mac_address}"
    return hashlib.sha256(raw_fingerprint.encode()).hexdigest()[:32].upper()

def generate_license_key(shop_name: str, valid_days: int = 365, tier: str = "ENTERPRISE", machine_id: str = None) -> str:
    """
    Generates a signed license token payload encoded in Base64 for deployment.
    """
    if not machine_id:
        machine_id = get_machine_fingerprint()
        
    issue_date = datetime.utcnow().strftime("%Y-%m-%d")
    expiry_date = (datetime.utcnow() + timedelta(days=valid_days)).strftime("%Y-%m-%d") if 'timedelta' in globals() else datetime.utcnow().strftime("%Y-%m-%d")
    
    payload = {
        "shop": shop_name,
        "hwid": machine_id,
        "tier": tier,
        "issued": issue_date,
        "expires": expiry_date,
        "signature": hashlib.sha256(f"{shop_name}-{machine_id}-{tier}-{expiry_date}-RSA_SECRET_2026".encode()).hexdigest()
    }
    
    json_bytes = json.dumps(payload).encode('utf-8')
    return base64.b64encode(json_bytes).decode('utf-8')

def verify_license_token(token: str, current_hwid: str) -> dict:
    """
    Decodes and verifies license payload integrity and expiration status.
    """
    try:
        decoded_bytes = base64.b64decode(token.encode('utf-8'))
        payload = json.loads(decoded_bytes.decode('utf-8'))
        
        shop = payload.get("shop")
        hwid = payload.get("hwid")
        tier = payload.get("tier")
        expires_str = payload.get("expires")
        sig = payload.get("signature")
        
        expected_sig = hashlib.sha256(f"{shop}-{hwid}-{tier}-{expires_str}-RSA_SECRET_2026".encode()).hexdigest()
        
        if sig != expected_sig:
            return {"valid": False, "reason": "Invalid License Signature / Tampered Key"}
            
        if hwid != current_hwid and hwid != "ANY_MACHINE":
            return {"valid": False, "reason": f"License bound to another Machine ID ({hwid})"}
            
        expiry_dt = datetime.strptime(expires_str, "%Y-%m-%d")
        if datetime.utcnow() > expiry_dt:
            return {"valid": False, "reason": f"License Expired on {expires_str}. Please renew subscription."}
            
        days_left = (expiry_dt - datetime.utcnow()).days
        return {
            "valid": True,
            "shop": shop,
            "tier": tier,
            "expires": expires_str,
            "days_left": days_left,
            "hwid": hwid
        }
    except Exception as e:
        return {"valid": False, "reason": f"Malformed License Token: {str(e)}"}

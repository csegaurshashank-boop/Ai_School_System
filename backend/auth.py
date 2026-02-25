"""
Authentication and token management
"""
import uuid
from typing import Dict, Optional
from datetime import datetime, timedelta
from typing import Optional
from models import User
from database import SessionLocal
# In-memory token storage
tokens: Dict[str, dict] = {}

class TokenManager:
    @staticmethod
    def create_token(user_id: int, user_role: str) -> str:
        """Create a new UUID token and store it in memory"""
        token = str(uuid.uuid4())
        
        # Store token with user info and expiration (24 hours)
        tokens[token] = {
            "user_id": user_id,
            "role": user_role,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(hours=24)
        }
        
        print(f"Token created: {token[:20]}... for user {user_id} ({user_role})")
        print(f"Total tokens in memory: {len(tokens)}")
        
        return token
    
    @staticmethod
    def validate_token(token: str) -> Optional[dict]:
        """Validate token and return user info if valid"""
        if not token:
            print("No token provided")
            return None
        
        if token not in tokens:
            print(f"Token not found in memory: {token[:20]}...")
            print(f"Available tokens: {list(tokens.keys())[:3] if tokens else 'None'}")
            return None
        
        token_data = tokens[token]
        
        # Check if token has expired
        if datetime.now() > token_data["expires_at"]:
            print(f"Token expired: {token[:20]}...")
            del tokens[token]
            return None
        
        # Update expiration (extend session on activity)
        token_data["expires_at"] = datetime.now() + timedelta(hours=24)
        
        return token_data
    
    @staticmethod
    def remove_token(token: str) -> bool:
        """Remove token from memory (logout)"""
        if token in tokens:
            print(f"Removing token: {token[:20]}...")
            del tokens[token]
            print(f"Total tokens remaining: {len(tokens)}")
            return True
        
        print(f"Token not found for removal: {token[:20]}...")
        return False
    
    @staticmethod
    def get_user_id(token: str) -> Optional[int]:
        """Get user ID from token"""
        token_data = TokenManager.validate_token(token)
        return token_data["user_id"] if token_data else None
    
    @staticmethod
    def get_user_role(token: str) -> Optional[str]:
        """Get user role from token"""
        token_data = TokenManager.validate_token(token)
        return token_data["role"] if token_data else None
    
    @staticmethod
    def list_tokens():
        """List all active tokens (for debugging)"""
        print(f"\n{'='*60}")
        print("ACTIVE TOKENS:")
        for token, data in tokens.items():
            age = datetime.now() - data["created_at"]
            expires_in = data["expires_at"] - datetime.now()
            print(f"  {token[:20]}... | User: {data['user_id']} | "
                  f"Role: {data['role']} | Age: {age.total_seconds():.0f}s | "
                  f"Expires in: {expires_in.total_seconds()/3600:.1f}h")
        print(f"Total: {len(tokens)} tokens")
        print(f"{'='*60}")




def get_user_by_token(token: str) -> Optional[User]:

    token_data = TokenManager.validate_token(token)

    if not token_data:
        return None

    user_id = token_data["user_id"]

    db = SessionLocal()

    try:
        return db.query(User).filter(User.id == user_id).first()
    finally:
        db.close()

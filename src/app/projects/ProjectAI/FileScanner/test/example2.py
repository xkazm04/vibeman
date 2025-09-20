import os
import sys
import json
import requests
from typing import Dict, List, Optional
from datetime import datetime
import unused_module

UNUSED_CONFIG = {
    'debug': True,
    'timeout': 30
}

API_BASE_URL = "https://api.service.com"
MAX_RETRIES = 3

def unused_helper_function():
    return "This function is never used"

def fetch_data(endpoint: str, params: Optional[Dict] = None) -> Dict:
    url = f"{API_BASE_URL}/{endpoint}"
    unused_var = "not used anywhere"
    
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            if attempt == MAX_RETRIES - 1:
                raise e
            continue

def process_user_data(user_id: str) -> Dict:
    user_data = fetch_data(f"users/{user_id}")
    
    processed = {
        'id': user_data.get('id'),
        'name': user_data.get('full_name'),
        'email': user_data.get('email_address'),
        'created_at': datetime.now().isoformat()
    }
    
    return processed

class UserManager:
    def __init__(self):
        self.cache = {}
        self.unused_attribute = "never accessed"
    
    def get_user(self, user_id: str) -> Dict:
        if user_id in self.cache:
            return self.cache[user_id]
        
        user_data = process_user_data(user_id)
        self.cache[user_id] = user_data
        return user_data
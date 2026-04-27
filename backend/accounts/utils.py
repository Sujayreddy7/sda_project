from cryptography.fernet import Fernet
import os
from django.conf import settings

# Usually, fetch from environment variables
def get_fernet_key():
    key = os.environ.get('FERNET_KEY')
    if not key:
        # Fallback for dev ONLY if no key is provided
        key = Fernet.generate_key()
        os.environ['FERNET_KEY'] = key.decode()
        return key
    return key.encode() if isinstance(key, str) else key

def encrypt_data(data: str) -> str:
    f = Fernet(get_fernet_key())
    return f.encrypt(data.encode('utf-8')).decode('utf-8')

def decrypt_data(encrypted_data: str) -> str:
    f = Fernet(get_fernet_key())
    return f.decrypt(encrypted_data.encode('utf-8')).decode('utf-8')

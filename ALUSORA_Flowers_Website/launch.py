#!/usr/bin/env python3
"""Convenient one-command local launcher. Generates a temporary admin credential."""
import os
import secrets
import sys
from pathlib import Path

root=Path(__file__).resolve().parent
os.chdir(root)
secret=os.environ.get('ALUSORA_ADMIN_TOKEN')
if not secret:
    secret=secrets.token_urlsafe(30)
    os.environ['ALUSORA_ADMIN_TOKEN']=secret
host=os.environ.get('HOST','127.0.0.1')
port=os.environ.get('PORT','8080')
print('\nALUSORA Flowers — demo local\n', flush=True)
print(f'Open storefront: http://{host}:{port}/', flush=True)
print(f'Open admin:      http://{host}:{port}/admin.html', flush=True)
print(f'Admin token:     {secret}', flush=True)
print('\nThe token is only for this local session. Use a securely configured secret when deploying.', flush=True)
print('Press Ctrl+C to stop the server.\n', flush=True)
os.execv(sys.executable,[sys.executable,'-u',str(root/'app.py')])

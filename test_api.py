import urllib.request
import urllib.error
import json

try:
    long_string = "a" * 10000
    data = json.dumps({'key': 'test_key', 'value': long_string}).encode()
    req2 = urllib.request.Request('https://futadmin.com.mx/api/store/', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req2) as f:
        print('POST long', f.getcode())
except urllib.error.HTTPError as e:
    print('POST long', e.code, e.read().decode())

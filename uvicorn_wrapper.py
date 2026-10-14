#!/usr/local/bin/python
import sys
import os
import re

if __name__ == '__main__':
    port_val = os.environ.get('PORT', '8000')
    if not port_val.isdigit():
        port_val = '8000'
    for i in range(len(sys.argv)):
        if sys.argv[i] in ('$PORT', '${PORT}', '\\$PORT'):
            sys.argv[i] = port_val

    from uvicorn.main import main
    sys.argv[0] = re.sub(r'(-script\.pyw|\.exe)?$', '', sys.argv[0])
    sys.exit(main())

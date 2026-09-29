try:
    import fastapi
    print("FASTAPI CONTAMINADO:", fastapi.__file__)
except ImportError:
    print("OK - fastapi no en sistema Python base")

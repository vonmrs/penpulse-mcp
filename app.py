"""PenPulse · 最简 WSGI 测试"""

def app(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET")
    path = environ.get("PATH_INFO", "/")

    if method == "GET" and path == "/":
        start_response("200 OK", [("Content-Type", "text/plain"), ("Access-Control-Allow-Origin", "*")])
        return [b"GET OK - Python WSGI is working"]

    if method == "POST":
        content_length = int(environ.get("CONTENT_LENGTH", 0) or 0)
        body = environ["wsgi.input"].read(content_length) if content_length > 0 else b""
        start_response("200 OK", [("Content-Type", "application/json"), ("Access-Control-Allow-Origin", "*")])
        return [b'{"status":"ok","method":"POST","body":"' + body[:50] + b'"}']

    start_response("405 Method Not Allowed", [("Content-Type", "text/plain")])
    return [b"405"]

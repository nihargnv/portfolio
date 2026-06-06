import http.server
import socketserver
import sys

PORT = 8000

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

if __name__ == '__main__':
    # Allow port to be customized via command line argument
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port number. Using default port {PORT}.")

    # Enable socket reuse to avoid "Address already in use" errors on restarts
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
            print(f"Serving HTTP on 0.0.0.0 port {port} (http://localhost:{port}/) with CORS enabled...")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Error starting server: {e}")

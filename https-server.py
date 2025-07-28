#!/usr/bin/env python3
import http.server
import ssl
import socketserver

PORT = 8443

class HTTPServer(socketserver.TCPServer):
    def __init__(self, server_address, RequestHandlerClass):
        super().__init__(server_address, RequestHandlerClass)
        self.socket = ssl.wrap_socket(self.socket, 
                                     keyfile='key.pem', 
                                     certfile='cert.pem', 
                                     server_side=True)

if __name__ == '__main__':
    with HTTPServer(('localhost', PORT), http.server.SimpleHTTPRequestHandler) as httpd:
        print(f'Serving HTTPS on https://localhost:{PORT}')
        print('Press Ctrl+C to stop')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nShutting down server...')
            httpd.shutdown() 
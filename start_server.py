"""Запуск локального сервера для NEUROATLAS без дополнительных пакетов."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import webbrowser

os.chdir(Path(__file__).parent)
port = 8080
url = f'http://localhost:{port}/'
print('NEUROATLAS:', url)
print('Остановить сервер: Ctrl+C')
webbrowser.open(url)
ThreadingHTTPServer(('127.0.0.1', port), SimpleHTTPRequestHandler).serve_forever()

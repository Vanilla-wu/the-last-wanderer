"""本機開發伺服器：與 python -m http.server 相同，但要求瀏覽器不要快取。

一般的 http.server 不送快取標頭，瀏覽器可能把新舊版本的 .js 混在一起載入
（例如新的 Level.js 搭配舊的 Sprites.js），造成開始遊戲後黑屏。

用法：python serve.py [port]   預設 8765
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = partial(NoCacheHandler, directory=str(Path(__file__).resolve().parent))
    print(f'Serving on http://localhost:{port}')
    ThreadingHTTPServer(('', port), handler).serve_forever()

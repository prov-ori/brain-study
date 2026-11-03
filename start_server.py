# Legacy helper: serve the built application rather than uncompiled Vite source.
import subprocess
from pathlib import Path
subprocess.run(['node', 'scripts/serve.mjs'], cwd=Path(__file__).parent, check=True)

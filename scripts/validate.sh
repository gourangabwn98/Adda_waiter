#!/bin/bash
set -e
echo "=== ValidateService: checking nginx ==="
systemctl is-active --quiet nginx && echo "Nginx is running" || exit 1

# Check index.html exists
if [ -f "/var/www/adda-frontend/index.html" ]; then
  echo "index.html found"
else
  echo "ERROR: index.html missing!"
  exit 1
fi

echo "=== Validation passed ==="
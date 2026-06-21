#!/bin/bash
set -e
echo "=== ApplicationStart: reloading nginx ==="
systemctl reload nginx
echo "=== Nginx reloaded ==="
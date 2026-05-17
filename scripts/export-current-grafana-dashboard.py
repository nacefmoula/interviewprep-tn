#!/usr/bin/env python3
"""
export-current-grafana-dashboard.py

Exports the working "AI Attack Detector" dashboard from the current Kubernetes
Grafana instance and saves it as a portable JSON file.

This version is adapted for the current cluster:
- Grafana runs in namespace: monitoring
- Grafana is accessed through local port-forward: http://127.0.0.1:3000
- Dashboard was created manually in Grafana UI
- Prometheus datasource is made portable using ${DS_PROMETHEUS}
"""

import json
import os
import sys
import urllib.request
import urllib.parse
import base64
from pathlib import Path

GRAFANA_URL = os.getenv("GRAFANA_URL", "http://127.0.0.1:3000")
GRAFANA_USER = os.getenv("GRAFANA_USER", "admin")
GRAFANA_PASS = os.getenv("GRAFANA_PASS")

DASHBOARD_TITLE = os.getenv("DASHBOARD_TITLE", "AI Attack Detector")
OUT_DIR = Path("k8s/attack-detection")
OUT_FILE = OUT_DIR / "attack-detector-dashboard.json"

if not GRAFANA_PASS:
    print("ERROR: GRAFANA_PASS environment variable is missing.")
    print("Run:")
    print('export GRAFANA_PASS=$(kubectl get secret -n monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 -d)')
    sys.exit(1)

def request_json(path: str):
    url = f"{GRAFANA_URL.rstrip('/')}{path}"
    token = base64.b64encode(f"{GRAFANA_USER}:{GRAFANA_PASS}".encode()).decode()

    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Basic {token}")
    req.add_header("Accept", "application/json")

    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())

def find_dashboard_uid(title: str) -> str:
    query = urllib.parse.urlencode({
        "query": title,
        "type": "dash-db"
    })

    results = request_json(f"/api/search?{query}")

    for item in results:
        if item.get("title") == title:
            return item["uid"]

    print(f"ERROR: Dashboard titled '{title}' not found.")
    print("Found dashboards:")
    for item in results:
        print(f"- {item.get('title')} uid={item.get('uid')}")
    sys.exit(1)

def fix_datasources(obj):
    """
    Replace environment-specific Prometheus datasource references with
    Grafana import variable ${DS_PROMETHEUS}.
    """
    if isinstance(obj, dict):
        if "datasource" in obj:
            ds = obj["datasource"]
            if isinstance(ds, dict):
                if ds.get("type") == "prometheus" or "prom" in str(ds).lower():
                    obj["datasource"] = {
                        "type": "prometheus",
                        "uid": "${DS_PROMETHEUS}"
                    }
            elif isinstance(ds, str) and ds:
                obj["datasource"] = {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                }

        for value in obj.values():
            fix_datasources(value)

    elif isinstance(obj, list):
        for item in obj:
            fix_datasources(item)

def clean_dashboard(dash: dict) -> dict:
    dash.pop("id", None)
    dash.pop("iteration", None)
    dash["version"] = 1

    # Keep same UID if you want stable import/update.
    # Change this if you want Grafana to create a new dashboard every time.
    dash["uid"] = "ai-attack-detector"

    dash["title"] = "AI Attack Detector"
    dash["time"] = {
        "from": "now-15m",
        "to": "now"
    }
    dash["refresh"] = "10s"

    for panel in dash.get("panels", []):
        panel.pop("id", None)
        fix_datasources(panel)

    fix_datasources(dash)

    dash["__inputs"] = [
        {
            "name": "DS_PROMETHEUS",
            "label": "Prometheus",
            "description": "Prometheus datasource scraping the attack-detector ServiceMonitor",
            "type": "datasource",
            "pluginId": "prometheus",
            "pluginName": "Prometheus"
        }
    ]

    dash["__requires"] = [
        {
            "type": "grafana",
            "id": "grafana",
            "name": "Grafana",
            "version": "9.0.0"
        },
        {
            "type": "panel",
            "id": "stat",
            "name": "Stat",
            "version": ""
        },
        {
            "type": "panel",
            "id": "timeseries",
            "name": "Time series",
            "version": ""
        },
        {
            "type": "datasource",
            "id": "prometheus",
            "name": "Prometheus",
            "version": "1.0.0"
        }
    ]

    return dash

def main():
    print(f"Connecting to Grafana: {GRAFANA_URL}")
    print(f"Searching dashboard: {DASHBOARD_TITLE}")

    uid = find_dashboard_uid(DASHBOARD_TITLE)
    print(f"Found dashboard UID: {uid}")

    exported = request_json(f"/api/dashboards/uid/{uid}")

    if "dashboard" not in exported:
        print("ERROR: Unexpected Grafana API response. Missing 'dashboard'.")
        sys.exit(1)

    dash = exported["dashboard"]
    dash = clean_dashboard(dash)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with OUT_FILE.open("w") as f:
        json.dump(dash, f, indent=2)

    print()
    print(f"✅ Exported portable dashboard: {OUT_FILE}")
    print(f"   Title:   {dash.get('title')}")
    print(f"   UID:     {dash.get('uid')}")
    print(f"   Panels:  {len(dash.get('panels', []))}")
    print(f"   Time:    {dash['time']['from']} → {dash['time']['to']}")
    print(f"   Refresh: {dash['refresh']}")
    print(f"   Size:    {OUT_FILE.stat().st_size} bytes")

if __name__ == "__main__":
    main()

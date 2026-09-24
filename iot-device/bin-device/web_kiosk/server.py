import os
import sys
import json
import asyncio
import logging
from typing import Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

logger = logging.getLogger("web_kiosk")

app = FastAPI(title="SBAY Web Kiosk")

# Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
assets_dir = os.path.join(os.path.dirname(current_dir), "assets")

# Connection Manager
class KioskConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.controller_callback = None
        self.latest_state = {
            "waste_levels": {},
            "server_status": True
        }

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        data_str = json.dumps(message)
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(data_str)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections.discard(ws)

manager = KioskConnectionManager()

# Static Files
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def get_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "SBAY Web Kiosk Running"}

@app.get("/{filename}.{ext}")
async def get_root_files(filename: str, ext: str):
    file_path = os.path.join(static_dir, f"{filename}.{ext}")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"error": "File not found"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send current waste levels and server status immediately
    if manager.latest_state.get("waste_levels"):
        await websocket.send_text(json.dumps({
            "event": "waste_levels",
            "data": manager.latest_state["waste_levels"]
        }))
    await websocket.send_text(json.dumps({
        "event": "server_status",
        "online": manager.latest_state.get("server_status", True)
    }))

    try:
        while True:
            text = await websocket.receive_text()
            try:
                payload = json.loads(text)
                action = payload.get("action")
                logger.info(f"[WS RECEIVE] Action: {action}")

                if manager.controller_callback:
                    manager.controller_callback(payload)
            except Exception as e:
                logger.error(f"[WS] Error processing payload: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"[WS] WebSocket error: {e}")
        manager.disconnect(websocket)

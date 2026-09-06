/*
 * Bharati Digital Twin - ESP32 Remote LED Node
 *
 * Connects to the bridge server over WebSocket and executes LED commands
 * sent from the web UI. Publishes telemetry (LED state, RSSI, uptime)
 * every second so the panel shows live device data.
 *
 * Wiring: NONE required. Uses the built-in LED on GPIO 2.
 * Board:  ESP32 DevKit V1 (30-pin)
 *
 * Libraries needed (already installed):
 *   - WebSockets by Markus Sattler (Links2004)
 *   - ArduinoJson by Benoit Blanchon
 *
 * ============================ EDIT THESE 3 LINES ============================
 */
const char* WIFI_SSID   = "YOUR_HOTSPOT_NAME";     // e.g. "Mahesh 5G"
const char* WIFI_PASS   = "YOUR_HOTSPOT_PASSWORD";

// Local test:   ws://192.168.x.x:3001/ws/device   (your laptop IP on same WiFi)
// Railway prod: wss://your-app.up.railway.app/ws/device
const char* BRIDGE_HOST = "YOUR_BRIDGE_HOST";      // e.g. "192.168.1.5" or "xxx.up.railway.app"
const int   BRIDGE_PORT = 3001;                    // Railway: 443, local: 3001
const bool  BRIDGE_TLS  = false;                   // Railway: true, local: false
const char* DEVICE_TOKEN   = "bharati-dev-token";
const char* DEVICE_ID      = "esp32_led_01";
// ===========================================================================

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// Built-in LED on DevKit V1
const int LED_PIN = 2;

// Blink state
bool ledState = false;        // current physical LED state (for steady mode)
bool blinking = false;        // blink mode active?
unsigned long blinkIntervalMs = 500;
unsigned long lastBlinkToggle = 0;

// Connection state
WebSocketsClient webSocket;
unsigned long lastTelemetry = 0;
unsigned long lastReconnectAttempt = 0;
bool wsConnected = false;

// Stats
unsigned long commandsReceived = 0;
unsigned long bootTime = 0;

// ---------------------------------------------------------------------------
// Telemetry: report LED state, wifi signal, uptime, heap
// ---------------------------------------------------------------------------
void sendTelemetry() {
  StaticJsonDocument<256> doc;
  doc["type"] = "telemetry";
  doc["deviceId"] = DEVICE_ID;
  doc["led"] = digitalRead(LED_PIN) == HIGH;
  doc["blinking"] = blinking;
  doc["rssi"] = WiFi.RSSI();
  doc["uptime_s"] = millis() / 1000;
  doc["heap"] = ESP.getFreeHeap();
  doc["commands"] = commandsReceived;

  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

// ---------------------------------------------------------------------------
// Command handling: LED_START_BLINK / LED_STOP_BLINK / GET_STATUS
// ---------------------------------------------------------------------------
void handleCommand(JsonObject cmd) {
  const char* action = cmd["action"] | "";
  String cmdId = cmd["cmd_id"] | String(millis());

  Serial.printf("[CMD] %s (id=%s)\n", action, cmdId.c_str());
  commandsReceived++;

  String statusMsg = "ok";

  if (strcmp(action, "LED_START_BLINK") == 0) {
    blinking = true;
    // Optional custom speed
    int speed = cmd["speed"] | 0; // ms interval
    if (speed >= 50 && speed <= 5000) blinkIntervalMs = speed;
    Serial.println("[LED] Blink started");
  } else if (strcmp(action, "LED_STOP_BLINK") == 0) {
    blinking = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("[LED] Blink stopped");
  } else if (strcmp(action, "GET_STATUS") == 0) {
    Serial.println("[CMD] Status requested");
  } else if (strcmp(action, "PING") == 0) {
    // respond with telemetry immediately
    sendTelemetry();
    commandsReceived--;
    return;
  } else {
    statusMsg = "unknown_action";
    commandsReceived--;
  }

  // Send acknowledgment back to bridge
  StaticJsonDocument<192> ack;
  ack["type"] = "ack";
  ack["cmd_id"] = cmdId;
  ack["action"] = action;
  ack["status"] = statusMsg;
  ack["led"] = digitalRead(LED_PIN) == HIGH;
  ack["blinking"] = blinking;
  String out;
  serializeJson(ack, out);
  webSocket.sendTXT(out);
}

// ---------------------------------------------------------------------------
// WebSocket events
// ---------------------------------------------------------------------------
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsConnected = true;
      Serial.printf("[WS] Connected to bridge: %s\n", payload);
      // Register ourselves with device role + token
      {
        StaticJsonDocument<192> reg;
        reg["type"] = "register";
        reg["role"] = "device";
        reg["deviceId"] = DEVICE_ID;
        reg["token"] = DEVICE_TOKEN;
        reg["kind"] = "esp32_led";
        String out;
        serializeJson(reg, out);
        webSocket.sendTXT(out);
      }
      sendTelemetry();
      break;

    case WStype_DISCONNECTED:
      wsConnected = false;
      // Safety: stop everything when link is lost
      blinking = false;
      digitalWrite(LED_PIN, LOW);
      Serial.println("[WS] Disconnected - LED forced off");
      break;

    case WStype_TEXT: {
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, payload, length);
      if (err) {
        Serial.printf("[WS] Bad JSON: %s\n", err.c_str());
        return;
      }
      const char* msgType = doc["type"] | "";
      if (strcmp(msgType, "command") == 0) {
        handleCommand(doc.as<JsonObject>());
      }
      break;
    }

    case WStype_ERROR:
      Serial.println("[WS] Error");
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected! IP: %s  RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("[WiFi] Failed - will retry");
  }
}

void connectBridge() {
  Serial.printf("[WS] Connecting to %s:%d (TLS=%d)\n", BRIDGE_HOST, BRIDGE_PORT, BRIDGE_TLS);
  if (BRIDGE_TLS) {
    // Skip cert validation for simplicity (demo project)
    webSocket.beginSSL(BRIDGE_HOST, BRIDGE_PORT, "/ws/device");
  } else {
    webSocket.begin(BRIDGE_HOST, BRIDGE_PORT, "/ws/device");
  }
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Bharati Digital Twin - ESP32 LED Node ===");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  bootTime = millis();
  connectWiFi();
  connectBridge();
}

void loop() {
  // Maintain WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = millis();
      Serial.println("[WiFi] Reconnecting...");
      WiFi.disconnect();
      connectWiFi();
    }
    return;
  }

  webSocket.loop();

  // Non-blocking blink logic
  if (blinking && millis() - lastBlinkToggle >= blinkIntervalMs) {
    lastBlinkToggle = millis();
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  }

  // Telemetry at 1 Hz
  if (wsConnected && millis() - lastTelemetry >= 1000) {
    lastTelemetry = millis();
    sendTelemetry();
  }
}

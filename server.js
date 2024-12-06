const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 3000;

// 提供静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 启动 HTTP 服务
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// WebSocket 服务
const wss = new WebSocket.Server({ server });

let playState = { playing: false, currentTime: 0 }; // 播放状态
const BUFFER_TIME = 0.2; // 缓冲时间，单位：秒

// WebSocket 连接
wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    // 初始化广播当前播放状态
    ws.send(JSON.stringify({
        type: 'playState',
        playing: playState.playing,
        currentTime: playState.currentTime,
        timestamp: Date.now(), // 初始化时间戳
    }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'playState') {
            const now = Date.now();

            // 更新播放状态
            playState = {
                playing: data.playing,
                currentTime: data.currentTime + BUFFER_TIME, // 加入缓冲时间
                timestamp: now,
            };

            // 广播播放状态给其他客户端
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'playState',
                        playing: playState.playing,
                        currentTime: playState.currentTime,
                        timestamp: playState.timestamp,
                    }));
                }
            });
        } else if (data.type === 'syncRequest') {
            console.log('Received sync request');

            // 找到剩余时间最长的客户端时间
            const maxTime = Math.max(...Array.from(wss.clients).map(client => {
                return client.readyState === WebSocket.OPEN && client.currentTime ? client.currentTime : 0;
            }));

            console.log(`Broadcasting sync time: ${maxTime}`);

            // 广播同步时间给所有客户端
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'syncAll',
                        maxTime,
                    }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});
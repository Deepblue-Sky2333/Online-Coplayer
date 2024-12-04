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

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    // 初次连接时同步当前播放状态
    ws.send(JSON.stringify({
        type: 'playState',
        playing: playState.playing,
        currentTime: playState.currentTime,
        timestamp: Date.now() // 加入时间戳
    }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // 如果是播放状态消息
        if (data.type === 'playState') {
            const now = Date.now();

            // 更新播放状态，加入缓冲时间
            playState = {
                playing: data.playing,
                currentTime: data.currentTime + BUFFER_TIME, // 加入缓冲时间
                timestamp: now
            };

            // 广播播放状态给其他客户端
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'playState',
                        playing: playState.playing,
                        currentTime: playState.currentTime,
                        timestamp: playState.timestamp // 广播时间戳
                    }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

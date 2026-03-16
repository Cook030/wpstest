const http = require('http');
const https = require('https');

const API_KEY = 'sk-48c16994455041aca07c39fa87a257a8';

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-DashScope-SSE');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/chat') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const messages = payload.input.messages;
                const hasImage = messages.length > 0 && Array.isArray(messages[messages.length - 1].content);
                
                const apiPath = hasImage 
                    ? '/api/v1/services/aigc/multimodal-generation/generation' 
                    : '/api/v1/services/aigc/text-generation/generation';

                const options = {
                    hostname: 'dashscope.aliyuncs.com',
                    path: apiPath,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'X-DashScope-SSE': 'enable'
                    }
                };

                const proxyReq = https.request(options, (proxyRes) => {
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    proxyRes.pipe(res);
                });

                proxyReq.on('error', (e) => {
                    console.error('代理请求错误:', e);
                    res.statusCode = 500;
                    res.end();
                });

                proxyReq.write(JSON.stringify(payload));
                proxyReq.end();

            } catch (err) {
                console.error('解析请求体失败:', err);
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
    }
});

server.listen(3000, () => {
    console.log('代理服务器已启动，支持图片识别功能');
    console.log('监听地址: http://localhost:3000/chat');
});
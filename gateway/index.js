const express = require('express');
const cors = require('cors');
const httpProxy = require('express-http-proxy');
const morgan = require('morgan');
const NodeCache = require('node-cache');
const cluster = require('cluster'); 
const os = require('os'); 
require('dotenv').config();

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`Master process ${process.pid} is running`);

    // Tạo ra các tiến trình con (Workers) tương ứng với số nhân CPU
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Forking a new one...`);
        cluster.fork(); // Tự động khởi động lại nếu một bản sao bị lỗi
    });

} else {
    const app = express();
    const myCache = new NodeCache({ stdTTL: 30 });

    // app.use(morgan('dev')); // Comment lại khi test tải
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }));

  
    const selectServer = (urlList) => {
        const urls = urlList.split(',');
        let current = 0;
        return () => {
            const url = urls[current];
            current = (current + 1) % urls.length;
            return url;
        };
    };

    const getUserService = selectServer(process.env.USER_SERVICE_URL);

    const proxyOptionsWithCache = {
        limit: '50mb',
        userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
            if (userReq.method === 'GET' && proxyRes.statusCode === 200) {
                myCache.set(userReq.originalUrl, proxyResData.toString());
            }
            return proxyResData;
        }
    };

    const checkCache = (req, res, next) => {
        if (req.method !== 'GET') return next();
        const cachedData = myCache.get(req.originalUrl);
        if (cachedData) {
            res.set('Content-Type', 'application/json');
            return res.send(cachedData);
        }
        next();
    };

    // API Routes
    app.use('/api/v1/course', checkCache, httpProxy(process.env.COURSE_SERVICE_URL, proxyOptionsWithCache));

    // Load Balancing ở tầng ứng dụng: Mỗi request sẽ được gửi tới các instance User Service khác nhau
    app.use('/api/v1/user', (req, res, next) => {
        const target = getUserService(); 
        httpProxy(target, { limit: '50mb' })(req, res, next);
    });

    app.use('/api/v1/payment', httpProxy(process.env.PAYMENT_SERVICE_URL, { limit: '50mb' }));
    app.use('/api/v1/', httpProxy(process.env.MISC_SERVICE_URL, { limit: '50mb' }));

    app.use(express.json({ limit: '50mb' }));
    app.listen(process.env.PORT, () => {
        console.log(`Worker ${process.pid} started - Port ${process.env.PORT}`);
    });
}
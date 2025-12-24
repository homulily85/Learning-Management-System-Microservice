const express = require('express');
const cors = require('cors');
const httpProxy = require('express-http-proxy');
const morgan = require('morgan');
const NodeCache = require('node-cache');
const cluster = require('cluster');
const os = require('os');
const { v4: uuidv4 } = require('uuid'); 
require('dotenv').config();


const statusMonitor = require('express-status-monitor')({
    path: '/status' // Đường dẫn xem dashboard
});

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`🚀 Master ${process.pid} đang chạy. Đang tạo ${numCPUs} bản sao (Workers)...`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} bị lỗi. Đang khởi động lại bản sao mới...`);
        cluster.fork();
    });

} else {
    const app = express();
    const myCache = new NodeCache({ stdTTL: 30 }); // Cache 30 giây
  
    app.use(statusMonitor);

    // Middleware tạo Correlation ID (Để đo đạc request đi qua các service)
    app.use((req, res, next) => {
        req.id = uuidv4();
        res.setHeader('X-Request-Id', req.id);
        next();
    });

    // app.use(morgan('dev')); // Tắt khi test tải nặng
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }));

    const proxyOptionsWithCache = {
        limit: '50mb',
        proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
            proxyReqOpts.headers['x-request-id'] = srcReq.id;
            return proxyReqOpts;
        },
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

    const userUrls = (process.env.USER_SERVICE_URL || '').split(',');
    let currentUserIndex = 0;
    const getNextUserUrl = () => {
        const url = userUrls[currentUserIndex];
        currentUserIndex = (currentUserIndex + 1) % userUrls.length;
        return url;
    };

    // API Course: Có Caching
    app.use('/api/v1/course', checkCache, httpProxy(process.env.COURSE_SERVICE_URL, proxyOptionsWithCache));

    // API User: Có Load Balancing 
    app.use('/api/v1/user', (req, res, next) => {
        const target = getNextUserUrl();
        httpProxy(target, {
            limit: '50mb',
            proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
                proxyReqOpts.headers['x-request-id'] = srcReq.id;
                return proxyReqOpts;
            }
        })(req, res, next);
    });

    app.use('/api/v1/payment', httpProxy(process.env.PAYMENT_SERVICE_URL, { limit: '50mb' }));
    app.use('/api/v1/', httpProxy(process.env.MISC_SERVICE_URL, { limit: '50mb' }));

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    app.all(/.*/, (_req, res) => {
        res.status(404).send('OOPS!! 404 page not found');
    });

    app.listen(process.env.PORT, () => {
        console.log(`Worker ${process.pid} started - Monitor: http://localhost:${process.env.PORT}/status`);
    });
}